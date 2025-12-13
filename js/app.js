// Connect to Production Backend (Vercel)
const API = 'https://backend-mu-sage.vercel.app/api';

// State
let allSkills = [], allProjects = [], allServices = [], allCerts = [];
let skillsExpanded = false, projectsExpanded = false, servicesExpanded = false, certsExpanded = false;
const INITIAL_COUNT = 6;

// Elements
const typingText = document.getElementById('typingText');
let texts = ['Web Developer', 'CSE Student', 'AI Enthusiast'];
let textIndex = 0, charIndex = 0, isDeleting = false;

// Init
document.addEventListener('DOMContentLoaded', async () => {
  updateFooterYear(); // Auto update copyright year
  await loadAllData();
  startTyping();
  setupEvents();
  initTheme();
  trackVisit(); // Silent analytics
  hideLoader(); // Smooth loading
  // Initialize Supabase Realtime AFTER page loads (delayed for performance)
  setTimeout(initRealtimeUpdates, 2000);
});

// ===========================================
// SUPABASE REALTIME - Live Updates from Admin
// ===========================================

function initRealtimeUpdates(retryCount = 0) {
  // Check if realtime module is loaded (it loads async/defer)
  if (typeof subscribeToMainPageUpdates !== 'function') {
    // Retry up to 5 times with 1 second delay
    if (retryCount < 5) {
      console.log(`⏳ Waiting for Supabase Realtime... (attempt ${retryCount + 1})`);
      setTimeout(() => initRealtimeUpdates(retryCount + 1), 1000);
      return;
    }
    console.warn('⚠️ Supabase Realtime module not available');
    return;
  }

  // Subscribe to all portfolio data changes
  subscribeToMainPageUpdates({
    // When profile is updated (name, bio, photo, etc.)
    onProfileUpdate: (payload) => {
      console.log('🔄 Reloading profile due to real-time update');
      showRealtimeNotification('Profile updated');
      loadProfile();
    },

    // When skills are updated
    onSkillsUpdate: (payload) => {
      console.log('🔄 Reloading skills due to real-time update');
      showRealtimeNotification('Skills updated');
      loadSkills();
    },

    // When projects are updated
    onProjectsUpdate: (payload) => {
      console.log('🔄 Reloading projects due to real-time update');
      showRealtimeNotification('Projects updated');
      loadProjects();
    },

    // When education is updated
    onEducationUpdate: (payload) => {
      console.log('🔄 Reloading education due to real-time update');
      showRealtimeNotification('Education updated');
      loadEducation();
    },

    // When services are updated
    onServicesUpdate: (payload) => {
      console.log('🔄 Reloading services due to real-time update');
      showRealtimeNotification('Services updated');
      loadServices();
    },

    // When certificates are updated
    onCertificatesUpdate: (payload) => {
      console.log('🔄 Reloading certificates due to real-time update');
      showRealtimeNotification('Certificates updated');
      loadCertificates();
    }
  });

  console.log('🚀 Real-time updates enabled - Admin changes will reflect instantly!');
}

// Show subtle notification for real-time updates
function showRealtimeNotification(message) {
  // Create or update a subtle indicator
  let indicator = document.getElementById('realtimeIndicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'realtimeIndicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideInRight 0.3s ease;
      opacity: 0;
      transform: translateX(100%);
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    document.body.appendChild(indicator);

    // Add keyframes for animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }

  indicator.innerHTML = `<i class="fas fa-sync-alt" style="animation: spin 1s linear infinite;"></i> ${message}`;
  indicator.style.opacity = '1';
  indicator.style.transform = 'translateX(0)';

  // Hide after 2 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateX(100%)';
  }, 2000);
}

// Auto update copyright year
function updateFooterYear() {
  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// Hide loader after content loads
function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => loader.style.display = 'none', 300);
    }, 100);
  }
}

// Silent analytics - tracks page visits
async function trackVisit() {
  try {
    await fetch(`${API}/analytics/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: window.location.pathname })
    });
  } catch (e) { /* Silent fail */ }
}

function setupEvents() {
  window.addEventListener('scroll', handleScroll);

  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('menuBtn').classList.toggle('active');
    document.getElementById('navMenu').classList.toggle('active');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('menuBtn').classList.remove('active');
      document.getElementById('navMenu').classList.remove('active');
    });
  });

  // Theme selector
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      setTheme(theme);
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('backTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.getElementById('contactForm').addEventListener('submit', handleContact);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => filterSkills(btn.dataset.filter));
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === savedTheme);
  });
}

function setTheme(theme) {
  localStorage.setItem('theme', theme);
  if (theme === 'system') {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = systemDark ? 'dark' : 'light';
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (localStorage.getItem('theme') === 'system') {
    document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
  }
});

function handleScroll() {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
  document.getElementById('backTop').classList.toggle('visible', window.scrollY > 500);

  document.querySelectorAll('section[id]').forEach(section => {
    const top = section.offsetTop - 100;
    const link = document.querySelector(`.nav-link[href="#${section.id}"]`);
    if (link) link.classList.toggle('active', window.scrollY >= top && window.scrollY < top + section.offsetHeight);
  });
}

function startTyping() {
  const type = () => {
    const current = texts[textIndex];
    typingText.textContent = isDeleting ? current.substring(0, --charIndex) : current.substring(0, ++charIndex);
    let delay = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === current.length) { delay = 2000; isDeleting = true; }
    else if (isDeleting && charIndex === 0) { isDeleting = false; textIndex = (textIndex + 1) % texts.length; delay = 500; }
    setTimeout(type, delay);
  };
  type();
}

async function loadAllData() {
  await Promise.all([loadProfile(), loadSkills(), loadEducation(), loadProjects(), loadServices(), loadCertificates()]);
}

async function fetchData(endpoint) {
  try {
    const res = await fetch(`${API}${endpoint}`);
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

async function loadProfile() {
  const data = await fetchData('/profile');
  if (!data) return;

  if (data.name) document.getElementById('heroName').textContent = data.name;
  if (data.bio) document.getElementById('heroBio').innerHTML = data.bio;
  if (data.typingTexts?.length) texts = data.typingTexts;

  // Available badge
  const badge = document.getElementById('heroBadge');
  if (badge) {
    if (data.isAvailable === false) {
      badge.innerHTML = '<span class="pulse unavailable"></span> Currently Unavailable';
      badge.classList.add('unavailable');
    } else {
      badge.innerHTML = '<span class="pulse"></span> Available for Work';
      badge.classList.remove('unavailable');
    }
  }

  if (data.about) {
    document.getElementById('aboutText').innerHTML = data.about.split('\n\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
  }

  if (data.stats) {
    document.getElementById('statProjects').textContent = (data.stats.projectsCompleted || 15) + '+';
    document.getElementById('statExp').textContent = (data.stats.yearsExperience || 2) + '+';
    document.getElementById('statCerts').textContent = (data.stats.certificatesEarned || 8) + '+';
  }

  // Profile Photo
  const profileImg = document.getElementById('profileImg');
  const heroInitials = document.getElementById('heroInitials');
  if (data.profileImage) {
    const imgUrl = data.profileImage.startsWith('http') ? data.profileImage : `${API.replace('/api', '')}${data.profileImage}`;
    profileImg.src = imgUrl;
    profileImg.style.display = 'block';
    if (heroInitials) heroInitials.style.display = 'none';
  } else {
    profileImg.style.display = 'none';
    if (heroInitials) {
      heroInitials.style.display = 'flex';
      // Set initials from name
      const initials = (data.name || 'MA').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      heroInitials.textContent = initials;
    }
  }

  // Social Links - Hero
  const social = data.socialLinks || {};
  const socialMap = {
    github: 'github',
    linkedin: 'linkedin',
    twitter: 'twitter',
    instagram: 'instagram',
    facebook: 'facebook',
    youtube: 'youtube',
    whatsapp: 'whatsapp',
    telegram: 'telegram'
  };
  Object.keys(socialMap).forEach(key => {
    const el = document.getElementById(key);
    if (el && social[key]) {
      el.setAttribute('href', social[key]);
      el.style.display = 'flex';
    } else if (el) {
      el.style.display = 'none';
    }
  });

  // Social Links - Footer
  const footerSocialMap = {
    github: 'footerGithub', linkedin: 'footerLinkedin', instagram: 'footerInstagram',
    facebook: 'footerFacebook', youtube: 'footerYoutube', twitter: 'footerTwitter',
    whatsapp: 'footerWhatsapp', telegram: 'footerTelegram'
  };
  Object.keys(footerSocialMap).forEach(key => {
    const el = document.getElementById(footerSocialMap[key]);
    if (el && social[key]) {
      el.setAttribute('href', social[key]);
      el.style.display = 'flex';
    } else if (el) {
      el.style.display = 'none';
    }
  });

  // Contact Info
  if (data.email) {
    document.getElementById('contactEmail').textContent = data.email;
    document.getElementById('footerEmail').textContent = data.email;
  }
  if (data.phone) {
    document.getElementById('contactPhone').textContent = data.phone;
    document.getElementById('footerPhone').textContent = data.phone;
  }
  if (data.address) document.getElementById('contactLocation').textContent = data.address;

  // Resume Download Button
  const resumeBtn = document.getElementById('resumeBtn');
  if (resumeBtn) {
    if (data.resumeUrl) {
      const resumeUrl = data.resumeUrl.startsWith('http') ? data.resumeUrl : `${API.replace('/api', '')}${data.resumeUrl}`;
      resumeBtn.setAttribute('href', resumeUrl);
      resumeBtn.setAttribute('download', 'Md_Azad_Resume.pdf');
      resumeBtn.setAttribute('target', '_blank');
      resumeBtn.style.display = 'inline-flex';
    } else {
      resumeBtn.style.display = 'none';
    }
  }
}

async function loadSkills() {
  allSkills = await fetchData('/skills') || [];
  renderSkills();
}

function renderSkills(filter = 'all') {
  const filtered = filter === 'all' ? allSkills : allSkills.filter(s => s.category === filter);
  const toShow = skillsExpanded ? filtered : filtered.slice(0, INITIAL_COUNT);

  const iconMap = {
    // Brand Icons (fab)
    'html5': 'fab fa-html5',
    'css3-alt': 'fab fa-css3-alt',
    'css3': 'fab fa-css3-alt',
    'js': 'fab fa-js',
    'javascript': 'fab fa-js',
    'react': 'fab fa-react',
    'vuejs': 'fab fa-vuejs',
    'angular': 'fab fa-angular',
    'node': 'fab fa-node',
    'node-js': 'fab fa-node-js',
    'nodejs': 'fab fa-node-js',
    'python': 'fab fa-python',
    'java': 'fab fa-java',
    'php': 'fab fa-php',
    'laravel': 'fab fa-laravel',
    'wordpress': 'fab fa-wordpress',
    'bootstrap': 'fab fa-bootstrap',
    'sass': 'fab fa-sass',
    'git-alt': 'fab fa-git-alt',
    'git': 'fab fa-git-alt',
    'github': 'fab fa-github',
    'docker': 'fab fa-docker',
    'aws': 'fab fa-aws',
    'linux': 'fab fa-linux',
    'windows': 'fab fa-windows',
    'apple': 'fab fa-apple',
    'android': 'fab fa-android',
    'swift': 'fab fa-swift',
    'figma': 'fab fa-figma',
    'npm': 'fab fa-npm',
    // Solid Icons (fas)
    'database': 'fas fa-database',
    'server': 'fas fa-server',
    'code': 'fas fa-code',
    'terminal': 'fas fa-terminal',
    'robot': 'fas fa-robot',
    'brain': 'fas fa-brain',
    'palette': 'fas fa-palette',
    'mobile-alt': 'fas fa-mobile-alt',
    'laptop-code': 'fas fa-laptop-code',
    'cogs': 'fas fa-cogs',
    'file-word': 'fas fa-file-word',
    'file-excel': 'fas fa-file-excel',
    'file-powerpoint': 'fas fa-file-powerpoint',
    'file-code': 'fas fa-file-code',
    'file-alt': 'fas fa-file-alt',
    'cloud': 'fas fa-cloud',
    'fire': 'fas fa-fire',
    'bolt': 'fas fa-bolt',
    'magic': 'fas fa-magic',
    'tools': 'fas fa-tools',
    'keyboard': 'fas fa-keyboard',
    'chart-line': 'fas fa-chart-line',
    'lock': 'fas fa-lock',
    'globe': 'fas fa-globe',
    'network-wired': 'fas fa-network-wired',
    'microchip': 'fas fa-microchip',
    'cube': 'fas fa-cube',
    'paint-brush': 'fas fa-paint-brush',
    'pen-nib': 'fas fa-pen-nib',
    'layer-group': 'fas fa-layer-group',
    'image': 'fas fa-image',
    'calculator': 'fas fa-calculator',
    'table': 'fas fa-table',
    'envelope': 'fas fa-envelope'
  };


  let html = '';
  if (toShow.length === 0) {
    html = `<div class="empty-state">
      <i class="fas fa-code" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
      No skills added yet.
    </div>`;
  } else {
    html = toShow.map(s => `
      <div class="skill-card" data-category="${s.category}">
        <i class="${iconMap[s.icon] || 'fas fa-code'}"></i>
        <h4>${s.name}</h4>
        <span>${s.proficiency}%</span>
        <div class="skill-bar"><div class="skill-progress" style="width:${s.proficiency}%"></div></div>
      </div>
    `).join('');
  }

  if (filtered.length > INITIAL_COUNT) {
    html += `<div class="show-more-wrap">
      <button class="btn-show-more" onclick="toggleSkills('${filter}')">
        <i class="fas fa-${skillsExpanded ? 'chevron-up' : 'chevron-down'}"></i>
        ${skillsExpanded ? 'Show Less' : `Show More (${filtered.length - INITIAL_COUNT}+)`}
      </button>
    </div>`;
  }

  document.getElementById('skillsGrid').innerHTML = html;
}


function toggleSkills(filter) { skillsExpanded = !skillsExpanded; renderSkills(filter); }
function filterSkills(filter) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  skillsExpanded = false;
  renderSkills(filter);
}

async function loadEducation() {
  const edu = await fetchData('/education');
  if (!edu?.length) {
    document.getElementById('educationList').innerHTML = `<div class="empty-state">
      <i class="fas fa-graduation-cap" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
      No education details added yet.
    </div>`;
    return;
  }

  // Sort by end year descending (newest first), then by start year
  const sortedEdu = [...edu].sort((a, b) => {
    const endA = parseInt(a.endYear) || 9999; // "Present" treated as highest
    const endB = parseInt(b.endYear) || 9999;
    if (endB !== endA) return endB - endA;
    return (parseInt(b.startYear) || 0) - (parseInt(a.startYear) || 0);
  });

  document.getElementById('educationList').innerHTML = sortedEdu.map(e => `
    <div class="edu-card">
      <p class="date"><i class="fas fa-calendar"></i> ${e.startYear} - ${e.endYear}</p>
      <h3>${e.degree} in ${e.field}</h3>
      <h4><i class="fas fa-building"></i> ${e.institution}</h4>
      ${e.description ? `<p>${e.description}</p>` : ''}
    </div>
  `).join('');
}

async function loadProjects() {
  allProjects = await fetchData('/projects') || [];
  renderProjects();
}

function renderProjects() {
  // Sort: Featured projects first, then by order/date
  const sortedProjects = [...allProjects].sort((a, b) => {
    // Featured first
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    // Then by order or date
    return (a.order || 0) - (b.order || 0);
  });

  const toShow = projectsExpanded ? sortedProjects : sortedProjects.slice(0, INITIAL_COUNT);


  let html = '';
  if (toShow.length === 0) {
    html = `<div class="empty-state">
      <i class="fas fa-folder-open" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
      No projects added yet.
    </div>`;
  } else {
    html = toShow.map(p => `
      <div class="project-card ${p.featured ? 'featured' : ''}">
        <div class="project-img">
          ${p.image ? `<img src="${p.image.startsWith('http') ? p.image : API.replace('/api', '') + p.image}" alt="${p.title}">` : `<div class="project-placeholder"><i class="fas fa-folder-open"></i></div>`}
          ${p.featured ? '<span class="featured-badge"><i class="fas fa-star"></i> Featured</span>' : ''}
        </div>
        <div class="project-content">
          <h3>${p.title}</h3>
          <p>${p.description?.substring(0, 100)}...</p>
          <div class="project-tags">${(p.technologies || []).slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('')}</div>
          <div class="project-links">
            ${p.liveUrl && p.liveUrl !== '#' ? `<a href="${p.liveUrl}" target="_blank" class="project-link"><i class="fas fa-external-link-alt"></i> Live</a>` : ''}
            ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" class="project-link"><i class="fab fa-github"></i> Code</a>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  if (allProjects.length > INITIAL_COUNT) {
    html += `<div class="show-more-wrap full-width">
      <button class="btn-show-more" onclick="toggleProjects()">
        <i class="fas fa-${projectsExpanded ? 'chevron-up' : 'chevron-down'}"></i>
        ${projectsExpanded ? 'Show Less' : `Show More (${allProjects.length - INITIAL_COUNT}+)`}
      </button>
    </div>`;
  }

  document.getElementById('projectsGrid').innerHTML = html;
}

function toggleProjects() { projectsExpanded = !projectsExpanded; renderProjects(); }

async function loadServices() {
  allServices = await fetchData('/services') || [];
  renderServices();
}

function renderServices() {
  const toShow = servicesExpanded ? allServices : allServices.slice(0, INITIAL_COUNT);
  const iconMap = { code: 'fa-code', layout: 'fa-layer-group', server: 'fa-server', tool: 'fa-tools', mobile: 'fa-mobile-alt', file: 'fa-file-alt', keyboard: 'fa-keyboard', robot: 'fa-robot' };


  let html = '';
  if (toShow.length === 0) {
    html = `<div class="empty-state">
      <i class="fas fa-briefcase" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
      No services added yet.
    </div>`;
  } else {
    html = toShow.map(s => `
      <div class="service-card">
        <i class="fas ${iconMap[s.icon] || 'fa-code'}"></i>
        <h3>${s.title}</h3>
        <p>${s.description}</p>
      </div>
    `).join('');
  }

  if (allServices.length > INITIAL_COUNT) {
    html += `<div class="show-more-wrap full-width">
      <button class="btn-show-more" onclick="toggleServices()">
        <i class="fas fa-${servicesExpanded ? 'chevron-up' : 'chevron-down'}"></i>
        ${servicesExpanded ? 'Show Less' : `Show More (${allServices.length - INITIAL_COUNT}+)`}
      </button>
    </div>`;
  }

  document.getElementById('servicesGrid').innerHTML = html;
}

function toggleServices() { servicesExpanded = !servicesExpanded; renderServices(); }

async function loadCertificates() {
  allCerts = await fetchData('/certificates') || [];
  renderCertificates();
}

function renderCertificates() {
  const toShow = certsExpanded ? allCerts : allCerts.slice(0, INITIAL_COUNT);


  let html = '';
  if (toShow.length === 0) {
    html = `<div class="empty-state">
      <i class="fas fa-certificate" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
      No certificates added yet.
    </div>`;
  } else {
    html = toShow.map(c => `
      <div class="cert-card">
        <div class="cert-icon"><i class="fas fa-certificate"></i></div>
        <div class="cert-content">
          <h4>${c.title}</h4>
          <p class="cert-issuer"><i class="fas fa-building"></i> ${c.issuer}</p>
          <p class="cert-date"><i class="fas fa-calendar"></i> ${c.date ? new Date(c.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}</p>
          ${c.description ? `<p class="cert-desc">${c.description}</p>` : ''}
        </div>
      </div>
    `).join('');
  }

  if (allCerts.length > INITIAL_COUNT) {
    html += `<div class="show-more-wrap full-width">
      <button class="btn-show-more" onclick="toggleCerts()">
        <i class="fas fa-${certsExpanded ? 'chevron-up' : 'chevron-down'}"></i>
        ${certsExpanded ? 'Show Less' : `Show More (${allCerts.length - INITIAL_COUNT}+)`}
      </button>
    </div>`;
  }

  document.getElementById('certificatesGrid').innerHTML = html;
}

function toggleCerts() { certsExpanded = !certsExpanded; renderCertificates(); }

async function handleContact(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  try {
    const res = await fetch(`${API}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.value, email: form.email.value, subject: form.subject.value, message: form.message.value })
    });

    if (res.ok) {
      showToast('Message sent! ✨');
      form.reset();
    } else {
      const error = await res.json();
      showToast(error.message || 'Failed to send');
    }
  } catch (err) {
    console.error('Contact form error:', err);
    showToast('Connection error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ===========================================
// PROFESSIONAL FEATURES (No UI Changes)
// ===========================================

// 1. KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {
  // Escape key closes mobile menu
  if (e.key === 'Escape') {
    document.getElementById('menuBtn').classList.remove('active');
    document.getElementById('navMenu').classList.remove('active');
  }

  // Arrow keys navigation (when not in input)
  if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    const sections = ['hero', 'about', 'skills', 'education', 'portfolio', 'services', 'certificates', 'contact'];
    const currentIndex = sections.findIndex(s => {
      const el = document.getElementById(s);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top <= 100 && rect.bottom > 100;
    });

    if (e.key === 'ArrowDown' && currentIndex < sections.length - 1) {
      e.preventDefault();
      document.getElementById(sections[currentIndex + 1])?.scrollIntoView({ behavior: 'smooth' });
    }
    if (e.key === 'ArrowUp' && currentIndex > 0) {
      e.preventDefault();
      document.getElementById(sections[currentIndex - 1])?.scrollIntoView({ behavior: 'smooth' });
    }

    // Press 'H' for Home
    if (e.key.toLowerCase() === 'h') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Press 'C' for Contact
    if (e.key.toLowerCase() === 'c') {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

// 2. SCROLL REVEAL ANIMATIONS (Intersection Observer)
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      revealObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Apply to cards after loading
function initScrollReveal() {
  document.querySelectorAll('.skill-card, .project-card, .service-card, .cert-card, .edu-card, .stat-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.05}s, transform 0.5s ease ${i * 0.05}s`;
    revealObserver.observe(el);
  });
}
setTimeout(initScrollReveal, 100);

// 3. COPY EMAIL ON CLICK
document.addEventListener('click', async (e) => {
  const emailLink = e.target.closest('a[href^="mailto:"]');
  if (emailLink) {
    e.preventDefault();
    const email = emailLink.href.replace('mailto:', '');
    try {
      await navigator.clipboard.writeText(email);
      showToast('Email copied! 📋');
    } catch {
      window.location.href = emailLink.href;
    }
  }
});

// 4. NATIVE SHARE API (for mobile)
async function sharePortfolio() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Md Azad - Portfolio',
        text: 'Check out my portfolio website!',
        url: window.location.href
      });
    } catch { /* User cancelled */ }
  } else {
    // Fallback: copy link
    await navigator.clipboard.writeText(window.location.href);
    showToast('Link copied! 🔗');
  }
}

// 5. LAZY LOADING IMAGES
function lazyLoadImages() {
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    });
  });
  images.forEach(img => imageObserver.observe(img));
}
lazyLoadImages();

// 6. PRINT RESUME (Ctrl+P customization)
window.addEventListener('beforeprint', () => {
  document.body.classList.add('printing');
});
window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing');
});

// 7. KONAMI CODE EASTER EGG
let konamiSequence = [];
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
document.addEventListener('keydown', (e) => {
  konamiSequence.push(e.key);
  konamiSequence = konamiSequence.slice(-10);
  if (konamiSequence.join(',') === konamiCode.join(',')) {
    showToast('🎮 Secret unlocked! Thanks for visiting! 🚀');
    document.body.style.animation = 'rainbow 2s ease';
    setTimeout(() => document.body.style.animation = '', 2000);
  }
});

// 8. PERFORMANCE MONITORING
const perfData = {
  loadTime: 0,
  scrollDepth: 0
};

window.addEventListener('load', () => {
  perfData.loadTime = performance.now();
  console.log(`⚡ Page loaded in ${Math.round(perfData.loadTime)}ms`);
});

let maxScroll = 0;
window.addEventListener('scroll', () => {
  const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  if (scrollPercent > maxScroll) {
    maxScroll = scrollPercent;
    perfData.scrollDepth = maxScroll;
  }
});

// 9. PREFERS REDUCED MOTION
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.style.scrollBehavior = 'auto';
}

// 10. AUTO-HIDE NAVBAR ON SCROLL DOWN
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > lastScrollY && window.scrollY > 200) {
    navbar.style.transform = 'translateY(-100%)';
  } else {
    navbar.style.transform = 'translateY(0)';
  }
  lastScrollY = window.scrollY;
}, { passive: true });

// 11. FOCUS TRAP FOR MOBILE MENU
document.getElementById('navMenu')?.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    const links = document.querySelectorAll('#navMenu .nav-link');
    if (e.shiftKey && document.activeElement === links[0]) {
      e.preventDefault();
      links[links.length - 1].focus();
    } else if (!e.shiftKey && document.activeElement === links[links.length - 1]) {
      e.preventDefault();
      links[0].focus();
    }
  }
});

// 12. SESSION TIME TRACKING
let sessionStart = Date.now();
window.addEventListener('beforeunload', () => {
  const sessionTime = Math.round((Date.now() - sessionStart) / 1000);
  // Could send to analytics
  console.log(`👋 Session duration: ${sessionTime}s, Max scroll: ${maxScroll}%`);
});

console.log('🚀 Portfolio loaded with professional features!');
console.log('💡 Tips: Use ↑↓ arrows to navigate, H for home, C for contact');

// ===========================================
// MOBILE-FRIENDLY FEATURES & SECTION HELPERS
// ===========================================

// 13. DOUBLE TAP TO SCROLL TOP (Mobile)
let lastTap = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTap < 300 && e.target.closest('#navbar')) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  lastTap = now;
});

// 14. TOUCH RIPPLE EFFECT ON BUTTONS (Mobile)
document.addEventListener('touchstart', (e) => {
  const btn = e.target.closest('button, .btn, .nav-link');
  if (btn && !btn.querySelector('.ripple')) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      background: rgba(255,255,255,0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: rippleEffect 0.4s ease-out;
      pointer-events: none;
    `;
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
  }
}, { passive: true });

// 15. VIBRATION FEEDBACK ON BUTTON CLICK (Mobile)
function vibrateOnClick() {
  if ('vibrate' in navigator) {
    navigator.vibrate(10); // 10ms subtle vibration
  }
}
document.addEventListener('click', (e) => {
  if (e.target.closest('button, .btn')) {
    vibrateOnClick();
  }
});

// 16. GET CURRENT SECTION (Utility)
function getCurrentSection() {
  const sections = ['hero', 'about', 'skills', 'education', 'portfolio', 'services', 'certificates', 'contact'];
  for (const id of sections) {
    const el = document.getElementById(id);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 150 && rect.bottom > 150) {
        return id;
      }
    }
  }
  return 'hero';
}

// 17. SCROLL TO SECTION (Utility)
function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
    return true;
  }
  return false;
}

// 18. GET SKILLS COUNT BY CATEGORY
function getSkillsCount() {
  const counts = {};
  allSkills.forEach(s => {
    counts[s.category] = (counts[s.category] || 0) + 1;
  });
  return { total: allSkills.length, byCategory: counts };
}

// 19. SEARCH PROJECTS BY TECHNOLOGY
function findProjectsByTech(tech) {
  const lowerTech = tech.toLowerCase();
  return allProjects.filter(p =>
    (p.technologies || []).some(t => t.toLowerCase().includes(lowerTech))
  );
}

// 20. GET FEATURED PROJECTS
function getFeaturedProjectsList() {
  return allProjects.filter(p => p.featured);
}

// 21. GET SCROLL PROGRESS (0-100%)
function getScrollProgress() {
  const scrollHeight = document.body.scrollHeight - window.innerHeight;
  return Math.round((window.scrollY / scrollHeight) * 100);
}

// 22. SCROLL PROGRESS INDICATOR (Updates on scroll)
window.addEventListener('scroll', () => {
  const progress = getScrollProgress();
  // Update any progress bar if exists
  const progressBar = document.getElementById('scrollProgress');
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}, { passive: true });

// 23. DEVICE DETECTION
const deviceInfo = {
  isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
  isTouch: 'ontouchstart' in window,
  isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
  isAndroid: /Android/i.test(navigator.userAgent)
};

// 24. ORIENTATION CHANGE HANDLER (Mobile)
window.addEventListener('orientationchange', () => {
  // Close mobile menu on orientation change
  document.getElementById('menuBtn')?.classList.remove('active');
  document.getElementById('navMenu')?.classList.remove('active');
});

// 25. SWIPE GESTURE DETECTION (Mobile)
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}, { passive: true });

function handleSwipe() {
  const swipeThreshold = 100;
  const diff = touchEndX - touchStartX;

  // Swipe right to close mobile menu
  if (diff > swipeThreshold) {
    document.getElementById('navMenu')?.classList.remove('active');
    document.getElementById('menuBtn')?.classList.remove('active');
  }
}

// 26. READING TIME ESTIMATOR (About Section)
function getReadingTime() {
  const aboutText = document.getElementById('aboutText')?.textContent || '';
  const words = aboutText.split(/\s+/).length;
  const readingSpeed = 200; // words per minute
  const minutes = Math.ceil(words / readingSpeed);
  return minutes < 1 ? '< 1 min read' : `${minutes} min read`;
}

// 27. COUNT TOTAL CERTIFICATES BY ISSUER
function getCertificateStats() {
  const byIssuer = {};
  allCerts.forEach(c => {
    const issuer = c.issuer || 'Unknown';
    byIssuer[issuer] = (byIssuer[issuer] || 0) + 1;
  });
  return { total: allCerts.length, byIssuer };
}

// 28. QUICK CONTACT VIA WHATSAPP (if available)
function openWhatsApp(message = 'Hello! I found your portfolio and wanted to connect.') {
  const whatsappEl = document.getElementById('whatsapp');
  if (whatsappEl) {
    const url = whatsappEl.href;
    window.open(`${url}?text=${encodeURIComponent(message)}`, '_blank');
    return true;
  }
  return false;
}

// 29. SHARE SPECIFIC SECTION
async function shareSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Md Azad - ${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}`,
        url: url
      });
    } catch { }
  } else {
    await navigator.clipboard.writeText(url);
    showToast('Link copied! 🔗');
  }
}

// 30. NETWORK STATUS DETECTION
let isOnline = navigator.onLine;
window.addEventListener('online', () => {
  isOnline = true;
  showToast('Back online! 🌐');
});
window.addEventListener('offline', () => {
  isOnline = false;
  showToast('You are offline 📴');
});

// 31. PAGE VISIBILITY (Pause animations when hidden)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Could pause animations here
    console.log('👁️ Page hidden');
  } else {
    console.log('👁️ Page visible');
  }
});

// 32. SMOOTH SCROLL POLYFILL CHECK
if (!('scrollBehavior' in document.documentElement.style)) {
  console.log('⚠️ Smooth scroll not supported, using fallback');
}

// Expose utility functions globally
window.getCurrentSection = getCurrentSection;
window.scrollToSection = scrollToSection;
window.getSkillsCount = getSkillsCount;
window.findProjectsByTech = findProjectsByTech;
window.getFeaturedProjectsList = getFeaturedProjectsList;
window.getScrollProgress = getScrollProgress;
window.getReadingTime = getReadingTime;
window.getCertificateStats = getCertificateStats;
window.openWhatsApp = openWhatsApp;
window.shareSection = shareSection;
window.sharePortfolio = sharePortfolio;
window.deviceInfo = deviceInfo;
window.isOnline = () => isOnline;

console.log('📱 Mobile features enabled!');
if (deviceInfo.isMobile) {
  console.log('📲 Mobile device detected - touch features active');
}

// ===========================================
// ADDITIONAL UTILITY FUNCTIONS
// ===========================================

// 33. GET PORTFOLIO STATS SUMMARY
function getPortfolioStats() {
  return {
    skills: allSkills.length,
    projects: allProjects.length,
    featuredProjects: allProjects.filter(p => p.featured).length,
    services: allServices.length,
    certificates: allCerts.length,
    totalItems: allSkills.length + allProjects.length + allServices.length + allCerts.length
  };
}

// 34. COPY TEXT TO CLIPBOARD
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied! 📋');
    return true;
  } catch {
    return false;
  }
}

// 35. COPY EMAIL
async function copyEmail() {
  const email = document.getElementById('contactEmail')?.textContent;
  if (email) {
    await copyToClipboard(email);
  }
}

// 36. COPY PHONE
async function copyPhone() {
  const phone = document.getElementById('contactPhone')?.textContent;
  if (phone) {
    await copyToClipboard(phone);
  }
}

// 37. QUICK CALL (Mobile)
function quickCall() {
  const phone = document.getElementById('contactPhone')?.textContent;
  if (phone && deviceInfo.isMobile) {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
    return true;
  }
  return false;
}

// 38. SCROLL TO RANDOM PROJECT
function scrollToRandomProject() {
  if (allProjects.length > 0) {
    scrollToSection('projects');
    showToast(`🎲 ${allProjects.length} projects available!`);
    return true;
  }
  return false;
}

// 39. GET TIME SINCE PAGE LOAD
function getTimeSinceLoad() {
  const seconds = Math.round((Date.now() - sessionStart) / 1000);
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  return `${Math.round(seconds / 3600)} hours`;
}

// 40. CHECK IF DARK MODE
function isDarkMode() {
  return document.documentElement.dataset.theme === 'dark';
}

// 41. TOGGLE DARK/LIGHT MODE
function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const newTheme = current === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  showToast(`${newTheme === 'dark' ? '🌙' : '☀️'} ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode`);
}

// 42. GET ALL TECHNOLOGIES USED
function getAllTechnologies() {
  const techs = new Set();
  allProjects.forEach(p => {
    (p.technologies || []).forEach(t => techs.add(t));
  });
  return Array.from(techs).sort();
}

// 43. COUNT TOTAL WORDS IN PORTFOLIO
function getTotalWords() {
  const aboutText = document.getElementById('aboutText')?.textContent || '';
  let total = aboutText.split(/\s+/).length;

  allProjects.forEach(p => {
    total += (p.description || '').split(/\s+/).length;
  });

  allServices.forEach(s => {
    total += (s.description || '').split(/\s+/).length;
  });

  return total;
}

// 44. GET GREETING BASED ON TIME
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning! ☀️';
  if (hour < 17) return 'Good Afternoon! 🌤️';
  if (hour < 21) return 'Good Evening! 🌅';
  return 'Good Night! 🌙';
}

// 45. QUICK NAVIGATE (Keyboard Shortcut Helper)
function goTo(section) {
  const sections = {
    home: 'hero',
    about: 'about',
    skills: 'skills',
    edu: 'education',
    education: 'education',
    projects: 'projects',
    portfolio: 'projects',
    services: 'services',
    certs: 'certificates',
    certificates: 'certificates',
    contact: 'contact'
  };

  const target = sections[section.toLowerCase()];
  if (target) {
    scrollToSection(target);
    return true;
  }
  return false;
}

// 46. GET RANDOM SKILL
function getRandomSkill() {
  if (allSkills.length === 0) return null;
  return allSkills[Math.floor(Math.random() * allSkills.length)];
}

// 47. GET SKILLS BY PROFICIENCY (above threshold)
function getTopSkills(minProficiency = 80) {
  return allSkills.filter(s => s.proficiency >= minProficiency);
}

// 48. PRINT PORTFOLIO (Opens Print Dialog)
function printPortfolio() {
  window.print();
}

// 49. GET CONTACT INFO
function getContactInfo() {
  return {
    email: document.getElementById('contactEmail')?.textContent || '',
    phone: document.getElementById('contactPhone')?.textContent || '',
    location: document.getElementById('contactLocation')?.textContent || ''
  };
}

// 50. HIGHLIGHT SECTION (Visual Pulse Effect)
function highlightSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.transition = 'box-shadow 0.3s ease';
    section.style.boxShadow = '0 0 0 4px var(--primary)';
    setTimeout(() => {
      section.style.boxShadow = 'none';
    }, 1500);
    scrollToSection(sectionId);
    return true;
  }
  return false;
}

// Expose new utility functions globally
window.getPortfolioStats = getPortfolioStats;
window.copyToClipboard = copyToClipboard;
window.copyEmail = copyEmail;
window.copyPhone = copyPhone;
window.quickCall = quickCall;
window.scrollToRandomProject = scrollToRandomProject;
window.getTimeSinceLoad = getTimeSinceLoad;
window.isDarkMode = isDarkMode;
window.toggleTheme = toggleTheme;
window.getAllTechnologies = getAllTechnologies;
window.getTotalWords = getTotalWords;
window.getGreeting = getGreeting;
window.goTo = goTo;
window.getRandomSkill = getRandomSkill;
window.getTopSkills = getTopSkills;
window.printPortfolio = printPortfolio;
window.getContactInfo = getContactInfo;
window.highlightSection = highlightSection;

// Show greeting on load
setTimeout(() => {
  console.log(`${getGreeting()} Welcome to Md Azad's Portfolio!`);
  console.log(`📊 Stats: ${getPortfolioStats().totalItems} items loaded`);
}, 1000);
