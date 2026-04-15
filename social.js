// ── Supabase Setup lol ──
const { createClient } = supabase;
const client = createClient(
  'https://tiyapgnehlwbhhzqqumq.supabase.co',
  'sb_publishable_TshJnLexCo4FrHe_YJ8l7g_QcxA_kaV'
);

// ── State ──
const state = {
  currentUser: {
    id: null,
    name: 'User',
    initials: 'U',
    email: '',
    avatar: null
  },
  currentPostId: null,
  posts: [],
  filters: { category: 'all', sortBy: 'recent', searchQuery: '' },
  likedPosts: new Set(),
  bookmarkedPosts: new Set()
};

// ── Auth & Profile Sync ──
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Auth guard
    const { data: { user } } = await client.auth.getUser();
    if (!user || !user.email_confirmed_at) {
      window.location.href = 'index.html';
      return;
    }

    // Store user ID
    state.currentUser.id = user.id;

    // Resolve display name
    const storedName = localStorage.getItem('username');
    let username = (storedName && !storedName.includes('@'))
      ? storedName
      : user.email.split('@')[0];

    // Apply nav/dropdown identity
    applyUserIdentity(username, user.email, null);
    state.currentUser.name = username;
    state.currentUser.initials = username.charAt(0).toUpperCase();
    state.currentUser.email = user.email;

    // Fetch full profile from Supabase
    const { data: profile } = await client
      .from('profiles')
      .select('avatar_url, username')
      .eq('id', user.id)
      .maybeSingle();

    console.log('User profile:', profile);

    if (profile?.username) {
      username = profile.username;
      state.currentUser.name = username;
      state.currentUser.initials = username.charAt(0).toUpperCase();
      state.currentUser.avatar = profile.avatar_url || null;
      applyUserIdentity(username, user.email, profile.avatar_url || null);
    } else if (profile?.avatar_url) {
      state.currentUser.avatar = profile.avatar_url;
      applyUserIdentity(username, user.email, profile.avatar_url);
    }

    // Load interactions and posts AFTER profile is resolved
    await loadUserInteractions(user.id);
    await loadPosts();

    // Load notifications
    await loadNotifications(user.id);

    // Init UI
    setupNavEvents();
    app.init();

  } catch (err) {
    console.error('Initialization error:', err);
    toast.error('Error', 'Failed to initialize. Please refresh.');
  }
});

async function loadUserInteractions(userId) {
  try {
    // Load likes
    const { data: likes } = await client
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId);

    if (likes) {
      likes.forEach(like => state.likedPosts.add(like.post_id));
    }

    // Load bookmarks
    const { data: bookmarks } = await client
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', userId);

    if (bookmarks) {
      bookmarks.forEach(bm => state.bookmarkedPosts.add(bm.post_id));
    }
  } catch (err) {
    console.error('Error loading interactions:', err);
  }
}

async function loadPosts() {
  try {
    const { data: posts, error } = await client
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading posts:', error);
      toast.error('Error', 'Failed to load posts');
      return;
    }

    // Fetch profiles for all post authors in one query
    const userIds = [...new Set(posts.map(p => String(p.user_id)))];
    const { data: profiles } = await client
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [String(p.id), p]));

    state.posts = posts.map(post => {
      const profile = profileMap[String(post.user_id)];
      const authorName = profile?.username || 'User';
      const avatarUrl = profile?.avatar_url || null;

      return {
        id: post.id,
        author: authorName,
        avatar_url: avatarUrl,
        initials: authorName.charAt(0).toUpperCase(),
        content: post.content,
        category: post.category,
        timestamp: post.created_at,
        likes: post.likes || 0,
        bookmarks: post.bookmarks || 0,
        comments: [],
        commentCount: 0,
        liked: state.likedPosts.has(post.id),
        bookmarked: state.bookmarkedPosts.has(post.id),
        userId: post.user_id
      };
    });

    postManager.render();
    postManager.updateStats();
  } catch (err) {
    console.error('Error in loadPosts:', err);
    toast.error('Error', 'Failed to load posts');
  }
}

async function loadCommentsForPost(postId) {
  try {
    const { data: comments, error } = await client
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading comments:', error);
      return;
    }

    // Fetch profiles for all commenters in one query
    const userIds = [...new Set(comments.map(c => String(c.user_id)))];
    const { data: profiles } = await client
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [String(p.id), p]));

    const post = state.posts.find(p => p.id === postId);
    if (post) {
      post.comments = comments.map(c => {
        const profile = profileMap[String(c.user_id)];
        const username = profile?.username || 'User';
        return {
          id: c.id,
          author: username,
          initials: username.charAt(0).toUpperCase(),
          avatar_url: profile?.avatar_url || null,
          text: c.text,
          time: formatTime(c.created_at),
          likes: c.likes || 0,
          userId: c.user_id,
          timestamp: new Date(c.created_at).getTime()
        };
      });
    }
  } catch (err) {
    console.error('Error in loadCommentsForPost:', err);
  }
}

function applyUserIdentity(name, email, avatarUrl) {
  const avatarImgHtml = (src) =>
    `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;

  const elUserName = document.getElementById('usernameDisplay');
  if (elUserName) elUserName.textContent = name;

  const ddName = document.getElementById('userDropdownName');
  const ddEmail = document.getElementById('userDropdownEmail');
  if (ddName) ddName.textContent = name;
  if (ddEmail) ddEmail.textContent = email;

  const avatarEls = [
    document.getElementById('userAvatar'),
    document.getElementById('userDropdownAvatar'),
    document.getElementById('postUserAvatar'),
    document.getElementById('modalUserAvatar'),
    document.getElementById('commentUserAvatar')
  ];

  const initial = name.charAt(0).toUpperCase();
  avatarEls.forEach(el => {
    if (!el) return;
    el.innerHTML = avatarUrl ? avatarImgHtml(avatarUrl) : initial;
  });

  const modalName = document.getElementById('modalUserName');
  if (modalName) modalName.textContent = name;

  state.currentUser.initials = initial;
  state.currentUser.name = name;
  state.currentUser.avatar = avatarUrl;
}

// ── Notifications ──
async function loadNotifications(userId) {
  try {
    const { data } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!data) return;

    const unread = data.filter(n => !n.is_read).length;
    const badge = document.getElementById('notifBadge');
    if (badge) badge.classList.toggle('active', unread > 0);

    const list = document.getElementById('notifList');
    if (!list) return;

    if (!data.length) {
      list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
      return;
    }

    list.innerHTML = data.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')">
        <div class="notif-dot"></div>
        <div>
          <div class="notif-msg">${escapeHtml(n.message)}</div>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
      </div>`).join('');
  } catch (err) {
    console.error('Error loading notifications:', err);
  }
}

async function markNotifRead(id) {
  try {
    await client.from('notifications').update({ is_read: true }).eq('id', id);
    const { data: { user } } = await client.auth.getUser();
    if (user) loadNotifications(user.id);
  } catch (err) {
    console.error('Error marking notification read:', err);
  }
}

async function handleLogout(e) {
  e.preventDefault();
  await client.auth.signOut();
  localStorage.removeItem('username');
  window.location.href = 'index.html';
}

// ── Nav Events ──
function setupNavEvents() {
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
      main.classList.toggle('sidebar-collapsed');
    }
  });

  document.addEventListener('click', (e) => {
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
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    await client.from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    loadNotifications(user.id);
  });
}

// ── Utilities ──
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Toast ──
const toast = {
  show(title, message, type = 'info') {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Close">×</button>
    `;
    el.querySelector('.toast-close').addEventListener('click', () => this.remove(el));
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => this.remove(el), 4500);
  },
  remove(el) {
    el.classList.add('toast-exit');
    setTimeout(() => el.remove(), 300);
  },
  success(t, m) { this.show(t, m, 'success'); },
  error(t, m) { this.show(t, m, 'error'); },
  warning(t, m) { this.show(t, m, 'warning'); },
  info(t, m) { this.show(t, m, 'info'); }
};

// ── Post Manager ──
const postManager = {
  getFiltered() {
    let posts = [...state.posts];
    if (state.filters.category !== 'all') {
      posts = posts.filter(p => p.category === state.filters.category);
    }
    if (state.filters.searchQuery) {
      const q = state.filters.searchQuery.toLowerCase();
      posts = posts.filter(p =>
        p.content.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)
      );
    }
    if (state.filters.sortBy === 'popular') {
      posts.sort((a, b) => b.likes - a.likes);
    } else if (state.filters.sortBy === 'comments') {
      posts.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
    } else {
      posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    return posts;
  },

  render() {
    const feed = document.getElementById('postsFeed');
    const posts = this.getFiltered();
    if (!posts.length) {
      feed.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h3>No posts found</h3>
          <p>Be the first to share something with the community!</p>
        </div>`;
      return;
    }
    feed.innerHTML = posts.map(p => this.postHTML(p)).join('');
    this.bindEvents();
  },

  postHTML(post) {
    const catColors = {
      achievement: '#10b981', question: '#3b82f6',
      progress: '#8b5cf6', discussion: '#f59e0b', general: '#71717a'
    };
    const catLabels = {
      achievement: '🏆 Achievement', question: '❓ Question',
      progress: '📈 Progress', discussion: '💬 Discussion', general: '📌 General'
    };
    const c = catColors[post.category] || catColors.general;
    const isOwnPost = post.userId === state.currentUser.id;

    return `
      <article class="post" data-post-id="${post.id}">
        <div class="post-header">
          <div class="post-author">
            <div class="author-avatar" style="background:linear-gradient(135deg,${c}22,${c}44)">
              ${post.avatar_url
                ? `<img src="${post.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
                : post.initials}
            </div>
            <div class="author-details">
              <span class="author-name">${escapeHtml(post.author)}</span>
              <div class="post-meta">
                <span class="post-time">${formatTime(post.timestamp)}</span>
                <span class="separator">•</span>
                <span class="post-category-badge" style="background:${c}18;color:${c}">
                  ${catLabels[post.category] || catLabels.general}
                </span>
              </div>
            </div>
          </div>
          ${isOwnPost ? `<button class="post-menu-btn delete-post-btn" data-post-id="${post.id}" aria-label="Delete post">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>` : ''}
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-stats-bar">
          <div class="post-stat">♡ <span>${post.likes}</span> likes</div>
          <div class="post-stat">🗨 <span>${post.commentCount || post.comments.length}</span> comments</div>
          <div class="post-stat">⛉ <span>${post.bookmarks}</span> saved</div>
        </div>
        <div class="post-actions-bar">
          <button class="post-btn ${post.liked ? 'liked' : ''}" data-action="like" data-post-id="${post.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="${post.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            ${post.liked ? 'Liked' : 'Like'}
          </button>
          <button class="post-btn" data-action="comment" data-post-id="${post.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Comment
          </button>
          <button class="post-btn ${post.bookmarked ? 'bookmarked' : ''}" data-action="bookmark" data-post-id="${post.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="${post.bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            ${post.bookmarked ? 'Saved' : 'Save'}
          </button>
        </div>
      </article>`;
  },

  bindEvents() {
    document.querySelectorAll('[data-action="like"]').forEach(btn =>
      btn.addEventListener('click', () => this.toggleLike(btn.dataset.postId)));
    document.querySelectorAll('[data-action="comment"]').forEach(btn =>
      btn.addEventListener('click', () => this.openComments(btn.dataset.postId)));
    document.querySelectorAll('[data-action="bookmark"]').forEach(btn =>
      btn.addEventListener('click', () => this.toggleBookmark(btn.dataset.postId)));
    document.querySelectorAll('.delete-post-btn').forEach(btn =>
      btn.addEventListener('click', () => this.deletePost(btn.dataset.postId)));
  },

  async toggleLike(postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = state.likedPosts.has(postId);

    try {
      if (isLiked) {
        await client.from('post_likes').delete().eq('post_id', postId).eq('user_id', state.currentUser.id);
        state.likedPosts.delete(postId);
        post.liked = false;
        post.likes = Math.max(0, post.likes - 1);
        await client.from('posts').update({ likes: post.likes }).eq('id', postId);
      } else {
        await client.from('post_likes').insert({ post_id: postId, user_id: state.currentUser.id });
        state.likedPosts.add(postId);
        post.liked = true;
        post.likes++;
        await client.from('posts').update({ likes: post.likes }).eq('id', postId);
        toast.success('Post liked!', 'You liked this post');
      }
      this.render();
      this.updateStats();
    } catch (err) {
      console.error('Error toggling like:', err);
      toast.error('Error', 'Failed to like post');
    }
  },

  async toggleBookmark(postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    const isBookmarked = state.bookmarkedPosts.has(postId);

    try {
      if (isBookmarked) {
        await client.from('bookmarks').delete().eq('post_id', postId).eq('user_id', state.currentUser.id);
        state.bookmarkedPosts.delete(postId);
        post.bookmarked = false;
        post.bookmarks = Math.max(0, post.bookmarks - 1);
        await client.from('posts').update({ bookmarks: post.bookmarks }).eq('id', postId);
        toast.info('Bookmark removed', 'Post removed from your bookmarks');
      } else {
        await client.from('bookmarks').insert({ post_id: postId, user_id: state.currentUser.id });
        state.bookmarkedPosts.add(postId);
        post.bookmarked = true;
        post.bookmarks++;
        await client.from('posts').update({ bookmarks: post.bookmarks }).eq('id', postId);
        toast.success('Saved!', 'Post added to your bookmarks');
      }
      this.render();
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      toast.error('Error', 'Failed to bookmark post');
    }
  },

  async deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await client.from('posts').delete().eq('id', postId).eq('user_id', state.currentUser.id);
      state.posts = state.posts.filter(p => p.id !== postId);
      this.render();
      this.updateStats();
      toast.success('Post deleted', 'Your post has been removed');
    } catch (err) {
      console.error('Error deleting post:', err);
      toast.error('Error', 'Failed to delete post');
    }
  },

  async openComments(postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    state.currentPostId = postId;

    await loadCommentsForPost(postId);

    document.getElementById('originalPost').innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">
        <div class="comment-avatar" style="${post.avatar_url ? 'padding:0;overflow:hidden;' : ''}">
          ${post.avatar_url
            ? `<img src="${post.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
            : post.initials}
        </div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text-primary)">${escapeHtml(post.author)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${formatTime(post.timestamp)}</div>
        </div>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.6">${escapeHtml(post.content)}</div>`;

    this.renderComments(post);
    document.getElementById('commentsModal').classList.add('active');
    document.getElementById('commentInput')?.focus();
  },

  renderComments(post) {
    const list = document.getElementById('commentsList');
    if (!post.comments.length) {
      list.innerHTML = '<div class="empty-comments">No comments yet. Be the first to share your thoughts!</div>';
      return;
    }
    list.innerHTML = post.comments.map(c => `
      <div class="comment">
        <div class="comment-avatar" style="${c.avatar_url ? 'padding:0;overflow:hidden;' : ''}">
          ${c.avatar_url
            ? `<img src="${c.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
            : c.initials}
        </div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(c.author)}</span>
            <span class="comment-time">${c.time}</span>
          </div>
          <div class="comment-text">${escapeHtml(c.text)}</div>
        </div>
      </div>`).join('');
    list.scrollTop = list.scrollHeight;
  },

  async addComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text || !state.currentPostId) return;

    try {
      const { data: comment, error } = await client
        .from('comments')
        .insert({
          post_id: state.currentPostId,
          user_id: state.currentUser.id,
          text: text
        })
        .select()
        .single();

      if (error) throw error;

      const post = state.posts.find(p => p.id === state.currentPostId);
      if (post) {
        post.comments.push({
          id: comment.id,
          author: state.currentUser.name,
          initials: state.currentUser.initials,
          avatar_url: state.currentUser.avatar,  // ← uses real avatar
          text: comment.text,
          time: 'Just now',
          likes: 0,
          userId: state.currentUser.id,
          timestamp: Date.now()
        });
        post.commentCount = (post.commentCount || 0) + 1;
      }

      this.renderComments(post);
      this.render();
      input.value = '';
      toast.success('Comment added!', 'Your comment has been posted');
      this.updateStats();
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Error', 'Failed to add comment');
    }
  },

  async createPost() {
    const content = document.getElementById('postTextarea').value.trim();
    const category = document.getElementById('postCategory').value;

    if (!content) {
      toast.error('Error', 'Please write something first');
      return;
    }
    if (content.length < 10) {
      toast.warning('Too short', 'Post must be at least 10 characters');
      return;
    }

    try {
      const { data: post, error } = await client
        .from('posts')
        .insert({
          user_id: state.currentUser.id,
          content: content,
          category: category
        })
        .select()
        .single();

      if (error) throw error;

      const newPost = {
        id: post.id,
        author: state.currentUser.name,
        initials: state.currentUser.initials,
        avatar_url: state.currentUser.avatar,  // ← uses real avatar
        content: post.content,
        category: post.category,
        timestamp: post.created_at,
        likes: 0,
        bookmarks: 0,
        comments: [],
        commentCount: 0,
        liked: false,
        bookmarked: false,
        userId: post.user_id
      };

      state.posts.unshift(newPost);
      this.render();
      this.closePostModal();
      toast.success('Post created!', 'Your post has been shared with the community');
      this.updateStats();
    } catch (err) {
      console.error('Error creating post:', err);
      toast.error('Error', 'Failed to create post: ' + err.message);
    }
  },

  closePostModal() {
    document.getElementById('createPostModal').classList.remove('active');
    document.getElementById('postTextarea').value = '';
  },

  updateStats() {
    const userId = state.currentUser.id;
    const posts = state.posts.filter(p => p.userId === userId).length;
    const comments = state.posts.reduce((a, p) =>
      a + p.comments.filter(c => c.userId === userId).length, 0);
    const likes = state.posts
      .filter(p => p.userId === userId)
      .reduce((a, p) => a + p.likes, 0);

    const el = (id, val) => {
      const e = document.getElementById(id);
      if (e) e.textContent = val;
    };
    el('userPostsCount', posts);
    el('userCommentsCount', comments);
    el('userLikesCount', likes);
  }
};

// ── App Init ──
const app = {
  init() {
    this.setupEvents();
  },

  setupEvents() {
    // Open post modal
    document.getElementById('createPostCard')?.addEventListener('click', () => {
      document.getElementById('createPostModal').classList.add('active');
      document.getElementById('postTextarea')?.focus();
    });
    document.getElementById('shareUpdateBtn')?.addEventListener('click', () => {
      document.getElementById('createPostModal').classList.add('active');
      document.getElementById('postTextarea')?.focus();
    });

    // Close post modal
    document.getElementById('closePostModal')?.addEventListener('click', () => postManager.closePostModal());
    document.getElementById('cancelPost')?.addEventListener('click', () => postManager.closePostModal());
    document.getElementById('submitPost')?.addEventListener('click', () => postManager.createPost());

    // Textarea auto-resize
    document.getElementById('postTextarea')?.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 280) + 'px';
    });

    // Comments modal
    document.getElementById('closeCommentsModal')?.addEventListener('click', () => {
      document.getElementById('commentsModal').classList.remove('active');
      state.currentPostId = null;
    });
    document.getElementById('submitComment')?.addEventListener('click', () => postManager.addComment());
    document.getElementById('commentInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        postManager.addComment();
      }
    });

    // Filters
    document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      postManager.render();
    });
    document.getElementById('sortFilter')?.addEventListener('change', (e) => {
      state.filters.sortBy = e.target.value;
      postManager.render();
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          if (overlay.id === 'commentsModal') state.currentPostId = null;
        }
      });
    });

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('createPostModal')?.classList.remove('active');
        document.getElementById('commentsModal')?.classList.remove('active');
        state.currentPostId = null;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.getElementById('createPostModal')?.classList.contains('active')) {
          postManager.createPost();
        }
      }
    });
  }
};

// Expose for debugging
window.socialApp = { state, postManager, toast, client };
