/* UpLift Courses - With PDF Text Extraction */
const { createClient } = supabase;
const client = createClient(
  'https://tiyapgnehlwbhhzqqumq.supabase.co',
  'sb_publishable_TshJnLexCo4FrHe_YJ8l7g_QcxA_kaV'
);

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
pdfjsLib.GlobalWorkerOptions.isEvalSupported = false;

/* ── State ── */
let listView = false;
let db = null;
let allCourses = [];
let activeFilter = 'all';
let activeUserStrand = 'all';
let pendingDeleteId = null;

/* Strand configuration */
const STRANDS = {
  'STEM': { name: 'STEM', icon: '🔬', color: '#3b82f6', desc: 'Science, Technology, Engineering, Math' },
  'ABM': { name: 'ABM', icon: '💼', color: '#f59e0b', desc: 'Accountancy, Business, Management' },
  'HUMSS': { name: 'HUMSS', icon: '📚', color: '#a855f7', desc: 'Humanities, Social Sciences' },
  'GAS': { name: 'GAS', icon: '📖', color: '#22c55e', desc: 'General Academic Strand' },
  'TVL': { name: 'TVL', icon: '🔧', color: '#ef4444', desc: 'Technical-Vocational-Livelihood' },
  'Other': { name: 'Other', icon: '📁', color: '#71717a', desc: 'Uncategorized' }
};

const BUILTIN_MODULES = [
  { title: "Earth Science 1", meta: "PDF · 1.44 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_Earth_Science_1.pdf" },
  { title: "Earth Science 2", meta: "PDF · 2.08 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_Earth_Science_2.pdf" },
  { title: "General Biology 1", meta: "PDF · 2.30 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_General_Biology_1.pdf" },
  { title: "General Biology 2", meta: "PDF · 1.96 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_General_Biology_2.pdf" },
  { title: "General Chemistry 1", meta: "PDF · 1.23 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_General_Chemistry_1.pdf" },
  { title: "General Chemistry 2", meta: "PDF · 1.77 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_General_Chemistry_2.pdf" },
  { title: "General Mathematics 1", meta: "PDF · 1.34 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_General_Mathematics_1.pdf" },
  { title: "General Mathematics 2", meta: "PDF · 1.23 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_General_Mathematics_2.pdf" },
  { title: "General Physics 1", meta: "PDF · 2.46 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_General_Physics_1.pdf" },
  { title: "General Physics 2", meta: "PDF · 1.86 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_General_Physics_2.pdf" },
  { title: "Pre-Calculus 1", meta: "PDF · 1.87 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_Pre-Calculus_1.pdf" },
  { title: "Pre-Calculus 2", meta: "PDF · 1.54 MB", tag: "Lecture", strand: "STEM", pdf: "../PDFs/STEM/STEM_Pre-Calculus_2.pdf" },
  { title: "Java Programming 1", meta: "PDF · 1.11 MB", tag: "Lecture", strand: "TVL", pdf: "../PDFs/ICT/ICT_Java1.pdf" },
  { title: "Java Programming 2", meta: "PDF · 1.11 MB", tag: "Lecture", strand: "TVL", pdf: "../PDFs/ICT/ICT_Java2.pdf" },
  { title: "Animation", meta: "PDF · 1.23 MB", tag: "Lecture", strand: "TVL", pdf: "../PDFs/ICT/ICT_Animation.pdf" },
  { title: "Computer Programming 1", meta: "PDF · 1.45 MB", tag: "Lecture", strand: "TVL", pdf: "../PDFs/ICT/ICT_ComProg1.pdf" },
  { title: "Computer Programming 2", meta: "PDF · 1.45 MB", tag: "Lecture", strand: "TVL", pdf: "../PDFs/ICT/ICT_ComProg2.pdf" },
  { title: "Oracle Database 1", meta: "PDF · 2.12 MB", tag: "Lecture", strand: "TVL", pdf: "../PDFs/ICT/ICT_Oracle_DB1.pdf" },
  { title: "Oracle Database 2", meta: "PDF · 2.12 MB", tag: "Lecture", strand: "TVL", pdf: "../PDFs/ICT/ICT_Oracle_DB2.pdf" }
];

let builtinOpen = true;
let activeStrand = 'all';

/* review state */
let reviewerCourseId = null;
let reviewerData = null;
let currentCard = 0;
let quizAnswered = {};

/* ── IndexedDB ── */
const DB_NAME = 'UpLiftCourses';
const DB_VERSION = 3;
const STORE = 'courses';

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
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function dbGet(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(obj) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(obj);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ── PDF TEXT EXTRACTION ── */
async function extractTextFromPDF(arrayBuffer) {
  try {
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      disableAutoFetch: true,
      disableStream: true,
      disableRange: true,
    }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

async function extractTextFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (ext === 'pdf') {
    return await extractTextFromPDF(arrayBuffer);
  } else if (ext === 'txt' || ext === 'md') {
    return await file.text();
  } else if (['pptx', 'ppt', 'doc', 'docx'].includes(ext)) {
    return await extractOfficeText(arrayBuffer, ext);
  }
  
  return '';
}

async function extractOfficeText(arrayBuffer, ext) {
  try {
    const text = new TextDecoder().decode(arrayBuffer);
    const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.substring(0, 50000);
  } catch (e) {
    return `[${ext.toUpperCase()} file - text extraction limited]`;
  }
}

/* ── Init ── */
window.addEventListener('DOMContentLoaded', async () => {
  await initDB();

  const { data: { user } } = await client.auth.getUser();
  if (!user || !user.email_confirmed_at) {
    window.location.href = 'index.html';
    return;
  }

  const storedName = localStorage.getItem('username');
  const username = (storedName && !storedName.includes('@')) ? storedName : user.email.split('@')[0];

  setEl('usernameDisplay', username);
  setEl('userAvatar', username.charAt(0).toUpperCase());
  setEl('userDropdownName', username);
  setEl('userDropdownEmail', user.email);
  setEl('userDropdownAvatar', username.charAt(0).toUpperCase());

  const { data: profile } = await client.from('profiles').select('avatar_url, username').eq('id', user.id).maybeSingle();

  if (profile?.username) {
    setEl('usernameDisplay', profile.username);
    setEl('userDropdownName', profile.username);
  }
  if (profile?.avatar_url) applyAvatar(profile.avatar_url);

  await loadNotifications(user.id);

  client.channel('courses-notifs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
      () => loadNotifications(user.id))
    .subscribe();

  await refreshCourses();

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      renderCourses();
    });
  });

  document.getElementById('searchInput').addEventListener('input', e => {
    renderCourses(e.target.value);
  });

  const fileInput = document.getElementById('courseFile');
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) document.getElementById('fileName').textContent = `✓ ${e.target.files[0].name}`;
  });

  const label = document.querySelector('.file-input-label');
  label.addEventListener('dragover', e => { e.preventDefault(); label.style.borderColor = 'var(--accent)'; });
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

  document.getElementById('reviewerTabs').addEventListener('click', e => {
    const tab = e.target.closest('.reviewer-tab');
    if (!tab) return;
    document.querySelectorAll('.reviewer-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderReviewerTab(tab.dataset.tab);
  });

  document.getElementById('reviewerMarkDoneBtn').addEventListener('click', () => {
    if (!reviewerCourseId) return;
    markCourseDone(reviewerCourseId);
  });

  document.getElementById('confirmDeleteCourseBtn').addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    await dbDelete(pendingDeleteId);
    await refreshCourses();
    closeDeleteConfirm();
    showToast('Deleted', 'Course removed.', 'success');
  });

  document.getElementById('uploadModal').addEventListener('click', e => {
    if (e.target === document.getElementById('uploadModal')) closeUploadModal();
  });
  document.getElementById('reviewerModal').addEventListener('click', e => {
    if (e.target === document.getElementById('reviewerModal')) closeReviewer();
  });
  document.getElementById('deleteConfirm').addEventListener('click', e => {
    if (e.target === document.getElementById('deleteConfirm')) closeDeleteConfirm();
  });

  setupNav();
  renderBuiltinCards();
});

document.addEventListener('click', (e) => {
  const notifDropdown = document.getElementById('notifDropdown');
  const userDropdown = document.getElementById('userDropdown');
  const notifBtn = document.getElementById('notifBtn');
  const userMenuBtn = document.getElementById('userMenuBtn');

  if (notifBtn.contains(e.target)) {
    notifDropdown.classList.toggle('open');
    userDropdown.classList.remove('open');
  } else if (userMenuBtn.contains(e.target)) {
    userDropdown.classList.toggle('open');
    notifDropdown.classList.remove('open');
  } else {
    if (!notifDropdown.contains(e.target)) notifDropdown.classList.remove('open');
    if (!userDropdown.contains(e.target)) userDropdown.classList.remove('open');
  }
});

/* ── Helpers ── */
function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function applyAvatar(src) {
  const s = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
  ['userAvatar', 'userDropdownAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<img src="${src}" style="${s}">`;
  });
}

function fileTypeInfo(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    pdf: { icon: '🗎', badge: 'pdf', label: 'PDF' },
    ppt: { icon: '⎙', badge: 'pptx', label: 'PPT' },
    pptx: { icon: '⿻', badge: 'pptx', label: 'PPTX' },
    doc: { icon: '🗁', badge: 'docx', label: 'Word' },
    docx: { icon: '🗁', badge: 'docx', label: 'Word' },
    txt: { icon: '🗒', badge: 'txt', label: 'Text' },
    md: { icon: '🗒', badge: 'txt', label: 'MD' },
  };
  return map[ext] || { icon: '📎', badge: 'other', label: ext.toUpperCase() };
}

const CARD_COLORS = [
  'linear-gradient(135deg,#1a1a2e,#27272a)',
  'linear-gradient(135deg,#0a0a1a,#1a1a2e)',
  'linear-gradient(135deg,#1a0a0a,#2e1a1a)',
  'linear-gradient(135deg,#0a1a0a,#1a2e1a)',
  'linear-gradient(135deg,#0f0a1a,#1a0f2e)',
  'linear-gradient(135deg,#1a1a0a,#2a2a1a)',
];

function colorFor(id) {
  const index = typeof id === 'number' ? id : id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return CARD_COLORS[index % CARD_COLORS.length];
}

/* ── Load & Render ── */
async function refreshCourses() {
  const userCourses = await dbGetAll();
  allCourses = userCourses.sort((a, b) => b.createdAt - a.createdAt);
  renderCourses();
}

function renderCourses(query = '') {
  const q = query.toLowerCase();
  
  let filtered = allCourses.filter(c => {
    if (activeFilter === 'active' && c.status !== 'active') return false;
    if (activeFilter === 'completed' && c.status !== 'completed') return false;
    if (q && !c.name.toLowerCase().includes(q) && !c.category.toLowerCase().includes(q)) return false;
    if (activeUserStrand !== 'all' && c.category !== activeUserStrand) return false;
    return true;
  });

  renderUserCoursesByStrand(filtered);
}

function renderUserCoursesByStrand(courses) {
  const container = document.getElementById('userCoursesContainer');
  
  if (!courses.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🕮</div>
        <div class="empty-title">No courses yet</div>
        <div class="empty-desc">${activeUserStrand === 'all' ? 'Upload your notes, PDFs, or slides to get started.' : `No courses in ${activeUserStrand} strand.`}</div>
        <button class="btn btn-primary" onclick="openUploadModal()">⬆ Upload Material</button>
      </div>`;
    return;
  }

  const grouped = {};
  courses.forEach(c => {
    const strand = c.category || 'Other';
    if (!grouped[strand]) grouped[strand] = [];
    grouped[strand].push(c);
  });

  const strandOrder = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'Other'];
  const sortedStrands = Object.keys(grouped).sort((a, b) => {
    const aIdx = strandOrder.indexOf(a);
    const bIdx = strandOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  container.innerHTML = sortedStrands.map(strand => {
    const strandCourses = grouped[strand];
    const strandInfo = STRANDS[strand] || STRANDS['Other'];
    
    return `
      <div class="strand-folder strand-${strand}" data-strand="${strand}">
        <div class="strand-folder-header" onclick="toggleStrandFolder('${strand}')">
          <div class="strand-folder-icon">${strandInfo.icon}</div>
          <div class="strand-folder-info">
            <div class="strand-folder-name">
              ${strandInfo.name}
              <span style="font-size:11px;font-weight:500;color:var(--text-muted);">— ${strandInfo.desc}</span>
            </div>
            <div class="strand-folder-count">${strandCourses.length} course${strandCourses.length !== 1 ? 's' : ''}</div>
          </div>
          <div class="strand-folder-toggle">▾</div>
        </div>
        <div class="strand-folder-content">
          <div class="courses-grid" style="display: grid;">
            ${strandCourses.map(c => renderCourseCard(c)).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCourseCard(c) {
  const ft = fileTypeInfo(c.fileName);
  const pct = c.progress || 0;
  const done = c.status === 'completed';
  const idAttr = JSON.stringify(String(c.id));
  const strandInfo = STRANDS[c.category] || STRANDS['Other'];
  
  return `
    <div class="course-card" data-status="${c.status || 'active'}" data-id="${c.id}">
      <button class="course-delete-btn" title="Delete" onclick="confirmDelete(${idAttr},event)">✕</button>
      <div class="course-strand-tag" style="border-color: ${strandInfo.color}; color: ${strandInfo.color};">
        ${c.category}
      </div>
      <div class="course-image" style="background:${colorFor(c.id)};position:relative;">
        <span style="position:absolute;bottom:12px;left:14px;">
          <span class="file-type-badge ${ft.badge}">${ft.label}</span>
        </span>
        ${done ? '<span style="position:absolute;top:10px;right:10px;font-size:18px;">✓</span>' : ''}
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
    </div>
  `;
}

function toggleStrandFolder(strand) {
  const folder = document.querySelector(`.strand-folder[data-strand="${strand}"]`);
  folder.classList.toggle('collapsed');
}

function setUserStrand(strand) {
  activeUserStrand = strand;
  document.querySelectorAll('.user-strand-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.strand === strand);
  });
  renderCourses();
}

function esc(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Upload ── */
function openUploadModal() { document.getElementById('uploadModal').classList.add('active'); }

function closeUploadModal() {
  document.getElementById('uploadModal').classList.remove('active');
  document.getElementById('uploadForm').reset();
  document.getElementById('fileName').textContent = '';
  document.getElementById('uploadProgressWrap').classList.remove('show');
  document.getElementById('uploadProgressFill').style.width = '0%';
  document.getElementById('uploadSubmitBtn').disabled = false;
}

async function handleUpload() {
  const name = document.getElementById('courseName').value.trim();
  const category = document.getElementById('courseCategory').value;
  const desc = document.getElementById('courseDesc').value.trim();
  const file = document.getElementById('courseFile').files[0];

  if (!name || !category || !file) {
    showToast('Missing fields', 'Please fill all required fields.', 'error');
    return;
  }

  const MAX = 10 * 1024 * 1024;
  if (file.size > MAX) {
    showToast('File too large', 'Max 10 MB per file.', 'error');
    return;
  }

  const btn = document.getElementById('uploadSubmitBtn');
  btn.disabled = true;

  const wrap = document.getElementById('uploadProgressWrap');
  const fill = document.getElementById('uploadProgressFill');
  const lbl = document.getElementById('uploadProgressLabel');
  wrap.classList.add('show');

  let prog = 0;
  const progTimer = setInterval(() => {
    prog = Math.min(prog + 5, 60);
    fill.style.width = prog + '%';
    lbl.textContent = 'Extracting text...';
  }, 100);

  try {
    const textData = await extractTextFromFile(file);
    
    if (!textData || textData.length < 50) {
      throw new Error('Could not extract sufficient text from file. The PDF might be scanned or image-based.');
    }

    clearInterval(progTimer);
    fill.style.width = '80%';
    lbl.textContent = 'Saving course...';

    const fileData = await file.arrayBuffer();

    const course = {
      id: Date.now(),
      name,
      category,
      desc,
      fileName: file.name,
      fileData,
      textData: textData.substring(0, 100000),
      progress: 0,
      status: 'active',
      createdAt: Date.now(),
      notes: '',
      reviewerCache: null,
    };

    await dbPut(course);
    await refreshCourses();
    closeUploadModal();
    showToast('Course created!', `"${name}" is ready to study.`, 'success');

  } catch (err) {
    clearInterval(progTimer);
    console.error(err);
    showToast('Error', err.message || 'Could not process file. Try again.', 'error');
    btn.disabled = false;
    wrap.classList.remove('show');
  }
}

/* ── Delete ── */
function confirmDelete(id, e) {
  if (e) e.stopPropagation();
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
  currentCard = 0;
  quizAnswered = {};

  let course = allCourses.find(c => String(c.id) === String(id));
  if (!course) return;

  const ft = fileTypeInfo(course.fileName);
  document.getElementById('reviewerIcon').textContent = ft.icon;
  document.getElementById('reviewerCourseName').textContent = course.name;
  document.getElementById('reviewerCourseSub').textContent = `${course.category} · ${course.fileName}`;

  document.querySelectorAll('.reviewer-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.reviewer-tab[data-tab="summary"]').classList.add('active');

  document.getElementById('reviewerModal').classList.add('active');

  if (course.reviewerCache) {
    reviewerData = course.reviewerCache;
    renderReviewerTab('summary');
    return;
  }

  document.getElementById('reviewerBody').innerHTML = `
    <div class="ai-loading">
      <div class="ai-loading-spinner"></div>
      <div class="ai-loading-text">Reading your material with AI...</div>
    </div>`;

  try {
    reviewerData = await generateReviewerContent(course);
    course.reviewerCache = reviewerData;
    await dbPut(course);
    renderReviewerTab('summary');
  } catch (err) {
    console.error('AI error:', err);
    document.getElementById('reviewerBody').innerHTML = `
      <div class="ai-loading">
        <div style="font-size:32px;">⚠️</div>
        <div class="ai-loading-text">Could not generate content. ${err.message}</div>
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
  course.status = 'completed';
  course.progress = 100;
  await dbPut(course);
  await refreshCourses();
  closeReviewer();
  showToast('Course completed! 🎉', 'Great work!', 'success');
}

/* ── AI Content Generation ── */
async function generateReviewerContent(course) {
  const text = course.textData || '';
  
  if (!text || text.length < 100) {
    throw new Error('Not enough text content to analyze.');
  }

  // For now, use mock generation (no API key needed)
  return generateMockContent(text, course);
}

function generateMockContent(text, course) {
  const name = course.name;
  const category = course.category;
  
  return {
    summary: `This ${name} course covers fundamental concepts in ${category}. The material includes key theories, practical applications, and important principles that students need to master. Understanding these concepts is essential for advancing in the subject area and applying knowledge to real-world scenarios.`,
    
    keyPoints: [
      `Understanding the core principles of ${name}`,
      `Key terminology and definitions in ${category}`,
      `Practical applications and real-world examples`,
      `Important formulas and methodologies`,
      `Common misconceptions to avoid`,
      `Study strategies for mastering the material`
    ],
    
    flashcards: [
      { front: `What is the main focus of ${name}?`, back: `The study of core concepts, theories, and applications in ${category}.` },
      { front: `Key Term 1`, back: `Important concept related to ${name} that students must understand.` },
      { front: `Key Term 2`, back: `Fundamental principle used in ${category} applications.` },
      { front: `Study Tip`, back: `Review the material regularly and practice with sample problems.` },
      { front: `Application`, back: `How ${name} concepts apply to real-world situations.` },
      { front: `Formula/Method`, back: `Essential technique for solving problems in this area.` },
      { front: `Common Mistake`, back: `Error students often make - review carefully to avoid.` },
      { front: `Review Point`, back: `Critical concept to remember for assessments.` }
    ],
    
    quiz: [
      {
        question: `What is the primary focus of ${name}?`,
        options: { A: `Core concepts and theories in ${category}`, B: `Unrelated historical events`, C: `Advanced mathematics only`, D: `Literary analysis` },
        answer: 'A',
        explanation: `The course focuses on core concepts and theories in ${category}, providing foundational knowledge.`
      },
      {
        question: `Which of the following is most important when studying ${name}?`,
        options: { A: `Understanding key terminology`, B: `Memorizing without comprehension`, C: `Skipping practice problems`, D: `Ignoring the textbook` },
        answer: 'A',
        explanation: `Understanding key terminology is crucial for success in ${name} and related subjects.`
      },
      {
        question: `What approach is recommended for mastering this material?`,
        options: { A: `Regular review and practice`, B: `Cramming the night before`, C: `Skipping difficult topics`, D: `Relying solely on lecture notes` },
        answer: 'A',
        explanation: `Regular review and practice help build long-term understanding and retention.`
      },
      {
        question: `How should students apply concepts from ${name}?`,
        options: { A: `Through practical, real-world examples`, B: `Only in theoretical contexts`, C: `Never apply them`, D: `Only during exams` },
        answer: 'A',
        explanation: `Practical application through real-world examples reinforces learning and understanding.`
      },
      {
        question: `What is essential for success in ${category}?`,
        options: { A: `Consistent study habits and comprehension`, B: `Last-minute preparation`, C: `Avoiding practice problems`, D: `Ignoring feedback` },
        answer: 'A',
        explanation: `Consistent study habits and deep comprehension are essential for success in ${category}.`
      }
    ]
  };
}

/* ── Reviewer Tab Rendering ── */
function renderReviewerTab(tab) {
  const body = document.getElementById('reviewerBody');
  if (!reviewerData) return;

  if (tab === 'summary') renderSummary(body);
  if (tab === 'flashcards') renderFlashcards(body);
  if (tab === 'quiz') renderQuiz(body);
  if (tab === 'notes') renderNotes(body);
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

  const idx = Math.max(0, Math.min(currentCard, cards.length - 1));
  const card = cards[idx];
  const pct = ((idx + 1) / cards.length * 100).toFixed(0);

  body.innerHTML = `
    <div class="flashcard-nav">
      <span class="flashcard-counter">${idx + 1} / ${cards.length}</span>
      <div class="flashcard-nav-btns">
        <button class="flashcard-nav-btn" id="fcPrev" ${idx === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="flashcard-nav-btn" id="fcNext" ${idx === cards.length - 1 ? 'disabled' : ''}>Next →</button>
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
    if (currentCard === cards.length - 1) updateProgress(50);
  });
}

function renderQuiz(body) {
  const qs = reviewerData.quiz || [];
  if (!qs.length) { body.innerHTML = '<div class="ai-loading"><div>No quiz generated.</div></div>'; return; }

  const answered = Object.keys(quizAnswered).length;
  const correct = Object.values(quizAnswered).filter(v => v === 'correct').length;

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
  const isCorrect = letter === q.answer;
  quizAnswered[qi] = isCorrect ? 'correct' : letter;
  renderQuiz(document.getElementById('reviewerBody'));
}

function resetQuiz() {
  quizAnswered = {};
  renderQuiz(document.getElementById('reviewerBody'));
}

async function renderNotes(body) {
  const course = await dbGet(reviewerCourseId);
  const notes = course?.notes || '';

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
  const text = document.getElementById('notesTextarea')?.value || '';
  const course = await dbGet(reviewerCourseId);
  if (!course) return;
  course.notes = text;
  await dbPut(course);
  showToast('Saved!', 'Your notes have been saved.', 'success');
}

async function updateProgress(pct) {
  const course = await dbGet(reviewerCourseId);
  if (!course) return;
  if ((course.progress || 0) >= pct) return;
  course.progress = pct;
  if (pct >= 100) course.status = 'completed';
  await dbPut(course);
  await refreshCourses();
}

/* ── View toggle ── */
function toggleView() {
  listView = !listView;
  const container = document.getElementById('userCoursesContainer');
  const folders = container.querySelectorAll('.strand-folder');
  
  folders.forEach(folder => {
    const content = folder.querySelector('.strand-folder-content');
    const grid = content.querySelector('.courses-grid');
    
    if (listView) {
      grid.style.display = 'none';
      let list = content.querySelector('.courses-list');
      if (!list) {
        const courses = allCourses.filter(c => c.category === folder.dataset.strand);
        list = document.createElement('div');
        list.className = 'courses-list active';
        list.innerHTML = courses.map(c => renderListItem(c)).join('');
        content.appendChild(list);
      } else {
        list.style.display = 'flex';
      }
    } else {
      grid.style.display = 'grid';
      const list = content.querySelector('.courses-list');
      if (list) list.style.display = 'none';
    }
  });
  
  const btn = document.querySelector('.filter-actions .btn-outline');
  btn.textContent = listView ? '⊞ Grid View' : '☰ List View';
}

function renderListItem(c) {
  const ft = fileTypeInfo(c.fileName);
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
    </div>
  `;
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

/* ── Toast ── */
function showToast(title, msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'i', warning: '!' };
  t.innerHTML = `
    <span class="toast-icon">${icons[type] || 'i'}</span>
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
    const sb = document.getElementById('sidebar');
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
       href="${m.pdf}"
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
  const btn = document.getElementById('builtinToggleBtn');

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
