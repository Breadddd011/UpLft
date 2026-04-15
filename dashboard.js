// ============================================
// UpLift Dashboard — Full Supabase Sync
// Uses custom_courses schema with PDF extraction
// ============================================

const { createClient } = supabase;
const client = createClient(
  'https://tiyapgnehlwbhhzqqumq.supabase.co',
  'sb_publishable_TshJnLexCo4FrHe_YJ8l7g_QcxA_kaV'
);

// ============================================
// PDF TEXT EXTRACTION MODULE
// ============================================

const PDFProcessor = {
  async extractText(file) {
    // Set worker from CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return {
      text: fullText,
      pages: pdf.numPages,
      preview: fullText.substring(0, 500) + '...',
      wordCount: fullText.split(/\s+/).filter(w => w.length > 0).length
    };
  }
};

// ============================================
// UNIFIED DATA SERVICE
// ============================================

const DataService = {
  user: null,
  statsCache: null,
  
  async init() {
    const { data: { user } } = await client.auth.getUser();
    this.user = user;
    return user;
  },

  // ── CUSTOM COURSES ─────────────────────────────────────────
  async getCourses() {
    if (!this.user) await this.init();
    
    const { data, error } = await client
      .from('custom_courses')
      .select('*')
      .eq('user_id', this.user.id)
      .order('last_opened', { ascending: false, nulls: 'last' });
    
    if (error) {
      console.error('getCourses error:', error);
      throw error;
    }
    return data || [];
  },

  async uploadCourse(file, title, category) {
    if (!this.user) await this.init();
    
    // 1. Extract text from PDF
    const extracted = await PDFProcessor.extractText(file);
    
    // 2. Determine file type
    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileType = ['pdf', 'ppt', 'pptx', 'png', 'jpg', 'jpeg'].includes(fileExt) 
      ? fileExt 
      : 'pdf';
    
    // 3. Upload file to Supabase Storage
    const filePath = `${this.user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await client.storage
      .from('course-materials')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = client.storage
      .from('course-materials')
      .getPublicUrl(filePath);
    
    // 4. Create course record
    const { data: course, error } = await client
      .from('custom_courses')
      .insert({
        user_id: this.user.id,
        title: title,
        description: null,
        category: category || 'Custom',
        file_url: publicUrl,
        file_type: fileType,
        file_name: file.name,
        file_size: file.size,
        extracted_text: extracted.text,
        progress: 0,
        status: 'active',
        metadata: {
          pages: extracted.pages,
          preview: extracted.preview,
          word_count: extracted.wordCount,
          generated: { quizzes: [], notes: null, flashcards: [] }
        },
        last_opened: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('uploadCourse error:', error);
      throw error;
    }
    
    // 5. Log activity
    await this.logActivity('enrolled', `Enrolled in <strong>${title}</strong>`, course.id);
    
    return course;
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
    
    if (newProgress >= 100) {
      const { data: course } = await client
        .from('custom_courses')
        .select('title')
        .eq('id', courseId)
        .single();
      await this.logActivity('completed', `Completed <strong>${course.title}</strong>`, courseId);
    }
  },

  // ── DEADLINES ───────────────────────────────────────
  async getDeadlines() {
    if (!this.user) await this.init();
    
    const now = new Date().toISOString();
    const { data, error } = await client
      .from('deadlines')
      .select('*, custom_courses(title)')
      .eq('user_id', this.user.id)
      .gte('due_date', now)
      .order('due_date', { ascending: true })
      .limit(10);
    
    if (error) throw error;
    return data || [];
  },

  async createDeadline({ title, description, dueDate, courseId, priority = 'normal' }) {
    if (!this.user) await this.init();
    
    const { data, error } = await client
      .from('deadlines')
      .insert({
        user_id: this.user.id,
        course_id: courseId,
        title,
        description,
        due_date: dueDate,
        priority,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    await this.logActivity('deadline_created', `Added deadline: <strong>${title}</strong>`, courseId);
    return data;
  },

  // ── ACTIVITIES ──────────────────────────────────────
  async getActivities(limit = 8) {
    if (!this.user) await this.init();
    
    const { data, error } = await client
      .from('activities')
      .select('*')
      .eq('user_id', this.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
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

  // ── STATS ───────────────────────────────────────────
  async loadOrCreateStats() {
    if (!this.user) await this.init();
    
    let { data } = await client
      .from('user_stats')
      .select('*')
      .eq('id', this.user.id)
      .maybeSingle();
    
    if (!data) {
      const { data: newRow } = await client
        .from('user_stats')
        .insert({ id: this.user.id })
        .select()
        .single();
      data = newRow;
    }
    this.statsCache = data;
    return data;
  },

  async syncStreak() {
    const stats = this.statsCache || await this.loadOrCreateStats();
    const today = new Date().toISOString().slice(0, 10);
    const last = stats.last_login_date;
    
    if (last === today) return stats.streak || 0;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);

    const newStreak = (last === yStr) ? (stats.streak || 0) + 1 : 1;
    const newLongest = Math.max(newStreak, stats.longest_streak || 0);
    const history = stats.login_history || [];
    const newHistory = [...new Set([...history, today])].slice(-365);

    await client.from('user_stats').update({
      streak: newStreak,
      longest_streak: newLongest,
      last_login_date: today,
      login_history: newHistory,
      updated_at: new Date().toISOString()
    }).eq('id', this.user.id);

    this.statsCache = { ...this.statsCache, streak: newStreak, longest_streak: newLongest,
                        last_login_date: today, login_history: newHistory };
    return newStreak;
  },

  async addStudyTime(hours) {
    const stats = this.statsCache || await this.loadOrCreateStats();
    const today = new Date().toISOString().slice(0, 10);
    const dayOfWeek = new Date().getDay();
    const isNewWeek = dayOfWeek === 1 && stats.weekly_reset_date !== today;
    const weekHours = isNewWeek ? hours : (stats.study_hours_this_week || 0) + hours;

    const updates = {
      study_hours_total: (stats.study_hours_total || 0) + hours,
      study_hours_this_week: weekHours,
      updated_at: new Date().toISOString(),
      ...(isNewWeek ? { weekly_reset_date: today } : {})
    };
    
    await client.from('user_stats').update(updates).eq('id', this.user.id);
    this.statsCache = { ...this.statsCache, ...updates };
  },

  // ── AI GENERATION ───────────────────────────────────
  async generateQuizzes(courseId, numQuestions = 5) {
    const { data: course } = await client
      .from('custom_courses')
      .select('extracted_text, title, metadata')
      .eq('id', courseId)
      .single();
    
    if (!course?.extracted_text) {
      throw new Error('No text extracted from this file. Upload a PDF first.');
    }
    
    return {
      prompt: `Generate ${numQuestions} multiple choice questions from this text:\n\n${course.extracted_text.substring(0, 3000)}`,
      context: course.extracted_text.substring(0, 5000),
      courseTitle: course.title
    };
  },

  async generateNotes(courseId) {
    const { data: course } = await client
      .from('custom_courses')
      .select('extracted_text, title')
      .eq('id', courseId)
      .single();
    
    if (!course?.extracted_text) throw new Error('No text extracted');
    
    return {
      prompt: `Create structured study notes from:\n\n${course.extracted_text.substring(0, 4000)}`,
      courseTitle: course.title
    };
  }
};

// ============================================
// RENDER FUNCTIONS
// ============================================

const Renderers = {
  async courses() {
    const courses = await DataService.getCourses();
    const container = document.getElementById('coursesList');
    if (!container) return;

    const EMOJIS = { 
      STEM: '🔬', ABM: '💼', HUMSS: '📚', 
      GAS: '📖', TVL: '🔧', Custom: '📁', Other: '📁',
      Health: '🏥', Mathematics: '📐', English: '📖', Science: '🧬'
    };

    if (!courses.length) {
      container.innerHTML = `
        <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;">
          <div style="font-size:32px;margin-bottom:8px;">📂</div>
          No courses yet. <a href="mycourses.html" style="color:var(--accent);text-decoration:underline;">
            Upload your first one →
          </a>
        </div>`;
      return;
    }

    // Sort: in-progress first
    courses.sort((a, b) => {
      const score = p => p === 100 ? 0 : p > 0 ? 2 : 1;
      return score(b.progress) - score(a.progress) || 
             new Date(b.last_opened || b.created_at) - new Date(a.last_opened || a.created_at);
    });

    container.innerHTML = courses.slice(0, 4).map(c => {
      const pct = c.progress || 0;
      const done = pct === 100;
      const icon = EMOJIS[c.category] || '📁';
      return `
        <div class="course-row" data-id="${c.id}">
          <div class="course-thumb" style="background:${this.thumbColor(c.id)}">
            ${icon}
          </div>
          <div class="course-info">
            <div class="course-name">${this.esc(c.title)}</div>
            <div class="course-sub">${c.category} • ${c.metadata?.pages || '?'} pages</div>
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

    // Update stat
    const statEl = document.getElementById('statCourses');
    if (statEl) statEl.textContent = courses.length;
    
    // Update subject progress
    this.subjectProgress(courses);
  },

  async deadlines() {
    const deadlines = await DataService.getDeadlines();
    const container = document.getElementById('deadlinesList');
    if (!container) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const getPriority = (date) => {
      const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
      if (days <= 2) return 'urgent';
      if (days <= 7) return 'soon';
      return 'normal';
    };

    if (!deadlines.length) {
      container.innerHTML = `
        <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">
          No upcoming deadlines. <a href="deadline.html" style="color:var(--accent);text-decoration:underline;">Add one →</a>
        </div>`;
      return;
    }

    container.innerHTML = deadlines.map(d => {
      const date = new Date(d.due_date);
      const priority = d.priority || getPriority(d.due_date);
      return `
        <div class="deadline-row">
          <div class="deadline-date">
            <div class="deadline-day">${date.getDate()}</div>
            <div class="deadline-month">${months[date.getMonth()]}</div>
          </div>
          <div class="deadline-info">
            <div class="deadline-title">${this.esc(d.title)}</div>
            <div class="deadline-desc">${this.esc(d.description || d.custom_courses?.title || '')}</div>
          </div>
          <span class="deadline-tag ${priority}">${priority}</span>
        </div>`;
    }).join('');
  },

  async activities() {
    const activities = await DataService.getActivities();
    const container = document.getElementById('activityList');
    if (!container) return;

    const dotColors = {
      enrolled: 'white',
      lesson_completed: 'green',
      course_started: 'blue',
      deadline_created: 'yellow',
      deadline_reminder: 'yellow',
      completed: 'green'
    };

    const timeAgo = (date) => {
      const s = Math.floor((Date.now() - new Date(date)) / 1000);
      if (s < 60) return 'Just now';
      if (s < 3600) return `${Math.floor(s/60)}m ago`;
      if (s < 86400) return `${Math.floor(s/3600)}h ago`;
      if (s < 172800) return 'Yesterday';
      return `${Math.floor(s/86400)} days ago`;
    };

    if (!activities.length) {
      container.innerHTML = `
        <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">
          No activity yet. Start studying!
        </div>`;
      return;
    }

    container.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-dot ${dotColors[a.type] || 'white'}"></div>
        <div class="activity-text">${a.message}</div>
        <div class="activity-time">${timeAgo(a.created_at)}</div>
      </div>
    `).join('');
  },

  subjectProgress(courses) {
    const container = document.getElementById('subjectsList');
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
      GAS: '#22c55e', TVL: '#ef4444', Custom: '#71717a',
      Health: '#22c55e', Mathematics: '#3b82f6', 
      English: '#a855f7', Science: '#10b981', Other: '#71717a'
    };

    const entries = Object.entries(groups)
      .map(([cat, { total, count }]) => ({
        cat,
        avg: Math.round(total / count),
        color: colors[cat] || '#71717a'
      }))
      .sort((a, b) => b.avg - a.avg);

    if (!entries.length) {
      container.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:13px;">No subjects yet</div>';
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
      </div>
    `).join('');
  },

  stats(stats, streak) {
    const s = stats || DataService.statsCache || {};
    const sk = streak !== undefined ? streak : (s.streak || 0);
    
    const set = (id, val) => { 
      const el = document.getElementById(id); 
      if (el) el.textContent = val; 
    };
    
    set('statCourses', s.courses_enrolled ?? '-');
    set('statCompleted', s.lessons_completed || 0);
    set('statStudyHours', Math.round((s.study_hours_total || 0) * 10) / 10);
    set('statStreak', sk);
    set('statStreakChange', sk > 1 ? `${sk} days in a row 🔥` : 'Start your streak today!');
    set('statStudyHoursChange', `+${Math.round((s.study_hours_this_week || 0) * 10) / 10}h this week`);
  },

  // Helpers
  thumbColor(id) {
    const colors = [
      'linear-gradient(135deg,#1a1a2e,#27272a)',
      'linear-gradient(135deg,#0a0a1a,#1a1a2e)',
      'linear-gradient(135deg,#1a0a0a,#2e1a1a)',
      'linear-gradient(135deg,#0a1a0a,#1a2e1a)',
      'linear-gradient(135deg,#0f0a1a,#1a0f2e)',
      'linear-gradient(135deg,#1a1a0a,#2a2a1a)',
    ];
    const n = String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return colors[n % colors.length];
  },

  esc(str = '') {
    return String(str).replace(/[&<>"']/g, m => 
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
    );
  }
};

// ============================================
// EVENT HANDLERS
// ============================================

async function handleContinue(courseId, courseTitle) {
  // Update progress
  const course = (await DataService.getCourses()).find(c => c.id === courseId);
  const newProgress = Math.min(100, (course?.progress || 0) + 10);
  
  await DataService.updateProgress(courseId, newProgress);
  await DataService.addStudyTime(0.5);
  await DataService.logActivity('lesson_completed', 
    `Continued studying <strong>${courseTitle}</strong>`, 
    courseId
  );
  
  // Navigate to course view
  window.location.href = `mycourses.html`;
}

async function handleLogout(e) {
  e.preventDefault();
  await client.auth.signOut();
  localStorage.removeItem('username');
  window.location.href = 'index.html';
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

function setupRealtime() {
  const channel = client.channel('dashboard-changes');
  
  channel
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'custom_courses',
      filter: `user_id=eq.${DataService.user.id}`
    }, () => Renderers.courses())
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'deadlines',
      filter: `user_id=eq.${DataService.user.id}`
    }, () => Renderers.deadlines())
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'activities',
      filter: `user_id=eq.${DataService.user.id}`
    }, () => Renderers.activities())
    .subscribe();
}

// ============================================
// NAV EVENTS
// ============================================

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
    if (window.innerWidth <= 768 && sidebar?.classList.contains('mobile-open') &&
        !sidebar.contains(e.target) && e.target !== document.getElementById('menuToggle')) {
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

  document.getElementById('userMenuBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userDropdown')?.classList.toggle('open');
    document.getElementById('notifDropdown')?.classList.remove('open');
  });

  document.getElementById('markAllRead')?.addEventListener('click', async () => {
    await client.from('notifications')
      .update({ is_read: true })
      .eq('user_id', DataService.user.id)
      .eq('is_read', false);
    loadNotifications();
  });
}

// ============================================
// NOTIFICATIONS
// ============================================

async function loadNotifications() {
  if (!DataService.user) return;
  
  const { data } = await client
    .from('notifications')
    .select('*')
    .eq('user_id', DataService.user.id)
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

  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  list.innerHTML = data.map(n => `
    <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markRead('${n.id}')">
      <div class="notif-dot"></div>
      <div>
        <div class="notif-msg">${n.message}</div>
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
    </div>
  `).join('');
}

async function markRead(id) {
  await client.from('notifications').update({ is_read: true }).eq('id', id);
  loadNotifications();
}

// ============================================
// AVATAR / IDENTITY
// ============================================

function applyAvatar(src) {
  const style = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
  const img = `<img src="${src}" style="${style}" onerror="this.parentElement.textContent=window._userInitial||'U'">`;
  ['userAvatar', 'userDropdownAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = img;
  });
}

function applyIdentity(name, email, avatarUrl) {
  window._userInitial = name.charAt(0).toUpperCase();
  const initial = window._userInitial;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('usernameDisplay', name);
  set('userDropdownName', name);
  set('userDropdownEmail', email);
  set('welcomeTitle', `Welcome back, ${name}! ( ˶ˆᗜˆ˵ )`);
  ['userAvatar', 'userDropdownAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = initial;
  });
  if (avatarUrl) applyAvatar(avatarUrl);
}

// ============================================
// MAIN INIT (FIXED)
// ============================================

window.addEventListener('DOMContentLoaded', async () => {
  console.log('Dashboard initializing...');

  // Auth guard
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    console.log('No user, redirecting to login');
    window.location.href = 'index.html';
    return;
  }

  console.log('User authenticated:', user.id);

  // Init DataService
  await DataService.init();
  console.log('DataService initialized');

  // Identity setup
  const storedName = localStorage.getItem('username');
  let username = (storedName && !storedName.includes('@')) 
    ? storedName 
    : user.email.split('@')[0];
  applyIdentity(username, user.email, null);

  // Fetch profile
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

  // Stats & streak
  const stats = await DataService.loadOrCreateStats();
  const streak = await DataService.syncStreak();
  Renderers.stats(stats, streak);

  // Initial render of all components
  console.log('Rendering initial data...');
  await Promise.all([
    Renderers.courses(),
    Renderers.deadlines(),
    Renderers.activities(),
    loadNotifications() // Load notifications immediately
  ]);

  // Setup realtime subscriptions
  console.log('Setting up realtime...');
  setupRealtime();
  setupNotificationsRealtime(); // Setup notifications realtime separately

  // Nav events
  setupNavEvents();

  // Lottie animation
  const container = document.getElementById('welcomeLottie');
  if (container && typeof lottie !== 'undefined') {
    lottie.loadAnimation({
      container, renderer: 'svg', loop: true, autoplay: true,
      path: 'https://assets10.lottiefiles.com/packages/lf20_fcfjwiyb.json'
    });
  }

  // Refresh timestamps every minute
  setInterval(() => {
    Renderers.activities();
    Renderers.deadlines();
  }, 60000);

  console.log('Dashboard initialization complete');
});
