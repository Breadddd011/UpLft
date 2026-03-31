const { createClient } = supabase;
const client = createClient(
  'https://tiyapgnehlwbhhzqqumq.supabase.co',
  'sb_publishable_TshJnLexCo4FrHe_YJ8l7g_QcxA_kaV'
);

/* video data */
const videosData = [
  { id: "DzBzWAOzdmo", title: "How to Study Consistently *Without* Burning Out",              category: "study-tips", url: "https://www.youtube.com/watch?v=DzBzWAOzdmo" },
  { id: "W65PKHuiZHY", title: "How to study even when you're EXHAUSTED",                      category: "study-tips", url: "https://www.youtube.com/watch?v=W65PKHuiZHY" },
  { id: "jMhhaAQK1NQ", title: "How I Study SMARTER, Not HARDER (10 Science-Based Tips)",      category: "study-tips", url: "https://www.youtube.com/watch?v=jMhhaAQK1NQ" },
  { id: "TjPFZaMe2yw", title: "3 tips on how to study effectively",                           category: "study-tips", url: "https://www.youtube.com/watch?v=TjPFZaMe2yw" },
  { id: "_f-qkGJBPts", title: "How to Learn Faster with the Feynman Technique (Example Included)", category: "explainers", url: "https://www.youtube.com/watch?v=_f-qkGJBPts" },
  { id: "tkm0TNFzIeg", title: "The Feynman Technique",                                        category: "explainers", url: "https://www.youtube.com/watch?v=tkm0TNFzIeg" },
  { id: "aQ_xKuXo0D0", title: "The Pomodoro Technique Explained",                             category: "explainers", url: "https://www.youtube.com/watch?v=aQ_xKuXo0D0" },
  { id: "z1BvrkPF2LE", title: "Beginner's Guide to The Pomodoro Technique",                   category: "explainers", url: "https://www.youtube.com/watch?v=z1BvrkPF2LE" },
  { id: "Lt54CX9DmS4", title: "How to Study for Exams - An Evidence-Based Masterclass",       category: "exam-prep",  url: "https://www.youtube.com/watch?v=Lt54CX9DmS4" },
  { id: "5wT0Py4yfkk", title: "Seriously, please watch this before your next exam",           category: "exam-prep",  url: "https://www.youtube.com/watch?v=5wT0Py4yfkk" },
  { id: "1OO8j3lz-i8", title: "Learn How To Ace Every Exam (in 6 minutes)",                  category: "exam-prep",  url: "https://www.youtube.com/watch?v=1OO8j3lz-i8" },
  { id: "BqKCWrueES0", title: "Preparing for an Exam",                                        category: "exam-prep",  url: "https://www.youtube.com/watch?v=BqKCWrueES0" },
  { id: "0QixN4ZFLx4", title: "The Ultimate Evidence Based Study Guide",                      category: "guides",     url: "https://www.youtube.com/watch?v=0QixN4ZFLx4" },
  { id: "njFFncLsX2w", title: "The ULTIMATE GUIDE to becoming an ACADEMIC WEAPON",            category: "guides",     url: "https://www.youtube.com/watch?v=njFFncLsX2w" },
  { id: "7wUJlEnXNAk", title: "Learn how to actually study before it's too late...",          category: "guides",     url: "https://www.youtube.com/watch?v=7wUJlEnXNAk" },
];

/* tab config */
const tabs = [
  { id: 'all',        label: 'All',        filter: 'all'        },
  { id: 'study-tips', label: 'Study Tips', filter: 'study-tips' },
  { id: 'explainers', label: 'Explainers', filter: 'explainers' },
  { id: 'exam-prep',  label: 'Exam Prep',  filter: 'exam-prep'  },
  { id: 'guides',     label: 'Guides',     filter: 'guides'     },
  { id: 'videos',     label: 'All Videos', filter: 'all'        },
];

const sectionTitles = {
  'all':        'Latest Videos',
  'study-tips': 'Study Tips Videos',
  'explainers': 'Explainers Videos',
  'exam-prep':  'Exam Prep Videos',
  'guides':     'Study Guides Videos',
  'videos':     'All Videos',
};

/* ── Init ── */
window.addEventListener('DOMContentLoaded', async () => {
  /* auth */
  const { data: { user } } = await client.auth.getUser();
  if (!user || !user.email_confirmed_at) {
    window.location.href = 'index.html';
    return;
  }

  /* nav user */
  const storedName = localStorage.getItem('username');
  const username   = (storedName && !storedName.includes('@'))
    ? storedName : user.email.split('@')[0];

  setEl('usernameDisplay',    username);
  setEl('userAvatar',         username.charAt(0).toUpperCase());
  setEl('userDropdownName',   username);
  setEl('userDropdownEmail',  user.email);
  setEl('userDropdownAvatar', username.charAt(0).toUpperCase());

  const { data: profile } = await client
    .from('profiles').select('avatar_url, username')
    .eq('id', user.id).maybeSingle();

  if (profile?.username) {
    setEl('usernameDisplay',  profile.username);
    setEl('userDropdownName', profile.username);
  }
  if (profile?.avatar_url) applyAvatar(profile.avatar_url);

  await loadNotifications(user.id);

  client.channel('blog-notifs')
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`user_id=eq.${user.id}` },
      () => loadNotifications(user.id))
    .subscribe();

  /* render */
  renderTabs();
  filterVideos('all');

  /* nav */
  setupNav();
});

/* tabs*/
function renderTabs() {
  const bar = document.getElementById('tabBar');
  bar.innerHTML = tabs.map(t => `
    <button class="tab-btn${t.id === 'all' ? ' tab-active' : ''}"
            id="tab-${t.id}"
            onclick="handleTabClick('${t.id}')">
      ${t.label}
    </button>`).join('');
}

function handleTabClick(tabId) {
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-${t.id}`);
    if (btn) btn.classList.toggle('tab-active', t.id === tabId);
  });
  const cfg = tabs.find(t => t.id === tabId);
  document.getElementById('sectionTitle').textContent = sectionTitles[tabId] || 'Latest Videos';
  filterVideos(cfg ? cfg.filter : 'all');
}

/* vids */
function filterVideos(filter) {
  const filtered = filter === 'all'
    ? videosData
    : videosData.filter(v => v.category === filter);
  renderVideos(filtered);
}

function renderVideos(list) {
  document.getElementById('resultCount').textContent = `${list.length} video${list.length !== 1 ? 's' : ''}`;
  document.getElementById('videosGrid').innerHTML = list.map(v => `
    <a href="${v.url}" target="_blank" class="video-card">
      <div class="video-thumb">
        <img src="https://img.youtube.com/vi/${v.id}/hqdefault.jpg" alt="${esc(v.title)}" loading="lazy">
        <div class="video-play-badge">▶ Watch</div>
      </div>
      <div class="video-body">
        <div class="video-title">${esc(v.title)}</div>
        <div class="video-footer">
          <span class="video-source">YouTube</span>
          <span class="video-watch">
            <span class="video-watch-dot"></span>
            Watch now
          </span>
        </div>
      </div>
    </a>`).join('');
}

/* article modal */
function showArticleModal() {
  document.getElementById('articleModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function hideArticleModal() {
  document.getElementById('articleModal').classList.remove('open');
  document.body.style.overflow = '';
}

/* close on backdrop click */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('articleModal').addEventListener('click', e => {
    if (e.target === document.getElementById('articleModal')) hideArticleModal();
  });
});

/* helpers*/
function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function applyAvatar(src) {
  const s = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
  ['userAvatar','userDropdownAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<img src="${src}" style="${s}">`;
  });
}

function esc(str='') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* notif */
async function loadNotifications(userId) {
  const { data } = await client.from('notifications').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (!data) return;

  document.getElementById('notifBadge').classList.toggle('active', data.some(n => !n.is_read));
  const list = document.getElementById('notifList');
  if (!data.length) { list.innerHTML = '<div class="notif-empty">No notifications yet</div>'; return; }
  list.innerHTML = data.map(n => `
    <div class="notif-item ${n.is_read?'read':'unread'}" onclick="markRead('${n.id}')">
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

/* nav setup */
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