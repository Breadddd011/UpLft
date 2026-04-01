:root {
  --bg-primary:    #0a0a0a;
  --bg-secondary:  #111111;
  --bg-tertiary:   #1a1a1a;
  --bg-card:       #141414;
  --bg-hover:      #1f1f1f;

  --text-primary:   #ffffff;
  --text-secondary: #a1a1aa;
  --text-muted:     #71717a;

  --border:       #27272a;
  --border-light: #3f3f46;

  --accent:       #ffffff;
  --accent-hover: #e4e4e7;

  --success: #22c55e;
  --error:   #ef4444;
  --warning: #f59e0b;
  --info:    #3b82f6;

  --gradient-1: #fafafa;
  --gradient-2: #a1a1aa;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.5);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5);
  --shadow-glow: 0 0 20px rgba(255,255,255,0.08);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  --transition: all 0.3s cubic-bezier(0.4,0,0.2,1);

  --sidebar-w: 240px;
  --nav-h: 60px;
}

* { margin:0; padding:0; box-sizing:border-box; }
html { scroll-behavior:smooth; }

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

::selection { background: rgba(255,255,255,0.15); }

/* ── Top Nav ── */
.top-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--nav-h);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(10,10,10,0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-toggle {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
  line-height: 1;
}

.menu-toggle:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.logo {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, var(--gradient-1), var(--gradient-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-search {
  position: relative;
  flex: 1;
  max-width: 360px;
  margin: 0 24px;
}

.nav-search input {
  width: 100%;
  padding: 8px 14px 8px 36px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary);
  transition: var(--transition);
}

.nav-search input::placeholder { color: var(--text-muted); }

.nav-search input:focus {
  outline: none;
  border-color: var(--border-light);
  background: var(--bg-card);
}

.nav-search .search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--text-muted);
  pointer-events: none;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Notification ── */
.notification-wrapper { position: relative; }

.notif-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  padding: 7px 9px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
  position: relative;
}

.notif-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.notif-badge {
  position: absolute;
  top: 4px; right: 4px;
  width: 8px; height: 8px;
  background: var(--error);
  border-radius: 50%;
  border: 2px solid var(--bg-primary);
  display: none;
}

.notif-badge.active { display: block; }

.notif-dropdown {
  display: none;
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 300px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 999;
  overflow: hidden;
  animation: dropIn 0.2s ease;
}

.notif-dropdown.open { display: block; }

.notif-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.notif-mark-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
  transition: var(--transition);
}

.notif-mark-btn:hover { color: var(--text-primary); }

.notif-list { max-height: 260px; overflow-y: auto; }

.notif-item {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: var(--transition);
  align-items: flex-start;
}

.notif-item:hover { background: var(--bg-tertiary); }
.notif-item.unread { background: rgba(255,255,255,0.02); }

.notif-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--border-light);
  margin-top: 5px;
  flex-shrink: 0;
}

.notif-item.unread .notif-dot { background: var(--accent); }

.notif-msg { font-size: 13px; color: var(--text-secondary); line-height: 1.4; }
.notif-time { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.notif-empty { padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px; }

/* ── User Menu ── */
.user-menu-wrapper { position: relative; }

.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 5px 10px 5px 5px;
  cursor: pointer;
  transition: var(--transition);
}

.user-btn:hover {
  border-color: var(--border-light);
  background: var(--bg-tertiary);
}

.user-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3f3f46, #71717a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-dropdown {
  display: none;
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 999;
  overflow: hidden;
  animation: dropIn 0.2s ease;
}

.user-dropdown.open { display: block; }

.user-dropdown-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.user-dropdown-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3f3f46, #71717a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  flex-shrink: 0;
}

.user-dropdown-avatar img {
  width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.user-dropdown-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.user-dropdown-email { font-size: 11px; color: var(--text-muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }

.user-dropdown-divider { height: 1px; background: var(--border); }

.user-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: var(--transition);
}

.user-dropdown-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.user-dropdown-item.danger { color: var(--error); }
.user-dropdown-item.danger:hover { background: rgba(239,68,68,0.08); color: var(--error); }

/* ── Layout ── */
.layout {
  display: flex;
  padding-top: var(--nav-h);
  min-height: 100vh;
}

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  position: fixed;
  top: var(--nav-h);
  left: 0;
  bottom: 0;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  overflow-x: hidden;
  transition: transform 0.3s ease, width 0.3s ease;
  z-index: 400;
  padding: 16px 0;
}

.sidebar.collapsed { width: 60px; }

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 10px;
}

.sidebar-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: 12px 8px 6px;
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.2s;
}

.sidebar.collapsed .sidebar-label { opacity: 0; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
  overflow: hidden;
  position: relative;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0; top: 20%; bottom: 20%;
  width: 2px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.nav-text {
  flex: 1;
  transition: opacity 0.2s;
}

.sidebar.collapsed .nav-text { opacity: 0; pointer-events: none; }

.sidebar-divider {
  height: 1px;
  background: var(--border);
  margin: 8px 0;
}

/* ── Main Content ── */
.main-content {
  flex: 1;
  margin-left: var(--sidebar-w);
  transition: margin-left 0.3s ease;
  min-height: calc(100vh - var(--nav-h));
  padding: 28px 32px;
}

.main-content.sidebar-collapsed { margin-left: 60px; }

/* ── Page Header ── */
.page-header {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px 32px;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.5s ease both;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 80% 50%, rgba(255,255,255,0.03) 0%, transparent 60%);
  pointer-events: none;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 6px;
}

.page-header p {
  font-size: 14px;
  color: var(--text-secondary);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.breadcrumb a {
  color: var(--text-muted);
  text-decoration: none;
  transition: var(--transition);
}

.breadcrumb a:hover { color: var(--text-primary); }
.breadcrumb .current { color: var(--text-primary); font-weight: 500; }

/* ── Filter Bar ── */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  animation: fadeInUp 0.5s ease 0.1s both;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tab {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
  font-family: inherit;
}

.filter-tab:hover {
  border-color: var(--border-light);
  color: var(--text-primary);
}

.filter-tab.active {
  background: var(--accent);
  color: var(--bg-primary);
  border-color: var(--accent);
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 9px 18px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  border: none;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;
}

.btn-primary {
  background: var(--accent);
  color: var(--bg-primary);
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow);
}

.btn-outline {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-light);
}

.btn-outline:hover {
  background: var(--bg-tertiary);
  border-color: var(--text-muted);
}

/* ── Course Grid ── */
.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
  animation: fadeInUp 0.5s ease 0.2s both;
}

.course-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: var(--transition);
  display: flex;
  flex-direction: column;
}

.course-card:hover {
  border-color: var(--border-light);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.course-image {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  position: relative;
  overflow: hidden;
}

.course-image::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(to bottom, transparent 0%, var(--bg-secondary) 100%);
  opacity: 0.6;
}

.course-content {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.course-category {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.course-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.4;
}

.course-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 16px;
  flex: 1;
}

.course-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.course-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.course-progress {
  margin-bottom: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.progress-label {
  color: var(--text-muted);
  font-weight: 500;
}

.progress-value {
  color: var(--text-primary);
  font-weight: 700;
}

.progress-track {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 99px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--text-muted), var(--accent));
  transition: width 0.8s ease;
  position: relative;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.course-actions {
  display: flex;
  gap: 10px;
}

.course-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  border: none;
  font-family: inherit;
  text-align: center;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.course-btn-primary {
  background: var(--accent);
  color: var(--bg-primary);
}

.course-btn-primary:hover {
  background: var(--accent-hover);
}

.course-btn-outline {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.course-btn-outline:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--border-light);
}

/* ── List View ── */
.courses-list {
  display: none;
  flex-direction: column;
  gap: 12px;
  animation: fadeInUp 0.5s ease 0.2s both;
}

.courses-list.active {
  display: flex;
}

.course-list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: var(--transition);
}

.course-list-item:hover {
  border-color: var(--border-light);
  background: var(--bg-hover);
}

.course-list-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  border: 1px solid var(--border);
}

.course-list-info {
  flex: 1;
  min-width: 0;
}

.course-list-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.course-list-meta {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  gap: 12px;
}

.course-list-progress {
  width: 120px;
  flex-shrink: 0;
}

.course-list-bar {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 4px;
}

.course-list-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--accent);
}

.course-list-pct {
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
  font-weight: 600;
}

.course-list-actions {
  display: flex;
  gap: 8px;
}

.course-list-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  font-family: inherit;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.course-list-btn:hover {
  background: var(--accent);
  color: var(--bg-primary);
  border-color: var(--accent);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  animation: fadeInUp 0.5s ease both;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

/* ── Animations ── */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes dropIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* ── Responsive ── */
@media (max-width: 1100px) {
  .courses-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    width: var(--sidebar-w) !important;
  }

  .sidebar.mobile-open { transform: translateX(0); }

  .main-content {
    margin-left: 0 !important;
    padding: 20px 16px;
  }

  .nav-search { display: none; }

  .page-header { padding: 20px 24px; }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .courses-grid { grid-template-columns: 1fr; }
  .course-list-item { flex-wrap: wrap; }
  .course-list-progress { width: 100%; order: 3; }
  .course-list-actions { width: 100%; order: 4; justify-content: flex-end; }
}

@media (max-width: 480px) {
  .user-name { display: none; }
  .course-actions { flex-direction: column; }
}

/* ── Modal ── */
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}

.modal.active {
  display: flex;
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.modal-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
}

/* ── Form ── */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13px;
  color: var(--text-primary);
  transition: var(--transition);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: var(--text-muted);
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--border-light);
  background: var(--bg-card);
}

.file-input-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.file-input-wrapper input[type="file"] {
  display: none;
}

.file-input-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  background: var(--bg-tertiary);
  border: 2px dashed var(--border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
  flex-direction: column;
}

.file-input-label:hover {
  background: var(--bg-card);
  border-color: var(--accent);
}

.file-input-icon {
  font-size: 28px;
}

.file-input-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.file-name {
  font-size: 12px;
  color: var(--success);
  margin-top: 8px;
  font-weight: 500;
}

.file-help {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  justify-content: flex-end;
}

.form-actions .btn {
  padding: 10px 20px;
  font-size: 13px;
}

/* ── Responsive Modal ── */
@media (max-width: 600px) {
  .modal-content {
    width: 95%;
    max-height: 95vh;
  }

  .modal-header,
  .modal-body {
    padding: 16px;
  }

  .file-input-label {
    padding: 24px;
  }
}

 /* AI Reviewer Modal */
    .reviewer-modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 2000;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    }
    .reviewer-modal-overlay.active { display: flex; }

    .reviewer-modal {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      width: 92%;
      max-width: 860px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 64px rgba(0,0,0,0.8);
      animation: slideIn 0.3s ease;
      overflow: hidden;
    }

    .reviewer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .reviewer-header-left { display: flex; align-items: center; gap: 12px; }
    .reviewer-course-icon {
      width: 40px; height: 40px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .reviewer-course-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .reviewer-course-sub  { font-size: 12px; color: var(--text-muted); margin-top: 1px; }

    .reviewer-tabs {
      display: flex;
      gap: 4px;
      padding: 12px 24px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-primary);
      flex-shrink: 0;
      overflow-x: auto;
    }
    .reviewer-tab {
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      border: 1px solid transparent;
      background: none;
      color: var(--text-muted);
      white-space: nowrap;
      font-family: inherit;
    }
    .reviewer-tab:hover { background: var(--bg-tertiary); color: var(--text-secondary); }
    .reviewer-tab.active { background: var(--bg-tertiary); color: var(--text-primary); border-color: var(--border-light); }

    .reviewer-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    /* summary tab */
    .summary-section { margin-bottom: 28px; }
    .summary-section h3 {
      font-size: 13px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-muted);
      margin-bottom: 12px;
    }
    .summary-content {
      font-size: 14px; line-height: 1.8;
      color: var(--text-secondary);
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px;
    }
    .key-points-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    .key-points-list li {
      display: flex; gap: 10px; align-items: flex-start;
      font-size: 14px; color: var(--text-secondary); line-height: 1.6;
    }
    .key-points-list li::before {
      content: '◆'; color: var(--text-muted); font-size: 8px;
      margin-top: 6px; flex-shrink: 0;
    }

    /* flashcards tab */
    .flashcard-nav {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px;
    }
    .flashcard-counter { font-size: 13px; color: var(--text-muted); font-weight: 600; }
    .flashcard-nav-btns { display: flex; gap: 8px; }
    .flashcard-nav-btn {
      padding: 6px 14px; border-radius: 8px; font-size: 13px;
      font-weight: 600; cursor: pointer; transition: var(--transition);
      border: 1px solid var(--border); background: var(--bg-tertiary);
      color: var(--text-secondary); font-family: inherit;
    }
    .flashcard-nav-btn:hover:not(:disabled) { background: var(--accent); color: var(--bg-primary); border-color: var(--accent); }
    .flashcard-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .flashcard-scene {
      perspective: 1000px;
      height: 240px;
      cursor: pointer;
      margin-bottom: 16px;
    }
    .flashcard-inner {
      position: relative;
      width: 100%; height: 100%;
      transition: transform 0.55s cubic-bezier(0.4,0,0.2,1);
      transform-style: preserve-3d;
    }
    .flashcard-inner.flipped { transform: rotateY(180deg); }
    .flashcard-front, .flashcard-back {
      position: absolute; inset: 0;
      backface-visibility: hidden;
      border-radius: var(--radius-md);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 28px;
      text-align: center;
      border: 1px solid var(--border);
    }
    .flashcard-front {
      background: var(--bg-tertiary);
    }
    .flashcard-back {
      background: var(--bg-card);
      transform: rotateY(180deg);
      border-color: var(--border-light);
    }
    .flashcard-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; color: var(--text-muted);
      margin-bottom: 16px;
    }
    .flashcard-text { font-size: 16px; font-weight: 600; color: var(--text-primary); line-height: 1.5; }
    .flashcard-hint { font-size: 11px; color: var(--text-muted); margin-top: 16px; }

    .flashcard-progress-bar {
      height: 3px; background: var(--bg-tertiary); border-radius: 99px; overflow: hidden;
    }
    .flashcard-progress-fill { height: 100%; background: var(--accent); border-radius: 99px; transition: width 0.3s ease; }

    /* quiz tab */
    .quiz-question-card {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 20px;
      margin-bottom: 16px;
    }
    .quiz-q-num { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 10px; }
    .quiz-q-text { font-size: 15px; font-weight: 600; color: var(--text-primary); line-height: 1.5; margin-bottom: 16px; }
    .quiz-options { display: flex; flex-direction: column; gap: 8px; }
    .quiz-option {
      padding: 11px 16px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--bg-card);
      font-size: 13px; color: var(--text-secondary);
      cursor: pointer; transition: var(--transition);
      display: flex; align-items: center; gap: 10px;
      font-family: inherit; text-align: left; width: 100%;
    }
    .quiz-option:hover:not(.locked) { border-color: var(--border-light); color: var(--text-primary); background: var(--bg-hover); }
    .quiz-option.correct { border-color: var(--success); background: rgba(34,197,94,0.08); color: var(--success); }
    .quiz-option.wrong   { border-color: var(--error);   background: rgba(239,68,68,0.08);  color: var(--error);   }
    .quiz-option.locked  { cursor: not-allowed; }
    .quiz-option-letter {
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--bg-tertiary); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .quiz-explanation {
      margin-top: 12px; padding: 12px 14px;
      background: var(--bg-card); border-radius: var(--radius-sm);
      font-size: 13px; color: var(--text-secondary); line-height: 1.6;
      border-left: 3px solid var(--border-light);
      display: none;
    }
    .quiz-explanation.show { display: block; }
    .quiz-score-banner {
      padding: 20px; background: var(--bg-tertiary); border: 1px solid var(--border);
      border-radius: var(--radius-md); text-align: center; margin-bottom: 20px;
    }
    .quiz-score-num { font-size: 36px; font-weight: 800; color: var(--text-primary); }
    .quiz-score-label { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

    /* loading state */
    .ai-loading {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 60px 20px; gap: 16px;
    }
    .ai-loading-spinner {
      width: 36px; height: 36px;
      border: 3px solid var(--border);
      border-top-color: var(--text-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ai-loading-text { font-size: 14px; color: var(--text-muted); }

    /* delete confirm overlay */
    .delete-confirm {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.8);
      z-index: 3000;
      align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
    }
    .delete-confirm.active { display: flex; }
    .delete-confirm-box {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 28px; max-width: 380px; width: 90%;
      text-align: center;
      animation: slideIn 0.25s ease;
    }
    .delete-confirm-box h3 { font-size: 17px; font-weight: 700; margin-bottom: 10px; }
    .delete-confirm-box p  { font-size: 13px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.6; }
    .delete-confirm-btns   { display: flex; gap: 10px; justify-content: center; }

    /* toast */
    .toast-container {
      position: fixed; bottom: 24px; right: 24px;
      z-index: 9999; display: flex; flex-direction: column; gap: 10px;
    }
    .toast {
      display: flex; align-items: flex-start; gap: 12px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 14px 18px;
      box-shadow: var(--shadow-lg); min-width: 260px; max-width: 360px;
      animation: slideInRight 0.3s ease;
    }
    @keyframes slideInRight { from { opacity:0; transform: translateX(24px); } }
    .toast.success { border-color: var(--success); }
    .toast.error   { border-color: var(--error); }
    .toast-icon { font-size: 16px; flex-shrink:0; margin-top:1px; }
    .toast-title { font-size: 13px; font-weight:700; color: var(--text-primary); }
    .toast-msg   { font-size: 12px; color: var(--text-muted); margin-top:2px; }

    /* course card delete btn */
    .course-delete-btn {
      position: absolute; top: 10px; right: 10px;
      width: 28px; height: 28px;
      background: rgba(10,10,10,0.7); border: 1px solid var(--border);
      border-radius: 6px; cursor: pointer; display: none;
      align-items: center; justify-content: center;
      font-size: 14px; color: var(--text-muted);
      transition: var(--transition); z-index: 2;
    }
    .course-card:hover .course-delete-btn { display: flex; }
    .course-delete-btn:hover { background: var(--error); color: #fff; border-color: var(--error); }

    .course-card { position: relative; }

    /* file type badge */
    .file-type-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 5px;
      font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .file-type-badge.pdf  { background: rgba(239,68,68,0.12);  color: #ef4444; }
    .file-type-badge.pptx { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .file-type-badge.docx { background: rgba(59,130,246,0.12); color: #3b82f6; }
    .file-type-badge.txt  { background: rgba(113,113,122,0.2); color: #a1a1aa; }
    .file-type-badge.other{ background: rgba(113,113,122,0.2); color: #a1a1aa; }

    /* upload progress */
    .upload-progress-wrap {
      margin-top: 12px; display: none;
    }
    .upload-progress-wrap.show { display: block; }
    .upload-progress-bar {
      height: 4px; background: var(--bg-tertiary); border-radius: 99px; overflow: hidden;
    }
    .upload-progress-fill {
      height: 100%; background: var(--accent); border-radius: 99px;
      transition: width 0.4s ease; width: 0%;
    }
    .upload-progress-label { font-size: 11px; color: var(--text-muted); margin-top: 6px; }

    /* notes textarea in reviewer */
    .notes-area {
      width: 100%; min-height: 180px; padding: 14px;
      background: var(--bg-tertiary); border: 1px solid var(--border);
      border-radius: var(--radius-md); font-family: inherit;
      font-size: 14px; color: var(--text-primary); resize: vertical;
      transition: var(--transition); line-height: 1.7;
    }
    .notes-area:focus { outline: none; border-color: var(--border-light); background: var(--bg-card); }
    .notes-area::placeholder { color: var(--text-muted); }
    .notes-save-btn {
      margin-top: 10px;
      padding: 8px 18px; border-radius: 8px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      border: 1px solid var(--border); background: var(--bg-tertiary);
      color: var(--text-secondary); font-family: inherit;
      transition: var(--transition);
    }
    .notes-save-btn:hover { background: var(--accent); color: var(--bg-primary); border-color: var(--accent); }

