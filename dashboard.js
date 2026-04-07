// (╬▔皿▔)╯
const { createClient } = supabase;
const client = createClient(
  'https://tiyapgnehlwbhhzqqumq.supabase.co',
  'sb_publishable_TshJnLexCo4FrHe_YJ8l7g_QcxA_kaV'
);


// STREAK & STATSSSSSSSSSS  (Supabase user_stats)

// In-memory cache so we don't re-fetch on every small update
let _statsCache = null;

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function loadOrCreateStats(userId) {
  let { data, error } = await client
    .from('user_stats')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!data) {
    // First login ever — create the row
    const { data: newRow } = await client
      .from('user_stats')
      .insert({ id: userId })
      .select()
      .single();
    data = newRow;
  }

  _statsCache = data;
  return data;
}

async function syncStreak(userId) {
  const stats   = _statsCache || await loadOrCreateStats(userId);
  const today   = todayStr();
  const last    = stats.last_login_date; // "YYYY-MM-DD" or null🤷🏻‍♀️

  // Already recorded today — return current streak as-is
  if (last === today) return stats.streak || 0;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  // Consecutive day → increment; otherwise reset to 1
  const newStreak  = (last === yStr) ? (stats.streak || 0) + 1 : 1;
  const newLongest = Math.max(newStreak, stats.longest_streak || 0);
  const history    = stats.login_history || [];
  const newHistory = [...new Set([...history, today])].slice(-365);

  await client.from('user_stats').update({
    streak:          newStreak,
    longest_streak:  newLongest,
    last_login_date: today,
    login_history:   newHistory,
    updated_at:      new Date().toISOString()
  }).eq('id', userId);

  // Update cache
  _statsCache = { ..._statsCache, streak: newStreak, longest_streak: newLongest,
                  last_login_date: today, login_history: newHistory };
  return newStreak;
}

async function addStudyTime(userId, hours) {
  const stats = _statsCache || await loadOrCreateStats(userId);
  const today = todayStr();

  // Reset weekly hours if it's a new Monday
  const dayOfWeek   = new Date().getDay();
  const lastReset   = stats.weekly_reset_date;
  const isNewWeek   = dayOfWeek === 1 && lastReset !== today;
  const weekHours   = isNewWeek ? hours : (stats.study_hours_this_week || 0) + hours;

  const updates = {
    study_hours_total:     (stats.study_hours_total || 0) + hours,
    study_hours_this_week: weekHours,
    updated_at:            new Date().toISOString(),
    ...(isNewWeek ? { weekly_reset_date: today } : {})
  };

  await client.from('user_stats').update(updates).eq('id', userId);
  _statsCache = { ..._statsCache, ...updates };
  renderStats(_statsCache);
}

// ACTIVITY LOG  (localStorage — lightweight)
const DEFAULT_ACTIVITY = [
  { dot: 'green',  text: 'Completed lesson <strong>Policy Analysis Methods</strong> in Health Policy 101', ts: Date.now() - 7200000 },
  { dot: 'blue',   text: 'Started <strong>Advanced Calculus</strong> — Limits and Continuity',              ts: Date.now() - 86400000 },
  { dot: 'yellow', text: 'Deadline reminder: <strong>Policy Presentation</strong> due in 3 days',           ts: Date.now() - 90000000 },
  { dot: 'green',  text: 'Completed <strong>Shakespeare Deep Dive</strong> in English Literature',           ts: Date.now() - 172800000 },
  { dot: 'white',  text: 'Enrolled in <strong>Biology: Cell &amp; Genetics</strong>',                       ts: Date.now() - 259200000 }
];

function getActivity() {
  try {
    const stored = JSON.parse(localStorage.getItem('uplift_activity_log'));
    return stored?.length ? stored : DEFAULT_ACTIVITY;
  } catch { return DEFAULT_ACTIVITY; }
}

function logActivity(dot, text) {
  const log = getActivity();
  log.unshift({ dot, text, ts: Date.now() });
  localStorage.setItem('uplift_activity_log', JSON.stringify(log.slice(0, 20)));
  renderActivity();
}

function timeAgoFromTs(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)     return 'Just now';
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return 'Yesterday';
  return `${Math.floor(s / 86400)} days ago`;
}

// RENDER FUNCTIONS
function renderStats(stats, streak) {
  // Accept either a stats object + streak, or fall back to cache
  const s  = stats || _statsCache || {};
  const sk = streak !== undefined ? streak : (s.streak || 0);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('statCourses',         s.courses_enrolled      ?? 5);
  set('statCompleted',       s.lessons_completed     ?? 0);
  set('statStudyHours',      Math.round((s.study_hours_total || 0) * 10) / 10);
  set('statStreak',          sk);
  set('statStreakChange',    sk > 1 ? `${sk} days in a row 🔥` : 'Start your streak today!');
  set('statStudyHoursChange', `+${Math.round((s.study_hours_this_week || 0) * 10) / 10}h this week`);
}

function renderActivity() {
  const list = document.getElementById('activityList');
  if (!list) return;
  const items = getActivity();
  list.innerHTML = items.slice(0, 8).map(item => `
    <div class="activity-item">
      <div class="activity-dot ${item.dot}"></div>
      <div class="activity-text">${item.text}</div>
      <div class="activity-time">${item.ts ? timeAgoFromTs(item.ts) : item.time}</div>
    </div>`).join('');
}

// NOTIFICATIONS
async function loadNotifications(userId) {
  const { data } = await client
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!data) return;

  const unread = data.filter(n => !n.is_read).length;
  const badge  = document.getElementById('notifBadge');
  if (badge) badge.classList.toggle('active', unread > 0);

  const list = document.getElementById('notifList');
  if (!list) return;

  if (!data.length) {
    list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
    return;
  }

  list.innerHTML = data.map(n => `
    <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markRead('${n.id}')">
      <div class="notif-dot"></div>
      <div>
        <div class="notif-msg">${n.message}</div>
        <div class="notif-time">${timeAgoSupabase(n.created_at)}</div>
      </div>
    </div>`).join('');
}

async function markRead(id) {
  await client.from('notifications').update({ is_read: true }).eq('id', id);
  const { data: { user } } = await client.auth.getUser();
  if (user) loadNotifications(user.id);
}

function timeAgoSupabase(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// AVATAR / IDENTITY
function applyAvatar(src) {
  const style = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
  const img   = `<img src="${src}" style="${style}" onerror="this.parentElement.textContent=window._userInitial||'U'">`;
  const ids   = ['userAvatar', 'userDropdownAvatar'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = img; });
}

function applyIdentity(name, email, avatarUrl) {
  window._userInitial = name.charAt(0).toUpperCase();
  const initial = window._userInitial;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('usernameDisplay',   name);
  set('userDropdownName',  name);
  set('userDropdownEmail', email);
  set('welcomeTitle',      `Welcome back, ${name}! ( ˶ˆᗜˆ˵ )`);

  // Avatars — set initial first, then image if available
  ['userAvatar', 'userDropdownAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = initial;
  });

  if (avatarUrl) applyAvatar(avatarUrl);
}

// COURSE CONTINUE TRACKING
function handleContinueCourse(userId, courseName, dot) {
  logActivity(dot || 'green', `Continued <strong>${courseName}</strong>`);
  addStudyTime(userId, 0.5); // count 30 min of study per click
}

// SMOOTH SCROLL
function smoothScroll(id, e) {
  if (e) e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// LOGOUT
async function handleLogout(e) {
  e.preventDefault();
  await client.auth.signOut();
  localStorage.removeItem('username');
  window.location.href = 'index.html';
}

// MAIN INIT
window.addEventListener('DOMContentLoaded', async () => {

  // ── Auth guard ──
  const { data: { user } } = await client.auth.getUser();
  if (!user || !user.email_confirmed_at) {
    window.location.href = 'index.html';
    return;
  }

  // ── Identity ──
  const storedName = localStorage.getItem('username');
  let username = (storedName && !storedName.includes('@'))
    ? storedName
    : user.email.split('@')[0];

  applyIdentity(username, user.email, null);

  // ── Fetch profile ──
  const { data: profile } = await client
    .from('profiles')
    .select('avatar_url, username')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.username) {
    username = profile.username;
    localStorage.setItem('username', username);
  }
  applyIdentity(username, user.email, profile?.avatar_url || null);

  // ── Stats & streak (Supabase) ──
  const stats  = await loadOrCreateStats(user.id);
  const streak = await syncStreak(user.id);
  renderStats(stats, streak);
  renderActivity();

  // ── Notifications ──
  await loadNotifications(user.id);

  // Realtime notifications
  client
    .channel('dashboard-notifs')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${user.id}`
    }, () => loadNotifications(user.id))
    .subscribe();

  // ── Nav events ──
  setupNavEvents(user.id);

  // ── Course continue buttons ──
  document.querySelectorAll('.course-continue-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row      = btn.closest('.course-row');
      const name     = row?.querySelector('.course-name')?.textContent || 'a course';
      const dotColor = row?.dataset.dot || 'green';
      handleContinueCourse(user.id, name, dotColor);
      // Visual feedback
      btn.textContent = 'Continued ✓';
      btn.style.background   = 'var(--success)';
      btn.style.color        = 'var(--bg-primary)';
      btn.style.borderColor  = 'var(--success)';
      setTimeout(() => {
        btn.textContent      = 'Continue';
        btn.style.background = '';
        btn.style.color      = '';
        btn.style.borderColor = '';
      }, 2000);
    });
  });

  // Refresh activity timestamps every minute
  setInterval(renderActivity, 60000);
});

// NAV EVENTS
function setupNavEvents(userId) {
  // Sidebar toggle
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('mainContent');
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
      main.classList.toggle('sidebar-collapsed');
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    if (
      window.innerWidth <= 768 &&
      sidebar?.classList.contains('mobile-open') &&
      !sidebar.contains(e.target) &&
      e.target !== document.getElementById('menuToggle')
    ) {
      sidebar.classList.remove('mobile-open');
    }
    if (!e.target.closest('.notification-wrapper')) {
      document.getElementById('notifDropdown')?.classList.remove('open');
    }
    if (!e.target.closest('.user-menu-wrapper')) {
      document.getElementById('userDropdown')?.classList.remove('open');
    }
  });

  document.getElementById('notifBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('notifDropdown')?.classList.toggle('open');
    document.getElementById('userDropdown')?.classList.remove('open');
  });

  document.getElementById('notifDropdown')?.addEventListener('click', e => e.stopPropagation());

  document.getElementById('userMenuBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userDropdown')?.classList.toggle('open');
    document.getElementById('notifDropdown')?.classList.remove('open');
  });

  document.getElementById('userDropdown')?.addEventListener('click', e => e.stopPropagation());

  document.getElementById('markAllRead')?.addEventListener('click', async () => {
    await client.from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    loadNotifications(userId);
  });
}

  /* lottie animations */
  (function () {
    const container = document.getElementById('welcomeLottie');
    if (!container || typeof lottie === 'undefined') return;

    lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop:     true,
      autoplay: true,
      path: 'https://assets10.lottiefiles.com/packages/lf20_fcfjwiyb.json'
    });
  })();
