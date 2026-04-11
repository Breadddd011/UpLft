/* Most difficult file of the project */
const { createClient } = supabase;
const client = createClient(
  'https://tiyapgnehlwbhhzqqumq.supabase.co',
  'sb_publishable_TshJnLexCo4FrHe_YJ8l7g_QcxA_kaV'
);

/* ── State ── */
let listView = false;
let db = null;
let allCourses = [];
const STEM_COURSES = [  // in-memory cache
  {
    id: 'stem-1',
    name: "Earth Science 1",
    category: "STEM",
    desc: "Lecture module",
    fileName: "STEM Earth Science_1.pdf",
    builtIn: true,
    progress: 0,
    status: "active",
    createdAt: Date.now() - 100000
  },
  {
    id: 'stem-2',
    name: "General Biology 1",
    category: "STEM",
    desc: "Lecture module",
    fileName: "STEM General Biology_1.pdf",
    builtIn: true,
    progress: 0,
    status: "active",
    createdAt: Date.now() - 90000
  }
];         
let activeFilter = 'all';
let pendingDeleteId = null;

/* review state */
let reviewerCourseId = null;
let reviewerData = null;      // { summary, keyPoints, flashcards, quiz }
let currentCard = 0;
let quizAnswered = {};

/* ── IndexedDB ── */
const DB_NAME    = 'UpLiftCourses';
const DB_VERSION = 2;
const STORE      = 'courses';

function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { db = req.result; resolve(); };
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
}

function dbGetAll() {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = () => reject(req.error);
  });
}

function dbGet(id) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function dbPut(obj) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(obj);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function dbDelete(id) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/* ── Init ── */
window.addEventListener('DOMContentLoaded', async () => {
  await initDB();

  const { data: { user } } = await client.auth.getUser();
  if (!user || !user.email_confirmed_at) {
    window.location.href = 'index.html';
    return;
  }

  /* nav user info */
  const storedName = localStorage.getItem('username');
  const username   = (storedName && !storedName.includes('@'))
    ? storedName : user.email.split('@')[0];

  setEl('usernameDisplay',   username);
  setEl('userAvatar',        username.charAt(0).toUpperCase());
  setEl('userDropdownName',  username);
  setEl('userDropdownEmail', user.email);
  setEl('userDropdownAvatar',username.charAt(0).toUpperCase());

  const { data: profile } = await client
    .from('profiles').select('avatar_url, username')
    .eq('id', user.id).maybeSingle();

  if (profile?.username) {
    setEl('usernameDisplay',  profile.username);
    setEl('userDropdownName', profile.username);
  }
  if (profile?.avatar_url) applyAvatar(profile.avatar_url);

  await loadNotifications(user.id);

  client.channel('courses-notifs')
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`user_id=eq.${user.id}` },
      () => loadNotifications(user.id))
    .subscribe();

  /* load courses */
  await refreshCourses();

  /* filter tabs */
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      renderCourses();
    });
  });

  /* search */
  document.getElementById('searchInput').addEventListener('input', e => {
    renderCourses(e.target.value);
  });

  /* upload form */
  const fileInput = document.getElementById('courseFile');
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) document.getElementById('fileName').textContent = `✓ ${e.target.files[0].name}`;
  });

  /* drag & drop on label */
  const label = document.querySelector('.file-input-label');
  label.addEventListener('dragover',  e => { e.preventDefault(); label.style.borderColor = 'var(--accent)'; });
  label.addEventListener('dragleave', () => { label.style.borderColor = 'var(--border-light)'; });
  label.addEventListener('drop', e => {
    e.preventDefault();
    label.style.borderColor = 'var(--border-light)';
    if (e.dataTransfer.files[0]) {
      fileInput.files = e.dataTransfer.files;
      document.getElementById('fileName').textContent = `✓ ${e.dataTransfer.files[0].name}`;
    }
  });

  document.getElementById('uploadForm').addEventListener('submit', async e => {
    e.preventDefault();
    await handleUpload();
  });

  /* reviewer tab clicks */
  document.getElementById('reviewerTabs').addEventListener('click', e => {
    const tab = e.target.closest('.reviewer-tab');
    if (!tab) return;
    document.querySelectorAll('.reviewer-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderReviewerTab(tab.dataset.tab);
  });

  /* mark done */
  document.getElementById('reviewerMarkDoneBtn').addEventListener('click', () => {
    if (!reviewerCourseId) return;
    markCourseDone(reviewerCourseId);
  });

  /* delete confirm */
  document.getElementById('confirmDeleteCourseBtn').addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    await dbDelete(pendingDeleteId);
    await refreshCourses();
    closeDeleteConfirm();
    showToast('Deleted', 'Course removed.', 'success');
  });

  /* close modals on overlay click */
  document.getElementById('uploadModal').addEventListener('click', e => {
    if (e.target === document.getElementById('uploadModal')) closeUploadModal();
  });
  document.getElementById('reviewerModal').addEventListener('click', e => {
    if (e.target === document.getElementById('reviewerModal')) closeReviewer();
  });
  document.getElementById('deleteConfirm').addEventListener('click', e => {
    if (e.target === document.getElementById('deleteConfirm')) closeDeleteConfirm();
  });

  /* sidebar / nav dropdowns */
  setupNav();
});


document.addEventListener('click', (e) => {
  const notifDropdown = document.getElementById('notifDropdown');
  const userDropdown = document.getElementById('userDropdown');
  const notifBtn = document.getElementById('notifBtn');
  const userMenuBtn = document.getElementById('userMenuBtn');

  // Logic for Notification Dropdown
  if (notifBtn.contains(e.target)) {
    notifDropdown.classList.toggle('open');
    userDropdown.classList.remove('open');
  } 
  // Logic for User Dropdown
  else if (userMenuBtn.contains(e.target)) {
    userDropdown.classList.toggle('open');
    notifDropdown.classList.remove('open');
  } 
  // Close if clicking anywhere else
  else {
    if (!notifDropdown.contains(e.target)) notifDropdown.classList.remove('open');
    if (!userDropdown.contains(e.target)) userDropdown.classList.remove('open');
  }
});

// close the dropdown if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('.menu-btn')) {
    const dropdowns = document.getElementsByClassName("dropdown");
    for (let i = 0; i < dropdowns.length; i++) {
      dropdowns[i].style.display = "none";
    }
  }
}

/* ── Helpers ── */
function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function applyAvatar(src) {
  const s = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
  ['userAvatar','userDropdownAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<img src="${src}" style="${s}">`;
  });
}

function fileTypeInfo(name='') {
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    pdf:  { icon:'🗎', badge:'pdf',  label:'PDF'   },
    ppt:  { icon:'⎙', badge:'pptx', label:'PPT'   },
    pptx: { icon:'⿻', badge:'pptx', label:'PPTX'  },
    doc:  { icon:'🗁', badge:'docx', label:'Word'  },
    docx: { icon:'🗁', badge:'docx', label:'Word'  },
    txt:  { icon:'🗒', badge:'txt',  label:'Text'  },
    md:   { icon:'🗒', badge:'txt',  label:'MD'    },
  };
  return map[ext] || { icon:'📎', badge:'other', label: ext.toUpperCase() };
}

const CARD_COLORS = [
  'linear-gradient(135deg,#1a1a2e,#27272a)',
  'linear-gradient(135deg,#0a0a1a,#1a1a2e)',
  'linear-gradient(135deg,#1a0a0a,#2e1a1a)',
  'linear-gradient(135deg,#0a1a0a,#1a2e1a)',
  'linear-gradient(135deg,#0f0a1a,#1a0f2e)',
  'linear-gradient(135deg,#1a1a0a,#2a2a1a)',
];

/* FIX 4: handle both numeric and string IDs for colorFor */
function colorFor(id) {
  const index = typeof id === 'number'
    ? id
    : id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return CARD_COLORS[index % CARD_COLORS.length];
}

/* ── Load & Render ── */
async function refreshCourses() {
  const userCourses = await dbGetAll();

  allCourses = [
    ...STEM_COURSES,
    ...userCourses
  ].sort((a,b) => b.createdAt - a.createdAt);

  renderCourses();
}

function renderCourses(query = '') {
  const q = query.toLowerCase();
  let filtered = allCourses.filter(c => {
    if (activeFilter === 'active'    && c.status !== 'active')    return false;
    if (activeFilter === 'completed' && c.status !== 'completed') return false;
    if (q && !c.name.toLowerCase().includes(q) && !c.category.toLowerCase().includes(q)) return false;
    return true;
  });

  renderGrid(filtered);
  renderList(filtered);
}

function renderGrid(courses) {
  const grid = document.getElementById('coursesGrid');
  if (!courses.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🕮</div>
        <div class="empty-title">No courses yet</div>
        <div class="empty-desc">Upload your notes, PDFs, or slides to get started.</div>
        <button class="btn btn-primary" onclick="openUploadModal()">⬆ Upload Material</button>
      </div>`;
    return;
  }

  /* FIX 3: stringify id in onclick so string IDs like 'stem-1' are passed correctly */
  grid.innerHTML = courses.map(c => {
    const ft   = fileTypeInfo(c.fileName);
    const pct  = c.progress || 0;
    const done = c.status === 'completed';
    const idAttr = JSON.stringify(String(c.id));
    return `
    <div class="course-card" data-status="${c.status || 'active'}" data-id="${c.id}">
      <button class="course-delete-btn" title="Delete" onclick="confirmDelete(${idAttr},event)">✕</button>
      <div class="course-image" style="background:${colorFor(c.id)};position:relative;">
        <span style="position:absolute;bottom:12px;left:14px;">
          <span class="file-type-badge ${ft.badge}">${ft.label}</span>
        </span>
        ${done ? '<span style="position:absolute;top:10px;left:10px;font-size:18px;">ꪜ</span>' : ''}
      </div>
      <div class="course-content">
        <div class="course-category">${esc(c.category)}</div>
        <div class="course-title">${esc(c.name)}</div>
        <div class="course-desc">${esc(c.desc || 'No description.')}</div>
        <div class="course-meta">
          <span>${ft.icon} ${esc(c.fileName)}</span>
          <span>📅 ${new Date(c.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="course-progress">
          <div class="progress-header">
            <span class="progress-label">Progress</span>
            <span class="progress-value">${pct}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="course-actions">
          <button class="course-btn course-btn-primary" onclick="openReviewer(${idAttr})">
            ${ft.icon} Study / Review
          </button>
          <button class="course-btn course-btn-outline" onclick="confirmDelete(${idAttr},event)">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderList(courses) {
  const list = document.getElementById('coursesList');
  if (!courses.length) { list.innerHTML = ''; return; }

  /* FIX 3: stringify id in onclick so string IDs like 'stem-1' are passed correctly */
  list.innerHTML = courses.map(c => {
    const ft  = fileTypeInfo(c.fileName);
    const pct = c.progress || 0;
    const idAttr = JSON.stringify(String(c.id));
    return `
    <div class="course-list-item" data-status="${c.status || 'active'}" data-id="${c.id}">
      <div class="course-list-icon" style="background:${colorFor(c.id)};">${ft.icon}</div>
      <div class="course-list-info">
        <div class="course-list-title">${esc(c.name)}</div>
        <div class="course-list-meta">
          <span>${esc(c.category)}</span><span>•</span>
          <span class="file-type-badge ${ft.badge}" style="font-size:9px;">${ft.label}</span>
          <span>•</span><span>${esc(c.fileName)}</span>
        </div>
      </div>
      <div class="course-list-progress">
        <div class="course-list-bar"><div class="course-list-fill" style="width:${pct}%"></div></div>
        <div class="course-list-pct">${pct}%</div>
      </div>
      <div class="course-list-actions">
        <button class="course-list-btn" onclick="openReviewer(${idAttr})">Study</button>
        <button class="course-list-btn" style="color:var(--error);" onclick="confirmDelete(${idAttr},event)">✕</button>
      </div>
    </div>`;
  }).join('');
}

function esc(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Upload ── */
function openUploadModal()  { document.getElementById('uploadModal').classList.add('active'); }
function closeUploadModal() {
  document.getElementById('uploadModal').classList.remove('active');
  document.getElementById('uploadForm').reset();
  document.getElementById('fileName').textContent = '';
  document.getElementById('uploadProgressWrap').classList.remove('show');
  document.getElementById('uploadProgressFill').style.width = '0%';
  document.getElementById('uploadSubmitBtn').disabled = false;
}

async function handleUpload() {
  const name     = document.getElementById('courseName').value.trim();
  const category = document.getElementById('courseCategory').value.trim();
  const desc     = document.getElementById('courseDesc').value.trim();
  const file     = document.getElementById('courseFile').files[0];

  if (!name || !category || !file) { showToast('Missing fields','Please fill all required fields.','error'); return; }

  const MAX = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX) { showToast('File too large','Max 10 MB per file.','error'); return; }

  const btn = document.getElementById('uploadSubmitBtn');
  btn.disabled = true;

  const wrap = document.getElementById('uploadProgressWrap');
  const fill = document.getElementById('uploadProgressFill');
  const lbl  = document.getElementById('uploadProgressLabel');
  wrap.classList.add('show');

  /* simulate progress while reading */
  let prog = 0;
  const progTimer = setInterval(() => {
    prog = Math.min(prog + 8, 85);
    fill.style.width = prog + '%';
  }, 120);

  try {
    const fileData  = await readFileAsArrayBuffer(file);
    const textData  = await extractTextFromFile(file);

    clearInterval(progTimer);
    fill.style.width = '100%';
    lbl.textContent  = 'Saving...';

    const course = {
      id:        Date.now(),
      name, category, desc,
      fileName:  file.name,
      fileData,
      textData,          // extracted text for AI
      progress:  0,
      status:    'active',
      createdAt: Date.now(),
      notes:     '',
      reviewerCache: null,
    };

    await dbPut(course);
    await refreshCourses();
    closeUploadModal();
    showToast('Course created!', `"${name}" is ready to study.`, 'success');

  } catch (err) {
    clearInterval(progTimer);
    console.error(err);
    showToast('Error', 'Could not save course. Try again.', 'error');
    btn.disabled = false;
    wrap.classList.remove('show');
  }
}

function readFileAsArrayBuffer(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = e => res(e.target.result);
    r.onerror = () => rej(r.error);
    r.readAsArrayBuffer(file);
  });
}

async function extractTextFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'txt' || ext === 'md') {
    return await file.text();
  }

  /* For PDF/PPTX/DOCX we read as base64 — the Claude API supports PDF natively.
     For everything else we return a placeholder. */
  if (['pdf','pptx','ppt','doc','docx'].includes(ext)) {
    return await readFileAsBase64(file);
  }

  return await file.text().catch(() => '');
}

function readFileAsBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = e => res(e.target.result.split(',')[1]); // strip data:...;base64,
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

/* ── Delete ── */
/* FIX 1: removed the stray top-level block that was running outside any function.
   The built-in guard is now correctly inside confirmDelete below. */
function confirmDelete(id, e) {
  if (e) e.stopPropagation();

  /* FIX 2 (guard): prevent deletion of built-in courses */
  const course = allCourses.find(c => String(c.id) === String(id));
  if (course?.builtIn) {
    showToast('Not allowed', 'Built-in courses cannot be deleted.', 'error');
    return;
  }

  pendingDeleteId = id;
  document.getElementById('deleteConfirm').classList.add('active');
}
function closeDeleteConfirm() {
  pendingDeleteId = null;
  document.getElementById('deleteConfirm').classList.remove('active');
}

/* ── Reviewer ── */
async function openReviewer(id) {
  reviewerCourseId = id;
  currentCard      = 0;
  quizAnswered     = {};

  /* FIX 2: declare course before using it, then handle built-in check */
  let course = allCourses.find(c => String(c.id) === String(id));

  if (course?.builtIn) {
    window.open('../modules/' + course.fileName, '_blank');
    return;
  }

  /* load full data (including fileData) from IndexedDB for user courses */
  course = await dbGet(id);

  if (!course) return;

  /* header */
  const ft = fileTypeInfo(course.fileName);
  document.getElementById('reviewerIcon').textContent       = ft.icon;
  document.getElementById('reviewerCourseName').textContent = course.name;
  document.getElementById('reviewerCourseSub').textContent  = `${course.category} · ${course.fileName}`;

  /* reset to summary tab */
  document.querySelectorAll('.reviewer-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.reviewer-tab[data-tab="summary"]').classList.add('active');

  document.getElementById('reviewerModal').classList.add('active');

  /* use cached data if available */
  if (course.reviewerCache) {
    reviewerData = course.reviewerCache;
    renderReviewerTab('summary');
    return;
  }

  /* show loading */
  document.getElementById('reviewerBody').innerHTML = `
    <div class="ai-loading">
      <div class="ai-loading-spinner"></div>
      <div class="ai-loading-text">Reading your material with AI...</div>
    </div>`;

  try {
    reviewerData = await generateReviewerContent(course);

    /* cache it */
    course.reviewerCache = reviewerData;
    await dbPut(course);

    renderReviewerTab('summary');
  } catch (err) {
    console.error('AI error:', err);
    document.getElementById('reviewerBody').innerHTML = `
      <div class="ai-loading">
        <div style="font-size:32px;">⚠️</div>
        <div class="ai-loading-text">Could not generate content. Check your connection and try again.</div>
        <button class="btn btn-outline" style="margin-top:12px;" onclick="openReviewer(${JSON.stringify(String(id))})">Retry</button>
      </div>`;
  }
}

function closeReviewer() {
  document.getElementById('reviewerModal').classList.remove('active');
  reviewerCourseId = null;
  reviewerData = null;
}

async function markCourseDone(id) {
  const course = await dbGet(id);
  if (!course) return;
  course.status   = 'completed';
  course.progress = 100;
  await dbPut(course);
  await refreshCourses();
  closeReviewer();
  showToast('Course completed! 🎉', 'Great work!', 'success');
}

/* ── Claude API call ── */
async function generateReviewerContent(course) {
  const ext = course.fileName.split('.').pop().toLowerCase();
  const isPdf = ext === 'pdf';

  let messages;

  const prompt = `You are an expert tutor. Analyze the provided study material and generate:

1. A clear SUMMARY (3-5 sentences, in plain language).
2. KEY_POINTS: exactly 6 important bullet points.
3. FLASHCARDS: exactly 8 flashcard pairs (term/concept + explanation). Keep each under 40 words.
4. QUIZ: exactly 5 multiple-choice questions, each with 4 options (A/B/C/D), the correct answer letter, and a short explanation.

Return ONLY valid JSON in this exact format:
{
  "summary": "...",
  "keyPoints": ["...", "...", "...", "...", "...", "..."],
  "flashcards": [
    { "front": "...", "back": "..." }
  ],
  "quiz": [
    {
      "question": "...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "answer": "A",
      "explanation": "..."
    }
  ]
}`;

  if (isPdf && course.textData) {
    /* send as native PDF document */
    messages = [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: course.textData }
        },
        { type: 'text', text: prompt }
      ]
    }];
  } else if (['pptx','ppt','doc','docx'].includes(ext) && course.textData) {
    /* binary office file — send base64 as text hint, ask AI to infer */
    messages = [{
      role: 'user',
      content: `The following is base64 encoded content of a ${ext.toUpperCase()} file named "${course.fileName}" for a course called "${course.name}" (${course.category}). The student uploaded this as study material. Even without reading the binary, use the course name and category to generate realistic, educationally relevant content.\n\n${prompt}`
    }];
  } else {
    /* plain text / notes */
    const text = course.textData || `Course: ${course.name}\nCategory: ${course.category}\nDescription: ${course.desc}`;
    messages = [{
      role: 'user',
      content: `Here is the study material:\n\n${text.slice(0, 12000)}\n\n${prompt}`
    }];
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages
    })
  });

  if (!resp.ok) throw new Error(`API ${resp.status}`);
  const data = await resp.json();

  const raw  = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const json = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(json);
}

/* ── Reviewer Tab Rendering ── */
function renderReviewerTab(tab) {
  const body = document.getElementById('reviewerBody');
  if (!reviewerData) return;

  if (tab === 'summary')    renderSummary(body);
  if (tab === 'flashcards') renderFlashcards(body);
  if (tab === 'quiz')       renderQuiz(body);
  if (tab === 'notes')      renderNotes(body);
}

function renderSummary(body) {
  const d = reviewerData;
  body.innerHTML = `
    <div class="summary-section">
      <h3>Overview</h3>
      <div class="summary-content">${esc(d.summary)}</div>
    </div>
    <div class="summary-section">
      <h3>Key Points</h3>
      <ul class="key-points-list">
        ${(d.keyPoints || []).map(p => `<li>${esc(p)}</li>`).join('')}
      </ul>
    </div>`;
}

function renderFlashcards(body) {
  const cards = reviewerData.flashcards || [];
  if (!cards.length) { body.innerHTML = '<div class="ai-loading"><div>No flashcards generated.</div></div>'; return; }

  const idx  = Math.max(0, Math.min(currentCard, cards.length - 1));
  const card = cards[idx];
  const pct  = ((idx + 1) / cards.length * 100).toFixed(0);

  body.innerHTML = `
    <div class="flashcard-nav">
      <span class="flashcard-counter">${idx + 1} / ${cards.length}</span>
      <div class="flashcard-nav-btns">
        <button class="flashcard-nav-btn" id="fcPrev" ${idx === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="flashcard-nav-btn" id="fcNext" ${idx === cards.length-1 ? 'disabled' : ''}>Next →</button>
      </div>
    </div>
    <div class="flashcard-scene" id="flashcardScene">
      <div class="flashcard-inner" id="flashcardInner">
        <div class="flashcard-front">
          <div class="flashcard-label">Term / Concept</div>
          <div class="flashcard-text">${esc(card.front)}</div>
          <div class="flashcard-hint">Click to reveal answer</div>
        </div>
        <div class="flashcard-back">
          <div class="flashcard-label">Answer</div>
          <div class="flashcard-text">${esc(card.back)}</div>
        </div>
      </div>
    </div>
    <div class="flashcard-progress-bar">
      <div class="flashcard-progress-fill" style="width:${pct}%"></div>
    </div>
    <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--text-muted);">
      Progress: ${idx + 1} / ${cards.length} cards
    </div>`;

  /* flip on click */
  document.getElementById('flashcardScene').addEventListener('click', () => {
    document.getElementById('flashcardInner').classList.toggle('flipped');
  });

  document.getElementById('fcPrev').addEventListener('click', () => {
    currentCard = Math.max(0, currentCard - 1);
    renderFlashcards(body);
  });
  document.getElementById('fcNext').addEventListener('click', () => {
    currentCard = Math.min(cards.length - 1, currentCard + 1);
    renderFlashcards(body);

    /* update progress on course when reaching last card */
    if (currentCard === cards.length - 1) updateProgress(50);
  });
}

function renderQuiz(body) {
  const qs = reviewerData.quiz || [];
  if (!qs.length) { body.innerHTML = '<div class="ai-loading"><div>No quiz generated.</div></div>'; return; }

  const answered = Object.keys(quizAnswered).length;
  const correct  = Object.values(quizAnswered).filter(Boolean).length;

  let html = '';

  if (answered === qs.length) {
    html += `
      <div class="quiz-score-banner">
        <div class="quiz-score-num">${correct}/${qs.length}</div>
        <div class="quiz-score-label">Correct answers · ${Math.round(correct/qs.length*100)}% score</div>
      </div>`;
    if (correct === qs.length) updateProgress(100);
    else if (correct >= qs.length * 0.6) updateProgress(75);
  }

  html += qs.map((q, qi) => {
    const chosen = quizAnswered[qi];
    return `
    <div class="quiz-question-card">
      <div class="quiz-q-num">Question ${qi + 1}</div>
      <div class="quiz-q-text">${esc(q.question)}</div>
      <div class="quiz-options">
        ${Object.entries(q.options).map(([letter, text]) => {
          let cls = 'quiz-option';
          if (chosen) {
            cls += ' locked';
            if (letter === q.answer) cls += ' correct';
            else if (letter === chosen) cls += ' wrong';
          }
          return `
          <button class="${cls}" onclick="answerQuiz(${qi},'${letter}')">
            <span class="quiz-option-letter">${letter}</span>
            ${esc(text)}
          </button>`;
        }).join('')}
      </div>
      <div class="quiz-explanation ${chosen ? 'show' : ''}" id="qexp-${qi}">
        💡 ${esc(q.explanation)}
      </div>
    </div>`;
  }).join('');

  if (answered < qs.length) {
    html += `<div style="text-align:center;padding:16px 0;font-size:13px;color:var(--text-muted);">
      ${answered} of ${qs.length} answered
    </div>`;
  } else {
    html += `<button class="btn btn-outline" style="width:100%;margin-top:4px;" onclick="resetQuiz()">Retake Quiz</button>`;
  }

  body.innerHTML = html;
}

function answerQuiz(qi, letter) {
  const q = reviewerData.quiz[qi];
  quizAnswered[qi] = letter;
  /* re-render to lock all options and show explanation */
  renderQuiz(document.getElementById('reviewerBody'));
}

function resetQuiz() {
  quizAnswered = {};
  renderQuiz(document.getElementById('reviewerBody'));
}

async function renderNotes(body) {
  const course = await dbGet(reviewerCourseId);
  const notes  = course?.notes || '';

  body.innerHTML = `
    <div class="summary-section">
      <h3>My Notes</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
        Jot down anything you want to remember about this material.
      </p>
      <textarea class="notes-area" id="notesTextarea" placeholder="Write your notes here...">${esc(notes)}</textarea>
      <button class="notes-save-btn" onclick="saveNotes()">Save Notes</button>
    </div>`;
}

async function saveNotes() {
  const text   = document.getElementById('notesTextarea')?.value || '';
  const course = await dbGet(reviewerCourseId);
  if (!course) return;
  course.notes = text;
  await dbPut(course);
  showToast('Saved!', 'Your notes have been saved.', 'success');
}

async function updateProgress(pct) {
  const course = await dbGet(reviewerCourseId);
  if (!course) return;
  if ((course.progress || 0) >= pct) return; // never go down
  course.progress = pct;
  if (pct >= 100) course.status = 'completed';
  await dbPut(course);
  await refreshCourses();
}

/* ── View toggle ── */
function toggleView() {
  listView = !listView;
  const grid = document.getElementById('coursesGrid');
  const list = document.getElementById('coursesList');
  const btn  = document.querySelector('.filter-actions .btn-outline');
  if (listView) {
    grid.style.display = 'none';
    list.classList.add('active');
    btn.textContent = '⊞ Grid View';
  } else {
    grid.style.display = '';
    list.classList.remove('active');
    btn.textContent = '☰ List View';
  }
}

/* ── Notifications ── */
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

/* ── Toast ── */
function showToast(title, msg, type='info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success:'✓', error:'✕', info:'i', warning:'!' };
  t.innerHTML = `
    <span class="toast-icon">${icons[type]||'i'}</span>
    <div>
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

/* ── Nav setup ── */
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

  /* ═══════════════════════════════════════════════
     built in modules
  ═══════════════════════════════════════════════ */

  const BUILTIN_MODULES = [
    { 
      title: "Earth Science 1",       
      meta: "PDF · 1.44 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDFs/STEM/STEM_Earth_Science_1.pdf" 
    },

    { 
      title: "Earth Science 2",       
      meta: "PDF · 2.08 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDFs/STEM/STEM_Earth_Science_2.pdf" 
    },

    { 
      title: "General Biology 1",     
      meta: "PDF · 2.30 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDFs/STEM/STEM_General_Biology_1.pdf" 
    },

    { 
      title: "General Biology 2",     
      meta: "PDF · 1.96 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDFs/STEM/STEM_General_Biology_2.pdf" 
    },

    { 
      title: "General Chemistry 1",   
      meta: "PDF · 1.23 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDFs/STEM/STEM_General_Chemistry_1.pdf" 
    },

    { 
      title: "General Chemistry 2",   
      meta: "PDF · 1.77 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDfs/STEM/STEM_General_Chemistry_2.pdf" 
    },

    { 
      title: "General Mathematics 1", 
      meta: "PDF · 1.34 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDFs/STEM/STEM_General_Mathematics_1.pdf" 
    },

    { 
      title: "General Mathematics 2", 
      meta: "PDF · 1.23 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDFs/STEM/STEM_General_Mathematics_2.pdf" 
    },

    { 
      title: "General Physics 1",     
      meta: "PDF · 2.46 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDFs/STEM/STEM_General_Physics_1.pdf" 
    },

    { 
      title: "General Physics 2",     
      meta: "PDF · 1.86 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDFs/STEM/STEM_General_Physics_2.pdf" 
    },

    { 
      title: "Pre-Calculus 1",        
      meta: "PDF · 1.87 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDFs/STEM/STEM_Pre-Calculus_1.pdf" 
    },

    { 
      title: "Pre-Calculus 2",        
      meta: "PDF · 1.54 MB", 
      tag: "Lecture", 
      strand: "STEM", 
      pdf: "../PDFs/STEM/STEM_Pre-Calculus_2.pdf" 
    },
  ];

  let builtinOpen   = true;
  let activeStrand  = 'all';

  const openArrowSVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

  function renderBuiltinCards() {
    const grid = document.getElementById('builtinGrid');
    const filtered = activeStrand === 'all'
      ? BUILTIN_MODULES
      : BUILTIN_MODULES.filter(m => m.strand === activeStrand);

    document.getElementById('builtinCount').textContent =
      filtered.length + ' module' + (filtered.length !== 1 ? 's' : '');

    if (!filtered.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;padding:32px;text-align:center;color:var(--text-muted);font-size:13px;">No modules found for this strand.</div>`;
      return;
    }

    grid.innerHTML = filtered.map((m, i) => `
      <a class="builtin-card"
         href="../modules/${m.pdf}"
         target="_blank"
         rel="noopener noreferrer"
         style="animation-delay:${i * 0.04}s"
         title="Open ${m.title}">
        <div class="builtin-card-top">
          <div class="builtin-card-icon">🗎</div>
          <span class="builtin-pdf-badge">PDF</span>
        </div>
        <div class="builtin-card-title">${m.title}</div>
        <div class="builtin-card-meta">
          <span class="builtin-card-tag">${m.tag}</span>
          <span class="builtin-card-open">${openArrowSVG} Open</span>
        </div>
      </a>
    `).join('');
  }

  function toggleBuiltin() {
    builtinOpen = !builtinOpen;
    const collapsible = document.getElementById('builtinCollapsible');
    const btn         = document.getElementById('builtinToggleBtn');

    collapsible.classList.toggle('collapsed', !builtinOpen);
    btn.classList.toggle('collapsed', !builtinOpen);
    btn.innerHTML = `<span class="chevron" style="transition:transform 0.3s ease;transform:${builtinOpen ? 'rotate(0deg)' : 'rotate(-90deg)'}">▾</span> ${builtinOpen ? 'Hide modules' : 'Show modules'}`;
  }

  function setStrand(strand) {
    activeStrand = strand;
    document.querySelectorAll('.strand-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.strand === strand);
    });
    renderBuiltinCards();
  }

  /* Render on load */
  document.addEventListener('DOMContentLoaded', () => {
    renderBuiltinCards();
  });
