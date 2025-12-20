// Connect to Backend
const API = 'https://backend-mu-sage.vercel.app/api';
let token = localStorage.getItem('adminToken');
const PLACEHOLDER_IMAGE = 'assets/profile-placeholder.svg';

// Delete confirmation state
let pendingDelete = null;

// Login attempt tracking
let loginAttempts = parseInt(localStorage.getItem('loginAttempts') || '0');

const loginPage = document.getElementById('loginPage');
const dashboard = document.getElementById('dashboard');
const sidebar = document.getElementById('sidebar');


document.addEventListener('DOMContentLoaded', async () => {
  initLoginFeatures(); // Professional login features

  // Check for password reset errors in URL first
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  const error = urlParams.get('error') || hashParams.get('error');
  const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
  const errorDesc = urlParams.get('error_description') || hashParams.get('error_description');

  if (error || errorCode) {
    console.log('❌ Auth error detected:', error, errorCode, errorDesc);
    showPasswordResetError(error, errorCode, errorDesc);
    return;
  }

  // Check if this is a password reset callback from Supabase
  if (typeof isPasswordResetCallback === 'function' && isPasswordResetCallback()) {
    console.log('🔑 Password reset mode detected');
    await showPasswordResetMode();
  } else {
    // Check Supabase session
    await checkAuth();
  }

  setupEvents();
  initTheme();
});

// Show password reset error (expired link, etc.)
function showPasswordResetError(error, errorCode, errorDesc) {
  loginPage.style.display = 'flex';
  dashboard.style.display = 'none';

  // Show login card with error
  document.getElementById('loginCard').style.display = 'none';
  document.getElementById('resetCard').style.display = 'block';

  const resetCard = document.getElementById('resetCard');

  let errorMessage = 'Something went wrong';
  let errorIcon = 'exclamation-triangle';
  let errorColor = '#ef4444';

  if (errorCode === 'otp_expired') {
    errorMessage = 'Reset link has expired';
    errorIcon = 'clock';
  } else if (errorCode === 'access_denied') {
    errorMessage = 'Invalid or expired link';
    errorIcon = 'ban';
  } else if (errorDesc) {
    errorMessage = errorDesc.replace(/\+/g, ' ');
  }

  resetCard.innerHTML = `
    <div class="login-header">
      <div class="login-logo" style="background: linear-gradient(135deg, ${errorColor}, #991b1b);">
        <i class="fas fa-${errorIcon}"></i>
      </div>
      <h1>Link Expired</h1>
      <p>${errorMessage}</p>
    </div>
    <div style="padding: 20px; text-align: center;">
      <p style="color: var(--text-muted); margin-bottom: 20px; font-size: 14px;">
        Password reset links expire after <strong>15 minutes</strong> for security.<br>
        Please request a new reset link.
      </p>
      <button type="button" class="btn btn-primary btn-full" onclick="showForgotPasswordForm()">
        <i class="fas fa-redo"></i> Request New Link
      </button>
      <div style="margin-top: 16px;">
        <a href="${window.location.pathname}" style="color: var(--primary); font-size: 13px;">
          <i class="fas fa-arrow-left"></i> Back to Login
        </a>
      </div>
    </div>
    <div class="login-security">
      <i class="fas fa-shield-alt"></i> Links expire for your security
    </div>
  `;

  // Clear the error from URL
  window.history.replaceState({}, document.title, window.location.pathname);
}

// Show forgot password form (for requesting new link)
function showForgotPasswordForm() {
  document.getElementById('resetCard').innerHTML = `
    <div class="login-header">
      <div class="login-logo"><i class="fas fa-key"></i></div>
      <h1>Reset Password</h1>
      <p>Enter your email to receive a reset link</p>
    </div>
    <form id="resetForm" class="login-form">
      <div class="form-group">
        <label><i class="fas fa-envelope"></i> Email</label>
        <input type="email" id="resetEmail" required placeholder="Enter your email" autocomplete="email">
        <small class="form-hint"><i class="fas fa-info-circle"></i> Link expires in 15 minutes</small>
      </div>
      <button type="submit" class="btn btn-primary btn-full" id="resetBtn">
        <i class="fas fa-paper-plane"></i> Send Reset Link
      </button>
    </form>
    <div class="login-footer">
      <a href="${window.location.pathname}"><i class="fas fa-arrow-left"></i> Back to Login</a>
    </div>
    <div class="login-security">
      <i class="fas fa-shield-alt"></i> Secured with Supabase Auth
    </div>
  `;

  document.getElementById('resetForm').addEventListener('submit', handleResetPassword);
  document.getElementById('resetEmail').focus();
}

window.showForgotPasswordForm = showForgotPasswordForm;

// Show password reset mode when user clicks email link
async function showPasswordResetMode() {
  loginPage.style.display = 'flex';
  dashboard.style.display = 'none';

  // Show reset card, hide login card
  document.getElementById('loginCard').style.display = 'none';
  document.getElementById('resetCard').style.display = 'block';

  // Show loading state first
  const resetCard = document.getElementById('resetCard');
  resetCard.innerHTML = `
    <div class="login-header">
      <div class="login-logo" style="background: linear-gradient(135deg, #8b5cf6, #6366f1);">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <h1>Verifying Link...</h1>
      <p>Please wait while we verify your reset link</p>
    </div>
  `;

  // First, establish session from URL tokens
  try {
    console.log('🔐 Setting up recovery session...');
    if (typeof handlePasswordResetCallback === 'function') {
      await handlePasswordResetCallback();
      console.log('✅ Recovery session ready');
    }
  } catch (err) {
    console.error('❌ Could not establish recovery session:', err);

    // Show error with retry option
    resetCard.innerHTML = `
      <div class="login-header">
        <div class="login-logo" style="background: linear-gradient(135deg, #ef4444, #991b1b);">
          <i class="fas fa-times"></i>
        </div>
        <h1>Link Invalid</h1>
        <p>${err.message || 'This reset link is invalid or has expired'}</p>
      </div>
      <div style="padding: 24px; text-align: center;">
        <p style="color: var(--text-muted); margin-bottom: 20px; font-size: 13px;">
          Reset links expire after <strong>15 minutes</strong> for security.<br>
          Please request a new one below.
        </p>
        <button type="button" class="btn btn-primary btn-full" onclick="showForgotPasswordForm()">
          <i class="fas fa-redo"></i> Request New Link
        </button>
        <div style="margin-top: 16px;">
          <a href="${window.location.pathname}" style="color: var(--primary); font-size: 13px;">
            <i class="fas fa-arrow-left"></i> Back to Login
          </a>
        </div>
      </div>
      <div class="login-security">
        <i class="fas fa-shield-alt"></i> Links expire for your security
      </div>
    `;
    return;
  }

  // Update UI for password update mode - Beautiful form
  resetCard.innerHTML = `
    <div class="login-header">
      <div class="login-logo" style="background: linear-gradient(135deg, #10b981, #059669);">
        <i class="fas fa-lock-open"></i>
      </div>
      <h1>Create New Password</h1>
      <p>Your identity is verified. Set a new password.</p>
    </div>
    <form id="resetForm" class="login-form">
      <div class="form-group">
        <label><i class="fas fa-lock"></i> New Password</label>
        <div class="input-with-icon">
          <input type="password" id="resetNewPass" required placeholder="Minimum 6 characters" minlength="6"
            aria-label="New password">
          <button type="button" class="password-toggle" onclick="togglePassword('resetNewPass')"
            aria-label="Toggle visibility">
            <i class="fas fa-eye"></i>
          </button>
        </div>
        <div class="password-strength" id="passwordStrength">
          <div class="strength-bar"><div class="strength-fill" id="strengthFill"></div></div>
          <span class="strength-text" id="strengthText">Enter a password</span>
        </div>
      </div>
      <div class="form-group">
        <label><i class="fas fa-lock"></i> Confirm Password</label>
        <div class="input-with-icon">
          <input type="password" id="resetConfirmPass" required placeholder="Re-enter password"
            aria-label="Confirm password">
          <button type="button" class="password-toggle" onclick="togglePassword('resetConfirmPass')"
            aria-label="Toggle visibility">
            <i class="fas fa-eye"></i>
          </button>
        </div>
        <div class="password-match" id="passwordMatch"></div>
      </div>
      <div class="password-requirements">
        <p style="font-size: 12px; color: var(--text-muted); margin: 0;">
          <i class="fas fa-info-circle"></i> Password must be at least 6 characters
        </p>
      </div>
      <button type="submit" class="btn btn-primary btn-full" id="resetBtn" style="margin-top: 16px;">
        <i class="fas fa-check-circle"></i> Update Password
      </button>
    </form>
    <div class="login-footer">
      <a href="${window.location.pathname}"><i class="fas fa-arrow-left"></i> Cancel</a>
    </div>
    <div class="login-security">
      <i class="fas fa-shield-alt"></i> Password secured with encryption
    </div>
  `;

  // Setup form listener
  document.getElementById('resetForm').addEventListener('submit', handlePasswordUpdate);

  // Add password strength and match listeners
  const newPassInput = document.getElementById('resetNewPass');
  const confirmPassInput = document.getElementById('resetConfirmPass');

  newPassInput?.addEventListener('input', updatePasswordStrength);
  confirmPassInput?.addEventListener('input', checkPasswordsMatch);

  newPassInput?.focus();
}

// Update password strength indicator
function updatePasswordStrength() {
  const password = document.getElementById('resetNewPass').value;
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');

  if (!strengthFill || !strengthText) return;

  let strength = 0;
  let text = 'Weak';
  let color = '#ef4444';

  if (password.length >= 6) strength += 25;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) strength += 25;

  if (strength <= 25) { text = 'Weak'; color = '#ef4444'; }
  else if (strength <= 50) { text = 'Fair'; color = '#f59e0b'; }
  else if (strength <= 75) { text = 'Good'; color = '#10b981'; }
  else { text = 'Strong'; color = '#10b981'; }

  strengthFill.style.width = `${strength}%`;
  strengthFill.style.background = color;
  strengthText.textContent = text;
  strengthText.style.color = color;
}

// Check if passwords match
function checkPasswordsMatch() {
  const newPass = document.getElementById('resetNewPass').value;
  const confirmPass = document.getElementById('resetConfirmPass').value;
  const matchDiv = document.getElementById('passwordMatch');

  if (!matchDiv || !confirmPass) {
    matchDiv.innerHTML = '';
    return;
  }

  if (newPass === confirmPass) {
    matchDiv.innerHTML = '<span style="color: #10b981; font-size: 12px;"><i class="fas fa-check"></i> Passwords match</span>';
  } else {
    matchDiv.innerHTML = '<span style="color: #ef4444; font-size: 12px;"><i class="fas fa-times"></i> Passwords do not match</span>';
  }
}

// Handle password update after clicking email link
async function handlePasswordUpdate(e) {
  e.preventDefault();
  const newPassword = document.getElementById('resetNewPass').value;
  const confirmPassword = document.getElementById('resetConfirmPass').value;

  if (newPassword !== confirmPassword) {
    showToast('❌ Passwords do not match');
    return;
  }

  if (newPassword.length < 6) {
    showToast('❌ Password must be at least 6 characters');
    return;
  }

  const btn = document.getElementById('resetBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

  try {
    // Update password in Supabase
    await supabaseUpdatePassword(newPassword);
    console.log('✅ Supabase password updated');

    // Also sync with backend (so login works with both)
    // Get current user email
    if (typeof getSupabaseUser === 'function') {
      const user = await getSupabaseUser();
      if (user && user.email) {
        try {
          // Call backend to sync password
          await fetch(`${API}/auth/sync-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, newPassword })
          });
          console.log('✅ Backend password synced');
        } catch (syncErr) {
          console.warn('Backend sync failed (non-critical):', syncErr);
        }
      }
    }

    showToast('✅ Password updated! Please login with your new password.');

    // Redirect to clean login page
    setTimeout(() => {
      window.location.href = window.location.pathname;
    }, 2000);
  } catch (error) {
    console.error('Password update error:', error);
    showToast('❌ ' + (error.message || 'Failed to update password'));
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Update Password';
  }
}




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

      // Initialize character counters when opening profile page
      if (page === 'profile') {
        setTimeout(initCharacterCounters, 100);
      }

      // Reload media when opening media page (ensure fresh data)
      if (page === 'media') {
        loadMedia();
      }
    });
  });

  // Close sidebar when clicking outside (mobile)
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('active')) {
      // Check if click is outside sidebar and not on menu toggle
      if (!sidebar.contains(e.target) && !e.target.closest('#menuToggle')) {
        sidebar.classList.remove('active');
      }
    }
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

  if (!email) {
    showToast('❌ Please enter your email');
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  try {
    // Use Supabase to send password reset email
    if (typeof supabaseResetPasswordEmail === 'function') {
      await supabaseResetPasswordEmail(email);

      // Show success message with better design
      document.getElementById('resetCard').innerHTML = `
        <div class="login-header">
          <div class="login-logo" style="background: linear-gradient(135deg, #10b981, #059669);">
            <i class="fas fa-paper-plane"></i>
          </div>
          <h1>Check Your Email</h1>
          <p>We've sent a password reset link to:</p>
          <p style="font-weight: 600; color: var(--accent); margin-top: 8px; font-size: 15px;">${email}</p>
        </div>
        <div style="padding: 20px;">
          <div style="background: var(--bg-elevated); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <p style="color: var(--text-secondary); font-size: 13px; margin: 0; line-height: 1.6;">
              <i class="fas fa-clock" style="color: var(--warning);"></i> 
              <strong>Link expires in 15 minutes</strong><br>
              <i class="fas fa-envelope" style="color: var(--primary); margin-top: 8px; display: inline-block;"></i> 
              Check your spam folder if you don't see it
            </p>
          </div>
          <button type="button" class="btn btn-primary btn-full" onclick="location.href='${window.location.pathname}'">
            <i class="fas fa-arrow-left"></i> Back to Login
          </button>
          <div style="text-align: center; margin-top: 16px;">
            <button type="button" class="btn btn-link" onclick="showForgotPasswordForm()" style="color: var(--text-muted); font-size: 13px; background: none; border: none; cursor: pointer;">
              <i class="fas fa-redo"></i> Resend Link
            </button>
          </div>
        </div>
        <div class="login-security">
          <i class="fas fa-shield-alt"></i> Email sent securely
        </div>
      `;

      showToast('📧 Password reset link sent!');
    } else {
      throw new Error('Supabase Auth not available');
    }
  } catch (error) {
    console.error('Reset error:', error);
    showToast('❌ ' + (error.message || 'Failed to send reset email'));
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
  }
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

// ===========================================
// AUTH - Login, Logout, Check Session
// ===========================================

async function checkAuth() {
  console.log('🔐 Checking authentication...');

  // Check backend token (this is what APIs require)
  if (token) {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        console.log('✅ Valid backend session');
        showDashboard();
        loadAllData();
        return;
      }
    } catch (e) {
      // Network error - silently continue to login
    }
  }

  // No valid token - show login (this is expected on first visit)
  console.log('❌ No valid session, showing login');
  showLogin();
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
    // Step 1: Login with Supabase Auth (for session management)
    if (typeof supabaseLogin === 'function') {
      console.log('🔐 Step 1: Supabase Auth login...');
      await supabaseLogin(email, password);
      console.log('✅ Supabase login successful');
    }

    // Step 2: Also login to backend to get backend JWT token (for API calls)
    console.log('🔐 Step 2: Getting backend token...');
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok && data.token) {
      token = data.token;
      localStorage.setItem('adminToken', token);
      console.log('✅ Backend token obtained');

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      resetLoginAttempts();
      showDashboard();
      loadAllData();
      showToast('Welcome back! 👋');
    } else {
      throw new Error(data.message || 'Login failed');
    }

  } catch (error) {
    console.error('Login error:', error);
    incrementLoginAttempts();
    showToast('❌ ' + (error.message || 'Invalid credentials'));
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

async function logout() {
  try {
    // Logout from Supabase if available
    if (typeof supabaseLogout === 'function') {
      await supabaseLogout();
    }
  } catch (e) {
    console.warn('Supabase logout error:', e);
  }

  // Clear local token
  token = null;
  localStorage.removeItem('adminToken');

  // Show login page
  showLogin();

  // Reset login form
  resetLoginForm();

  showToast('Logged out ✅');
}

function showLogin() {
  loginPage.style.display = 'flex';
  dashboard.style.display = 'none';

  // Make sure login card is visible, not reset card
  const loginCard = document.getElementById('loginCard');
  const resetCard = document.getElementById('resetCard');
  if (loginCard) loginCard.style.display = 'block';
  if (resetCard) resetCard.style.display = 'none';
}

function resetLoginForm() {
  // Reset form fields
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.reset();

  // Clear password field specifically
  const passwordField = document.getElementById('loginPassword');
  if (passwordField) passwordField.value = '';

  // Reset login button
  const loginBtn = document.querySelector('#loginForm button[type="submit"]');
  if (loginBtn) {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
  }

  // Restore remembered email if exists
  const rememberedEmail = localStorage.getItem('rememberedEmail');
  const emailField = document.getElementById('loginEmail');
  if (emailField && rememberedEmail) {
    emailField.value = rememberedEmail;
  }
}

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
  loadSessions(); // Load active sessions
  // Initialize Supabase Realtime quickly after dashboard loads
  setTimeout(initAdminRealtimeUpdates, 500);

  // Initialize dashboard widgets
  setTimeout(checkProfileCompletion, 1000);
  setTimeout(checkSystemStatus, 500);
}

// ===========================================
// DASHBOARD WIDGETS
// ===========================================

// Check profile completion percentage
async function checkProfileCompletion() {
  let completed = 0;
  let total = 6;
  let details = [];

  try {
    // Check Profile
    const profileRes = await fetch(`${API}/profile`);
    const profile = await profileRes.json();
    if (profile && profile.name && profile.title && profile.bio) {
      completed++;
      details.push({ name: 'Profile', complete: true });
    } else {
      details.push({ name: 'Profile', complete: false });
    }

    // Check Skills
    const skillsRes = await fetchAuth('/skills/all');
    const skills = await skillsRes.json();
    if (skills && skills.length >= 3) {
      completed++;
      details.push({ name: 'Skills', complete: true });
    } else {
      details.push({ name: 'Skills', complete: false });
    }

    // Check Projects
    const projectsRes = await fetchAuth('/projects/all');
    const projects = await projectsRes.json();
    if (projects && projects.length >= 2) {
      completed++;
      details.push({ name: 'Projects', complete: true });
    } else {
      details.push({ name: 'Projects', complete: false });
    }

    // Check Education
    const eduRes = await fetchAuth('/education/all');
    const edu = await eduRes.json();
    if (edu && edu.length >= 1) {
      completed++;
      details.push({ name: 'Education', complete: true });
    } else {
      details.push({ name: 'Education', complete: false });
    }

    // Check Photo
    if (profile && profile.profileImage) {
      completed++;
      details.push({ name: 'Photo', complete: true });
    } else {
      details.push({ name: 'Photo', complete: false });
    }

    // Check Resume
    if (profile && profile.resumeUrl) {
      completed++;
      details.push({ name: 'Resume', complete: true });
    } else {
      details.push({ name: 'Resume', complete: false });
    }

  } catch (e) {
    console.log('Error checking completion:', e);
  }

  // Update UI
  const percent = Math.round((completed / total) * 100);
  const percentEl = document.getElementById('completionPercent');
  const fillEl = document.getElementById('completionFill');
  const detailsEl = document.getElementById('completionDetails');

  if (percentEl) percentEl.textContent = `${percent}%`;
  if (fillEl) fillEl.style.width = `${percent}%`;

  if (detailsEl) {
    detailsEl.innerHTML = details.map(d => `
      <span class="detail-item ${d.complete ? 'complete' : ''}">
        <i class="fas fa-${d.complete ? 'check' : 'times'}"></i>
        ${d.name}
      </span>
    `).join('');
  }
}

// Check system status
async function checkSystemStatus() {
  const backendDot = document.getElementById('backendStatus');
  const backendText = document.getElementById('backendStatusText');
  const realtimeDot = document.getElementById('realtimeStatus');
  const realtimeText = document.getElementById('realtimeStatusText');
  const dbDot = document.getElementById('dbStatus');
  const dbText = document.getElementById('dbStatusText');

  // Check Backend
  try {
    const start = Date.now();
    const res = await fetch(`${API}/profile`);
    const latency = Date.now() - start;

    if (res.ok) {
      if (backendDot) backendDot.className = 'status-dot online';
      if (backendText) backendText.textContent = `Online (${latency}ms)`;
      if (dbDot) dbDot.className = 'status-dot online';
      if (dbText) dbText.textContent = 'Connected';
    } else {
      if (backendDot) backendDot.className = 'status-dot offline';
      if (backendText) backendText.textContent = 'Error';
    }
  } catch (e) {
    if (backendDot) backendDot.className = 'status-dot offline';
    if (backendText) backendText.textContent = 'Offline';
    if (dbDot) dbDot.className = 'status-dot offline';
    if (dbText) dbText.textContent = 'Disconnected';
  }

  // Check Realtime (wait a bit for it to initialize)
  setTimeout(() => {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      if (realtimeDot) realtimeDot.className = 'status-dot online';
      if (realtimeText) realtimeText.textContent = 'Connected';
    } else {
      if (realtimeDot) realtimeDot.className = 'status-dot checking';
      if (realtimeText) realtimeText.textContent = 'Initializing...';
    }
  }, 2000);
}

// ===========================================
// SUPABASE REALTIME - Live Updates for Admin
// ===========================================

function initAdminRealtimeUpdates(retryCount = 0) {
  // Check if realtime module is loaded (it loads async/defer)
  if (typeof subscribeToAdminUpdates !== 'function') {
    // Retry up to 5 times with 1 second delay
    if (retryCount < 5) {
      console.log(`⏳ Waiting for Supabase Realtime... (attempt ${retryCount + 1})`);
      setTimeout(() => initAdminRealtimeUpdates(retryCount + 1), 1000);
      return;
    }
    console.warn('⚠️ Supabase Realtime module not available');
    return;
  }

  // Subscribe to admin-relevant updates
  subscribeToAdminUpdates({
    // When new contact message arrives from main page
    onNewMessage: (payload) => {
      console.log('🔔 New message received in real-time!');
      showToast('📬 New message received!');
      playNotificationSound();
      loadMessages(); // Reload messages list
      loadStats(); // Update message count in stats
      updateMessageBadge(); // Update sidebar badge
    },

    // When message is updated (e.g., marked as read)
    onMessageUpdate: (payload) => {
      console.log('📧 Message updated in real-time');
      loadMessages();
      loadStats();
    },

    // When message is deleted
    onMessageDelete: (payload) => {
      console.log('🗑️ Message deleted in real-time');
      loadMessages();
      loadStats();
    },

    // When profile is updated (sync across tabs)
    onProfileUpdate: (payload) => {
      console.log('🔄 Profile updated in real-time');
      loadProfile();
      loadMedia();
    },

    // When skills are updated
    onSkillsUpdate: (payload) => {
      console.log('🔄 Skills updated in real-time');
      loadSkills();
      loadStats();
    },

    // When projects are updated
    onProjectsUpdate: (payload) => {
      console.log('🔄 Projects updated in real-time');
      loadProjects();
      loadStats();
    },

    // When education is updated
    onEducationUpdate: (payload) => {
      console.log('🔄 Education updated in real-time');
      loadEducation();
    },

    // When services are updated
    onServicesUpdate: (payload) => {
      console.log('🔄 Services updated in real-time');
      loadServices();
    },

    // When certificates are updated
    onCertificatesUpdate: (payload) => {
      console.log('🔄 Certificates updated in real-time');
      loadCertificates();
      loadStats();
    },

    // When sessions change (login/logout from any device)
    onSessionChange: (payload) => {
      console.log('🔐 Session changed in real-time:', payload.eventType);
      // If we're on sessions page, reload the list
      const sessionsContainer = document.getElementById('sessionsList');
      if (sessionsContainer && sessionsContainer.closest('.page.active')) {
        loadSessions();
        if (payload.eventType === 'INSERT') {
          showToast('🔐 New device logged in');
        } else if (payload.eventType === 'DELETE') {
          showToast('🔓 A device was logged out');
        }
      }
    }
  });

  console.log('🚀 Admin Real-time updates enabled - Messages and data will sync instantly!');

  // Start fallback polling as backup (in case realtime has issues)
  startMessagePolling();
}

// Fallback polling for messages (backup for realtime)
let messagePollingInterval = null;
let lastMessageCount = 0;

function startMessagePolling() {
  if (messagePollingInterval) return; // Already running

  console.log('⏱️ Starting message polling as fallback (every 10s)');

  messagePollingInterval = setInterval(async () => {
    try {
      const res = await fetchAuth('/contact');
      if (res.ok) {
        const msgs = await res.json();
        const currentCount = msgs.length;

        // Check if new message arrived
        if (currentCount > lastMessageCount && lastMessageCount > 0) {
          console.log('🔔 New message detected via polling!');
          showToast('📬 New message received!');
          playNotificationSound();
          loadMessages();
          loadStats();
        }

        lastMessageCount = currentCount;
      }
    } catch (e) {
      // Silent fail - polling is just a backup
    }
  }, 10000); // Check every 10 seconds
}

function stopMessagePolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
    messagePollingInterval = null;
    console.log('⏹️ Message polling stopped');
  }
}

// Play notification sound for new messages
function playNotificationSound() {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1; // Volume

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15); // Duration in seconds
  } catch (e) {
    console.log('Audio notification not available');
  }
}

// Update message badge in sidebar
function updateMessageBadge() {
  const badge = document.getElementById('msgBadge');
  if (badge) {
    const currentCount = parseInt(badge.textContent) || 0;
    badge.textContent = currentCount + 1;
    badge.classList.add('pulse-animation');
    setTimeout(() => badge.classList.remove('pulse-animation'), 2000);
  }
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

    // Reset unsaved indicator after loading data
    hideUnsavedIndicator();
  } catch { }
}

// Load Media (Photo & Resume) - separate function for Media page
async function loadMedia() {
  console.log('📷 Loading media...');

  try {
    const res = await fetch(`${API}/profile`);
    if (!res.ok) throw new Error('Failed to load profile');

    const d = await res.json();

    // ========== PROFILE PHOTO ==========
    const previewImg = document.getElementById('previewImg');
    const photoInitials = document.getElementById('photoInitials');
    const removeBtn = document.getElementById('removePhotoBtn');

    if (d.profileImage) {
      const imgUrl = d.profileImage.startsWith('http')
        ? d.profileImage
        : `${API.replace('/api', '')}${d.profileImage}`;

      previewImg.src = imgUrl;
      previewImg.style.display = 'block';
      previewImg.onerror = () => {
        console.warn('⚠️ Profile image failed to load:', imgUrl);
        previewImg.src = PLACEHOLDER_IMAGE;
      };

      if (photoInitials) photoInitials.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'inline-flex';

      console.log('✅ Profile photo loaded');
    } else {
      // Show initials when no profile image
      previewImg.style.display = 'none';

      if (photoInitials) {
        const name = d.name || d.fullName || 'User';
        const initials = name.split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        photoInitials.textContent = initials;
        photoInitials.style.display = 'flex';
      }

      if (removeBtn) removeBtn.style.display = 'none';
      console.log('ℹ️ No profile photo set');
    }

    // ========== RESUME/CV ==========
    const resumeStatus = document.getElementById('resumeStatus');
    const downloadBtn = document.getElementById('downloadResumeBtn');
    const removeResumeBtn = document.getElementById('removeResumeBtn');

    if (d.resumeUrl) {
      window.currentResumeUrl = d.resumeUrl;

      // Extract filename from URL
      const fileName = d.resumeUrl.split('/').pop().split('?')[0] || 'Resume.pdf';

      // Display resume info
      resumeStatus.innerHTML = `
        <span style="color: var(--success); font-weight: 500;">
          <i class="fas fa-check-circle"></i> ${fileName}
        </span>
      `;

      if (downloadBtn) downloadBtn.style.display = 'inline-flex';
      if (removeResumeBtn) removeResumeBtn.style.display = 'inline-flex';

      console.log('✅ Resume found:', fileName);
    } else {
      resumeStatus.textContent = 'Upload your resume in PDF format';
      if (downloadBtn) downloadBtn.style.display = 'none';
      if (removeResumeBtn) removeResumeBtn.style.display = 'none';
      window.currentResumeUrl = null;
      console.log('ℹ️ No resume uploaded');
    }

  } catch (error) {
    console.error('❌ Error loading media:', error);
    showToast('Error loading media data');
  }
}

// Preview photo in full size (opens in new tab)
function previewFullPhoto() {
  const previewImg = document.getElementById('previewImg');
  if (previewImg && previewImg.src && !previewImg.src.includes('placeholder')) {
    window.open(previewImg.src, '_blank');
    showToast('Opening full photo...');
  } else {
    showToast('No photo to preview');
  }
}

// ===========================================
// PROFILE HELPER FUNCTIONS
// ===========================================

// Reset profile form to last saved state
function resetProfileForm() {
  if (confirm('Reset all unsaved changes?')) {
    loadProfile();
    showToast('Form reset to last saved state');
  }
}

// Preview profile on main site (popup)
function previewProfileOnSite() {
  const popup = window.open('index.html', 'Portfolio Preview', 'width=1200,height=800,scrollbars=yes');
  if (popup) {
    popup.focus();
    showToast('Opening preview...');
  } else {
    showToast('Please allow popups for preview');
  }
}

// Initialize character counters for textarea fields
function initCharacterCounters() {
  const bioField = document.querySelector('textarea[name="bio"]');
  const aboutField = document.querySelector('textarea[name="about"]');

  const maxBio = 200;
  const maxAbout = 1000;

  if (bioField && !bioField.dataset.hasCounter) {
    bioField.dataset.hasCounter = 'true';
    const counter = document.createElement('small');
    counter.className = 'char-counter';
    counter.style.cssText = 'display:block;text-align:right;color:var(--text-muted);font-size:11px;margin-top:4px;';
    bioField.parentElement.appendChild(counter);

    const updateCounter = () => {
      const len = bioField.value.length;
      counter.textContent = `${len}/${maxBio} characters`;
      counter.style.color = len > maxBio ? 'var(--error)' : 'var(--text-muted)';
    };
    bioField.addEventListener('input', updateCounter);
    updateCounter();
  }

  if (aboutField && !aboutField.dataset.hasCounter) {
    aboutField.dataset.hasCounter = 'true';
    const counter = document.createElement('small');
    counter.className = 'char-counter';
    counter.style.cssText = 'display:block;text-align:right;color:var(--text-muted);font-size:11px;margin-top:4px;';
    aboutField.parentElement.appendChild(counter);

    const updateCounter = () => {
      const len = aboutField.value.length;
      counter.textContent = `${len}/${maxAbout} characters`;
      counter.style.color = len > maxAbout ? 'var(--error)' : 'var(--text-muted)';
    };
    aboutField.addEventListener('input', updateCounter);
    updateCounter();
  }
}

// Export profile helper functions
window.resetProfileForm = resetProfileForm;
window.previewProfileOnSite = previewProfileOnSite;

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
      // Hide the preview image completely
      const previewImg = document.getElementById('previewImg');
      if (previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
      }

      // Hide remove button
      const removeBtn = document.getElementById('removePhotoBtn');
      if (removeBtn) {
        removeBtn.style.display = 'none';
      }

      // Show initials instead
      const name = document.querySelector('input[name="name"]')?.value || 'MA';
      const initialsStr = name.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2) || 'MA';

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
      console.error('❌ Resume upload failed:', err);
      console.error('Status:', res.status);
      console.error('Error details:', JSON.stringify(err, null, 2));
      showToast('❌ ' + (err.message || err.error || 'Upload failed'));
    }
  } catch (error) {
    console.error('Resume upload error:', error);
    console.error('Error stack:', error.stack);
    showToast('❌ Server error');
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
  console.log('📚 Loading skills...');

  try {
    const res = await fetchAuth('/skills/all');
    if (!res.ok) throw new Error('Failed to fetch skills');

    const skills = await res.json();

    // Sort skills by category then by proficiency
    const sortedSkills = skills.sort((a, b) => {
      if (a.category === b.category) {
        return (b.proficiency || 0) - (a.proficiency || 0);
      }
      return (a.category || '').localeCompare(b.category || '');
    });

    // Log stats
    console.log(`✅ Loaded ${skills.length} skills`);

    if (!sortedSkills?.length) {
      document.getElementById('skillsList').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-code"></i>
          <p>No skills added yet</p>
          <button class="btn btn-primary btn-sm" onclick="openModal('skill')">
            <i class="fas fa-plus"></i> Add Your First Skill
          </button>
        </div>
      `;
      return;
    }

    document.getElementById('skillsList').innerHTML = sortedSkills.map(s => {
      const iconClass = getIconClass(s.icon);
      const proficiency = s.proficiency || 0;

      // Proficiency color
      let profColor = 'var(--text-muted)';
      if (proficiency >= 80) profColor = 'var(--success)';
      else if (proficiency >= 50) profColor = 'var(--warning)';
      else if (proficiency < 30) profColor = 'var(--error)';

      return `
        <div class="item-card">
          <div class="item-header">
            <h4>
              <i class="${iconClass}" style="margin-right: 8px; color: var(--accent);"></i>
              ${s.name}
            </h4>
            <div class="item-actions">
              <button class="btn-edit" onclick='editItem("skill", ${JSON.stringify(s).replace(/'/g, "&#39;")})'>Edit</button>
              <button class="btn-delete" data-endpoint="skills" data-id="${s._id}">Delete</button>
            </div>
          </div>
          <p>
            <span class="tag">${s.category || 'Other'}</span>
            <span style="color: ${profColor}; font-weight: 500;">${proficiency}%</span>
          </p>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('❌ Error loading skills:', error);
    document.getElementById('skillsList').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle" style="color: var(--error);"></i>
        <p>Error loading skills</p>
        <button class="btn btn-primary btn-sm" onclick="loadSkills()">
          <i class="fas fa-refresh"></i> Retry
        </button>
      </div>
    `;
  }
}

// Get skill statistics by category
function getSkillCategoryStats() {
  return new Promise(async (resolve) => {
    try {
      const res = await fetchAuth('/skills/all');
      const skills = await res.json();

      const stats = {};
      skills.forEach(s => {
        const cat = s.category || 'other';
        stats[cat] = (stats[cat] || 0) + 1;
      });

      resolve({
        total: skills.length,
        categories: stats
      });
    } catch {
      resolve({ total: 0, categories: {} });
    }
  });
}

async function loadEducation() {
  console.log('🎓 Loading education...');

  try {
    const res = await fetchAuth('/education/all');
    if (!res.ok) throw new Error('Failed to fetch education');

    const edu = await res.json();

    // Sort by year (most recent first)
    const sortedEdu = edu.sort((a, b) => {
      const yearA = parseInt(a.endYear) || (a.endYear === 'Present' ? 9999 : parseInt(a.startYear) || 0);
      const yearB = parseInt(b.endYear) || (b.endYear === 'Present' ? 9999 : parseInt(b.startYear) || 0);
      return yearB - yearA;
    });

    console.log(`✅ Loaded ${edu.length} education entries`);

    if (!sortedEdu?.length) {
      document.getElementById('educationList').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-graduation-cap"></i>
          <p>No education added yet</p>
          <button class="btn btn-primary btn-sm" onclick="openModal('education')">
            <i class="fas fa-plus"></i> Add Education
          </button>
        </div>
      `;
      return;
    }

    document.getElementById('educationList').innerHTML = sortedEdu.map(e => {
      // Check if currently studying
      const isCurrent = e.endYear === 'Present' || e.endYear === 'present' || !e.endYear;

      // Calculate duration
      const startYear = parseInt(e.startYear) || 0;
      const endYear = isCurrent ? new Date().getFullYear() : (parseInt(e.endYear) || startYear);
      const duration = endYear - startYear;
      const durationText = duration > 0 ? `(${duration} ${duration === 1 ? 'year' : 'years'})` : '';

      return `
        <div class="item-card ${isCurrent ? 'current' : ''}">
          <div class="item-header">
            <h4>
              <i class="fas fa-graduation-cap" style="margin-right: 8px; color: var(--accent);"></i>
              ${e.degree} - ${e.field}
            </h4>
            <div class="item-actions">
              <button class="btn-edit" onclick='editItem("education", ${JSON.stringify(e).replace(/'/g, "&#39;")})'>Edit</button>
              <button class="btn-delete" data-endpoint="education" data-id="${e._id}">Delete</button>
            </div>
          </div>
          <p>
            ${e.websiteUrl
          ? `<a href="${e.websiteUrl}" target="_blank" style="color: var(--accent); text-decoration: none;">${e.institution} <i class="fas fa-external-link-alt" style="font-size: 10px;"></i></a>`
          : e.institution
        }
          </p>
          <p>
            <span class="tag ${isCurrent ? 'current-tag' : ''}">${e.startYear} - ${e.endYear || 'Present'}</span>
            <span style="color: var(--text-muted); font-size: 12px;">${durationText}</span>
          </p>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('❌ Error loading education:', error);
    document.getElementById('educationList').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle" style="color: var(--error);"></i>
        <p>Error loading education</p>
        <button class="btn btn-primary btn-sm" onclick="loadEducation()">
          <i class="fas fa-refresh"></i> Retry
        </button>
      </div>
    `;
  }
}

// Get current education (if any)
async function getCurrentEducation() {
  try {
    const res = await fetchAuth('/education/all');
    const edu = await res.json();

    const current = edu.find(e =>
      e.endYear === 'Present' || e.endYear === 'present' || !e.endYear
    );

    return current || null;
  } catch {
    return null;
  }
}

// Get education timeline (sorted by year)
async function getEducationTimeline() {
  try {
    const res = await fetchAuth('/education/all');
    const edu = await res.json();

    return edu.sort((a, b) => {
      const yearA = parseInt(a.startYear) || 0;
      const yearB = parseInt(b.startYear) || 0;
      return yearA - yearB;
    }).map(e => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      startYear: e.startYear,
      endYear: e.endYear || 'Present',
      isCurrent: !e.endYear || e.endYear === 'Present'
    }));
  } catch {
    return [];
  }
}

async function loadProjects() {
  console.log('📁 Loading projects...');

  try {
    const res = await fetchAuth('/projects/all');
    if (!res.ok) throw new Error('Failed to fetch projects');

    const projects = await res.json();

    // Sort: featured first, then by title
    const sortedProjects = projects.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (a.title || '').localeCompare(b.title || '');
    });

    console.log(`✅ Loaded ${projects.length} projects (${projects.filter(p => p.featured).length} featured)`);

    if (!sortedProjects?.length) {
      document.getElementById('projectsList').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-folder"></i>
          <p>No projects added yet</p>
          <button class="btn btn-primary btn-sm" onclick="openModal('project')">
            <i class="fas fa-plus"></i> Add Your First Project
          </button>
        </div>
      `;
      return;
    }

    document.getElementById('projectsList').innerHTML = sortedProjects.map(p => {
      // Get image URL
      const hasImage = p.image && p.image.length > 0;
      const imageUrl = hasImage
        ? (p.image.startsWith('http') ? p.image : `${API.replace('/api', '')}${p.image}`)
        : null;

      // Category icon
      const categoryIcons = {
        'web': 'fas fa-globe',
        'mobile': 'fas fa-mobile-alt',
        'api': 'fas fa-code',
        'other': 'fas fa-folder'
      };
      const categoryIcon = categoryIcons[p.category] || 'fas fa-folder';

      // Limit technologies display
      const techsToShow = (p.technologies || []).slice(0, 4);
      const moreTechs = (p.technologies || []).length - 4;

      return `
        <div class="item-card ${p.featured ? 'featured' : ''}">
          <div class="item-header">
            <h4>
              ${p.featured ? '<i class="fas fa-star" style="color: gold; margin-right: 5px;"></i>' : ''}
              <i class="${categoryIcon}" style="margin-right: 8px; color: var(--accent);"></i>
              ${p.title}
            </h4>
            <div class="item-actions">
              <button class="btn-edit" onclick='editItem("project", ${JSON.stringify(p).replace(/'/g, "&#39;")})'>Edit</button>
              <button class="btn-delete" data-endpoint="projects" data-id="${p._id}">Delete</button>
            </div>
          </div>
          <p>${p.description?.substring(0, 100)}${p.description?.length > 100 ? '...' : ''}</p>
          <p>
            ${techsToShow.map(t => `<span class="tag">${t}</span>`).join('')}
            ${moreTechs > 0 ? `<span class="tag" style="background: var(--bg-elevated);">+${moreTechs} more</span>` : ''}
          </p>
          <div class="item-links">
            ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" class="item-link"><i class="fas fa-external-link-alt"></i> Live Demo</a>` : ''}
            ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" class="item-link"><i class="fab fa-github"></i> GitHub</a>` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('❌ Error loading projects:', error);
    document.getElementById('projectsList').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle" style="color: var(--error);"></i>
        <p>Error loading projects</p>
        <button class="btn btn-primary btn-sm" onclick="loadProjects()">
          <i class="fas fa-refresh"></i> Retry
        </button>
      </div>
    `;
  }
}

// Get featured projects only
async function getFeaturedProjects() {
  try {
    const res = await fetchAuth('/projects/all');
    const projects = await res.json();
    return projects.filter(p => p.featured);
  } catch {
    return [];
  }
}

// Get projects by category
async function getProjectsByCategory(category) {
  try {
    const res = await fetchAuth('/projects/all');
    const projects = await res.json();

    if (category === 'all') return projects;
    return projects.filter(p => p.category === category);
  } catch {
    return [];
  }
}

// Get project statistics
async function getProjectStats() {
  try {
    const res = await fetchAuth('/projects/all');
    const projects = await res.json();

    const categories = {};
    const allTechs = [];

    projects.forEach(p => {
      // Count by category
      const cat = p.category || 'other';
      categories[cat] = (categories[cat] || 0) + 1;

      // Collect all technologies
      if (p.technologies) {
        allTechs.push(...p.technologies);
      }
    });

    // Count technologies
    const techCount = {};
    allTechs.forEach(t => {
      techCount[t] = (techCount[t] || 0) + 1;
    });

    // Sort technologies by usage
    const topTechs = Object.entries(techCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tech, count]) => ({ tech, count }));

    return {
      total: projects.length,
      featured: projects.filter(p => p.featured).length,
      categories,
      topTechnologies: topTechs
    };
  } catch {
    return { total: 0, featured: 0, categories: {}, topTechnologies: [] };
  }
}

async function loadServices() {
  console.log('💼 Loading services...');

  try {
    const res = await fetchAuth('/services/all');
    if (!res.ok) throw new Error('Failed to fetch services');

    const services = await res.json();

    // Sort alphabetically by title
    const sortedServices = services.sort((a, b) =>
      (a.title || '').localeCompare(b.title || '')
    );

    console.log(`✅ Loaded ${services.length} services`);

    if (!sortedServices?.length) {
      document.getElementById('servicesList').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-briefcase"></i>
          <p>No services added yet</p>
          <button class="btn btn-primary btn-sm" onclick="openModal('service')">
            <i class="fas fa-plus"></i> Add Service
          </button>
        </div>
      `;
      return;
    }

    // Icon mapping
    const serviceIconMap = {
      'code': 'fas fa-code',
      'layout': 'fas fa-palette',
      'server': 'fas fa-server',
      'mobile': 'fas fa-mobile-alt',
      'file': 'fas fa-file-alt',
      'keyboard': 'fas fa-keyboard',
      'robot': 'fas fa-robot',
      'tool': 'fas fa-tools'
    };

    document.getElementById('servicesList').innerHTML = sortedServices.map(s => {
      const iconClass = serviceIconMap[s.icon] || 'fas fa-briefcase';
      const description = s.description || '';
      const truncatedDesc = description.length > 100
        ? description.substring(0, 100) + '...'
        : description;

      return `
        <div class="item-card">
          <div class="item-header">
            <h4>
              <i class="${iconClass}" style="margin-right: 8px; color: var(--accent);"></i>
              ${s.title}
            </h4>
            <div class="item-actions">
              <button class="btn-edit" onclick='editItem("service", ${JSON.stringify(s).replace(/'/g, "&#39;")})'>Edit</button>
              <button class="btn-delete" data-endpoint="services" data-id="${s._id}">Delete</button>
            </div>
          </div>
          <p>${truncatedDesc}</p>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('❌ Error loading services:', error);
    document.getElementById('servicesList').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle" style="color: var(--error);"></i>
        <p>Error loading services</p>
        <button class="btn btn-primary btn-sm" onclick="loadServices()">
          <i class="fas fa-refresh"></i> Retry
        </button>
      </div>
    `;
  }
}

// Get all services as array
async function getAllServices() {
  try {
    const res = await fetchAuth('/services/all');
    const services = await res.json();
    return services.map(s => ({
      id: s._id,
      title: s.title,
      description: s.description,
      icon: s.icon
    }));
  } catch {
    return [];
  }
}

// Get service icon options
function getServiceIconOptions() {
  return [
    { value: 'code', label: 'Code', icon: 'fas fa-code', emoji: '💻' },
    { value: 'layout', label: 'Layout/Design', icon: 'fas fa-palette', emoji: '🎨' },
    { value: 'server', label: 'Server', icon: 'fas fa-server', emoji: '🖥️' },
    { value: 'mobile', label: 'Mobile', icon: 'fas fa-mobile-alt', emoji: '📱' },
    { value: 'file', label: 'Document', icon: 'fas fa-file-alt', emoji: '📄' },
    { value: 'keyboard', label: 'Typing', icon: 'fas fa-keyboard', emoji: '⌨️' },
    { value: 'robot', label: 'AI/Robot', icon: 'fas fa-robot', emoji: '🤖' },
    { value: 'tool', label: 'Tools', icon: 'fas fa-tools', emoji: '🔧' }
  ];
}

async function loadCertificates() {
  console.log('🏆 Loading certificates...');

  try {
    const res = await fetchAuth('/certificates/all');
    if (!res.ok) throw new Error('Failed to fetch certificates');

    const certs = await res.json();

    // Sort by date (newest first)
    const sortedCerts = certs.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB - dateA;
    });

    console.log(`✅ Loaded ${certs.length} certificates`);

    if (!sortedCerts?.length) {
      document.getElementById('certificatesList').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-certificate"></i>
          <p>No certificates added yet</p>
          <button class="btn btn-primary btn-sm" onclick="openModal('certificate')">
            <i class="fas fa-plus"></i> Add Certificate
          </button>
        </div>
      `;
      return;
    }

    document.getElementById('certificatesList').innerHTML = sortedCerts.map(c => {
      // Format date
      const certDate = c.date ? new Date(c.date) : null;
      const dateStr = certDate ? certDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      }) : 'N/A';

      // Calculate how old (relative time)
      let relativeTime = '';
      if (certDate) {
        const now = new Date();
        const diffMonths = Math.floor((now - certDate) / (1000 * 60 * 60 * 24 * 30));
        if (diffMonths < 1) relativeTime = 'This month';
        else if (diffMonths < 12) relativeTime = `${diffMonths} months ago`;
        else {
          const years = Math.floor(diffMonths / 12);
          relativeTime = `${years} ${years === 1 ? 'year' : 'years'} ago`;
        }
      }

      return `
        <div class="item-card">
          <div class="item-header">
            <h4>
              <i class="fas fa-award" style="margin-right: 8px; color: var(--accent);"></i>
              ${c.title}
            </h4>
            <div class="item-actions">
              <button class="btn-edit" onclick='editItem("certificate", ${JSON.stringify(c).replace(/'/g, "&#39;")})'>Edit</button>
              <button class="btn-delete" data-endpoint="certificates" data-id="${c._id}">Delete</button>
            </div>
          </div>
          <p>
            <i class="fas fa-building" style="margin-right: 5px; color: var(--text-muted);"></i>
            ${c.issuer}
          </p>
          <p>
            <span class="tag">${dateStr}</span>
            ${relativeTime ? `<span style="color: var(--text-muted); font-size: 12px; margin-left: 5px;">${relativeTime}</span>` : ''}
          </p>
          ${c.credentialUrl
          ? `<a href="${c.credentialUrl}" target="_blank" class="item-link"><i class="fas fa-certificate"></i> View Certificate</a>`
          : ''
        }
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('❌ Error loading certificates:', error);
    document.getElementById('certificatesList').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle" style="color: var(--error);"></i>
        <p>Error loading certificates</p>
        <button class="btn btn-primary btn-sm" onclick="loadCertificates()">
          <i class="fas fa-refresh"></i> Retry
        </button>
      </div>
    `;
  }
}

// Get certificates by issuer
async function getCertificatesByIssuer(issuer) {
  try {
    const res = await fetchAuth('/certificates/all');
    const certs = await res.json();

    if (!issuer || issuer === 'all') return certs;
    return certs.filter(c => c.issuer?.toLowerCase().includes(issuer.toLowerCase()));
  } catch {
    return [];
  }
}

// Get recent certificates (last N months)
async function getRecentCertificates(months = 6) {
  try {
    const res = await fetchAuth('/certificates/all');
    const certs = await res.json();

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    return certs.filter(c => {
      if (!c.date) return false;
      return new Date(c.date) >= cutoffDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch {
    return [];
  }
}

// Get certificate statistics
async function getCertificateStats() {
  try {
    const res = await fetchAuth('/certificates/all');
    const certs = await res.json();

    // Group by issuer
    const byIssuer = {};
    certs.forEach(c => {
      const issuer = c.issuer || 'Unknown';
      byIssuer[issuer] = (byIssuer[issuer] || 0) + 1;
    });

    // Find most recent
    const sortedByDate = certs
      .filter(c => c.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const mostRecent = sortedByDate[0] || null;

    // Count by year
    const byYear = {};
    certs.forEach(c => {
      if (c.date) {
        const year = new Date(c.date).getFullYear();
        byYear[year] = (byYear[year] || 0) + 1;
      }
    });

    return {
      total: certs.length,
      byIssuer,
      byYear,
      mostRecent: mostRecent ? {
        title: mostRecent.title,
        issuer: mostRecent.issuer,
        date: mostRecent.date
      } : null
    };
  } catch {
    return { total: 0, byIssuer: {}, byYear: {}, mostRecent: null };
  }
}


async function loadMessages() {
  console.log('📬 Loading messages...');

  try {
    const res = await fetchAuth('/contact');
    if (!res.ok) throw new Error('Failed to fetch messages');

    const msgs = await res.json();

    // Sort by date (newest first)
    const sortedMsgs = msgs.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });

    const unread = sortedMsgs.filter(m => !m.isRead).length;

    console.log(`✅ Loaded ${msgs.length} messages (${unread} unread)`);

    // Update sidebar badge
    const msgBadge = document.getElementById('msgBadge');
    if (msgBadge) {
      msgBadge.textContent = unread;
      msgBadge.style.display = unread > 0 ? 'block' : 'none';
    }

    // Update last message count for polling
    lastMessageCount = msgs.length;

    // Update dashboard unread count
    const unreadCountEl = document.getElementById('unreadCount');
    if (unreadCountEl) {
      unreadCountEl.textContent = `${unread} unread`;
      unreadCountEl.style.background = unread > 0 ? 'var(--error)' : 'var(--bg-elevated)';
      unreadCountEl.style.color = unread > 0 ? 'white' : 'var(--text-muted)';
    }

    if (!sortedMsgs?.length) {
      document.getElementById('messagesList').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No messages yet</p>
          <span style="color: var(--text-muted); font-size: 12px;">Messages from your contact form will appear here</span>
        </div>
      `;
      document.getElementById('recentMessages').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No messages</p>
        </div>
      `;
      return;
    }

    document.getElementById('messagesList').innerHTML = sortedMsgs.map(m => {
      // Format date with relative time
      const msgDate = m.createdAt ? new Date(m.createdAt) : null;
      const dateStr = msgDate ? msgDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) : 'Unknown';

      // Relative time
      let relativeTime = '';
      if (msgDate) {
        const now = new Date();
        const diffHours = Math.floor((now - msgDate) / (1000 * 60 * 60));
        if (diffHours < 1) relativeTime = 'Just now';
        else if (diffHours < 24) relativeTime = `${diffHours}h ago`;
        else {
          const diffDays = Math.floor(diffHours / 24);
          if (diffDays < 7) relativeTime = `${diffDays}d ago`;
          else relativeTime = dateStr;
        }
      }

      return `
        <div class="item-card msg-card ${m.isRead ? 'read' : 'unread'}">
          <div class="msg-header">
            <strong>
              ${!m.isRead ? '<i class="fas fa-circle" style="color: var(--accent); font-size: 8px; margin-right: 5px;"></i>' : ''}
              ${m.name}
            </strong>
            <span title="${dateStr}">${relativeTime}</span>
          </div>
          <p class="msg-email"><i class="fas fa-envelope"></i> ${m.email}</p>
          ${m.phone ? `<p class="msg-phone"><i class="fas fa-phone"></i> ${m.phone}</p>` : ''}
          <p class="msg-subject"><strong>${m.subject || 'No Subject'}</strong></p>
          <p class="msg-body">${m.message}</p>
          <div class="msg-actions item-actions">
            ${!m.isRead ? `<button class="btn-edit" onclick="markRead('${m._id}')"><i class="fas fa-check"></i> Mark Read</button>` : ''}
            <button class="btn-delete" data-endpoint="contact" data-id="${m._id}">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    // Recent messages for dashboard
    document.getElementById('recentMessages').innerHTML = sortedMsgs.slice(0, 3).map(m => {
      const msgDate = m.createdAt ? new Date(m.createdAt) : null;
      let relativeTime = '';
      if (msgDate) {
        const now = new Date();
        const diffHours = Math.floor((now - msgDate) / (1000 * 60 * 60));
        if (diffHours < 1) relativeTime = 'Just now';
        else if (diffHours < 24) relativeTime = `${diffHours}h ago`;
        else {
          const diffDays = Math.floor(diffHours / 24);
          relativeTime = `${diffDays}d ago`;
        }
      }

      return `
        <div class="item-card msg-card ${m.isRead ? 'read' : 'unread'}" style="margin-bottom:12px">
          <div class="msg-header">
            <strong>
              ${!m.isRead ? '<i class="fas fa-circle" style="color: var(--accent); font-size: 6px; margin-right: 4px;"></i>' : ''}
              ${m.name}
            </strong>
            <span>${relativeTime}</span>
          </div>
          <p class="msg-body">${m.message?.substring(0, 60)}${m.message?.length > 60 ? '...' : ''}</p>
        </div>
      `;
    }).join('') || '<div class="empty-state"><i class="fas fa-inbox"></i><p>No messages</p></div>';

  } catch (error) {
    console.error('❌ Error loading messages:', error);
    document.getElementById('messagesList').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle" style="color: var(--error);"></i>
        <p>Error loading messages</p>
        <button class="btn btn-primary btn-sm" onclick="loadMessages()">
          <i class="fas fa-refresh"></i> Retry
        </button>
      </div>
    `;
  }
}

async function markRead(id) {
  try {
    const res = await fetchAuth(`/contact/${id}/read`, { method: 'PUT' });
    if (res.ok) {
      await loadMessages();
      showToast('✅ Marked as read');
    } else {
      showToast('❌ Failed to mark as read');
    }
  } catch (error) {
    console.error('Error marking as read:', error);
    showToast('❌ Connection error');
  }
}

// Get unread messages only
async function getUnreadMessages() {
  try {
    const res = await fetchAuth('/contact');
    const msgs = await res.json();
    return msgs.filter(m => !m.isRead).sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  } catch {
    return [];
  }
}

// Mark all messages as read
async function markAllAsRead() {
  try {
    const unread = await getUnreadMessages();
    if (unread.length === 0) {
      showToast('No unread messages');
      return;
    }

    showToast(`⏳ Marking ${unread.length} messages as read...`);

    let success = 0;
    for (const msg of unread) {
      const res = await fetchAuth(`/contact/${msg._id}/read`, { method: 'PUT' });
      if (res.ok) success++;
    }

    await loadMessages();
    showToast(`✅ Marked ${success} messages as read`);
    return success;
  } catch (error) {
    console.error('Error marking all as read:', error);
    showToast('❌ Error marking messages as read');
    return 0;
  }
}

// Get message statistics
async function getMessageStats() {
  try {
    const res = await fetchAuth('/contact');
    const msgs = await res.json();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date(today);
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    return {
      total: msgs.length,
      unread: msgs.filter(m => !m.isRead).length,
      read: msgs.filter(m => m.isRead).length,
      today: msgs.filter(m => m.createdAt && new Date(m.createdAt) >= today).length,
      thisWeek: msgs.filter(m => m.createdAt && new Date(m.createdAt) >= thisWeek).length,
      thisMonth: msgs.filter(m => m.createdAt && new Date(m.createdAt) >= thisMonth).length
    };
  } catch {
    return { total: 0, unread: 0, read: 0, today: 0, thisWeek: 0, thisMonth: 0 };
  }
}

// Search messages
async function searchMessages(query) {
  try {
    const res = await fetchAuth('/contact');
    const msgs = await res.json();

    if (!query) return msgs;

    const lowerQuery = query.toLowerCase();
    return msgs.filter(m =>
      m.name?.toLowerCase().includes(lowerQuery) ||
      m.email?.toLowerCase().includes(lowerQuery) ||
      m.subject?.toLowerCase().includes(lowerQuery) ||
      m.message?.toLowerCase().includes(lowerQuery)
    );
  } catch {
    return [];
  }
}

// ===========================================
// SESSION MANAGEMENT - CLEAN VERSION
// ===========================================
console.log('📱 Session Management v6.0 Loaded');

// Global data
let ipApiData = null;
let geoLocation = null; // Stores browser geolocation

// Request browser geolocation
async function requestGeolocation() {
  if (!navigator.geolocation) return null;

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });

    geoLocation = {
      lat: position.coords.latitude.toFixed(4),
      lng: position.coords.longitude.toFixed(4)
    };

    // Reverse geocode to get city/country
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${geoLocation.lat}&lon=${geoLocation.lng}&format=json`);
      const geoData = await geoRes.json();
      if (geoData && geoData.address) {
        geoLocation.city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.state || '';
        geoLocation.country = geoData.address.country || '';
      }
    } catch (e) {
      console.log('Geocode failed, using coordinates');
    }

    console.log('📍 Geolocation:', geoLocation);
    return geoLocation;
  } catch (e) {
    console.log('Geolocation denied');
    return null;
  }
}

async function loadSessions() {
  console.log('🔐 Loading sessions...');

  const container = document.getElementById('sessionsList');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><i class="fas fa-spinner fa-spin"></i> Loading sessions...</div>';

  try {
    // Request geolocation (will prompt user)
    await requestGeolocation();

    // Fetch IP info from API
    if (!ipApiData) {
      try {
        const ipRes = await fetch('http://ip-api.com/json/');
        const data = await ipRes.json();
        if (data.status === 'success') {
          ipApiData = data;
          console.log('🌐 IP Info:', data.city, data.country, data.query);
        }
      } catch (e) {
        console.log('IP API unavailable');
      }
    }

    // Fetch sessions from backend
    const res = await fetchAuth('/auth/sessions');
    if (!res.ok) {
      console.error('❌ Failed to load sessions');
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle" style="color: var(--error);"></i>
          <p>Failed to load sessions</p>
          <button class="btn btn-primary btn-sm" onclick="loadSessions()">
            <i class="fas fa-refresh"></i> Retry
          </button>
        </div>
      `;
      return;
    }

    const sessions = await res.json();

    // Sort: current session first, then by most recent
    const sortedSessions = sessions.sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const currentSession = sortedSessions.find(s => s.isCurrent);
    const otherSessions = sortedSessions.filter(s => !s.isCurrent);

    console.log(`✅ Loaded ${sessions.length} sessions (${otherSessions.length} other devices)`);

    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-shield-alt"></i><p>No active sessions</p></div>';
      return;
    }

    // Render all sessions
    let html = '<div class="sessions-grid">';
    sortedSessions.forEach(session => {
      html += createSessionCard(session);
    });
    html += '</div>';

    container.innerHTML = html;

  } catch (error) {
    console.error('❌ Session load error:', error);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle" style="color: var(--error);"></i>
        <p>Error: ${error.message}</p>
        <button class="btn btn-primary btn-sm" onclick="loadSessions()">
          <i class="fas fa-refresh"></i> Retry
        </button>
      </div>
    `;
  }
}

// Get session statistics
async function getSessionStats() {
  try {
    const res = await fetchAuth('/auth/sessions');
    if (!res.ok) return null;

    const sessions = await res.json();

    // Categorize by device type
    const byDevice = { desktop: 0, mobile: 0, tablet: 0 };
    const byBrowser = {};
    const byOS = {};

    sessions.forEach(s => {
      const ua = s.userAgent || '';
      const device = parseDeviceType(ua);
      const browser = parseBrowser(ua);
      const os = parseOS(ua);

      byDevice[device] = (byDevice[device] || 0) + 1;
      byBrowser[browser] = (byBrowser[browser] || 0) + 1;
      byOS[os] = (byOS[os] || 0) + 1;
    });

    const current = sessions.find(s => s.isCurrent);

    return {
      total: sessions.length,
      otherDevices: sessions.filter(s => !s.isCurrent).length,
      byDevice,
      byBrowser,
      byOS,
      currentDevice: current ? {
        browser: parseBrowser(current.userAgent),
        os: parseOS(current.userAgent),
        ip: current.ipAddress
      } : null
    };
  } catch {
    return null;
  }
}

// Get count of active sessions
async function getActiveSessionCount() {
  try {
    const res = await fetchAuth('/auth/sessions');
    if (!res.ok) return 0;
    const sessions = await res.json();
    return sessions.length;
  } catch {
    return 0;
  }
}

// Check if current session is secure (HTTPS)
function isCurrentSessionSecure() {
  return window.location.protocol === 'https:';
}

function createSessionCard(session) {
  // Extract data with fallbacks
  const info = session.deviceInfo || {};
  const userAgent = session.userAgent || '';

  // Parse browser/OS from user agent if not in deviceInfo
  let browser = info.browser || parseBrowser(userAgent);
  let browserVersion = info.browserVersion || parseBrowserVersion(userAgent);
  let os = info.os || parseOS(userAgent);
  let deviceType = info.deviceType || parseDeviceType(userAgent);

  // IP address - use API data for current session
  let ip = session.ipAddress || 'Unknown';
  if (session.isCurrent && ipApiData && (ip === 'Unknown' || ip === '127.0.0.1' || ip === '::1')) {
    ip = ipApiData.query;
  }

  // Location and ISP 
  let city = info.city || '';
  let country = info.country || '';
  let isp = info.isp || '';
  let locationDisplay = '';

  // Get ISP from IP API if not in session
  if (ipApiData && !isp) {
    isp = ipApiData.isp || '';
  }

  // For current session - prioritize geolocation
  if (session.isCurrent) {
    if (geoLocation && geoLocation.lat) {
      // User allowed location - show coordinates
      const coords = `${geoLocation.lat}°N, ${geoLocation.lng}°E`;
      if (geoLocation.city && geoLocation.country) {
        locationDisplay = `${geoLocation.city}, ${geoLocation.country} (${coords})`;
      } else if (ipApiData && ipApiData.city) {
        locationDisplay = `${ipApiData.city}, ${ipApiData.country} (${coords})`;
      } else {
        locationDisplay = `Coordinates: ${coords}`;
      }
    } else if (ipApiData) {
      // No geolocation but have IP data
      locationDisplay = `${ipApiData.city || ''}, ${ipApiData.country || ''}`;
      if (!isp) isp = ipApiData.isp || '';
    }
  } else {
    // Other sessions - use stored data
    if (city && country) {
      locationDisplay = `${city}, ${country}`;
    } else if (city || country) {
      locationDisplay = city || country;
    }
  }

  // Final fallbacks
  if (!locationDisplay || locationDisplay === ', ') {
    locationDisplay = (ipApiData) ? `${ipApiData.city || 'Unknown'}, ${ipApiData.country || ''}` : 'Not available';
  }

  const ispDisplay = isp || (ipApiData ? ipApiData.isp : '') || 'Not available';

  // Time handling
  let lastActive = 'Just now';
  let duration = 'Active';

  if (session.createdAt) {
    const created = new Date(session.createdAt);
    if (!isNaN(created.getTime())) {
      const now = new Date();
      const mins = Math.floor((now - created) / 60000);

      if (mins < 1) lastActive = 'Just now';
      else if (mins < 60) lastActive = `${mins} min ago`;
      else if (mins < 1440) lastActive = `${Math.floor(mins / 60)} hours ago`;
      else lastActive = `${Math.floor(mins / 1440)} days ago`;

      if (mins < 60) duration = `${mins} minutes`;
      else if (mins < 1440) duration = `${Math.floor(mins / 60)} hours`;
      else duration = `${Math.floor(mins / 1440)} days`;
    }
  }

  // Device icon and color
  let icon = 'fa-desktop';
  let color = '#6366f1';
  let deviceName = 'Desktop';

  if (deviceType === 'mobile') {
    icon = 'fa-mobile-alt';
    color = '#f97316';
    deviceName = 'Mobile';
  } else if (deviceType === 'tablet') {
    icon = 'fa-tablet-alt';
    color = '#22d3ee';
    deviceName = 'Tablet';
  }

  // Build card HTML
  return `
    <div class="session-card-new ${session.isCurrent ? 'current-session' : ''}">
      <div class="session-card-header">
        <div class="session-device-icon" style="background:${color}20;color:${color}">
          <i class="fas ${icon}"></i>
        </div>
        <div class="session-title-info">
          <h4>${browser} on ${os}</h4>
          <span>${deviceName} • ${browser}</span>
        </div>
        ${session.isCurrent ? '<span class="this-device-badge"><i class="fas fa-check"></i> This Device</span>' : ''}
      </div>
      
      <div class="session-info-grid">
        <div class="session-info-item">
          <span class="session-info-label"><i class="fas fa-globe"></i> BROWSER</span>
          <span class="session-info-value">${browser} ${browserVersion}</span>
        </div>
        <div class="session-info-item">
          <span class="session-info-label"><i class="fas fa-laptop"></i> OS</span>
          <span class="session-info-value">${os}</span>
        </div>
        <div class="session-info-item">
          <span class="session-info-label"><i class="fas fa-network-wired"></i> IP ADDRESS</span>
          <span class="session-info-value">${ip}</span>
        </div>
        <div class="session-info-item">
          <span class="session-info-label"><i class="fas fa-map-marker-alt"></i> LOCATION</span>
          <span class="session-info-value">${locationDisplay}</span>
        </div>
        <div class="session-info-item">
          <span class="session-info-label"><i class="fas fa-wifi"></i> ISP</span>
          <span class="session-info-value">${ispDisplay}</span>
        </div>
        <div class="session-info-item">
          <span class="session-info-label"><i class="fas fa-desktop"></i> DEVICE</span>
          <span class="session-info-value">${deviceName}</span>
        </div>
        <div class="session-info-item">
          <span class="session-info-label"><i class="fas fa-clock"></i> LAST ACTIVE</span>
          <span class="session-info-value">${lastActive}</span>
        </div>
        <div class="session-info-item">
          <span class="session-info-label"><i class="fas fa-hourglass-half"></i> DURATION</span>
          <span class="session-info-value">${duration}</span>
        </div>
      </div>
      
      <div class="session-card-footer">
        ${session.isCurrent ?
      `<span class="active-now-badge"><span class="pulse-dot"></span> Active Now</span>
           <span class="current-device-tag"><i class="fas fa-check-circle"></i> Current Device</span>` :
      `<span class="active-badge"><span class="status-dot"></span> Active</span>
           <button class="btn-logout-device" onclick="logoutSession('${session.id}', '${browser} on ${os}')">
             <i class="fas fa-sign-out-alt"></i> Logout
           </button>`
    }
      </div>
    </div>
  `;
}

// Simple browser parser
function parseBrowser(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR/')) return 'Opera';
  return 'Browser';
}

function parseBrowserVersion(ua) {
  if (!ua) return '';
  const patterns = [/Chrome\/(\d+)/, /Firefox\/(\d+)/, /Edg\/(\d+)/, /Version\/(\d+)/, /OPR\/(\d+)/];
  for (const p of patterns) {
    const m = ua.match(p);
    if (m) return m[1];
  }
  return '';
}

function parseOS(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Windows NT 10')) return 'Windows 10/11';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone')) return 'iOS';
  if (ua.includes('iPad')) return 'iPadOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown';
}

function parseDeviceType(ua) {
  if (!ua) return 'desktop';
  const lower = ua.toLowerCase();
  if (lower.includes('mobile') || lower.includes('android') && !lower.includes('tablet')) return 'mobile';
  if (lower.includes('tablet') || lower.includes('ipad')) return 'tablet';
  return 'desktop';
}

// Session to logout (for modal)
let sessionToLogout = null;
let sessionDeviceName = '';

// Cancel logout - close modal
window.cancelSessionLogout = function () {
  const modal = document.getElementById('sessionLogoutModal');
  if (modal) modal.classList.remove('active');
  sessionToLogout = null;
};

// Confirm logout - perform logout
window.confirmSessionLogout = async function () {
  if (!sessionToLogout) return;

  const btn = document.querySelector('#sessionLogoutModal .btn-danger');
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
    btn.disabled = true;
  }

  try {
    const res = await fetchAuth(`/auth/sessions/${sessionToLogout}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('✓ Device logged out successfully');
      loadSessions();
    } else {
      showToast('Failed to logout device');
    }
  } catch (e) {
    showToast('Error: ' + e.message);
  }

  cancelSessionLogout();
  if (btn) {
    btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout Device';
    btn.disabled = false;
  }
};

// Execute logout all devices - called from HTML onclick
window.executeLogoutAllDevices = async function (btn) {
  console.log('🔴 Logout All Devices clicked');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
  btn.disabled = true;

  try {
    const res = await fetchAuth('/auth/sessions', { method: 'DELETE' });
    if (res.ok) {
      showToast('✓ All other devices logged out');
      loadSessions();
    } else {
      showToast('Failed to logout devices');
    }
  } catch (e) {
    showToast('Error: ' + e.message);
  }

  document.getElementById('logoutAllModal').classList.remove('active');
  btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout All Devices';
  btn.disabled = false;
};

// Show logout confirmation modal
function logoutSession(sessionId, deviceName) {
  console.log('🔴 logoutSession called:', sessionId, deviceName);
  sessionToLogout = sessionId;
  sessionDeviceName = deviceName || 'this device';

  // Remove old modal if exists (to reset event listeners)
  let oldModal = document.getElementById('sessionLogoutModal');
  if (oldModal) oldModal.remove();

  // Create fresh modal
  const modal = document.createElement('div');
  modal.id = 'sessionLogoutModal';
  modal.className = 'delete-confirm-modal';
  modal.innerHTML = `
    <div class="delete-confirm-container">
      <div class="delete-confirm-header">
        <div class="delete-confirm-icon" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
          <i class="fas fa-sign-out-alt" style="color: white;"></i>
        </div>
        <div class="delete-confirm-header-text">
          <h3>Logout Device?</h3>
          <p>This will end the session on that device.</p>
        </div>
      </div>
      <div class="delete-confirm-body">
        <p class="delete-confirm-message">
          Are you sure you want to logout <strong>${sessionDeviceName}</strong>?
          They will need to sign in again.
        </p>
      </div>
      <div class="delete-confirm-footer">
        <button class="btn btn-outline session-cancel-btn" type="button">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button class="btn btn-danger session-confirm-btn" type="button">
          <i class="fas fa-sign-out-alt"></i> Logout Device
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Attach event listeners directly
  const cancelBtn = modal.querySelector('.session-cancel-btn');
  const confirmBtn = modal.querySelector('.session-confirm-btn');

  cancelBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('❌ Cancel clicked');
    modal.classList.remove('active');
    sessionToLogout = null;
  });

  confirmBtn.addEventListener('click', async function (e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('✅ Confirm clicked, sessionId:', sessionToLogout);

    if (!sessionToLogout) return;

    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
    this.disabled = true;

    try {
      const res = await fetchAuth(`/auth/sessions/${sessionToLogout}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('✓ Device logged out successfully');
        loadSessions();
      } else {
        showToast('Failed to logout device');
      }
    } catch (err) {
      showToast('Error: ' + err.message);
    }

    modal.classList.remove('active');
    this.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout Device';
    this.disabled = false;
    sessionToLogout = null;
  });

  // Close on backdrop click
  modal.addEventListener('click', function (e) {
    if (e.target === modal) {
      console.log('🔙 Backdrop clicked');
      modal.classList.remove('active');
      sessionToLogout = null;
    }
  });

  // Show modal
  modal.classList.add('active');
  console.log('📦 Modal shown');
}

// Logout all other sessions - use existing HTML modal
function logoutOtherSessions() {
  const modal = document.getElementById('logoutAllModal');
  if (modal) {
    modal.classList.add('active');
  }
}

// Setup modal event listeners (called on page load)
function setupSessionModals() {
  // Logout All Modal
  const logoutAllModal = document.getElementById('logoutAllModal');
  const cancelBtn = document.getElementById('logoutAllCancelBtn');
  const confirmBtn = document.getElementById('logoutAllConfirmBtn');

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      logoutAllModal.classList.remove('active');
    };
  }

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
      confirmBtn.disabled = true;

      try {
        const res = await fetchAuth('/auth/sessions', { method: 'DELETE' });
        if (res.ok) {
          showToast('✓ All other devices logged out');
          loadSessions();
        } else {
          showToast('Failed to logout devices');
        }
      } catch (e) {
        showToast('Error: ' + e.message);
      }

      logoutAllModal.classList.remove('active');
      confirmBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout All Devices';
      confirmBtn.disabled = false;
    };
  }

  // Click outside to close
  if (logoutAllModal) {
    logoutAllModal.onclick = (e) => {
      if (e.target === logoutAllModal) {
        logoutAllModal.classList.remove('active');
      }
    };
  }
}

// Initialize modals when DOM ready
document.addEventListener('DOMContentLoaded', setupSessionModals);




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
    <div class="form-group"><label>Skill Name</label><input type="text" name="name" required placeholder="Enter skill name"></div>
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
    <div class="form-group"><label>Institution</label><input type="text" name="institution" required placeholder="Enter institution name"></div>
    <div class="form-row">
      <div class="form-group"><label>Degree</label><input type="text" name="degree" required placeholder="Enter degree"></div>
      <div class="form-group"><label>Field</label><input type="text" name="field" required placeholder="Enter field of study"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Start Year</label><input type="text" name="startYear" required placeholder="Enter start year"></div>
      <div class="form-group"><label>End Year</label><input type="text" name="endYear" placeholder="Enter end year or Present"></div>
    </div>
    <div class="form-group"><label>Website Link</label>
      <div class="input-with-icon">
        <input type="url" name="websiteUrl" placeholder="Enter institution website URL">
        <button type="button" class="link-preview-btn" onclick="previewLink('websiteUrl')"><i class="fas fa-external-link-alt"></i></button>
      </div>
    </div>
    <div class="form-group"><label>Description</label><textarea name="description" rows="2" placeholder="Enter description (optional)"></textarea></div>
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
    <div class="form-group"><label>Project Title</label><input type="text" name="title" required placeholder="Enter project title"></div>
    <div class="form-group"><label>Description</label><textarea name="description" rows="3" required placeholder="Enter project description"></textarea></div>
    <div class="form-group"><label>Technologies (comma separated)</label><input type="text" name="technologies" placeholder="Enter technologies used"></div>
    <div class="form-group"><label>Category</label>
      <select name="category"><option value="web">Web App</option><option value="mobile">Mobile</option><option value="api">API</option><option value="other">Other</option></select>
    </div>
    <div class="form-group"><label>Live Demo URL</label>
      <div class="input-with-icon">
        <input type="url" name="liveUrl" placeholder="Enter live demo URL">
        <button type="button" class="link-preview-btn" onclick="previewLink('liveUrl')"><i class="fas fa-external-link-alt"></i></button>
      </div>
    </div>
    <div class="form-group"><label>GitHub URL</label>
      <div class="input-with-icon">
        <input type="url" name="githubUrl" placeholder="Enter GitHub repository URL">
        <button type="button" class="link-preview-btn" onclick="previewLink('githubUrl')"><i class="fab fa-github"></i></button>
      </div>
    </div>
    <div class="form-group checkbox-group"><label><input type="checkbox" name="featured"> ⭐ Featured Project</label></div>
    <input type="hidden" name="existingImage" id="existingImage" value="">
    <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-save"></i> Save Project</button>
  `,
  service: `
    <div class="form-group"><label>Service Title</label><input type="text" name="title" required placeholder="Enter service title"></div>
    <div class="form-group"><label>Description</label><textarea name="description" rows="3" required placeholder="Enter service description"></textarea></div>
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
    <div class="form-group"><label>Certificate Title</label><input type="text" name="title" required placeholder="Enter certificate title"></div>
    <div class="form-row">
      <div class="form-group"><label>Issuer</label><input type="text" name="issuer" required placeholder="Enter issuing organization"></div>
      <div class="form-group"><label>Date</label><input type="date" name="date"></div>
    </div>
    <div class="form-group"><label>Credential URL</label>
      <div class="input-with-icon">
        <input type="url" name="credentialUrl" placeholder="Enter credential verification URL">
        <button type="button" class="link-preview-btn" onclick="previewLink('credentialUrl')"><i class="fas fa-certificate"></i></button>
      </div>
    </div>
    <div class="form-group"><label>Description</label><textarea name="description" rows="2" placeholder="Enter description (optional)"></textarea></div>
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
let lastLoginTimestamp = null;
let lastLoginInterval = null;

function updateLastLogin() {
  const lastLogin = localStorage.getItem('lastLogin');

  if (lastLogin) {
    lastLoginTimestamp = new Date(lastLogin);
  }

  // Update display immediately
  updateLastLoginDisplay();

  // Save current login time for NEXT session
  localStorage.setItem('lastLogin', new Date().toISOString());

  // Start real-time update timer
  startLastLoginTimer();
}

function updateLastLoginDisplay() {
  const lastLoginText = document.getElementById('lastLoginText');

  if (lastLoginText && lastLoginTimestamp) {
    const now = new Date();
    const diffMs = now - lastLoginTimestamp;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeAgo;
    if (diffDays > 0) {
      timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      timeAgo = 'Just now';
    }

    lastLoginText.textContent = `Last login: ${timeAgo}`;
  } else if (lastLoginText) {
    lastLoginText.textContent = 'First time login! Welcome!';
  }
}

function startLastLoginTimer() {
  // Clear existing interval if any
  if (lastLoginInterval) {
    clearInterval(lastLoginInterval);
  }

  // Update every 30 seconds for real-time feel
  lastLoginInterval = setInterval(() => {
    updateLastLoginDisplay();
  }, 30000); // 30 seconds
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

// Export session functions to window
window.loadSessions = loadSessions;
window.logoutSession = logoutSession;
window.logoutOtherSessions = logoutOtherSessions;
console.log('✅ Session Management v5.0 - Clean Version');


// === END OF ADMIN.JS ===
