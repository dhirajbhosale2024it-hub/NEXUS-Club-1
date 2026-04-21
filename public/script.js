// ===== MOBILE MENU =====
function toggleMobile() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('open');
}

function closeMobile() {
  document.getElementById('mobileMenu').classList.remove('open');
}

// ===== EVENTS TAB =====
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  btn.classList.add('active');
}

// ===== GALLERY FILTER =====
function filterGallery(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.gallery-item').forEach((item) => {
    if (cat === 'all' || item.dataset.cat === cat) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

// ===== LIGHTBOX =====
function openLightbox(imgSrc, title, sub) {
  var img = document.getElementById('lightboxImg');
  if (img) { img.src = imgSrc; img.alt = title; }
  document.getElementById('lightboxTitle').textContent = title;
  document.getElementById('lightboxSub').textContent = sub;
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(e) {
  if (
    !e ||
    e.target === document.getElementById('lightbox') ||
    e.target.classList.contains('lightbox-close')
  ) {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ===== JOIN FORM VALIDATION =====
function validateField(id, errId, msg, extraCheck) {
  const el = document.getElementById(id);
  const err = document.getElementById(errId);
  const val = el.value.trim();
  if (!val || (extraCheck && !extraCheck(val))) {
    el.classList.add('error');
    err.textContent = msg;
    return false;
  }
  el.classList.remove('error');
  err.textContent = '';
  return true;
}

async function submitJoinForm() {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRe = /^[0-9+\s\-]{7,15}$/;
  const checks = [
    validateField('j_name', 'err_name', 'Please enter your full name.'),
    validateField('j_email', 'err_email', 'Please enter a valid email.', (v) => emailRe.test(v)),
    validateField('j_phone', 'err_phone', 'Please enter a valid phone number.', (v) =>
      phoneRe.test(v)
    ),
    validateField('j_dept', 'err_dept', 'Please select your department.'),
    validateField('j_year', 'err_year', 'Please select your year of study.'),
    validateField('j_interest', 'err_interest', 'Please select an area of interest.'),
  ];
  if (!checks.every(Boolean)) return;

  // Collect data
  const data = {
    name: document.getElementById('j_name').value.trim(),
    email: document.getElementById('j_email').value.trim(),
    phone: document.getElementById('j_phone').value.trim(),
    dept: document.getElementById('j_dept').value,
    year: document.getElementById('j_year').value,
    interest: document.getElementById('j_interest').value
  };

  // Disable button
  const btn = document.querySelector('#joinFormContent button');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      document.getElementById('joinFormContent').style.display = 'none';
      document.getElementById('joinSuccess').classList.add('show');
    } else {
      // Show error
      document.getElementById('err_email').textContent = result.message;
      document.getElementById('j_email').classList.add('error');
      btn.disabled = false;
      btn.textContent = 'Submit Registration';
    }
  } catch (err) {
    console.error(err);
    document.getElementById('err_email').textContent = 'Network error. Please try again.';
    document.getElementById('j_email').classList.add('error');
    btn.disabled = false;
    btn.textContent = 'Submit Registration';
  }
}

function resetJoinForm() {
  const fc = document.getElementById('joinFormContent');
  const fs = document.getElementById('joinSuccess');
  if (fc && fs) {
    fc.style.display = '';
    fs.classList.remove('show');
    ['j_name', 'j_email', 'j_phone', 'j_dept', 'j_year', 'j_interest'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = '';
        el.classList.remove('error');
      }
    });
    ['err_name', 'err_email', 'err_phone', 'err_dept', 'err_year', 'err_interest'].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
      }
    );
  }
}

// ===== CONTACT FORM VALIDATION =====
function submitContact() {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const checks = [
    validateField('c_name', 'cerr_name', 'Please enter your name.'),
    validateField('c_email', 'cerr_email', 'Please enter a valid email.', (v) => emailRe.test(v)),
    validateField('c_msg', 'cerr_msg', 'Please enter your message.'),
  ];
  if (checks.every(Boolean)) {
    document.getElementById('contactFormContent').style.display = 'none';
    document.getElementById('contactSuccess').classList.add('show');
  }
}

function resetContactForm() {
  document.getElementById('contactFormContent').style.display = '';
  document.getElementById('contactSuccess').classList.remove('show');
  ['c_name', 'c_email', 'c_msg'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      el.classList.remove('error');
    }
  });
  ['cerr_name', 'cerr_email', 'cerr_msg'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

// ===== INPUT LIVE VALIDATION =====
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    el.addEventListener('input', () => {
      el.classList.remove('error');
      const errId = el.id.replace(/^(j_|c_)/, (match) =>
        match === 'j_' ? 'err_' : 'cerr_'
      );
      const errEl = document.getElementById(errId);
      if (errEl) errEl.textContent = '';
    });
  });

  // Close mobile menu on outside click
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('mobileMenu');
    const hamburger = document.getElementById('hamburger');
    if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
      menu.classList.remove('open');
    }
  });
});