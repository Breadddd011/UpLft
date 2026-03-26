const { createClient } = supabase;
const client = createClient(
  'https://tiyapgnehlwbhhzqqumq.supabase.co',
  'sb_publishable_TshJnLexCo4FrHe_YJ8l7g_QcxA_kaV'
);

let listView = false;

window.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await client.auth.getUser();
  if (!user || !user.email_confirmed_at) {
    window.location.href = 'index.html';
    return;
  }

  const storedName = localStorage.getItem('username');
  const username = (storedName && !storedName.includes('@'))
    ? storedName
    : user.email.split('@')[0];

  document.getElementById('usernameDisplay').textContent = username;
  document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
  document.getElementById('userDropdownName').textContent = username;
  document.getElementById('userDropdownEmail').textContent = user.email;
  document.getElementById('userDropdownAvatar').textContent = username.charAt(0).toUpperCase();

  const { data: profile } = await client
    .from('profiles')
    .select('avatar_url, username')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.username) {
    const n = profile.username;
    document.getElementById('usernameDisplay').textContent = n;
    document.getElementById('userDropdownName').textContent = n;
  }

  if (profile?.avatar_url) applyAvatar(profile.avatar_url);

  await loadNotifications(user.id);

  client
    .channel('courses-notifs')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`
    }, () => loadNotifications(user.id))
    .subscribe();

  // filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filterCourses(tab.dataset.filter);
    });
  });

  // search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchCourses(e.target.value);
  });

  // sidebar toggle
  document.getElementById('menuToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
      main.classList.toggle('sidebar-collapsed');
    }
  });

  // mark all read
  document.getElementById('markAllRead').addEventListener('click', async () => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    await client.from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    loadNotifications(user.id);
  });

  // dropdowns
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
    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains('mobile-open') &&
      !sidebar.contains(e.target) &&
      e.target !== document.getElementById('menuToggle')
    ) {
      sidebar.classList.remove('mobile-open');
    }
    if (!e.target.closest('.notification-wrapper')) {
      document.getElementById('notifDropdown').classList.remove('open');
    }
    if (!e.target.closest('.user-menu-wrapper')) {
      document.getElementById('userDropdown').classList.remove('open');
    }
  });
});

function applyAvatar(src) {
  const s = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
  document.getElementById('userAvatar').innerHTML = `<img src="${src}" style="${s}">`;
  document.getElementById('userDropdownAvatar').innerHTML = `<img src="${src}" style="${s}">`;
}

function toggleView() {
  listView = !listView;
  const grid = document.getElementById('coursesGrid');
  const list = document.getElementById('coursesList');
  const btn = document.querySelector('.filter-actions .btn-outline');

  if (listView) {
    grid.style.display = 'none';
    list.classList.add('active');
    btn.textContent = '⊞ Grid View';
  } else {
    grid.style.display = 'grid';
    list.classList.remove('active');
    btn.textContent = '☰ List View';
  }
}

function filterCourses(filter) {
  const cards = document.querySelectorAll('.course-card');
  const listItems = document.querySelectorAll('.course-list-item');

  cards.forEach(card => {
    card.style.display = (filter === 'all' || card.dataset.status === filter) ? 'flex' : 'none';
  });

  listItems.forEach(item => {
    item.style.display = (filter === 'all' || item.dataset.status === filter) ? 'flex' : 'none';
  });
}

function searchCourses(query) {
  const cards = document.querySelectorAll('.course-card');
  const listItems = document.querySelectorAll('.course-list-item');
  const lowerQuery = query.toLowerCase();

  cards.forEach(card => {
    const title = card.querySelector('.course-title').textContent.toLowerCase();
    const category = card.querySelector('.course-category').textContent.toLowerCase();
    card.style.display = (title.includes(lowerQuery) || category.includes(lowerQuery)) ? 'flex' : 'none';
  });

  listItems.forEach(item => {
    const title = item.querySelector('.course-list-title').textContent.toLowerCase();
    const meta = item.querySelector('.course-list-meta').textContent.toLowerCase();
    item.style.display = (title.includes(lowerQuery) || meta.includes(lowerQuery)) ? 'flex' : 'none';
  });
}

async function loadNotifications(userId) {
  const { data } = await client
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!data) return;

  const unread = data.filter(n => !n.is_read).length;
  document.getElementById('notifBadge').classList.toggle('active', unread > 0);

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