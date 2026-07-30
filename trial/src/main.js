/* ═══════════════════════════════════════════════════════
   DOCTOR JI — MAIN APPLICATION SCRIPT
   ═══════════════════════════════════════════════════════ */

// ── CSS Imports ──────────────────────────────────────
import './styles/variables.css';
import './styles/base.css';
import './styles/animations.css';
import './styles/components.css';
import './styles/sections.css';
import './styles/responsive.css';

// ── Library Imports ──────────────────────────────────
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════
   GLOBAL STATE
   ═══════════════════════════════════════════════════════ */
const state = {
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  mouseX: 0,
  mouseY: 0,
  lenis: null,
  isLoaded: false,
  isMobile: window.innerWidth <= 768,
  animFrames: [],
};

/* ═══════════════════════════════════════════════════════
   1. LOADING SCREEN
   ═══════════════════════════════════════════════════════ */
function initLoader() {
  const loader = document.getElementById('loader');
  const canvas = document.getElementById('loader-canvas');
  const bar = document.getElementById('loader-bar');
  const percent = document.getElementById('loader-percent');
  if (!loader || !canvas) return;

  const ctx = canvas.getContext('2d');
  let progress = 0;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();

  // ECG line animation
  let ecgOffset = 0;
  function drawECG() {
    if (state.isLoaded) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const centerY = canvas.height / 2;
    const waveWidth = 300;

    for (let line = 0; line < 3; line++) {
      const yOff = centerY + (line - 1) * 80;
      const alpha = 0.15 + line * 0.1;
      ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const pos = (x + ecgOffset + line * 100) % waveWidth;
        let y = yOff;
        if (pos > 100 && pos < 110) y = yOff - 5;
        else if (pos > 110 && pos < 120) y = yOff - 30;
        else if (pos > 120 && pos < 130) y = yOff + 40;
        else if (pos > 130 && pos < 140) y = yOff - 50;
        else if (pos > 140 && pos < 150) y = yOff + 15;
        else if (pos > 150 && pos < 160) y = yOff - 8;
        else if (pos > 160 && pos < 170) y = yOff;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ecgOffset += 1.5;
    requestAnimationFrame(drawECG);
  }
  drawECG();

  // Simulate loading progress
  const loadInterval = setInterval(() => {
    progress += Math.random() * 3 + 1;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loadInterval);
      completeLoading();
    }
    if (bar) bar.style.width = `${progress}%`;
    if (percent) percent.textContent = `${Math.floor(progress)}%`;
  }, 50);

  function completeLoading() {
    state.isLoaded = true;
    setTimeout(() => {
      gsap.to(loader, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          loader.style.display = 'none';
          document.body.classList.add('loaded');
          initAllAnimations();
        },
      });
    }, 400);
  }
}

/* ═══════════════════════════════════════════════════════
   2. LENIS SMOOTH SCROLL
   ═══════════════════════════════════════════════════════ */
function initLenis() {
  if (state.reducedMotion) return;
  state.lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    touchMultiplier: 1.5,
    infinite: false,
  });

  state.lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    state.lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

/* ═══════════════════════════════════════════════════════
   3. CUSTOM CURSOR
   ═══════════════════════════════════════════════════════ */
function initCursor() {
  if (state.isMobile) return;
  const dot = document.getElementById('cursor-dot');
  const glow = document.getElementById('cursor-glow');
  if (!dot || !glow) return;

  let curX = 0, curY = 0;
  let glowX = 0, glowY = 0;

  document.addEventListener('mousemove', (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    curX = e.clientX;
    curY = e.clientY;
  });

  function updateCursor() {
    dot.style.transform = `translate(${curX}px, ${curY}px)`;
    glowX += (curX - glowX) * 0.12;
    glowY += (curY - glowY) * 0.12;
    glow.style.transform = `translate(${glowX}px, ${glowY}px)`;
    requestAnimationFrame(updateCursor);
  }
  updateCursor();

  // Hover states
  const interactiveElements = document.querySelectorAll('a, button, .glass-card, .magnetic-btn, .triage__card, .feature__tile');
  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      dot.classList.add('cursor-dot--hover');
      glow.classList.add('cursor-glow--hover');
    });
    el.addEventListener('mouseleave', () => {
      dot.classList.remove('cursor-dot--hover');
      glow.classList.remove('cursor-glow--hover');
    });
  });
}

/* ═══════════════════════════════════════════════════════
   4. AMBIENT PARTICLES
   ═══════════════════════════════════════════════════════ */
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const COUNT = state.isMobile ? 30 : 60;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2.5 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.4 + 0.1;
      this.color = ['#22D3EE', '#2563EB', '#10B981', '#F97316'][Math.floor(Math.random() * 4)];
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  for (let i = 0; i < COUNT; i++) particles.push(new Particle());

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => { p.update(); p.draw(); });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(34, 211, 238, ${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }
  if (!state.reducedMotion) animate();
}

/* ═══════════════════════════════════════════════════════
   5. NAVBAR
   ═══════════════════════════════════════════════════════ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('nav-hamburger');
  const links = document.getElementById('nav-links');
  const underline = document.getElementById('nav-underline');
  const navLinks = document.querySelectorAll('.navbar__link');

  // Scroll effect
  ScrollTrigger.create({
    start: 'top -80',
    onUpdate: (self) => {
      if (self.direction === 1) navbar.classList.add('navbar--scrolled');
      else if (self.scroll() < 80) navbar.classList.remove('navbar--scrolled');
    },
  });

  // Active section highlight
  navLinks.forEach((link) => {
    const sectionId = link.getAttribute('data-section');
    if (!sectionId) return;
    ScrollTrigger.create({
      trigger: `#${sectionId}`,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => {
        if (self.isActive) {
          navLinks.forEach((l) => l.classList.remove('active'));
          link.classList.add('active');
          if (underline) {
            gsap.to(underline, {
              left: link.offsetLeft,
              width: link.offsetWidth,
              duration: 0.3,
              ease: 'power2.out',
            });
          }
        }
      },
    });
  });

  // Hamburger toggle
  if (hamburger && links) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      links.classList.toggle('active');
    });
    // Close on link click
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        links.classList.remove('active');
      });
    });
  }
}

/* ═══════════════════════════════════════════════════════
   6. HERO SECTION
   ═══════════════════════════════════════════════════════ */
function initHero() {
  // Hero entrance animation
  const tl = gsap.timeline({ delay: 0.2 });
  tl.from('#hero-label', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' })
    .from('.hero__heading-word', { opacity: 0, y: 40, duration: 0.7, stagger: 0.15, ease: 'power3.out' }, '-=0.3')
    .from('#hero-desc', { opacity: 0, y: 20, duration: 0.5, ease: 'power3.out' }, '-=0.4')
    .from('.hero__buttons', { opacity: 0, y: 20, duration: 0.5, ease: 'power3.out' }, '-=0.3')
    .from('.hero__object', { opacity: 0, scale: 0.5, duration: 0.8, stagger: 0.1, ease: 'back.out(1.2)' }, '-=0.4')
    .from('#scroll-indicator', { opacity: 0, y: -10, duration: 0.5, ease: 'power2.out' }, '-=0.2');

  // Mouse parallax on hero objects
  if (!state.isMobile && !state.reducedMotion) {
    const heroScene = document.getElementById('hero-scene');
    if (!heroScene) return;
    const objects = heroScene.querySelectorAll('.hero__object');

    document.addEventListener('mousemove', (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;

      objects.forEach((obj) => {
        const depth = parseFloat(obj.dataset.depth) || 0.5;
        const moveX = dx * 40 * depth;
        const moveY = dy * 30 * depth;
        gsap.to(obj, {
          x: moveX,
          y: moveY,
          duration: 0.8,
          ease: 'power2.out',
        });
      });
    });
  }

  // Hero ECG canvas
  initHeroECG();
}

function initHeroECG() {
  const canvas = document.getElementById('hero-ecg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let offset = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    const waveW = 250;
    const cy = canvas.height * 0.5;

    ctx.beginPath();
    for (let x = 0; x < canvas.width + waveW; x++) {
      const pos = (x + offset) % waveW;
      let y = cy;
      if (pos > 80 && pos < 90) y = cy - 5;
      else if (pos > 90 && pos < 100) y = cy - 25;
      else if (pos > 100 && pos < 110) y = cy + 35;
      else if (pos > 110 && pos < 120) y = cy - 40;
      else if (pos > 120 && pos < 130) y = cy + 12;
      else if (pos > 130 && pos < 140) y = cy - 3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    offset += 0.8;
    if (!state.reducedMotion) requestAnimationFrame(draw);
  }
  draw();
}

/* ═══════════════════════════════════════════════════════
   7. INTRO SECTION — Word Reveal
   ═══════════════════════════════════════════════════════ */
function initIntro() {
  const words = document.querySelectorAll('.intro__word');
  if (!words.length) return;

  // Set initial state
  gsap.set(words, { opacity: 0.15 });

  // Reveal each word as user scrolls through
  words.forEach((word, i) => {
    gsap.to(word, {
      opacity: 1,
      color: word.classList.contains('intro__word--highlight') ? undefined : '#F8FAFC',
      scrollTrigger: {
        trigger: '#intro',
        start: `top+=${i * 30} center`,
        end: `top+=${i * 30 + 60} center`,
        scrub: 0.5,
      },
    });
  });

  // Keywords fade in
  gsap.from('.intro__keyword', {
    opacity: 0,
    y: 20,
    stagger: 0.15,
    duration: 0.6,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.intro__keywords',
      start: 'top 80%',
      toggleActions: 'play none none reverse',
    },
  });

  // Patient queue animation
  const patients = document.querySelectorAll('.intro__patient');
  if (patients.length) {
    // Initially show patients in a queue, then re-order by urgency
    gsap.from(patients, {
      opacity: 0,
      x: 50,
      stagger: 0.1,
      duration: 0.5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#intro-queue',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });

    // Re-sort animation
    ScrollTrigger.create({
      trigger: '#intro-queue',
      start: 'top 40%',
      onEnter: () => {
        const queue = document.getElementById('intro-queue');
        if (!queue || queue.dataset.sorted === 'true') return;
        queue.dataset.sorted = 'true';
        const sorted = Array.from(patients).sort((a, b) =>
          parseInt(a.dataset.urgency) - parseInt(b.dataset.urgency)
        );
        sorted.forEach((p, i) => {
          gsap.to(p, {
            order: i,
            duration: 0.6,
            delay: i * 0.1,
            ease: 'power2.inOut',
          });
          p.style.order = i;
        });
        gsap.fromTo(queue, { borderColor: 'rgba(34,211,238,0.1)' },
          { borderColor: 'rgba(34,211,238,0.4)', duration: 0.5, yoyo: true, repeat: 1 });
      },
    });
  }
}

/* ═══════════════════════════════════════════════════════
   8. PROBLEM SECTION — Counter + Mini Graphs
   ═══════════════════════════════════════════════════════ */
function initProblem() {
  // Stat counters
  const statNums = document.querySelectorAll('.problem__stat-number');
  statNums.forEach((num) => {
    const target = parseInt(num.dataset.target) || 0;
    const suffix = num.dataset.suffix || '';
    ScrollTrigger.create({
      trigger: num,
      start: 'top 85%',
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate: function () {
            num.textContent = Math.floor(this.targets()[0].val) + suffix;
          },
        });
      },
      once: true,
    });
  });

  // Section reveal
  gsap.from('.problem__title', {
    opacity: 0, y: 30, duration: 0.7,
    scrollTrigger: { trigger: '#problem', start: 'top 75%', toggleActions: 'play none none reverse' },
  });

  // Story cards stagger
  gsap.from('.problem__card', {
    opacity: 0, y: 40, stagger: 0.2, duration: 0.6, ease: 'power3.out',
    scrollTrigger: { trigger: '#problem-stories', start: 'top 80%', toggleActions: 'play none none reverse' },
  });

  // Mini graphs on cards
  initMiniGraphs();
}

function initMiniGraphs() {
  const canvases = document.querySelectorAll('.problem__mini-graph');
  canvases.forEach((canvas) => {
    const card = canvas.closest('.problem__card');
    const type = card?.dataset.story || 'bp';
    canvas.width = canvas.offsetWidth || 200;
    canvas.height = canvas.offsetHeight || 60;
    const ctx = canvas.getContext('2d');

    let dataPoints;
    let color;
    if (type === 'bp') {
      dataPoints = [120, 125, 128, 132, 138, 142, 148, 155, 158];
      color = '#EF4444';
    } else if (type === 'o2') {
      dataPoints = [98, 97, 96, 95, 94, 93, 92, 91, 89];
      color = '#F97316';
    } else {
      dataPoints = [140, 150, 162, 170, 175, 180, 185, 190, 200];
      color = '#FBBF24';
    }

    ScrollTrigger.create({
      trigger: canvas,
      start: 'top 85%',
      onEnter: () => drawGraph(ctx, canvas, dataPoints, color),
      once: true,
    });
  });
}

function drawGraph(ctx, canvas, data, color) {
  const w = canvas.width;
  const h = canvas.height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 8;
  const stepX = (w - padding * 2) / (data.length - 1);

  let drawn = 0;
  function animateDraw() {
    drawn += 0.15;
    if (drawn > data.length - 1) drawn = data.length - 1;

    ctx.clearRect(0, 0, w, h);

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(padding, h);
    for (let i = 0; i <= Math.floor(drawn); i++) {
      const x = padding + i * stepX;
      const y = h - padding - ((data[i] - min) / range) * (h - padding * 2);
      ctx.lineTo(x, y);
    }
    // Partial last segment
    const frac = drawn - Math.floor(drawn);
    if (frac > 0 && Math.floor(drawn) < data.length - 1) {
      const i = Math.floor(drawn);
      const x1 = padding + i * stepX;
      const y1 = h - padding - ((data[i] - min) / range) * (h - padding * 2);
      const x2 = padding + (i + 1) * stepX;
      const y2 = h - padding - ((data[i + 1] - min) / range) * (h - padding * 2);
      ctx.lineTo(x1 + (x2 - x1) * frac, y1 + (y2 - y1) * frac);
    }
    ctx.lineTo(padding + Math.min(drawn, data.length - 1) * stepX, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let i = 0; i <= Math.floor(drawn); i++) {
      const x = padding + i * stepX;
      const y = h - padding - ((data[i] - min) / range) * (h - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (frac > 0 && Math.floor(drawn) < data.length - 1) {
      const i = Math.floor(drawn);
      const x1 = padding + i * stepX;
      const y1 = h - padding - ((data[i] - min) / range) * (h - padding * 2);
      const x2 = padding + (i + 1) * stepX;
      const y2 = h - padding - ((data[i + 1] - min) / range) * (h - padding * 2);
      ctx.lineTo(x1 + (x2 - x1) * frac, y1 + (y2 - y1) * frac);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    for (let i = 0; i <= Math.floor(drawn); i++) {
      const x = padding + i * stepX;
      const y = h - padding - ((data[i] - min) / range) * (h - padding * 2);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    if (drawn < data.length - 1) requestAnimationFrame(animateDraw);
  }
  animateDraw();
}

/* ═══════════════════════════════════════════════════════
   9. HOW IT WORKS — Journey Line + Steps
   ═══════════════════════════════════════════════════════ */
function initHowItWorks() {
  // Section header
  gsap.from('#how-it-works .section__label, #how-it-works .section__title', {
    opacity: 0, y: 30, stagger: 0.1, duration: 0.6,
    scrollTrigger: { trigger: '#how-it-works', start: 'top 75%', toggleActions: 'play none none reverse' },
  });

  // Journey line draw
  const linePath = document.getElementById('how-line-path');
  if (linePath) {
    const length = linePath.getTotalLength();
    linePath.style.strokeDasharray = length;
    linePath.style.strokeDashoffset = length;

    gsap.to(linePath, {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '#how-journey',
        start: 'top 70%',
        end: 'bottom 30%',
        scrub: 1,
      },
    });
  }

  // Steps stagger
  gsap.from('.how__step', {
    opacity: 0, y: 40, scale: 0.9,
    stagger: 0.15, duration: 0.6, ease: 'power3.out',
    scrollTrigger: { trigger: '.how__steps', start: 'top 80%', toggleActions: 'play none none reverse' },
  });
}

/* ═══════════════════════════════════════════════════════
   10. TRIAGE SECTION — Cards + ECG Lines
   ═══════════════════════════════════════════════════════ */
function initTriage() {
  // Header
  gsap.from('#triage .section__label, #triage .section__title', {
    opacity: 0, y: 30, stagger: 0.1, duration: 0.6,
    scrollTrigger: { trigger: '#triage', start: 'top 75%', toggleActions: 'play none none reverse' },
  });

  // Cards entrance
  gsap.from('.triage__card', {
    opacity: 0, y: 50, stagger: 0.2, duration: 0.7, ease: 'power3.out',
    scrollTrigger: { trigger: '#triage-cards', start: 'top 80%', toggleActions: 'play none none reverse' },
  });

  // Counter animations on triage vital values
  const triageVitals = document.querySelectorAll('.triage__vital-value[data-target]');
  triageVitals.forEach((el) => {
    const target = parseInt(el.dataset.target) || 0;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target,
          duration: 1.2,
          ease: 'power2.out',
          onUpdate: function () { el.textContent = Math.floor(this.targets()[0].val); },
        });
      },
      once: true,
    });
  });

  // ECG lines on triage cards
  initTriageECG();

  // Card tilt on hover (desktop)
  if (!state.isMobile) {
    document.querySelectorAll('.triage__card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
        card.style.transform = `perspective(800px) rotateX(${y}deg) rotateY(${x}deg) translateZ(10px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)';
      });
    });
  }
}

function initTriageECG() {
  const canvases = document.querySelectorAll('.triage__ecg-line');
  canvases.forEach((canvas) => {
    canvas.width = canvas.offsetWidth || 280;
    canvas.height = canvas.offsetHeight || 40;
    const ctx = canvas.getContext('2d');
    const color = canvas.dataset.color || '#22D3EE';
    let offset = Math.random() * 300;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.7;

      const cy = canvas.height / 2;
      const waveW = 200;

      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const pos = (x + offset) % waveW;
        let y = cy;
        if (pos > 60 && pos < 68) y = cy - 3;
        else if (pos > 68 && pos < 76) y = cy - 14;
        else if (pos > 76 && pos < 84) y = cy + 18;
        else if (pos > 84 && pos < 92) y = cy - 22;
        else if (pos > 92 && pos < 100) y = cy + 8;
        else if (pos > 100 && pos < 108) y = cy - 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      offset += 0.5;
      if (!state.reducedMotion) requestAnimationFrame(draw);
    }

    ScrollTrigger.create({
      trigger: canvas,
      start: 'top 90%',
      onEnter: () => draw(),
      once: true,
    });
  });
}

/* ═══════════════════════════════════════════════════════
   11. RISK SCORE SECTION — Meter + Factors
   ═══════════════════════════════════════════════════════ */
function initRiskScore() {
  // Header
  gsap.from('#risk-score .section__label, #risk-score .section__title', {
    opacity: 0, y: 30, stagger: 0.1, duration: 0.6,
    scrollTrigger: { trigger: '#risk-score', start: 'top 75%', toggleActions: 'play none none reverse' },
  });

  // Risk arc animation
  const arc = document.getElementById('risk-arc');
  const scoreNum = document.getElementById('risk-score-num');
  if (arc) {
    const circumference = 2 * Math.PI * 108; // ~679
    const targetScore = 88;
    const targetOffset = circumference * (1 - targetScore / 100);

    ScrollTrigger.create({
      trigger: '#risk-meter',
      start: 'top 70%',
      onEnter: () => {
        gsap.to(arc, {
          strokeDashoffset: targetOffset,
          duration: 2,
          ease: 'power2.out',
        });
        if (scoreNum) {
          gsap.to({ val: 0 }, {
            val: targetScore,
            duration: 2,
            ease: 'power2.out',
            onUpdate: function () { scoreNum.textContent = Math.floor(this.targets()[0].val); },
          });
        }
      },
      once: true,
    });
  }

  // Ring rotations
  gsap.to('.risk__ring--outer', { rotation: 360, duration: 60, repeat: -1, ease: 'none',
    transformOrigin: '50% 50%', scrollTrigger: { trigger: '#risk-meter', start: 'top 90%' } });
  gsap.to('.risk__ring--mid', { rotation: -360, duration: 45, repeat: -1, ease: 'none',
    transformOrigin: '50% 50%', scrollTrigger: { trigger: '#risk-meter', start: 'top 90%' } });

  // Factors stagger
  gsap.from('.risk__factor', {
    opacity: 0, x: -30, stagger: 0.15, duration: 0.5, ease: 'power3.out',
    scrollTrigger: { trigger: '#risk-factors', start: 'top 80%', toggleActions: 'play none none reverse' },
  });

  // Risk particles
  initRiskParticles();
}

function initRiskParticles() {
  const container = document.getElementById('risk-particles');
  if (!container) return;
  for (let i = 0; i < 12; i++) {
    const dot = document.createElement('span');
    dot.className = 'risk__particle';
    dot.style.cssText = `
      position: absolute;
      width: ${3 + Math.random() * 4}px;
      height: ${3 + Math.random() * 4}px;
      background: ${['#EF4444', '#F97316', '#FBBF24'][Math.floor(Math.random() * 3)]};
      border-radius: 50%;
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      opacity: ${0.3 + Math.random() * 0.4};
      animation: float ${3 + Math.random() * 4}s ease-in-out infinite ${Math.random() * 3}s;
    `;
    container.appendChild(dot);
  }
}

/* ═══════════════════════════════════════════════════════
   12. LIVE VITALS — Waveforms + Counters
   ═══════════════════════════════════════════════════════ */
function initVitals() {
  // Header
  gsap.from('#live-vitals .section__label, #live-vitals .section__title', {
    opacity: 0, y: 30, stagger: 0.1, duration: 0.6,
    scrollTrigger: { trigger: '#live-vitals', start: 'top 75%', toggleActions: 'play none none reverse' },
  });

  // Panels stagger
  gsap.from('.vitals__panel', {
    opacity: 0, y: 40, stagger: 0.1, duration: 0.6, ease: 'power3.out',
    scrollTrigger: { trigger: '#vitals-grid', start: 'top 80%', toggleActions: 'play none none reverse' },
  });

  // Counter animations
  document.querySelectorAll('.vitals__current[data-target]').forEach((el) => {
    const target = parseInt(el.dataset.target) || 0;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate: function () { el.textContent = Math.floor(this.targets()[0].val); },
        });
      },
      once: true,
    });
  });

  // Waveform canvases
  initVitalWaveforms();
}

function initVitalWaveforms() {
  const canvases = document.querySelectorAll('.vitals__waveform');
  canvases.forEach((canvas) => {
    canvas.width = canvas.offsetWidth || 300;
    canvas.height = canvas.offsetHeight || 80;
    const ctx = canvas.getContext('2d');
    const type = canvas.dataset.type || 'spo2';

    const colors = {
      spo2: '#22D3EE',
      bp: '#F97316',
      pulse: '#EF4444',
      sugar: '#FBBF24',
      temp: '#10B981',
      resp: '#2563EB',
    };
    const color = colors[type] || '#22D3EE';
    let offset = Math.random() * 500;
    let isRunning = false;

    function draw() {
      if (!isRunning) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Waveform
      const cy = canvas.height / 2;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        let y = cy;
        if (type === 'pulse' || type === 'spo2') {
          const period = 120;
          const pos = (x + offset) % period;
          if (pos > 30 && pos < 38) y = cy - 4;
          else if (pos > 38 && pos < 46) y = cy - 20;
          else if (pos > 46 && pos < 54) y = cy + 28;
          else if (pos > 54 && pos < 62) y = cy - 32;
          else if (pos > 62 && pos < 70) y = cy + 10;
          else if (pos > 70 && pos < 78) y = cy - 3;
        } else if (type === 'bp') {
          y = cy + Math.sin((x + offset) * 0.04) * 15 + Math.sin((x + offset) * 0.08) * 8;
        } else if (type === 'sugar') {
          y = cy + Math.sin((x + offset) * 0.02) * 18 + Math.cos((x + offset) * 0.05) * 6;
        } else if (type === 'temp') {
          y = cy + Math.sin((x + offset) * 0.015) * 10 + Math.sin((x + offset) * 0.06) * 4;
        } else {
          y = cy + Math.sin((x + offset) * 0.03) * 12 + Math.sin((x + offset) * 0.07) * 5;
        }
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      offset += 0.7;
      if (!state.reducedMotion) requestAnimationFrame(draw);
    }

    ScrollTrigger.create({
      trigger: canvas,
      start: 'top 90%',
      onEnter: () => { isRunning = true; draw(); },
      onLeaveBack: () => { isRunning = false; },
    });
  });
}

/* ═══════════════════════════════════════════════════════
   13. REFERRAL JOURNEY — Ambulance Animation
   ═══════════════════════════════════════════════════════ */
function initReferral() {
  // Header
  gsap.from('#referral .section__label, #referral .section__title', {
    opacity: 0, y: 30, stagger: 0.1, duration: 0.6,
    scrollTrigger: { trigger: '#referral', start: 'top 75%', toggleActions: 'play none none reverse' },
  });

  const clinic = document.getElementById('ref-clinic');
  const hospital = document.getElementById('ref-hospital');
  const ambulance = document.getElementById('ref-ambulance');
  const roadLine = document.getElementById('ref-road-line');
  const roadDash = document.getElementById('ref-road-dash');
  const info = document.getElementById('ref-info');
  const infoPanel = document.getElementById('ref-info-panel');

  if (!clinic || !hospital || !ambulance) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#referral-scene',
      start: 'top 70%',
      toggleActions: 'play none none reverse',
    },
  });

  // 1) Reveal clinic
  tl.to(clinic, { opacity: 1, duration: 0.5, ease: 'power2.out' })
    // 2) Reveal hospital
    .to(hospital, { opacity: 1, duration: 0.5, ease: 'power2.out' }, '+=0.2')
    // 3) Draw road line
    .to(roadLine, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' }, '-=0.3')
    // 4) Show road dash
    .to(roadDash, { opacity: 1, duration: 0.3 }, '-=0.5')
    // 5) Ambulance appears and moves along path
    .to(ambulance, { opacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.3');

  // Animate ambulance along path using motionPath-like approach
  const roadPath = document.getElementById('ref-road');
  if (roadPath && ambulance) {
    tl.to(ambulance, {
      motionPath: {
        path: '#ref-road',
        align: '#ref-road',
        alignOrigin: [0.5, 0.5],
        autoRotate: true,
      },
      duration: 3,
      ease: 'power1.inOut',
    }, '-=0.1');

    // Fallback if motionPath isn't available
    // The ambulance will simply move from clinic area to hospital area
    if (!gsap.plugins?.motionPath) {
      tl.to(ambulance, {
        attr: { transform: 'translate(860, 275)' },
        duration: 3,
        ease: 'power1.inOut',
      }, '<');
    }
  }

  // 6) Show info
  tl.to(info, { opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=1')
    // 7) Show info panel
    .from(infoPanel, { opacity: 0, y: 30, duration: 0.6, ease: 'power3.out' }, '-=0.3');
}

/* ═══════════════════════════════════════════════════════
   14. FEATURES SECTION
   ═══════════════════════════════════════════════════════ */
function initFeatures() {
  // Header
  gsap.from('#features .section__label, #features .section__title', {
    opacity: 0, y: 30, stagger: 0.1, duration: 0.6,
    scrollTrigger: { trigger: '#features', start: 'top 75%', toggleActions: 'play none none reverse' },
  });

  // Tiles stagger
  gsap.from('.feature__tile', {
    opacity: 0, y: 40, scale: 0.95,
    stagger: { each: 0.08, grid: 'auto', from: 'start' },
    duration: 0.6, ease: 'power3.out',
    scrollTrigger: { trigger: '#features-grid', start: 'top 80%', toggleActions: 'play none none reverse' },
  });

  // Hover tilt (desktop)
  if (!state.isMobile) {
    document.querySelectorAll('.feature__tile').forEach((tile) => {
      tile.addEventListener('mousemove', (e) => {
        const rect = tile.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
        tile.style.transform = `perspective(600px) rotateX(${y}deg) rotateY(${x}deg) translateZ(5px)`;
      });
      tile.addEventListener('mouseleave', () => {
        tile.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateZ(0)';
      });
    });
  }
}

/* ═══════════════════════════════════════════════════════
   15. RURAL HEALTHCARE SECTION — Parallax
   ═══════════════════════════════════════════════════════ */
function initRural() {
  const layers = document.querySelectorAll('.rural__layer[data-depth]');
  if (!layers.length) return;

  gsap.from('.rural__content', {
    opacity: 0, y: 40, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '#rural', start: 'top 60%', toggleActions: 'play none none reverse' },
  });

  // Parallax layers on scroll
  layers.forEach((layer) => {
    const depth = parseFloat(layer.dataset.depth) || 0.1;
    gsap.to(layer, {
      y: -100 * depth,
      ease: 'none',
      scrollTrigger: {
        trigger: '#rural',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
    });
  });
}

/* ═══════════════════════════════════════════════════════
   16. DASHBOARD PREVIEW — Counters + Bars
   ═══════════════════════════════════════════════════════ */
function initDashboard() {
  // Header
  gsap.from('#dashboard .section__label, #dashboard .section__title', {
    opacity: 0, y: 30, stagger: 0.1, duration: 0.6,
    scrollTrigger: { trigger: '#dashboard', start: 'top 75%', toggleActions: 'play none none reverse' },
  });

  // Frame perspective entrance
  gsap.from('#dashboard-frame', {
    opacity: 0, y: 60, rotateX: 15, scale: 0.92,
    duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: '#dashboard-frame', start: 'top 80%', toggleActions: 'play none none reverse' },
  });

  // Dashboard card counters
  document.querySelectorAll('.dashboard__card-num[data-target]').forEach((el) => {
    const target = parseInt(el.dataset.target) || 0;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target,
          duration: 1.2,
          ease: 'power2.out',
          onUpdate: function () { el.textContent = Math.floor(this.targets()[0].val); },
        });
      },
      once: true,
    });
  });

  // Chart bars animation
  gsap.from('.dashboard__chart-bar', {
    scaleY: 0,
    transformOrigin: 'bottom',
    stagger: 0.08,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.dashboard__chart-bars', start: 'top 85%', toggleActions: 'play none none reverse' },
  });

  // Alert slide in
  gsap.from('.dashboard__alert', {
    opacity: 0, x: -30, duration: 0.6, delay: 1,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.dashboard__alert', start: 'top 90%', toggleActions: 'play none none reverse' },
  });
}

/* ═══════════════════════════════════════════════════════
   17. CTA SECTION
   ═══════════════════════════════════════════════════════ */
function initCTA() {
  gsap.from('#cta-heading', {
    opacity: 0, y: 30, duration: 0.7, ease: 'power3.out',
    scrollTrigger: { trigger: '#cta', start: 'top 70%', toggleActions: 'play none none reverse' },
  });
  gsap.from('#cta-heading-2', {
    opacity: 0, y: 30, duration: 0.7, ease: 'power3.out', delay: 0.3,
    scrollTrigger: { trigger: '#cta', start: 'top 70%', toggleActions: 'play none none reverse' },
  });
  gsap.from('#cta-btn', {
    opacity: 0, scale: 0.8, duration: 0.6, delay: 0.5, ease: 'back.out(1.5)',
    scrollTrigger: { trigger: '#cta', start: 'top 70%', toggleActions: 'play none none reverse' },
  });

  // Heart pulse
  gsap.to('#cta-heart', {
    scale: 1.05,
    duration: 1.5,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    scrollTrigger: { trigger: '#cta', start: 'top 80%' },
  });
}

/* ═══════════════════════════════════════════════════════
   18. FOOTER
   ═══════════════════════════════════════════════════════ */
function initFooter() {
  gsap.from('.footer__brand, .footer__col, .footer__social', {
    opacity: 0, y: 30, stagger: 0.1, duration: 0.5, ease: 'power3.out',
    scrollTrigger: { trigger: '#footer', start: 'top 85%', toggleActions: 'play none none reverse' },
  });
}

/* ═══════════════════════════════════════════════════════
   19. MAGNETIC BUTTONS
   ═══════════════════════════════════════════════════════ */
function initMagneticButtons() {
  if (state.isMobile) return;
  document.querySelectorAll('.magnetic-btn').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });
}

/* ═══════════════════════════════════════════════════════
   20. SECTION LABELS ANIMATION (generic)
   ═══════════════════════════════════════════════════════ */
function initSectionLabels() {
  document.querySelectorAll('.section__label').forEach((label) => {
    gsap.from(label, {
      opacity: 0,
      x: -20,
      duration: 0.5,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: label,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    });
  });
}

/* ═══════════════════════════════════════════════════════
   21. REDUCE MOTION TOGGLE
   ═══════════════════════════════════════════════════════ */
function initReduceMotion() {
  const btn = document.getElementById('reduce-motion-toggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    state.reducedMotion = !state.reducedMotion;
    document.body.classList.toggle('reduce-motion', state.reducedMotion);
    btn.classList.toggle('active', state.reducedMotion);

    if (state.reducedMotion) {
      // Kill all GSAP animations
      gsap.globalTimeline.pause();
      // Stop lenis
      if (state.lenis) state.lenis.destroy();
    } else {
      gsap.globalTimeline.resume();
      initLenis();
    }
  });
}

/* ═══════════════════════════════════════════════════════
   INIT ALL ANIMATIONS (called after loader completes)
   ═══════════════════════════════════════════════════════ */
function initAllAnimations() {
  initNavbar();
  initHero();
  initIntro();
  initProblem();
  initHowItWorks();
  initTriage();
  initRiskScore();
  initVitals();
  initReferral();
  initFeatures();
  initRural();
  initDashboard();
  initCTA();
  initFooter();
  initSectionLabels();
  initMagneticButtons();
}

/* ═══════════════════════════════════════════════════════
   BOOTSTRAP
   ═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initLenis();
  initCursor();
  initParticles();
  initReduceMotion();
  initLoader();

  // Responsive updates
  window.addEventListener('resize', () => {
    state.isMobile = window.innerWidth <= 768;
  });
});
