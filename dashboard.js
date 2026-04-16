// (╬▔皿▔)╯
const { createClient } = supabase;
const client = createClient(
  'https://tiyapgnehlwbhhzqqumq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpeWFwZ25laGx3YmhoenFxdW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzExMTYsImV4cCI6MjA4NzMwNzExNn0.Y4VgYUS6XDh_XYKPc1wi2TcFi3s5KKglo6ouNdriwRg'
);

// DATA SERVICE
const DataService = {
  user: null,

  async init() {
    const { data: { user } } = await client.auth.getUser();
    this.user = user;
    return user;
  },

  async getCourses() {
    if (!this.user) await this.init();
    const { data, error } = await client
      .from('custom_courses')
      .select('*')
      .eq('user_id', this.user.id)
      .order('last_opened', { ascending: false, nulls: 'last' });
    if (error) { console.error('getCourses error:', error); return []; }
    return data || [];
  },

  async getStreak() {
    if (!this.user) await this.init();
    const { data, error } = await client
      .from('streak')
      .select('*')
      .eq('user_id', this.user.id)
      .maybeSingle();
    if (error) { console.error('getStreak error:', error); return { current: 0, longest: 0 }; }
    return data || {current: 0, Longest: 0};
  },

  async getDeadlines() {
    if (!this.user) await this.init();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from('deadlines')
      .select('*')
      .eq('user_id', this.user.id)
      .gte('due_date', now)
      .order('due_date', { ascending: true })
      .limit(10);
    if (error) { console.error('getDeadlines error:', error); return []; }
    return data || [];
  },

  async getActivities(limit = 8) {
    if (!this.user) await this.init();
    const { data, error } = await client
      .from('activities')
      .select('*')
      .eq('user_id', this.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('getActivities error:', error); return []; }
    return data || [];
  },

  async logActivity(type, message, courseId = null) {
    if (!this.user) await this.init();
    const { error } = await client.from('activities').insert({
      user_id: this.user.id,
      course_id: courseId,
      type,
      message,
      metadata: {},
      created_at: new Date().toISOString()
    });
    if (error) console.warn('logActivity error:', error);
  },

  async updateProgress(courseId, newProgress) {
    if (!this.user) await this.init();
    const { error } = await client
      .from('custom_courses')
      .update({
        progress: Math.min(100, newProgress),
        last_opened: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId);
    if (error) throw error;
  }
};

// RENDERERS
const Renderers = {

  async courses() {
    const courses = await DataService.getCourses();
    const container = document.querySelector('.courses-list');
    if (!container) return;

    const EMOJIS = {
      STEM: '🔬', ABM: '💼', HUMSS: '📚',
      GAS: '📖', TVL: '🔧', Other: '📁'
    };

    if (!courses.length) {
      container.innerHTML = `
        <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;">
          <div style="font-size:32px;margin-bottom:8px;">📂</div>
          No courses yet.
          <a href="mycourses.html" style="color:var(--accent);text-decoration:underline;">
            Upload your first one →
          </a>
        </div>`;
      return;
    }

    // Sort: in-progress first, then not started, then completed
    courses.sort((a, b) => {
      const score = p => p === 100 ? 0 : p > 0 ? 2 : 1;
      return score(b.progress) - score(a.progress) ||
             new Date(b.last_opened) - new Date(a.last_opened);
    });

    // FIXED: c.name → c.title (matches DB column)
    container.innerHTML = courses.slice(0, 4).map(c => {
      const pct = c.progress || 0;
      const done = pct === 100;
      return `
        <div class="course-row" data-id="${c.id}">
          <div class="course-thumb" style="background:${this.thumbColor(c.id)}">
            ${EMOJIS[c.category] || '📁'}
          </div>
          <div class="course-info">
            <div class="course-name">${this.esc(c.title)}</div>
            <div class="course-sub">${c.category} · ${c.metadata?.pages || '?'} pages</div>
          </div>
          <div class="course-progress-wrap">
            <div class="progress-bar">
              <div class="progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="progress-pct">${pct}%</div>
          </div>
          <button class="course-continue-btn"
                  onclick="handleContinue('${c.id}', '${this.esc(c.title)}')"
                  ${done ? 'disabled style="opacity:0.5"' : ''}>
            ${done ? '✓ Done' : pct > 0 ? 'Continue' : 'Start'}
          </button>
        </div>`;
    }).join('');

    // Update stat card
    const statEl = document.querySelector('.stat-card.courses .stat-number');
    if (statEl) statEl.textContent = courses.length;

    this.subjectProgress(courses);
  },

  async deadlines() {
    const deadlines = await DataService.getDeadlines();
    const container = document.querySelector('.deadlines-list');
    if (!container) return;

    const months = ['Jan','Feb','Mar','Apr','May','Jun',
                    'Jul','Aug','Sep','Oct','Nov','Dec'];

    const getPriority = date => {
      const days = Math.ceil((new Date(date) - new Date()) / 86400000);
      if (days <= 2) return 'urgent';
      if (days <= 7) return 'soon';
      return 'normal';
    };

    if (!deadlines.length) {
      container.innerHTML = `
        <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">
          No upcoming deadlines.
          <a href="deadline.html" style="color:var(--accent);text-decoration:underline;">Add one →</a>
        </div>`;
      return;
    }

    container.innerHTML = deadlines.map(d => {
      const date = new Date(d.due_date);
      const priority = getPriority(d.due_date);
      return `
        <div class="deadline-row">
          <div class="deadline-date">
            <div class="deadline-day">${date.getDate()}</div>
            <div class="deadline-month">${months[date.getMonth()]}</div>
          </div>
          <div class="deadline-info">
            <div class="deadline-title">${this.esc(d.title)}</div>
            <div class="deadline-desc">${this.esc(d.description || '')}</div>
          </div>
          <span class="deadline-tag ${priority}">${priority}</span>
        </div>`;
    }).join('');
  },

  async activities() {
    const activities = await DataService.getActivities();
    const container = document.querySelector('.activity-list');
    if (!container) return;

    const dotColors = {
      lesson_completed: 'green',
      course_started: 'blue',
      deadline_reminder: 'yellow',
      enrolled: 'white',
      deadline_created: 'yellow',
      completed: 'green'
    };

    const timeAgo = date => {
      const s = Math.floor((Date.now() - new Date(date)) / 1000);
      if (s < 60) return 'Just now';
      if (s < 3600) return `${Math.floor(s/60)}m ago`;
      if (s < 86400) return `${Math.floor(s/3600)}h ago`;
      if (s < 172800) return 'Yesterday';
      return `${Math.floor(s/86400)} days ago`;
    };

    if (!activities.length) {
      container.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">No activity yet.</div>`;
      return;
    }

    container.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-dot ${dotColors[a.type] || 'white'}"></div>
        <div class="activity-text">${a.message}</div>
        <div class="activity-time">${timeAgo(a.created_at)}</div>
      </div>`).join('');
  },

  subjectProgress(courses) {
    const container = document.querySelector('.subjects-list');
    if (!container) return;

    const groups = {};
    courses.forEach(c => {
      const cat = c.category || 'Other';
      if (!groups[cat]) groups[cat] = { total: 0, count: 0 };
      groups[cat].total += c.progress || 0;
      groups[cat].count++;
    });

    const colors = {
      STEM: '#3b82f6', ABM: '#f59e0b', HUMSS: '#a855f7',
      GAS: '#22c55e', TVL: '#ef4444', Other: '#71717a'
    };

    const entries = Object.entries(groups)
      .map(([cat, { total, count }]) => ({
        cat,
        avg: Math.round(total / count),
        color: colors[cat] || '#71717a'
      }))
      .sort((a, b) => b.avg - a.avg);

    if (!entries.length) {
      container.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">No data yet.</div>`;
      return;
    }

    container.innerHTML = entries.map(e => `
      <div>
        <div class="subject-top">
          <span class="subject-name">${e.cat}</span>
          <span class="subject-pct">${e.avg}%</span>
        </div>
        <div class="subject-bar">
          <div class="subject-fill" style="width:${e.avg}%;background:${e.color};"></div>
        </div>
      </div>`).join('');
  },

  // Helpers
  thumbColor(id) {
    const colors = [
      'linear-gradient(135deg,#1a1a2e,#27272a)',
      'linear-gradient(135deg,#0a0a1a,#1a1a2e)',
      'linear-gradient(135deg,#1a0a0a,#2e1a1a)',
      'linear-gradient(135deg,#0a1a0a,#1a2e1a)',
      'linear-gradient(135deg,#0f0a1a,#1a0f2e)',
    ];
    const n = String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return colors[n % colors.length];
  },

  esc(str = '') {
    return String(str).replace(/[&<>"']/g, m =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );
  }
};

// ============================================================
// EVENT HANDLERS
// ============================================================
async function handleContinue(courseId, courseName) {
  await DataService.logActivity(
    'lesson_completed',
    `Continued studying <strong>${courseName}</strong>`,
    courseId
  );
  window.location.href = `course-view.html?id=${courseId}`;
}

// ============================================================
// NOTIFICATIONS
// ============================================================
async function loadNotifications(userId) {
  const { data } = await client
    .from('notifications').select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (!data) return;

  document.getElementById('notifBadge').classList.toggle('active', data.some(n => !n.is_read));
  const list = document.getElementById('notifList');
  if (!data.length) {
    list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
    return;
  }
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
  const { data: { user } } = await client.auth.getUser();
  if (user) loadNotifications(user.id);
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

// ============================================================
// REALTIME
// ============================================================
function setupRealtime(userId) {
  client
    .channel('dashboard-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_courses', filter: `user_id=eq.${userId}` },
      () => Renderers.courses())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deadlines', filter: `user_id=eq.${userId}` },
      () => Renderers.deadlines())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `user_id=eq.${userId}` },
      () => Renderers.activities())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => loadNotifications(userId))
    .subscribe();
}

// ============================================================
// NAV SETUP
// ============================================================
function setupNav() {
  document.getElementById('menuToggle').addEventListener('click', () => {
    const sb   = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');
    if (window.innerWidth <= 768) sb.classList.toggle('mobile-open');
    else { sb.classList.toggle('collapsed'); main.classList.toggle('sidebar-collapsed'); }
  });

  document.getElementById('markAllRead').addEventListener('click', async () => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    await client.from('notifications').update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false);
    loadNotifications(user.id);
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
    const sb = document.getElementById('sidebar');
    if (window.innerWidth <= 768 && sb.classList.contains('mobile-open')
      && !sb.contains(e.target) && e.target !== document.getElementById('menuToggle'))
      sb.classList.remove('mobile-open');
    if (!e.target.closest('.notification-wrapper'))
      document.getElementById('notifDropdown').classList.remove('open');
    if (!e.target.closest('.user-menu-wrapper'))
      document.getElementById('userDropdown').classList.remove('open');
  });
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
  // Auth guard
  const { data: { user } } = await client.auth.getUser();
  if (!user || !user.email_confirmed_at) {
    window.location.href = 'index.html';
    return;
  }

  await DataService.init();

  // Load profile for display name
  const storedName = localStorage.getItem('username');
  let username = (storedName && !storedName.includes('@'))
    ? storedName
    : user.email.split('@')[0];

  const { data: profile } = await client
    .from('profiles').select('avatar_url, username')
    .eq('id', user.id).maybeSingle();

  if (profile?.username) username = profile.username;

  // Set nav display
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('usernameDisplay',    username);
  setEl('userAvatar',         username.charAt(0).toUpperCase());
  setEl('userDropdownName',   username);
  setEl('userDropdownEmail',  user.email);
  setEl('userDropdownAvatar', username.charAt(0).toUpperCase());

  // Welcome title
  const welcomeEl = document.getElementById('welcomeTitle');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${username}! ( ˶ˆᗜˆ˵ )`;

  // Avatar
  if (profile?.avatar_url) {
    const s = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
    ['userAvatar','userDropdownAvatar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<img src="${profile.avatar_url}" style="${s}">`;
    });
  }

    // Lottie animation
  const container = document.getElementById('welcomeLottie');
  if (container && typeof lottie !== 'undefined') {
    lottie.loadAnimation({
      container, renderer: 'svg', loop: true, autoplay: true,
      path: 'https://assets10.lottiefiles.com/packages/lf20_fcfjwiyb.json'
    });
  }

  // Render all sections
  await Promise.all([
    Renderers.courses(),
    Renderers.deadlines(),
    Renderers.activities()
  ]);

  await loadNotifications(user.id);
  setupRealtime(user.id);
  setupNav();
});
