const { createClient } = supabase;
  const client = createClient(
    'https://tiyapgnehlwbhhzqqumq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpeWFwZ25laGx3YmhoenFxdW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzExMTYsImV4cCI6MjA4NzMwNzExNn0.Y4VgYUS6XDh_XYKPc1wi2TcFi3s5KKglo6ouNdriwRg'
  );

  let currentUser = null;

  // Init 
  window.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await client.auth.getUser();
    if (!user || !user.email_confirmed_at) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = user;

    // Set email field
    document.getElementById('fieldEmail').value = user.email;
    document.getElementById('profileEmail').textContent = user.email;

    // Load profile
    const { data: profile } = await client
      .from('profiles')
      .select('username, avatar_url, bio')
      .eq('id', user.id)
      .maybeSingle();

    const name = profile?.username || user.email.split('@')[0];

    // Nav elements
    document.getElementById('usernameDisplay').textContent = name;
    document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('userDropdownName').textContent = name;
    document.getElementById('userDropdownEmail').textContent = user.email;
    document.getElementById('userDropdownAvatar').textContent = name.charAt(0).toUpperCase();

    // Profile card
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileAvatar').textContent = name.charAt(0).toUpperCase();

    // Form fields
    document.getElementById('fieldUsername').value = name;
    if (profile?.bio) document.getElementById('fieldBio').value = profile.bio;

    // Avatar
    if (profile?.avatar_url) applyAvatar(profile.avatar_url);

    await loadNotifications(user.id);

    client
      .channel('profile-notifs')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => loadNotifications(user.id))
      .subscribe();
  });

  // apply avatar everywhere
  function applyAvatar(src) {
    const s = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
    ['userAvatar','userDropdownAvatar','profileAvatar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<img src="${src}" style="${s}">`;
    });
  }

  // avatar upload
  document.getElementById('avatarInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('File too large', 'Please choose an image under 2MB.', 'error');
      return;
    }

    showToast('Uploading...', 'Please wait.', 'info');

    const ext = file.name.split('.').pop();
    const path = `${currentUser.id}/avatar.${ext}`;

    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      showToast('Upload failed', uploadError.message, 'error');
      return;
    }

    const { data: { publicUrl } } = client.storage
      .from('avatars')
      .getPublicUrl(path);

    const { error: updateError } = await client
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', currentUser.id);

    if (updateError) {
      showToast('Error saving avatar', updateError.message, 'error');
      return;
    }

    applyAvatar(publicUrl);
    showToast('Avatar updated!', 'Your profile picture has been changed.', 'success');
  });

  // save profiles
  async function saveProfile() {
    const btn = document.getElementById('saveProfileBtn');
    const username = document.getElementById('fieldUsername').value.trim();
    const bio = document.getElementById('fieldBio').value.trim();

    if (!username) {
      showToast('Name required', 'Please enter a display name.', 'error');
      return;
    }

    setLoading(btn, true);

    const { error } = await client
      .from('profiles')
      .upsert({ id: currentUser.id, username, bio, updated_at: new Date().toISOString() });

    setLoading(btn, false);

    if (error) {
      showToast('Error', error.message, 'error');
      return;
    }

    localStorage.setItem('username', username);
    document.getElementById('profileName').textContent = username;
    document.getElementById('usernameDisplay').textContent = username;
    document.getElementById('userDropdownName').textContent = username;

    showToast('Profile saved!', 'Your changes have been saved.', 'success');
  }

  // change password
  async function changePassword() {
    const btn = document.getElementById('changePassBtn');
    const newPass = document.getElementById('fieldNewPassword').value;
    const confirm = document.getElementById('fieldConfirmPassword').value;

    if (!newPass || newPass.length < 6) {
      showToast('Too short', 'Password must be at least 6 characters.', 'error');
      return;
    }

    if (newPass !== confirm) {
      showToast('Passwords don\'t match', 'Please make sure both fields are the same.', 'error');
      return;
    }

    setLoading(btn, true);

    const { error } = await client.auth.updateUser({ password: newPass });

    setLoading(btn, false);

    if (error) {
      showToast('Error', error.message, 'error');
      return;
    }

    document.getElementById('fieldNewPassword').value = '';
    document.getElementById('fieldConfirmPassword').value = '';
    showToast('Password updated!', 'Your password has been changed successfully.', 'success');
  }

  // delete acc❌
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    const btn = document.getElementById('confirmDeleteBtn');
    setLoading(btn, true);

    // delete the profile row first, then sign out
    await client.from('profiles').delete().eq('id', currentUser.id);
    await client.auth.signOut();
    localStorage.clear();
    window.location.href = 'index.html';
  });

  // notifs
  async function loadNotifications(userId) {
  const { data } = await client
    .from('notifications')
    .select('*')
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
    loadNotifications(currentUser.id);
  }

  document.getElementById('markAllRead').addEventListener('click', async () => {
    await client.from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);
    loadNotifications(currentUser.id);
  });

  function timeAgo(d) {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }

  // logout
  async function handleLogout(e) {
    e.preventDefault();
    await client.auth.signOut();
    localStorage.removeItem('username');
    window.location.href = 'index.html';
  }

  // toast(?)
  function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', info: 'i' };
    t.innerHTML = `
      <span class="toast-icon">${icons[type] || 'i'}</span>
      <div>
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  // loading state
  function setLoading(btn, on) {
    btn.disabled = on;
    btn.classList.toggle('loading', on);
  }

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

  document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains('mobile-open') &&
      !sidebar.contains(e.target) &&
      e.target !== document.getElementById('menuToggle')
    ) sidebar.classList.remove('mobile-open');

    if (!e.target.closest('.notification-wrapper'))
      document.getElementById('notifDropdown').classList.remove('open');
    if (!e.target.closest('.user-menu-wrapper'))
      document.getElementById('userDropdown').classList.remove('open');
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
