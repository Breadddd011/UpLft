/* ════════════════════════════════════════════════════
   UpLift — progress.js (FIXED)
   Fixes: element IDs now match progress.html exactly
          (overallProgress, coursesTotalCount, coursesActiveCount,
           coursesCompletedCount), correct API key,
          nav fully wired up
   ════════════════════════════════════════════════════ */

const { createClient } = supabase;
const client = createClient(
  'https://tiyapgnehlwbhhzqqumq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpeWFwZ25laGx3YmhoenFxdW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzExMTYsImV4cCI6MjA4NzMwNzExNn0.Y4VgYUS6XDh_XYKPc1wi2TcFi3s5KKglo6ouNdriwRg'
);

let db;
let currentUser = null;

// ── IndexedDB (written by mycourses.js) ──────────────────────
function initDB() {
  return new Promise((resolve, reject) => {
    // Must match the DB_NAME and DB_VERSION used in mycourses.js
    const req = indexedDB.open('UpLiftCourses', 3);
    req.onerror   = () => reject(req.error);
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('courses'))
        d.createObjectStore('courses', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('progress'))
        d.createObjectStore('progress', { keyPath: 'courseId' });
    };
  });
}

function dbGetAll(store) {
  return new Promise((res, rej) => {
    const tx  = db.transaction([store], 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  });
}

// ── Init ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  try { await initDB(); } catch (e) { console.error('DB init', e); }

  const { data: { user } } = await client.auth.getUser();
  if (!user || !user.email_confirmed_at) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = user;

  // Display name
  const storedName = localStorage.getItem('username');
  let username = (storedName && !storedName.includes('@'))
    ? storedName : user.email.split('@')[0];

  const { data: profile } = await client
    .from('profiles').select('avatar_url, username')
    .eq('id', user.id).maybeSingle();

  if (profile?.username) username = profile.username;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('usernameDisplay',    username);
  setEl('userAvatar',         username.charAt(0).toUpperCase());
  setEl('userDropdownName',   username);
  setEl('userDropdownEmail',  user.email);
  setEl('userDropdownAvatar', username.charAt(0).toUpperCase());

  if (profile?.avatar_url) applyAvatar(profile.avatar_url);

  await loadNotifications(user.id);
  await loadProgressData();
  setupNav();

  // Re-render if mycourses.js updates localStorage
  window.addEventListener('storage', e => {
    if (e.key === 'uplift_courses_progress') loadProgressData();
  });

  client.channel('progress-notifs')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${user.id}`
    }, () => loadNotifications(user.id))
    .subscribe();
});

function applyAvatar(src) {
  const s = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
  ['userAvatar','userDropdownAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<img src="${src}" style="${s}">`;
  });
}

// ── Load data ─────────────────────────────────────────────────
async function loadProgressData() {
  let courses = [], progressRecords = [];

  try {
    courses         = await dbGetAll('courses');
    progressRecords = await dbGetAll('progress');
  } catch (e) {
    const cached = localStorage.getItem('uplift_courses_progress');
    if (cached) { try { renderAll(JSON.parse(cached)); } catch (_) {} }
    else showNoCourses();
    return;
  }

  if (!courses.length) { showNoCourses(); return; }

  const progressMap = {};
  progressRecords.forEach(p => {
    progressMap[p.courseId] = new Set(p.completedPages || []);
  });

  const enriched = courses.map(c => {
    const done  = (progressMap[c.id] || new Set()).size;
    const total = c.pages?.length || 1;
    const pct   = Math.round((done / total) * 100);
    return { ...c, done, total, pct, status: pct === 100 ? 'completed' : 'active' };
  });

  renderAll(enriched);
}

function renderAll(enriched) {
  renderStats(enriched);
  renderCourseProgressList(enriched);
  renderMilestones(enriched);
  renderSkillRings(enriched);
  animateOverallProgress(enriched);
}

function showNoCourses() {
  const msg = `
    <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px;line-height:1.7;">
      No courses yet.<br>
      <a href="mycourses.html" style="color:var(--accent);font-weight:600;">Upload your first course →</a>
    </div>`;
  ['courseProgressList','milestonesList'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = msg;
  });
  const sg = document.getElementById('skillsGrid');
  if (sg) sg.innerHTML = '';
}

// ── Render stats ──────────────────────────────────────────────
// FIXED: IDs now match progress.html exactly
function renderStats(enriched) {
  const total     = enriched.length;
  const completed = enriched.filter(c => c.status === 'completed').length;
  const active    = total - completed;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('coursesTotalCount',     total);
  setEl('coursesActiveCount',    active);
  setEl('coursesCompletedCount', completed);
}

function animateOverallProgress(enriched) {
  const avg = enriched.length
    ? Math.round(enriched.reduce((s, c) => s + c.pct, 0) / enriched.length)
    : 0;

  const el = document.getElementById('overallProgress');
  if (!el) return;

  let cur = 0;
  const inc = avg / 25;
  const t = setInterval(() => {
    cur = Math.min(cur + inc, avg);
    el.textContent = Math.round(cur) + '%';
    if (cur >= avg) clearInterval(t);
  }, 40);
}

// ── Course progress list ──────────────────────────────────────
function renderCourseProgressList(enriched) {
  const list = document.getElementById('courseProgressList');
  if (!list) return;

  if (!enriched.length) {
    list.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;">No courses uploaded yet.</div>';
    return;
  }

  const colors = ['#d4d4d8','#a1a1aa','#71717a','#52525b','#3f3f46'];
  const grads  = [
    'linear-gradient(135deg,#1a1a2e,#27272a)',
    'linear-gradient(135deg,#0a0a1a,#1a1a2e)',
    'linear-gradient(135deg,#1a0a0a,#2e1a1a)',
    'linear-gradient(135deg,#0a1a0a,#1a2e1a)',
    'linear-gradient(135deg,#1a1a0a,#2a2a1a)'
  ];

  list.innerHTML = enriched.map((c, i) => `
    <div class="progress-item">
      <div class="progress-top">
        <div class="progress-info">
          <div class="progress-icon" style="background:${grads[i % grads.length]}">${fileIcon(c.fileType || c.fileName?.split('.').pop())}</div>
          <div>
            <div class="progress-title">${esc(c.name || c.title || 'Untitled')}</div>
            <div class="progress-sub">${c.done} of ${c.total} pages · ${esc(c.category || 'Other')}</div>
          </div>
        </div>
        <div class="progress-stats">
          <div class="progress-pct">${c.pct}%</div>
          <div class="progress-meta">${c.status === 'completed' ? '✓ Done' : `${c.total - c.done} remaining`}</div>
        </div>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-fill" style="width:${c.pct}%;background:linear-gradient(90deg,${colors[i % colors.length]},${colors[(i+1) % colors.length]});"></div>
      </div>
    </div>`).join('');
}

// ── Milestones ────────────────────────────────────────────────
function renderMilestones(enriched) {
  const total     = enriched.length;
  const completed = enriched.filter(c => c.status === 'completed').length;
  const pagesDone = enriched.reduce((s, c) => s + (c.done || 0), 0);

  const milestones = [
    { title: 'First Upload',      desc: 'Upload your first course material',     done: total >= 1 },
    { title: 'Getting Started',   desc: 'Complete at least one page',             done: pagesDone >= 1 },
    { title: 'Halfway There',     desc: 'Reach 50% progress in any course',       done: enriched.some(c => c.pct >= 50) },
    { title: 'Almost There',      desc: 'Reach 80% progress in any course',       done: enriched.some(c => c.pct >= 80) },
    { title: 'Scholar',           desc: 'Complete your first course',             done: completed >= 1 },
    { title: 'Course Collector',  desc: 'Upload 3 or more courses',               done: total >= 3 },
    { title: 'Power Learner',     desc: 'Complete 10 or more pages',              done: pagesDone >= 10 },
    { title: 'Expert',            desc: 'Complete 2 or more courses',             done: completed >= 2 },
  ];

  const list = document.getElementById('milestonesList');
  if (!list) return;

  list.innerHTML = milestones.map(m => `
    <div class="milestone-item ${m.done ? 'completed' : ''}">
      <div class="milestone-check">${m.done ? '✓' : '○'}</div>
      <div class="milestone-content">
        <div class="milestone-title">${m.title}</div>
        <div class="milestone-desc">${m.desc}</div>
      </div>
      <div class="milestone-date">${m.done ? 'Done ✓' : 'Locked'}</div>
    </div>`).join('');
}

// ── Skill rings ───────────────────────────────────────────────
function renderSkillRings(enriched) {
  const byCategory = {};
  enriched.forEach(c => {
    const cat = c.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = { totalPct: 0, count: 0 };
    byCategory[cat].totalPct += c.pct || 0;
    byCategory[cat].count++;
  });

  const circ   = 163.36;
  const entries = Object.entries(byCategory).slice(0, 6);
  const levelLabel = p => p >= 80 ? 'Advanced' : p >= 50 ? 'Intermediate' : p >= 20 ? 'Beginner' : 'Novice';

  const grid = document.getElementById('skillsGrid');
  if (!grid) return;

  if (!entries.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;padding:32px;text-align:center;color:var(--text-muted);font-size:13px;">Upload courses to see skill rings.</div>';
    return;
  }

  grid.innerHTML = entries.map(([cat, data]) => {
    const avg    = Math.round(data.totalPct / data.count);
    const offset = circ - (avg / 100) * circ;
    return `
      <div class="skill-card">
        <div class="skill-ring">
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle class="skill-ring-bg"   cx="30" cy="30" r="26"></circle>
            <circle class="skill-ring-fill" cx="30" cy="30" r="26"
              stroke-dasharray="${circ}" stroke-dashoffset="${offset}"></circle>
          </svg>
          <div class="skill-ring-text">${avg}%</div>
        </div>
        <div class="skill-name">${esc(cat)}</div>
        <div class="skill-level">${levelLabel(avg)}</div>
      </div>`;
  }).join('');
}

// ── Helpers ───────────────────────────────────────────────────
function fileIcon(ext) {
  const icons = { pdf:'📄', pptx:'📊', ppt:'📊', txt:'📝', doc:'📃', docx:'📃' };
  return icons[(ext || '').toLowerCase()] || '📎';
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Notifications ─────────────────────────────────────────────
async function loadNotifications(userId) {
  const { data } = await client
    .from('notifications').select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (!data) return;

  document.getElementById('notifBadge').classList.toggle('active', data.some(n => !n.is_read));
  const list = document.getElementById('notifList');
  if (!data.length) { list.innerHTML = '<div class="notif-empty">No notifications yet</div>'; return; }

  list.innerHTML = data.map(n => `
    <div class="notif-item ${n.is_read ? 'read' : 'unread'}" onclick="markRead('${n.id}')">
      <div class="notif-dot"></div>
      <div>
        <div class="notif-msg">${n.message}</div>
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
    </div>`).join('');
}

async function markRead(id) {
  await client.from('notifications').update({ is_read: true }).eq('id', id);
  loadNotifications(currentUser.id);
}

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

async function handleLogout(e) {
  e.preventDefault();
  await client.auth.signOut();
  localStorage.removeItem('username');
  window.location.href = 'index.html';
}

// ── Nav setup ─────────────────────────────────────────────────
function setupNav() {
  document.getElementById('menuToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('mainContent');
    if (window.innerWidth <= 768) sidebar.classList.toggle('mobile-open');
    else { sidebar.classList.toggle('collapsed'); main.classList.toggle('sidebar-collapsed'); }
  });

  document.getElementById('markAllRead').addEventListener('click', async () => {
    await client.from('notifications').update({ is_read: true })
      .eq('user_id', currentUser.id).eq('is_read', false);
    loadNotifications(currentUser.id);
  });

  document.getElementById('notifBtn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('notifDropdown').classList.toggle('open');
    document.getElementById('userDropdown').classList.remove('open');
  });
  document.getElementById('notifDropdown').addEventListener('click', e => e.stopPropagation());

  document.getElementById('userMenuBtn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('userDropdown').classList.toggle('open');
    document.getElementById('notifDropdown').classList.remove('open');
  });
  document.getElementById('userDropdown').addEventListener('click', e => e.stopPropagation());

  document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')
      && !sidebar.contains(e.target) && e.target !== document.getElementById('menuToggle'))
      sidebar.classList.remove('mobile-open');
    if (!e.target.closest('.notification-wrapper'))
      document.getElementById('notifDropdown').classList.remove('open');
    if (!e.target.closest('.user-menu-wrapper'))
      document.getElementById('userDropdown').classList.remove('open');
  });
}
