// Connect to Backend (dynamic based on environment)
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://backend-mu-sage.vercel.app/api';

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
});

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

  document.getElementById('educationList').innerHTML = edu.map(e => `
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
  const toShow = projectsExpanded ? allProjects : allProjects.slice(0, INITIAL_COUNT);


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
