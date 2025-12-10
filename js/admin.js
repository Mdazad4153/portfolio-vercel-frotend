const API = 'http://localhost:5000/api';
let token = localStorage.getItem('adminToken');
const PLACEHOLDER_IMAGE = 'assets/profile-placeholder.svg';

// Delete confirmation state
let pendingDelete = null;

// Login attempt tracking
let loginAttempts = parseInt(localStorage.getItem('loginAttempts') || '0');

const loginPage = document.getElementById('loginPage');
const dashboard = document.getElementById('dashboard');
const sidebar = document.getElementById('sidebar');

document.addEventListener('DOMContentLoaded', () => {
  initLoginFeatures(); // Professional login features
  if (token) checkAuth();
  else showLogin();
  setupEvents();
  initTheme();
});

// Initialize professional login features
function initLoginFeatures() {
  // Caps Lock Detection
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(input => {
    input.addEventListener('keyup', (e) => {
      const warning = document.getElementById('capslockWarning');
      if (warning && e.getModifierState && e.getModifierState('CapsLock')) {
        warning.style.display = 'flex';
      } else if (warning) {
        warning.style.display = 'none';
      }
    });
  });

  // Remember Me - Load saved email
  const savedEmail = localStorage.getItem('rememberedEmail');
  const rememberCheckbox = document.getElementById('rememberMe');
  const emailInput = document.getElementById('loginEmail');

  if (savedEmail && emailInput) {
    emailInput.value = savedEmail;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  // Password Strength for Reset Form
  const resetNewPass = document.getElementById('resetNewPass');
  if (resetNewPass) {
    resetNewPass.addEventListener('input', checkPasswordStrength);
  }

  // Password Match Check
  const resetConfirmPass = document.getElementById('resetConfirmPass');
  if (resetConfirmPass) {
    resetConfirmPass.addEventListener('input', checkPasswordMatch);
  }

  // Show login attempts warning if needed
  if (loginAttempts >= 3) {
    showLoginAttempts();
  }
}

function setupEvents() {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('menuToggle').addEventListener('click', () => sidebar.classList.add('active'));
  document.getElementById('sidebarClose').addEventListener('click', () => sidebar.classList.remove('active'));
  document.getElementById('availableToggle').addEventListener('change', toggleAvailable);

  // Theme selector
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      setTheme(theme);
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const page = item.dataset.page;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(page + 'Page').classList.add('active');
      document.getElementById('pageTitle').textContent = item.querySelector('span').textContent;
      sidebar.classList.remove('active');
    });
  });

  document.getElementById('profileForm')?.addEventListener('submit', saveProfile);

  // Photo upload
  document.getElementById('photoInput')?.addEventListener('change', handlePhotoSelect);
  // removePhotoBtn is handled by global event delegation below

  // Resume upload
  document.getElementById('resumeInput')?.addEventListener('change', handleResumeUpload);
  document.getElementById('downloadResumeBtn')?.addEventListener('click', downloadResume);
  // removeResumeBtn is handled by global event delegation below

  // Forgot Password Link -> Show Reset Card
  document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('resetCard').style.display = 'block';
  });

  // Back to Login Link -> Show Login Card
  document.getElementById('backToLoginLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('resetCard').style.display = 'none';
    document.getElementById('loginCard').style.display = 'block';
  });

  document.getElementById('resetForm').addEventListener('submit', handleResetPassword);

  // ================================
  // GLOBAL EVENT DELEGATION
  // ================================
  // This handles all dynamically generated buttons
  // Instead of adding individual event listeners to each button,
  // we use one listener on the body element for better performance
  document.body.addEventListener('click', (e) => {
    // Check if clicked element is a delete button (or inside one)
    const deleteBtn = e.target.closest('.btn-delete');

    if (deleteBtn) {
      // Extract the endpoint and ID from data attributes
      // Example: <button class="btn-delete" data-endpoint="skills" data-id="123abc">
      const endpoint = deleteBtn.dataset.endpoint;
      const id = deleteBtn.dataset.id;

      // Validate and call deleteItem function
      if (endpoint && id) {
        deleteItem(endpoint, id);
      } else {
        console.error('Delete button missing data-endpoint or data-id attributes');
        showToast('⚠️ Delete button configuration error');
      }
      return;
    }

    // Handle Resume Remove Button
    if (e.target.closest('#removeResumeBtn')) {
      console.log('📄 Resume remove button clicked via delegation');
      const modal = document.getElementById('resumeRemoveModal');
      if (modal) {
        modal.classList.add('active');
        console.log('📄 Resume remove modal opened');
      }
      return;
    }

    // Handle Photo Remove Button  
    if (e.target.closest('#removePhotoBtn')) {
      console.log('📸 Photo remove button clicked via delegation');
      const modal = document.getElementById('photoRemoveModal');
      if (modal) {
        modal.classList.add('active');
        console.log('📸 Photo remove modal opened');
      }
      return;
    }
    // Handle Text Formatting Buttons (Bold, Italic, Underline)
    const toolBtn = e.target.closest('.btn-tool');
    if (toolBtn) {
      e.preventDefault();
      const field = toolBtn.dataset.field;
      const tag = toolBtn.dataset.tag;
      if (field && tag) {
        wrapSelection(field, tag);
      }
      return;
    }
  });

  // Prevent focus loss when clicking tool buttons (Important for text selection)
  document.body.addEventListener('mousedown', (e) => {
    if (e.target.closest('.btn-tool')) {
      e.preventDefault();
    }
  });

  // Delete modal event listeners

  const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
  const deleteCancelBtn = document.getElementById('deleteCancelBtn');
  const deleteModal = document.getElementById('deleteConfirmModal');

  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', confirmDelete);
  }

  if (deleteCancelBtn) {
    deleteCancelBtn.addEventListener('click', cancelDelete);
  }

  if (deleteModal) {
    // Close on backdrop click
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) cancelDelete();
    });
  }

  // Photo remove modal event listeners
  const photoRemoveConfirmBtn = document.getElementById('photoRemoveConfirmBtn');
  const photoRemoveCancelBtn = document.getElementById('photoRemoveCancelBtn');
  const photoRemoveModal = document.getElementById('photoRemoveModal');

  if (photoRemoveConfirmBtn) {
    photoRemoveConfirmBtn.addEventListener('click', confirmPhotoRemove);
  }

  if (photoRemoveCancelBtn) {
    photoRemoveCancelBtn.addEventListener('click', cancelPhotoRemove);
  }

  if (photoRemoveModal) {
    // Close on backdrop click
    photoRemoveModal.addEventListener('click', (e) => {
      if (e.target === photoRemoveModal) cancelPhotoRemove();
    });
  }

  // Resume remove modal event listeners
  const resumeRemoveConfirmBtn = document.getElementById('resumeRemoveConfirmBtn');
  const resumeRemoveCancelBtn = document.getElementById('resumeRemoveCancelBtn');
  const resumeRemoveModal = document.getElementById('resumeRemoveModal');

  if (resumeRemoveConfirmBtn) {
    resumeRemoveConfirmBtn.addEventListener('click', confirmResumeRemove);
  }

  if (resumeRemoveCancelBtn) {
    resumeRemoveCancelBtn.addEventListener('click', cancelResumeRemove);
  }

  if (resumeRemoveModal) {
    // Close on backdrop click
    resumeRemoveModal.addEventListener('click', (e) => {
      if (e.target === resumeRemoveModal) cancelResumeRemove();
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (deleteModal && deleteModal.classList.contains('active')) {
        cancelDelete();
      }
      if (photoRemoveModal && photoRemoveModal.classList.contains('active')) {
        cancelPhotoRemove();
      }
      if (resumeRemoveModal && resumeRemoveModal.classList.contains('active')) {
        cancelResumeRemove();
      }
    }
  });
}

// Password Visibility Toggle
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.parentElement.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

async function handleResetPassword(e) {
  e.preventDefault();
  const form = e.target;
  const email = document.getElementById('resetEmail').value;
  const secretCode = document.getElementById('resetSecret').value;
  const newPassword = document.getElementById('resetNewPass').value;
  const confirmPassword = document.getElementById('resetConfirmPass').value;

  if (newPassword !== confirmPassword) {
    showToast('Passwords do not match');
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';

  try {
    const res = await fetch(`${API}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, secretCode, newPassword })
    });
    const data = await res.json();

    if (res.ok) {
      showToast('✅ Password reset successful! Please login with your new password.');
      // Switch back to login card
      document.getElementById('resetCard').style.display = 'none';
      document.getElementById('loginCard').style.display = 'block';

      // Pre-fill login email for convenience
      const loginEmailInput = document.getElementById('loginEmail');
      if (loginEmailInput) {
        loginEmailInput.value = email;
        loginEmailInput.focus();
      }

      form.reset();
    } else {
      showToast(data.message || 'Reset failed');
    }
  } catch { showToast('Connection error'); }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check-circle"></i> Reset Password';
}

function initTheme() {
  const savedTheme = localStorage.getItem('adminTheme') || 'dark';
  setTheme(savedTheme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === savedTheme);
  });
}

function setTheme(theme) {
  localStorage.setItem('adminTheme', theme);
  if (theme === 'system') {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = systemDark ? 'dark' : 'light';
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (localStorage.getItem('adminTheme') === 'system') {
    document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
  }
});

async function checkAuth() {
  try {
    const res = await fetchAuth('/auth/me');
    if (res.ok) { showDashboard(); loadAllData(); }
    else showLogin();
  } catch { showLogin(); }
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
  btn.disabled = true;

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe')?.checked;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok) {
      token = data.token;
      localStorage.setItem('adminToken', token);

      // Remember Me functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Reset login attempts on successful login
      resetLoginAttempts();

      showDashboard();
      loadAllData();
      showToast('Welcome back! 👋');
    } else if (res.status === 429) {
      // Rate limited - show countdown
      const lockoutSeconds = data.lockoutSeconds || 30;
      showLockoutCountdown(lockoutSeconds, btn);
      showToast('⏱️ Too many attempts! Wait for countdown...');
    } else {
      // Increment failed login attempts
      incrementLoginAttempts();
      showToast(data.message || 'Invalid credentials');
      btn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
      btn.disabled = false;
    }
  } catch {
    showToast('Connection error');
    btn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
    btn.disabled = false;
  }
}

// Show countdown timer when locked out
function showLockoutCountdown(seconds, btn) {
  let remaining = seconds;

  // Create or get lockout message element
  let lockoutMsg = document.getElementById('lockoutMessage');
  if (!lockoutMsg) {
    lockoutMsg = document.createElement('div');
    lockoutMsg.id = 'lockoutMessage';
    lockoutMsg.className = 'lockout-countdown';
    const loginCard = document.getElementById('loginCard');
    if (loginCard) {
      const formGroup = loginCard.querySelector('.form-group');
      if (formGroup) formGroup.parentNode.insertBefore(lockoutMsg, formGroup);
    }
  }

  const updateCountdown = () => {
    if (remaining > 0) {
      lockoutMsg.innerHTML = `
        <div class="countdown-box">
          <i class="fas fa-lock"></i>
          <span>Too many attempts! Retry in <strong>${remaining}s</strong></span>
        </div>
      `;
      lockoutMsg.style.display = 'block';
      btn.innerHTML = `<i class="fas fa-clock"></i> Wait ${remaining}s`;
      btn.disabled = true;
      remaining--;
      setTimeout(updateCountdown, 1000);
    } else {
      lockoutMsg.style.display = 'none';
      btn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
      btn.disabled = false;
      showToast('✅ You can try again now!');
    }
  };

  updateCountdown();
}

function logout() {
  token = null;
  localStorage.removeItem('adminToken');
  showLogin();
  showToast('Logged out');
}

function showLogin() { loginPage.style.display = 'flex'; dashboard.style.display = 'none'; }
function showDashboard() { loginPage.style.display = 'none'; dashboard.style.display = 'flex'; }

async function fetchAuth(url, options = {}) {
  return fetch(`${API}${url}`, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${token}` } });
}

async function loadAllData() {
  loadStats();
  loadProfile();
  loadMedia(); // Load photo and resume
  loadSkills();
  loadEducation();
  loadProjects();
  loadServices();
  loadCertificates();
  loadMessages();
}

async function loadStats() {
  const stats = [
    { url: '/projects/all', id: 'sProjects' },
    { url: '/skills/all', id: 'sSkills' },
    { url: '/contact', id: 'sMessages' },
    { url: '/certificates/all', id: 'sCerts' }
  ];
  for (const s of stats) {
    try {
      const res = await fetchAuth(s.url);
      const data = await res.json();
      document.getElementById(s.id).textContent = Array.isArray(data) ? data.length : 0;
    } catch { }
  }
}

async function toggleAvailable() {
  const isAvailable = document.getElementById('availableToggle').checked;
  try {
    await fetchAuth('/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable })
    });
    showToast(isAvailable ? 'Now available for work! ✅' : 'Status set to not available');
  } catch { showToast('Error updating status'); }
}

async function loadProfile() {
  try {
    const res = await fetch(`${API}/profile`);
    const d = await res.json();
    const f = document.getElementById('profileForm');
    f.name.value = d.name || '';
    f.fullName.value = d.fullName || '';
    f.title.value = d.title || '';
    f.bio.value = d.bio || '';
    f.about.value = d.about || '';
    f.email.value = d.email || '';
    f.phone.value = d.phone || '';
    f.address.value = d.address || '';
    f.github.value = d.socialLinks?.github || '';
    f.linkedin.value = d.socialLinks?.linkedin || '';
    f.twitter.value = d.socialLinks?.twitter || '';
    f.instagram.value = d.socialLinks?.instagram || '';
    f.facebook.value = d.socialLinks?.facebook || '';
    f.youtube.value = d.socialLinks?.youtube || '';
    f.whatsapp.value = d.socialLinks?.whatsapp || '';
    f.telegram.value = d.socialLinks?.telegram || '';
    f.typingTexts.value = (d.typingTexts || []).join(', ');
    f.projectsCompleted.value = d.stats?.projectsCompleted || 0;
    f.yearsExperience.value = d.stats?.yearsExperience || 0;
    f.certificatesEarned.value = d.stats?.certificatesEarned || 0;
    document.getElementById('availableToggle').checked = d.isAvailable !== false;

    // Show current photo or placeholder
    const previewImg = document.getElementById('previewImg');
    const photoInitials = document.getElementById('photoInitials');
    const removeBtn = document.getElementById('removePhotoBtn');
    if (d.profileImage) {
      previewImg.src = d.profileImage.startsWith('http') ? d.profileImage : `${API.replace('/api', '')}${d.profileImage}`;
      previewImg.style.display = 'block';
      if (photoInitials) photoInitials.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
      // Show placeholder SVG when no profile image
      previewImg.src = PLACEHOLDER_IMAGE;
      previewImg.style.display = 'block';
      if (photoInitials) photoInitials.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'none';
    }

    // Show current resume if exists
    if (d.resumeUrl) {
      window.currentResumeUrl = d.resumeUrl;
      const fileName = d.resumeUrl.split('/').pop();
      document.getElementById('resumeStatus').textContent = fileName || 'Resume.pdf';
      document.getElementById('downloadResumeBtn').style.display = 'inline-flex';
      document.getElementById('removeResumeBtn').style.display = 'inline-flex';
    } else {
      document.getElementById('resumeStatus').textContent = 'Upload your resume in PDF format';
      document.getElementById('downloadResumeBtn').style.display = 'none';
      document.getElementById('removeResumeBtn').style.display = 'none';
      window.currentResumeUrl = null;
    }
  } catch { }
}

// Load Media (Photo & Resume) - separate function for Media page
async function loadMedia() {
  try {
    const res = await fetch(`${API}/profile`);
    const d = await res.json();

    // Show current photo or placeholder
    const previewImg = document.getElementById('previewImg');
    const photoInitials = document.getElementById('photoInitials');
    const removeBtn = document.getElementById('removePhotoBtn');
    if (d.profileImage) {
      previewImg.src = d.profileImage.startsWith('http') ? d.profileImage : `${API.replace('/api', '')}${d.profileImage}`;
      previewImg.style.display = 'block';
      if (photoInitials) photoInitials.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
      // Show placeholder SVG when no profile image
      previewImg.src = PLACEHOLDER_IMAGE;
      previewImg.style.display = 'block';
      if (photoInitials) photoInitials.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'none';
    }

    // Show current resume if exists
    if (d.resumeUrl) {
      window.currentResumeUrl = d.resumeUrl;
      const fileName = d.resumeUrl.split('/').pop();
      document.getElementById('resumeStatus').textContent = fileName || 'Resume.pdf';
      document.getElementById('downloadResumeBtn').style.display = 'inline-flex';
      document.getElementById('removeResumeBtn').style.display = 'inline-flex';
    } else {
      document.getElementById('resumeStatus').textContent = 'Upload your resume in PDF format';
      document.getElementById('downloadResumeBtn').style.display = 'none';
      document.getElementById('removeResumeBtn').style.display = 'none';
      window.currentResumeUrl = null;
    }
  } catch { }
}

async function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file');
    e.target.value = '';
    return;
  }

  // Use the photo-cropper.js functionality
  if (typeof openCropper === 'function') {
    openCropper(file);
  } else {
    // Fallback if cropper is missing
    console.error('Photo cropper not loaded');
    showToast('Error: Cropper functionality missing');
  }

  e.target.value = '';
}

// Photo removal with custom modal
async function removePhoto() {
  // Show custom modal instead of browser confirm
  document.getElementById('photoRemoveModal').classList.add('active');
  console.log('📸 Photo remove confirmation shown');
}

// Actually remove the photo (called when user confirms)
async function confirmPhotoRemove() {
  // Close modal
  document.getElementById('photoRemoveModal').classList.remove('active');

  try {
    showToast('⏳ Removing photo...');

    const res = await fetch(`${API}/profile/image`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      document.getElementById('previewImg').src = PLACEHOLDER_IMAGE;
      document.getElementById('removePhotoBtn').style.display = 'none';

      const name = document.querySelector('input[name="name"]').value || 'MA';
      const initialsStr = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

      const initialElem = document.getElementById('photoInitials');
      if (initialElem) {
        initialElem.textContent = initialsStr;
        initialElem.style.display = 'flex';
      }

      showToast('✅ Photo removed successfully!');
      console.log('✅ Photo removed');
    } else {
      showToast('❌ Failed to remove photo');
      console.error('❌ Photo removal failed');
    }
  } catch (error) {
    showToast('❌ Connection error');
    console.error('❌ Photo removal error:', error);
  }
}

// Cancel photo removal
function cancelPhotoRemove() {
  document.getElementById('photoRemoveModal').classList.remove('active');
  showToast('❌ Photo removal cancelled');
  console.log('✖ Photo removal cancelled');
}

// ================================
// RESUME FUNCTIONS
// ================================

// Handle resume upload
async function handleResumeUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    showToast('❌ Please select a PDF file');
    e.target.value = '';
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast('❌ File size must be less than 10MB');
    e.target.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('resume', file);

  try {
    showToast('⏳ Uploading resume...');

    const res = await fetch(`${API}/profile/resume`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      window.currentResumeUrl = data.resumeUrl;
      document.getElementById('resumeStatus').textContent = file.name;
      document.getElementById('downloadResumeBtn').style.display = 'inline-flex';
      document.getElementById('removeResumeBtn').style.display = 'inline-flex';
      showToast('✅ Resume uploaded successfully!');
      console.log('✅ Resume uploaded:', data.resumeUrl);
    } else {
      const err = await res.json();
      showToast('❌ ' + (err.message || 'Upload failed'));
    }
  } catch (error) {
    console.error('Resume upload error:', error);
    showToast('❌ Connection error');
  }

  e.target.value = '';
}

// Download resume
function downloadResume() {
  if (window.currentResumeUrl) {
    const url = window.currentResumeUrl.startsWith('http')
      ? window.currentResumeUrl
      : `${API.replace('/api', '')}${window.currentResumeUrl}`;
    window.open(url, '_blank');
    showToast('📥 Opening resume...');
  } else {
    showToast('❌ No resume available');
  }
}

// Show resume remove modal
function removeResume() {
  document.getElementById('resumeRemoveModal').classList.add('active');
  console.log('📄 Resume remove confirmation shown');
}

// Actually remove the resume (called when user confirms)
async function confirmResumeRemove() {
  document.getElementById('resumeRemoveModal').classList.remove('active');

  try {
    showToast('⏳ Removing resume...');

    const res = await fetch(`${API}/profile/resume`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      window.currentResumeUrl = null;
      document.getElementById('resumeStatus').textContent = 'Upload your resume in PDF format';
      document.getElementById('downloadResumeBtn').style.display = 'none';
      document.getElementById('removeResumeBtn').style.display = 'none';
      showToast('✅ Resume removed successfully!');
      console.log('✅ Resume removed');
    } else {
      showToast('❌ Failed to remove resume');
      console.error('❌ Resume removal failed');
    }
  } catch (error) {
    showToast('❌ Connection error');
    console.error('❌ Resume removal error:', error);
  }
}

// Cancel resume removal
function cancelResumeRemove() {
  document.getElementById('resumeRemoveModal').classList.remove('active');
  showToast('❌ Resume removal cancelled');
  console.log('✖ Resume removal cancelled');
}

async function saveProfile(e) {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    await fetchAuth('/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: f.name.value, fullName: f.fullName.value, title: f.title.value,
        bio: f.bio.value, about: f.about.value, email: f.email.value,
        phone: f.phone.value, address: f.address.value,
        socialLinks: {
          github: f.github.value, linkedin: f.linkedin.value, twitter: f.twitter.value,
          instagram: f.instagram.value, facebook: f.facebook.value, youtube: f.youtube.value,
          whatsapp: f.whatsapp.value, telegram: f.telegram.value
        },
        typingTexts: f.typingTexts.value.split(',').map(t => t.trim()).filter(t => t),
        stats: { projectsCompleted: +f.projectsCompleted.value, yearsExperience: +f.yearsExperience.value, certificatesEarned: +f.certificatesEarned.value }
      })
    });
    showToast('Profile saved! ✨');
  } catch { showToast('Error saving'); }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
}

async function loadSkills() {
  try {
    const res = await fetchAuth('/skills/all');
    const skills = await res.json();
    document.getElementById('skillsList').innerHTML = skills?.length ? skills.map(s => `
      <div class="item-card">
        <div class="item-header"><h4>${s.name}</h4>
          <div class="item-actions">
            <button class="btn-edit" onclick='editItem("skill", ${JSON.stringify(s).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn-delete" data-endpoint="skills" data-id="${s._id}">Delete</button>
          </div>
        </div>
        <p><span class="tag">${s.category}</span> ${s.proficiency}%</p>
      </div>
    `).join('') : '<div class="empty-state"><i class="fas fa-code"></i><p>No skills</p></div>';
  } catch { }
}

async function loadEducation() {
  try {
    const res = await fetchAuth('/education/all');
    const edu = await res.json();
    document.getElementById('educationList').innerHTML = edu?.length ? edu.map(e => `
      <div class="item-card">
        <div class="item-header"><h4>${e.degree} - ${e.field}</h4>
          <div class="item-actions">
            <button class="btn-edit" onclick='editItem("education", ${JSON.stringify(e).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn-delete" data-endpoint="education" data-id="${e._id}">Delete</button>
          </div>
        </div>
        <p>${e.institution}</p><p><span class="tag">${e.startYear} - ${e.endYear}</span></p>
      </div>
    `).join('') : '<div class="empty-state"><i class="fas fa-graduation-cap"></i><p>No education</p></div>';
  } catch { }
}

async function loadProjects() {
  try {
    const res = await fetchAuth('/projects/all');
    const projects = await res.json();
    document.getElementById('projectsList').innerHTML = projects?.length ? projects.map(p => `
      <div class="item-card ${p.featured ? 'featured' : ''}">
        <div class="item-header"><h4>${p.featured ? '⭐ ' : ''}${p.title}</h4>
          <div class="item-actions">
            <button class="btn-edit" onclick='editItem("project", ${JSON.stringify(p).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn-delete" data-endpoint="projects" data-id="${p._id}">Delete</button>
          </div>
        </div>
        <p>${p.description?.substring(0, 80)}...</p>
        <p>${(p.technologies || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}</p>
        <div class="item-links">
          ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" class="item-link"><i class="fas fa-external-link-alt"></i> Live Demo</a>` : ''}
          ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" class="item-link"><i class="fab fa-github"></i> GitHub</a>` : ''}
        </div>
      </div>
    `).join('') : '<div class="empty-state"><i class="fas fa-folder"></i><p>No projects</p></div>';
  } catch { }
}

async function loadServices() {
  try {
    const res = await fetchAuth('/services/all');
    const services = await res.json();
    document.getElementById('servicesList').innerHTML = services?.length ? services.map(s => `
      <div class="item-card">
        <div class="item-header"><h4>${s.title}</h4>
          <div class="item-actions">
            <button class="btn-edit" onclick='editItem("service", ${JSON.stringify(s).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn-delete" data-endpoint="services" data-id="${s._id}">Delete</button>
          </div>
        </div>
        <p>${s.description?.substring(0, 80)}...</p>
      </div>
    `).join('') : '<div class="empty-state"><i class="fas fa-briefcase"></i><p>No services</p></div>';
  } catch { }
}

async function loadCertificates() {
  try {
    const res = await fetchAuth('/certificates/all');
    const certs = await res.json();
    document.getElementById('certificatesList').innerHTML = certs?.length ? certs.map(c => `
      <div class="item-card">
        <div class="item-header"><h4>${c.title}</h4>
          <div class="item-actions">
            <button class="btn-edit" onclick='editItem("certificate", ${JSON.stringify(c).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn-delete" data-endpoint="certificates" data-id="${c._id}">Delete</button>
          </div>
        </div>
        <p><i class="fas fa-building"></i> ${c.issuer}</p>
        <p><span class="tag">${c.date ? new Date(c.date).toLocaleDateString() : 'N/A'}</span></p>
        ${c.credentialUrl ? `<a href="${c.credentialUrl}" target="_blank" class="item-link"><i class="fas fa-certificate"></i> View Certificate</a>` : ''}
      </div>
    `).join('') : '<div class="empty-state"><i class="fas fa-certificate"></i><p>No certificates</p></div>';
  } catch { }
}


async function loadMessages() {
  try {
    const res = await fetchAuth('/contact');
    const msgs = await res.json();
    const unread = msgs.filter(m => !m.isRead).length;
    document.getElementById('msgBadge').textContent = unread;
    document.getElementById('msgBadge').style.display = unread > 0 ? 'block' : 'none';

    document.getElementById('messagesList').innerHTML = msgs?.length ? msgs.map(m => `
      <div class="item-card msg-card ${m.isRead ? 'read' : ''}">
        <div class="msg-header"><strong>${m.name}</strong><span>${new Date(m.createdAt).toLocaleDateString()}</span></div>
        <p class="msg-email"><i class="fas fa-envelope"></i> ${m.email}</p>
        <p class="msg-subject"><strong>${m.subject}</strong></p>
        <p class="msg-body">${m.message}</p>
        <div class="msg-actions item-actions">
          ${!m.isRead ? `<button class="btn-edit" onclick="markRead('${m._id}')">Mark Read</button>` : ''}
          <button class="btn-delete" data-endpoint="contact" data-id="${m._id}">Delete</button>
        </div>
      </div>
    `).join('') : '<div class="empty-state"><i class="fas fa-envelope"></i><p>No messages</p></div>';

    document.getElementById('recentMessages').innerHTML = msgs.slice(0, 3).map(m => `
      <div class="item-card msg-card ${m.isRead ? 'read' : ''}" style="margin-bottom:12px">
        <div class="msg-header"><strong>${m.name}</strong><span>${m.email}</span></div>
        <p class="msg-body">${m.message?.substring(0, 60)}...</p>
      </div>
    `).join('') || '<div class="empty-state"><i class="fas fa-inbox"></i><p>No messages</p></div>';
  } catch { }
}

async function markRead(id) {
  await fetchAuth(`/contact/${id}/read`, { method: 'PUT' });
  loadMessages();
  showToast('Marked as read');
}

// ================================
// DELETE ITEM FUNCTION - Properly Implemented
// ================================
/**
 * Deletes an item from the database with user confirmation
 * @param {string} endpoint - API endpoint (e.g., 'skills', 'education', 'projects')
 * @param {string} id - MongoDB ObjectId of the item to delete
 */
async function deleteItem(endpoint, id) {
  // Validate parameters
  if (!endpoint || !id) {
    showToast('⚠️ Invalid delete request');
    console.error('Delete error: Missing endpoint or id');
    return;
  }

  // Store delete request
  pendingDelete = { endpoint, id };

  // Get item type
  const itemTypes = {
    'skills': 'skill',
    'education': 'education entry',
    'projects': 'project',
    'services': 'service',
    'certificates': 'certificate',
    'contact': 'message'
  };
  const itemType = itemTypes[endpoint] || 'item';

  // Update modal message (simple and clean)
  document.getElementById('deleteConfirmMessage').textContent =
    `Are you sure you want to delete this ${itemType}?`;

  // Show modal
  document.getElementById('deleteConfirmModal').classList.add('active');
  console.log(`🗑️ Delete confirmation for: ${endpoint}/${id}`);
}

/**
 * Actually performs the delete operation (called when user clicks "Delete" in modal)
 */
async function confirmDelete() {
  if (!pendingDelete) return;

  const { endpoint, id } = pendingDelete;
  closeDeleteModal();

  const itemTypes = {
    'skills': 'skill',
    'education': 'education entry',
    'projects': 'project',
    'services': 'service',
    'certificates': 'certificate',
    'contact': 'message'
  };
  const itemType = itemTypes[endpoint] || 'item';

  try {
    showToast('⏳ Deleting...');
    console.log(`🗑️ DELETE: /${endpoint}/${id}`);

    const response = await fetchAuth(`/${endpoint}/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      console.log('✅ Delete successful');
      showToast(`✅ ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} deleted successfully!`);
      await loadAllData();
    } else {
      const err = await response.json().catch(() => ({ message: 'Delete failed' }));
      console.error('❌ Delete failed:', err);
      showToast(`❌ ${err.message || 'Failed to delete'}`);
    }
  } catch (error) {
    console.error('❌ Delete error:', error);
    showToast('❌ Connection error');
  } finally {
    pendingDelete = null;
  }
}

/**
 * Cancels delete operation (called when user clicks "Cancel" in modal)
 */
function cancelDelete() {
  console.log('✖ Delete cancelled');
  pendingDelete = null;
  closeDeleteModal();
  showToast('❌ Deletion cancelled');
}

/**
 * Closes the delete confirmation modal
 */
function closeDeleteModal() {
  document.getElementById('deleteConfirmModal').classList.remove('active');
}

// Make functions globally available for onclick handlers
window.deleteItem = deleteItem;
window.confirmDelete = confirmDelete;
window.cancelDelete = cancelDelete;
window.closeDeleteModal = closeDeleteModal;

// Photo removal functions
window.removePhoto = removePhoto;
window.confirmPhotoRemove = confirmPhotoRemove;
window.cancelPhotoRemove = cancelPhotoRemove;

// Icon options for skills dropdown
const skillIconOptions = [
  { value: 'html5', label: 'HTML5', icon: 'fab fa-html5' },
  { value: 'css3-alt', label: 'CSS3', icon: 'fab fa-css3-alt' },
  { value: 'js', label: 'JavaScript', icon: 'fab fa-js' },
  { value: 'react', label: 'React', icon: 'fab fa-react' },
  { value: 'vuejs', label: 'Vue.js', icon: 'fab fa-vuejs' },
  { value: 'angular', label: 'Angular', icon: 'fab fa-angular' },
  { value: 'node', label: 'Node.js', icon: 'fab fa-node' },
  { value: 'node-js', label: 'Node JS', icon: 'fab fa-node-js' },
  { value: 'python', label: 'Python', icon: 'fab fa-python' },
  { value: 'java', label: 'Java', icon: 'fab fa-java' },
  { value: 'php', label: 'PHP', icon: 'fab fa-php' },
  { value: 'laravel', label: 'Laravel', icon: 'fab fa-laravel' },
  { value: 'wordpress', label: 'WordPress', icon: 'fab fa-wordpress' },
  { value: 'bootstrap', label: 'Bootstrap', icon: 'fab fa-bootstrap' },
  { value: 'sass', label: 'Sass', icon: 'fab fa-sass' },
  { value: 'git-alt', label: 'Git', icon: 'fab fa-git-alt' },
  { value: 'github', label: 'GitHub', icon: 'fab fa-github' },
  { value: 'docker', label: 'Docker', icon: 'fab fa-docker' },
  { value: 'aws', label: 'AWS', icon: 'fab fa-aws' },
  { value: 'linux', label: 'Linux', icon: 'fab fa-linux' },
  { value: 'windows', label: 'Windows', icon: 'fab fa-windows' },
  { value: 'apple', label: 'Apple', icon: 'fab fa-apple' },
  { value: 'android', label: 'Android', icon: 'fab fa-android' },
  { value: 'swift', label: 'Swift', icon: 'fab fa-swift' },
  { value: 'figma', label: 'Figma', icon: 'fab fa-figma' },
  { value: 'npm', label: 'NPM', icon: 'fab fa-npm' },
  { value: 'database', label: 'Database', icon: 'fas fa-database' },
  { value: 'server', label: 'Server', icon: 'fas fa-server' },
  { value: 'code', label: 'Code', icon: 'fas fa-code' },
  { value: 'terminal', label: 'Terminal', icon: 'fas fa-terminal' },
  { value: 'robot', label: 'AI/Robot', icon: 'fas fa-robot' },
  { value: 'brain', label: 'AI Brain', icon: 'fas fa-brain' },
  { value: 'palette', label: 'Design', icon: 'fas fa-palette' },
  { value: 'mobile-alt', label: 'Mobile', icon: 'fas fa-mobile-alt' },
  { value: 'laptop-code', label: 'Laptop Code', icon: 'fas fa-laptop-code' },
  { value: 'cogs', label: 'Settings/Cogs', icon: 'fas fa-cogs' },
  { value: 'file-word', label: 'MS Word', icon: 'fas fa-file-word' },
  { value: 'file-excel', label: 'MS Excel', icon: 'fas fa-file-excel' },
  { value: 'file-powerpoint', label: 'PowerPoint', icon: 'fas fa-file-powerpoint' },
  { value: 'file-code', label: 'File Code', icon: 'fas fa-file-code' },
  { value: 'cloud', label: 'Cloud', icon: 'fas fa-cloud' },
  { value: 'fire', label: 'Firebase', icon: 'fas fa-fire' },
  { value: 'bolt', label: 'Fast/Bolt', icon: 'fas fa-bolt' },
  { value: 'magic', label: 'Magic', icon: 'fas fa-magic' },
  { value: 'tools', label: 'Tools', icon: 'fas fa-tools' },
  { value: 'keyboard', label: 'Keyboard', icon: 'fas fa-keyboard' },
  { value: 'chart-line', label: 'Analytics', icon: 'fas fa-chart-line' },
  { value: 'lock', label: 'Security', icon: 'fas fa-lock' },
  { value: 'globe', label: 'Web/Globe', icon: 'fas fa-globe' },
  { value: 'network-wired', label: 'Network', icon: 'fas fa-network-wired' },
  { value: 'microchip', label: 'Microchip', icon: 'fas fa-microchip' },
  { value: 'cube', label: '3D/Cube', icon: 'fas fa-cube' },
  { value: 'paint-brush', label: 'Paint Brush', icon: 'fas fa-paint-brush' },
  { value: 'pen-nib', label: 'Pen Nib', icon: 'fas fa-pen-nib' },
  { value: 'layer-group', label: 'Layers', icon: 'fas fa-layer-group' },
];

function generateIconDropdown(selectedValue = '') {
  let options = skillIconOptions.map(opt =>
    `<option value="${opt.value}" ${selectedValue === opt.value ? 'selected' : ''}>${opt.label}</option>`
  ).join('');
  return `<option value="">-- Select Icon --</option>${options}`;
}

const modalForms = {
  skill: `
    <div class="form-group"><label>Skill Name</label><input type="text" name="name" required placeholder="e.g., React.js"></div>
    <div class="form-group"><label>Category</label>
      <select name="category">
        <option value="frontend">Frontend</option><option value="backend">Backend</option>
        <option value="database">Database</option><option value="tools">Tools</option>
        <option value="ai">AI Tools</option><option value="office">MS Office</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Proficiency (%)</label><input type="number" name="proficiency" min="0" max="100" value="75"></div>
      <div class="form-group">
        <label>Icon</label>
        <div class="icon-selector">
          <select name="icon" id="iconSelect" onchange="updateIconPreview(this)">
            ${generateIconDropdown()}
          </select>
          <span class="icon-preview" id="iconPreview"><i class="fas fa-code"></i></span>
        </div>
      </div>
    </div>
    <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-save"></i> Save Skill</button>
  `,
  education: `
    <div class="form-group"><label>Institution</label><input type="text" name="institution" required placeholder="University/College name"></div>
    <div class="form-row">
      <div class="form-group"><label>Degree</label><input type="text" name="degree" required placeholder="B.Tech, BCA, etc."></div>
      <div class="form-group"><label>Field</label><input type="text" name="field" required placeholder="Computer Science"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Start Year</label><input type="text" name="startYear" required placeholder="2020"></div>
      <div class="form-group"><label>End Year</label><input type="text" name="endYear" placeholder="Present"></div>
    </div>
    <div class="form-group"><label>Website Link</label>
      <div class="input-with-icon">
        <input type="url" name="websiteUrl" placeholder="https://university.edu">
        <button type="button" class="link-preview-btn" onclick="previewLink('websiteUrl')"><i class="fas fa-external-link-alt"></i></button>
      </div>
    </div>
    <div class="form-group"><label>Description</label><textarea name="description" rows="2" placeholder="Brief description..."></textarea></div>
    <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-save"></i> Save Education</button>
  `,
  project: `
    <div class="project-image-upload">
      <div class="project-image-preview" id="projectImagePreview">
        <i class="fas fa-folder-open"></i>
        <span>Project Image</span>
      </div>
      <div class="project-image-actions">
        <label class="btn btn-outline btn-sm">
          <i class="fas fa-image"></i> Choose Image
          <input type="file" name="projectImage" id="projectImageInput" accept="image/*" hidden onchange="previewProjectImage(this)">
        </label>
        <button type="button" class="btn btn-danger btn-sm" id="removeProjectImageBtn" style="display:none" onclick="removeProjectImage()">
          <i class="fas fa-trash"></i> Remove
        </button>
      </div>
      <small class="photo-hint">Recommended: 16:9 aspect ratio, max 5MB</small>
    </div>
    <div class="form-group"><label>Project Title</label><input type="text" name="title" required placeholder="My Awesome Project"></div>
    <div class="form-group"><label>Description</label><textarea name="description" rows="3" required placeholder="What does this project do?"></textarea></div>
    <div class="form-group"><label>Technologies (comma separated)</label><input type="text" name="technologies" placeholder="React, Node.js, MongoDB"></div>
    <div class="form-group"><label>Category</label>
      <select name="category"><option value="web">Web App</option><option value="mobile">Mobile</option><option value="api">API</option><option value="other">Other</option></select>
    </div>
    <div class="form-group"><label>Live Demo URL</label>
      <div class="input-with-icon">
        <input type="url" name="liveUrl" placeholder="https://myproject.com">
        <button type="button" class="link-preview-btn" onclick="previewLink('liveUrl')"><i class="fas fa-external-link-alt"></i></button>
      </div>
    </div>
    <div class="form-group"><label>GitHub URL</label>
      <div class="input-with-icon">
        <input type="url" name="githubUrl" placeholder="https://github.com/username/repo">
        <button type="button" class="link-preview-btn" onclick="previewLink('githubUrl')"><i class="fab fa-github"></i></button>
      </div>
    </div>
    <div class="form-group checkbox-group"><label><input type="checkbox" name="featured"> ⭐ Featured Project</label></div>
    <input type="hidden" name="existingImage" id="existingImage" value="">
    <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-save"></i> Save Project</button>
  `,
  service: `
    <div class="form-group"><label>Service Title</label><input type="text" name="title" required placeholder="Web Development"></div>
    <div class="form-group"><label>Description</label><textarea name="description" rows="3" required placeholder="What do you offer?"></textarea></div>
    <div class="form-group"><label>Icon</label>
      <select name="icon">
        <option value="code">💻 Code</option><option value="layout">🎨 Layout/Design</option><option value="server">🖥️ Server</option>
        <option value="mobile">📱 Mobile</option><option value="file">📄 Document</option><option value="keyboard">⌨️ Typing</option>
        <option value="robot">🤖 AI/Robot</option><option value="tool">🔧 Tools</option>
      </select>
    </div>
    <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-save"></i> Save Service</button>
  `,
  certificate: `
    <div class="form-group"><label>Certificate Title</label><input type="text" name="title" required placeholder="AWS Certified Developer"></div>
    <div class="form-row">
      <div class="form-group"><label>Issuer</label><input type="text" name="issuer" required placeholder="Amazon, Google, etc."></div>
      <div class="form-group"><label>Date</label><input type="date" name="date"></div>
    </div>
    <div class="form-group"><label>Credential URL</label>
      <div class="input-with-icon">
        <input type="url" name="credentialUrl" placeholder="https://credential.net/...">
        <button type="button" class="link-preview-btn" onclick="previewLink('credentialUrl')"><i class="fas fa-certificate"></i></button>
      </div>
    </div>
    <div class="form-group"><label>Description</label><textarea name="description" rows="2" placeholder="Brief description..."></textarea></div>
    <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-save"></i> Save Certificate</button>
  `
};

// Preview link in new tab
function previewLink(fieldName) {
  const input = document.querySelector(`[name="${fieldName}"]`);
  if (input && input.value) {
    window.open(input.value, '_blank');
  } else {
    showToast('Please enter a URL first');
  }
}


let currentModal = { type: null, id: null };

function openModal(type, data = null) {
  currentModal = { type, id: data?._id || null };
  document.getElementById('modalTitle').textContent = data ? `Edit ${type}` : `Add ${type}`;
  document.getElementById('modalForm').innerHTML = modalForms[type];

  if (data) {
    const form = document.getElementById('modalForm');
    Object.keys(data).forEach(key => {
      const input = form.elements[key];
      if (input) {
        if (input.type === 'checkbox') input.checked = data[key];
        else if (Array.isArray(data[key])) input.value = data[key].join(', ');
        else if (key === 'date' && data[key]) input.value = data[key].split('T')[0];
        else input.value = data[key] || '';
      }
    });
  }

  document.getElementById('modal').classList.add('active');
  document.getElementById('modalForm').onsubmit = handleModalSubmit;
}

function editItem(type, data) { openModal(type, data); }
function closeModal() { document.getElementById('modal').classList.remove('active'); }

async function handleModalSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  const endpoints = { skill: 'skills', education: 'education', project: 'projects', service: 'services', certificate: 'certificates' };
  const endpoint = endpoints[currentModal.type];
  const url = currentModal.id ? `/${endpoint}/${currentModal.id}` : `/${endpoint}`;

  try {
    let res;

    // Use FormData for projects (to support image upload)
    if (currentModal.type === 'project') {
      const formData = new FormData();
      const fileInput = form.querySelector('input[name="projectImage"]');

      // Add file if selected
      if (fileInput && fileInput.files[0]) {
        formData.append('projectImage', fileInput.files[0]);
      }

      // Add other fields
      formData.append('title', form.elements['title'].value);
      formData.append('description', form.elements['description'].value);
      formData.append('technologies', form.elements['technologies'].value);
      formData.append('category', form.elements['category'].value);
      formData.append('liveUrl', form.elements['liveUrl'].value);
      formData.append('githubUrl', form.elements['githubUrl'].value);
      formData.append('featured', form.elements['featured'].checked);

      res = await fetch(`${API}${url}`, {
        method: currentModal.id ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
    } else {
      // Use JSON for other types
      const data = {};
      new FormData(form).forEach((value, key) => {
        if (key === 'technologies') data[key] = value.split(',').map(t => t.trim()).filter(t => t);
        else if (key === 'featured') data[key] = form.elements[key].checked;
        else if (key !== 'projectImage' && key !== 'existingImage') data[key] = value;
      });

      res = await fetchAuth(url, {
        method: currentModal.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    if (res.ok) {
      showToast('Saved! ✨');
      closeModal();
      loadAllData();
    } else {
      const err = await res.json();
      showToast(err.message || 'Failed');
    }
  } catch (error) {
    console.error('Save error:', error);
    showToast('Error saving');
  }

  btn.disabled = false;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
}

// Update icon preview when dropdown changes
function updateIconPreview(select) {
  const iconPreview = document.getElementById('iconPreview');
  if (!iconPreview) return;

  const selectedOption = skillIconOptions.find(opt => opt.value === select.value);
  if (selectedOption) {
    iconPreview.innerHTML = `<i class="${selectedOption.icon}"></i>`;
  } else {
    iconPreview.innerHTML = `<i class="fas fa-code"></i>`;
  }
}

// Override openModal to set icon dropdown value when editing
const originalOpenModal = openModal;
function openModalWithIcon(type, data = null) {
  currentModal = { type, id: data?._id || null };

  // Generate form with correct icon if editing skill
  if (type === 'skill' && data?.icon) {
    document.getElementById('modalTitle').textContent = 'Edit skill';
    document.getElementById('modalForm').innerHTML = `
      <div class="form-group"><label>Skill Name</label><input type="text" name="name" required placeholder="e.g., React.js"></div>
      <div class="form-group"><label>Category</label>
        <select name="category">
          <option value="frontend">Frontend</option><option value="backend">Backend</option>
          <option value="database">Database</option><option value="tools">Tools</option>
          <option value="ai">AI Tools</option><option value="office">MS Office</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Proficiency (%)</label><input type="number" name="proficiency" min="0" max="100" value="75"></div>
        <div class="form-group">
          <label>Icon</label>
          <div class="icon-selector">
            <select name="icon" id="iconSelect" onchange="updateIconPreview(this)">
              ${generateIconDropdown(data.icon)}
            </select>
            <span class="icon-preview" id="iconPreview"><i class="${getIconClass(data.icon)}"></i></span>
          </div>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-save"></i> Save Skill</button>
    `;

    // Fill in form values
    const form = document.getElementById('modalForm');
    if (data) {
      Object.keys(data).forEach(key => {
        const input = form.elements[key];
        if (input) {
          if (input.type === 'checkbox') input.checked = data[key];
          else if (Array.isArray(data[key])) input.value = data[key].join(', ');
          else input.value = data[key] || '';
        }
      });
    }

    document.getElementById('modal').classList.add('active');
    document.getElementById('modalForm').onsubmit = handleModalSubmit;
  } else {
    // Use original openModal for other types
    document.getElementById('modalTitle').textContent = data ? `Edit ${type}` : `Add ${type}`;
    document.getElementById('modalForm').innerHTML = modalForms[type];

    if (data) {
      const form = document.getElementById('modalForm');
      Object.keys(data).forEach(key => {
        const input = form.elements[key];
        if (input) {
          if (input.type === 'checkbox') input.checked = data[key];
          else if (Array.isArray(data[key])) input.value = data[key].join(', ');
          else if (key === 'date' && data[key]) input.value = data[key].split('T')[0];
          else input.value = data[key] || '';
        }
      });
    }

    document.getElementById('modal').classList.add('active');
    document.getElementById('modalForm').onsubmit = handleModalSubmit;
  }
}

// Helper function to get icon class from value
function getIconClass(iconValue) {
  const option = skillIconOptions.find(opt => opt.value === iconValue);
  return option ? option.icon : 'fas fa-code';
}

// Override openModal
openModal = openModalWithIcon;

// Project image preview functions
let selectedProjectImage = null;

function previewProjectImage(input) {
  const file = input.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file');
    input.value = '';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size should be less than 5MB');
    input.value = '';
    return;
  }

  selectedProjectImage = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('projectImagePreview');
    preview.innerHTML = `<img src="${e.target.result}" alt="Project Preview">`;
    document.getElementById('removeProjectImageBtn').style.display = 'inline-flex';
  };
  reader.readAsDataURL(file);
}

function removeProjectImage() {
  const preview = document.getElementById('projectImagePreview');
  preview.innerHTML = `<i class="fas fa-folder-open"></i><span>Project Image</span>`;
  const input = document.getElementById('projectImageInput');
  if (input) input.value = '';
  document.getElementById('removeProjectImageBtn').style.display = 'none';
  selectedProjectImage = null;
}

// Modify openModalWithIcon to show existing project image
const originalOpenModalWithIcon = openModalWithIcon;
function openModalWithProjectImage(type, data = null) {
  originalOpenModalWithIcon(type, data);

  // If editing a project with existing image, show it
  if (type === 'project' && data?.image) {
    setTimeout(() => {
      const preview = document.getElementById('projectImagePreview');
      if (preview) {
        const imgUrl = data.image.startsWith('http') ? data.image : `${API.replace('/api', '')}${data.image}`;
        preview.innerHTML = `<img src="${imgUrl}" alt="Project Preview">`;
        document.getElementById('removeProjectImageBtn').style.display = 'inline-flex';
      }
    }, 50);
  }
}

openModal = openModalWithProjectImage;

// Expose functions globally for onclick handlers
window.editItem = editItem;
window.openModal = openModalWithProjectImage;
window.closeModal = closeModal;
window.markRead = markRead;
window.previewLink = previewLink;
window.updateIconPreview = updateIconPreview;
window.generateIconDropdown = generateIconDropdown;
window.getIconClass = getIconClass;

// Text Formatting Helper
function wrapSelection(textareaName, tag) {
  const textarea = document.querySelector(`textarea[name="${textareaName}"]`);
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);

  if (!selectedText) {
    // If no text selected, just insert empty tags and place cursor inside
    const newText = text.substring(0, start) + `<${tag}></${tag}>` + text.substring(end);
    textarea.value = newText;
    textarea.focus();
    textarea.selectionStart = start + tag.length + 2;
    textarea.selectionEnd = start + tag.length + 2;
    return;
  }

  const newText = text.substring(0, start) + `<${tag}>` + selectedText + `</${tag}>` + text.substring(end);
  textarea.value = newText;

  // Restore selection
  textarea.focus();
  textarea.selectionStart = start;
  textarea.selectionEnd = end + tag.length * 2 + 5; // approx adjustment
}

// ================================
// RESUME UPLOAD FUNCTIONALITY
// ================================

async function handleResumeUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  if (file.type !== 'application/pdf') {
    showToast('❌ Please select a PDF file');
    e.target.value = '';
    return;
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('❌ File size should be less than 10MB');
    e.target.value = '';
    return;
  }

  try {
    showToast('⏳ Uploading resume...');

    const formData = new FormData();
    formData.append('resume', file);

    const res = await fetch(`${API}/profile/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      showToast('✅ Resume uploaded successfully!');

      // Update UI
      document.getElementById('resumeStatus').textContent = file.name;
      document.getElementById('downloadResumeBtn').style.display = 'inline-flex';
      document.getElementById('removeResumeBtn').style.display = 'inline-flex';

      // Store resume URL
      window.currentResumeUrl = data.resumeUrl;
    } else {
      const err = await res.json();
      showToast(`❌ ${err.message || 'Upload failed'}`);
    }
  } catch (error) {
    showToast('❌ Connection error');
    console.error('Resume upload error:', error);
  }

  e.target.value = '';
}

function downloadResume() {
  if (window.currentResumeUrl) {
    const link = document.createElement('a');
    link.href = window.currentResumeUrl.startsWith('http')
      ? window.currentResumeUrl
      : `${API.replace('/api', '')}${window.currentResumeUrl}`;
    link.download = 'Resume.pdf';
    link.target = '_blank';
    link.click();
    showToast('📥 Downloading resume...');
  } else {
    showToast('❌ No resume found');
  }
}

async function removeResume() {
  if (!confirm('Are you sure you want to remove your resume?')) {
    return;
  }

  try {
    showToast('⏳ Removing resume...');

    // Update profile to clear resume URL
    await fetchAuth('/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeUrl: '' })
    });

    showToast('✅ Resume removed successfully!');

    // Update UI
    document.getElementById('resumeStatus').textContent = 'Upload your resume in PDF format';
    document.getElementById('downloadResumeBtn').style.display = 'none';
    document.getElementById('removeResumeBtn').style.display = 'none';
    window.currentResumeUrl = null;
  } catch (error) {
    showToast('❌ Error removing resume');
    console.error('Resume remove error:', error);
  }
}

// Toast notification function
function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  toastMsg.textContent = msg;
  toast.classList.add('show');

  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ================================
// TEXT FORMATTING FUNCTION
// ================================
// Wraps selected text in textarea with HTML tags (b, i, u)
function wrapSelection(textareaName, tag) {
  const textarea = document.querySelector(`textarea[name="${textareaName}"]`);
  if (!textarea) {
    console.error('Textarea not found:', textareaName);
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);

  if (!selectedText) {
    // If no text selected, just insert empty tags and place cursor inside
    const newText = text.substring(0, start) + `<${tag}></${tag}>` + text.substring(end);
    textarea.value = newText;
    textarea.focus();
    textarea.selectionStart = start + tag.length + 2;
    textarea.selectionEnd = start + tag.length + 2;
    showToast('📝 Select text first, then click format button');
    return;
  }

  // Wrap selected text with tags
  const newText = text.substring(0, start) + `<${tag}>` + selectedText + `</${tag}>` + text.substring(end);
  textarea.value = newText;

  // Restore selection
  textarea.focus();
  textarea.selectionStart = start;
  textarea.selectionEnd = end + tag.length * 2 + 5;

  const tagNames = { 'b': 'Bold', 'i': 'Italic', 'u': 'Underline' };
  showToast(`✅ ${tagNames[tag] || 'Format'} applied!`);
}

window.previewProjectImage = previewProjectImage;
window.removeProjectImage = removeProjectImage;
window.wrapSelection = wrapSelection;

// ===========================================
// PROFESSIONAL LOGIN FUNCTIONS
// ===========================================

// Password Strength Checker
function checkPasswordStrength() {
  const password = document.getElementById('resetNewPass').value;
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');

  let strength = 0;
  const requirements = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password)
  };

  // Update requirement indicators
  Object.keys(requirements).forEach(req => {
    const el = document.getElementById('req' + req.charAt(0).toUpperCase() + req.slice(1));
    if (el) {
      el.classList.toggle('valid', requirements[req]);
    }
  });

  // Calculate strength
  strength = Object.values(requirements).filter(Boolean).length;

  // Update strength bar
  strengthFill.className = 'strength-fill';
  if (password.length === 0) {
    strengthText.textContent = 'Enter password';
  } else if (strength <= 1) {
    strengthFill.classList.add('weak');
    strengthText.textContent = 'Weak';
  } else if (strength === 2) {
    strengthFill.classList.add('fair');
    strengthText.textContent = 'Fair';
  } else if (strength === 3) {
    strengthFill.classList.add('good');
    strengthText.textContent = 'Good';
  } else {
    strengthFill.classList.add('strong');
    strengthText.textContent = 'Strong';
  }
}

// Password Match Checker
function checkPasswordMatch() {
  const newPass = document.getElementById('resetNewPass').value;
  const confirmPass = document.getElementById('resetConfirmPass').value;
  const matchEl = document.getElementById('passwordMatch');
  const mismatchEl = document.getElementById('passwordMismatch');

  if (confirmPass.length === 0) {
    matchEl.style.display = 'none';
    mismatchEl.style.display = 'none';
  } else if (newPass === confirmPass) {
    matchEl.style.display = 'flex';
    mismatchEl.style.display = 'none';
  } else {
    matchEl.style.display = 'none';
    mismatchEl.style.display = 'flex';
  }
}

// Show login attempts warning
function showLoginAttempts() {
  const attemptsDiv = document.getElementById('loginAttempts');
  const attemptsText = document.getElementById('attemptsText');
  if (attemptsDiv && attemptsText) {
    const remaining = 5 - loginAttempts;
    if (remaining > 0) {
      attemptsText.textContent = `${remaining} attempts remaining before lockout`;
      attemptsDiv.style.display = 'block';
    } else {
      attemptsText.textContent = 'Account temporarily locked. Try again later.';
      attemptsDiv.style.display = 'block';
    }
  }
}

// Reset login attempts on successful login
function resetLoginAttempts() {
  loginAttempts = 0;
  localStorage.setItem('loginAttempts', '0');
  const attemptsDiv = document.getElementById('loginAttempts');
  if (attemptsDiv) attemptsDiv.style.display = 'none';
}

// Increment login attempts on failed login
function incrementLoginAttempts() {
  loginAttempts++;
  localStorage.setItem('loginAttempts', loginAttempts.toString());
  if (loginAttempts >= 3) {
    showLoginAttempts();
  }
}

// Export functions
window.checkPasswordStrength = checkPasswordStrength;
window.checkPasswordMatch = checkPasswordMatch;

// ===========================================
// PROFESSIONAL ADMIN FEATURES
// ===========================================

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in inputs
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

  // Only work when dashboard is visible
  if (dashboard.style.display === 'none') return;

  const key = e.key.toLowerCase();

  // Navigation shortcuts
  if (key === 'd') navigateToPage('home');
  if (key === 'p') navigateToPage('projects');
  if (key === 's') navigateToPage('skills');
  if (key === 'm') navigateToPage('messages');
  if (key === 'e') navigateToPage('education');
  if (key === 'c') navigateToPage('certificates');

  // Action shortcuts
  if (key === 'n') {
    const currentPage = document.querySelector('.page.active')?.id?.replace('Page', '');
    if (currentPage === 'projects') openModal('project');
    else if (currentPage === 'skills') openModal('skill');
    else if (currentPage === 'education') openModal('education');
    else if (currentPage === 'services') openModal('service');
    else if (currentPage === 'certificates') openModal('certificate');
  }

  if (key === 't') toggleQuickTheme();
  if (key === '?' || (e.shiftKey && key === '/')) showKeyboardShortcuts();
  if (key === 'l' && e.ctrlKey) { e.preventDefault(); logout(); }
});

// Navigate to page function
function navigateToPage(page) {
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) {
    navItem.click();
  }
}

// Toggle theme quickly
function toggleQuickTheme() {
  const currentTheme = localStorage.getItem('adminTheme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === newTheme);
  });
  showToast(`Theme: ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}`);
}

// Show keyboard shortcuts modal
function showKeyboardShortcuts() {
  document.getElementById('shortcutsModal')?.classList.add('active');
}

// Hide keyboard shortcuts modal
function hideKeyboardShortcuts() {
  document.getElementById('shortcutsModal')?.classList.remove('active');
}

// Click outside to close shortcuts modal
document.getElementById('shortcutsModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'shortcutsModal') hideKeyboardShortcuts();
});

// Export all data
async function exportAllData() {
  try {
    showToast('Preparing export...');
    const res = await fetchAuth('/backup');
    if (res.ok) {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export downloaded! ✅');
    } else {
      showToast('Export failed');
    }
  } catch {
    showToast('Export error');
  }
}

// SESSION MANAGEMENT
let sessionTimer;
let sessionWarningTimer;
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before expiry

function startSessionTimer() {
  clearTimeout(sessionTimer);
  clearTimeout(sessionWarningTimer);

  // Show warning 5 minutes before session expires
  sessionWarningTimer = setTimeout(() => {
    showSessionWarning();
  }, SESSION_DURATION - WARNING_TIME);

  // Auto logout after session duration
  sessionTimer = setTimeout(() => {
    showToast('Session expired. Please login again.');
    logout();
  }, SESSION_DURATION);
}

function showSessionWarning() {
  const warning = document.getElementById('sessionWarning');
  if (warning) {
    warning.style.display = 'block';
    startCountdown();
  }
}

function dismissSessionWarning() {
  document.getElementById('sessionWarning').style.display = 'none';
}

function extendSession() {
  startSessionTimer();
  dismissSessionWarning();
  showToast('Session extended! ✅');
}

let countdownInterval;
function startCountdown() {
  let timeLeft = 5 * 60; // 5 minutes
  const countdownEl = document.getElementById('sessionCountdown');

  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    if (countdownEl) {
      countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    timeLeft--;
    if (timeLeft < 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
}

// LAST LOGIN TRACKING
function updateLastLogin() {
  const lastLogin = localStorage.getItem('lastLogin');
  const lastLoginText = document.getElementById('lastLoginText');

  if (lastLoginText) {
    if (lastLogin) {
      const date = new Date(lastLogin);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let timeAgo;
      if (diffDays > 0) timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      else if (diffHours > 0) timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      else if (diffMins > 0) timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      else timeAgo = 'Just now';

      lastLoginText.textContent = `Last login: ${timeAgo}`;
    } else {
      lastLoginText.textContent = 'First time login! Welcome!';
    }
  }

  // Save current login time
  localStorage.setItem('lastLogin', new Date().toISOString());
}

// UNSAVED CHANGES DETECTION
let hasUnsavedChanges = false;

function trackFormChanges() {
  document.querySelectorAll('form input, form textarea, form select').forEach(el => {
    el.addEventListener('change', () => {
      showUnsavedIndicator();
    });
  });
}

function showUnsavedIndicator() {
  hasUnsavedChanges = true;
  document.getElementById('unsavedIndicator').style.display = 'flex';
}

function hideUnsavedIndicator() {
  hasUnsavedChanges = false;
  document.getElementById('unsavedIndicator').style.display = 'none';
}

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// UPDATE UNREAD COUNT
function updateUnreadCount(count) {
  const unreadEl = document.getElementById('unreadCount');
  if (unreadEl) {
    unreadEl.textContent = `${count || 0} unread`;
  }
}

// Initialize admin features on dashboard load
const originalShowDashboard = showDashboard;
showDashboard = function () {
  originalShowDashboard();
  startSessionTimer();
  updateLastLogin();
  trackFormChanges();
  console.log('🎛️ Admin dashboard loaded with professional features');
  console.log('💡 Press ? for keyboard shortcuts');
};

// Export new functions
window.navigateToPage = navigateToPage;
window.showKeyboardShortcuts = showKeyboardShortcuts;
window.hideKeyboardShortcuts = hideKeyboardShortcuts;
window.exportAllData = exportAllData;
window.extendSession = extendSession;
window.dismissSessionWarning = dismissSessionWarning;
