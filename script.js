const { createClient } = supabase;
const client = createClient(
  'https://tiyapgnehlwbhhzqqumq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpeWFwZ25laGx3YmhoenFxdW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzExMTYsImV4cCI6MjA4NzMwNzExNn0.Y4VgYUS6XDh_XYKPc1wi2TcFi3s5KKglo6ouNdriwRg'
);

window.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await client.auth.getUser();
  if (user && user.email_confirmed_at) {
    window.location.href = 'dashboard.html';
  }

  animateStats();
  setupScrollReveal();
});

// nav scroll behavior
let lastScroll = 0;
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  if (currentScroll > lastScroll && currentScroll > 100) {
    navbar.classList.add('hidden');
  } else {
    navbar.classList.remove('hidden');
  }

  lastScroll = currentScroll;
});

// mobile menu toggle
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

hamburger.addEventListener('click', () => {
  navMenu.classList.toggle('mobile-open');
  hamburger.textContent = navMenu.classList.contains('mobile-open') ? '✕' : '☰';
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('mobile-open');
    hamburger.textContent = '☰';
  });
});

// active nav link
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', function() {
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    this.classList.add('active');
  });
});

// notification system
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// modal functions
function openLoginModal() {
  document.getElementById('loginModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.remove('active');
  document.body.style.overflow = '';
  resetForm('loginForm');
}

function openSignupModal() {
  document.getElementById('signupModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSignupModal() {
  document.getElementById('signupModal').classList.remove('active');
  document.body.style.overflow = '';
  resetForm('signupForm');
}

function switchToSignup() {
  closeLoginModal();
  setTimeout(openSignupModal, 100);
}

function switchToLogin() {
  closeSignupModal();
  setTimeout(openLoginModal, 100);
}

function resetForm(formId) {
  const form = document.getElementById(formId);
  form.reset();
  form.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
  form.querySelectorAll('input').forEach(el => el.classList.remove('error'));
}

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    closeLoginModal();
    closeSignupModal();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLoginModal();
    closeSignupModal();
  }
});

// form validation
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateForm(formId) {
  const form = document.getElementById(formId);
  let isValid = true;

  const email = form.querySelector('input[type="email"]');
  const password = form.querySelector('input[type="password"]');

  if (email) {
    if (!validateEmail(email.value)) {
      const emailErrEl = document.getElementById(`${formId}EmailError`);
      if (emailErrEl) { email.classList.add('error'); emailErrEl.classList.add('show'); }
      isValid = false;
    } else {
      const emailErrEl = document.getElementById(`${formId}EmailError`);
      if (emailErrEl) { email.classList.remove('error'); emailErrEl.classList.remove('show'); }
    }
  }

  if (password) {
    if (password.value.length < 6) {
      const passErrEl = document.getElementById(`${formId}PasswordError`);
      if (passErrEl) { password.classList.add('error'); passErrEl.classList.add('show'); }
      isValid = false;
    } else {
      const passErrEl = document.getElementById(`${formId}PasswordError`);
      if (passErrEl) { password.classList.remove('error'); passErrEl.classList.remove('show'); }
    }
  }

  return isValid;
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

// auth handlers
async function handleLogin(event) {
  event.preventDefault();
  if (!validateForm('loginForm')) return;

  setLoading('loginBtn', true);

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        showToast('Email not confirmed', 'Please check your inbox and confirm your email.', 'warning');
      } else {
        showToast('Invalid credentials', 'Please check your email and password.', 'error');
      }
    } else if (!data.user.email_confirmed_at) {
      showToast('Email not confirmed', 'Please confirm your email before logging in.', 'warning');
    } else {
      showToast('Welcome back!', 'Redirecting to your dashboard...', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    }
  } catch (err) {
    showToast('Error', 'Something went wrong. Please try again.', 'error');
  } finally {
    setLoading('loginBtn', false);
  }
}

// the "Database error saving new user" was caused by a missing trigger or profile table.
// this need some fixing (‼️)
async function handleSignup(event) {
  event.preventDefault();
  if (!validateForm('signupForm')) return;

  setLoading('signupBtn', true);

  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }  // stored in auth.users user_metadata
      }
    });

    if (error) {
      // handle specific known errors with friendly messages
      if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
        showToast('Email already in use', 'Try logging in instead.', 'warning');
      } else if (error.message.includes('Password should be')) {
        showToast('Weak password', 'Please use at least 6 characters.', 'error');
      } else {
        showToast('Signup failed', error.message, 'error');
      }
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      // supabase returns an empty identities array when the email already exists
      showToast('Email already in use', 'Try logging in instead.', 'warning');
    } else {
      localStorage.setItem('username', name);
      showToast('Account created! 🎉', 'Check your email to confirm your account before logging in.', 'success');
      setTimeout(() => {
        closeSignupModal();
        openLoginModal();
      }, 2500);
    }
  } catch (err) {
    console.error('Signup error:', err);
    showToast('Error', 'Something went wrong. Please try again.', 'error');
  } finally {
    setLoading('signupBtn', false);
  }
}

// utility functions
function startLearning()    { openLoginModal(); }
function scrollToCourses()  { document.getElementById('courses').scrollIntoView({ behavior: 'smooth' }); }
function showFeature(name)  { showToast('Coming soon', `${name} details page is under construction.`, 'info'); }
function showCourse(name)   { showToast('Enrollment', `Opening ${name} enrollment...`, 'info'); }

// stats animation
function animateStats() {
  const stats = document.querySelectorAll('.stat-number');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.target);
        animateValue(entry.target, 0, target, 2000);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(stat => observer.observe(stat));
}

function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const value = Math.floor(progress * (end - start) + start);
    obj.innerHTML = value + (end === 90 ? '%' : '+');
    if (progress < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

// animation while scrolling
function setupScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('active'), index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  reveals.forEach(el => observer.observe(el));
}