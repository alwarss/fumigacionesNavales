/*
  Compat wrapper: mismo contenido que site.js para compatibilidad con páginas antiguas.
  Copiado para evitar referencias rotas entre pages.
*/
(function () {
  'use strict';

  /* Carga parcial HTML (header) probando rutas relativas */
  function loadInclude(name, selector) {
    const candidates = [
      `./includes/${name}.html`,
      `../includes/${name}.html`,
      `/includes/${name}.html`
    ];
    const target = document.querySelector(selector);
    if (!target) return Promise.resolve(false);

    return candidates.reduce((p, url) => {
      return p.then(found => {
        if (found) return true;
        return fetch(url).then(res => {
          if (!res.ok) return false;
          return res.text().then(html => {
            target.innerHTML = html;
            return true;
          });
        }).catch(() => false);
      });
    }, Promise.resolve(false));
  }

  function injectFallbackAnimationCSS() {
    if (document.getElementById('site-animations-css')) return;
    const css = `
      @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      .reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s var(--ease), transform 0.6s var(--ease); will-change: opacity, transform; }
      .reveal.visible { opacity: 1; transform: translateY(0); }
      .metric-bar { height: 10px; background: linear-gradient(90deg, #e31f1b, #ff8f8d); transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1); display: block; border-radius: 6px; }
      .mobile-menu { transition: opacity 0.25s ease, transform 0.25s ease; }
    `;
    const s = document.createElement('style');
    s.id = 'site-animations-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function initHeaderBehavior() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    // aceptar tanto id como clase por compatibilidad
    const mobileMenuClose = document.getElementById('mobileMenuClose') || document.querySelector('.mobile-menu-close');
    if (!hamburger || !mobileMenu) return;

    let _scrollY = 0;
    function lockScroll() {
      _scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${_scrollY}px`;
      document.documentElement.classList.add('no-scroll');
    }
    function unlockScroll() {
      document.body.style.position = '';
      document.body.style.top = '';
      document.documentElement.classList.remove('no-scroll');
      window.scrollTo(0, _scrollY);
    }

    function setOpen(open) {
      hamburger.classList.toggle('open', open);
      mobileMenu.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');

      if (open) {
        lockScroll();
        const first = mobileMenu.querySelector('a, button');
        if (first) first.focus();
      } else {
        unlockScroll();
        hamburger.focus();
      }
    }

    hamburger.addEventListener('click', () => setOpen(!mobileMenu.classList.contains('open')));
    if (mobileMenuClose) mobileMenuClose.addEventListener('click', () => setOpen(false));

    // Cerrar con Escape (sólo si está abierto)
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mobileMenu.classList.contains('open')) setOpen(false); });

    // Cerrar al clickar el fondo del overlay (no el panel)
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) setOpen(false);
    });

    // Cerrar al clicar un enlace
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));

    // marcar link activo
    const filename = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
      const href = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
      if (href === filename) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  }

  function initInPageNav() {
    const inpageLinks = document.querySelectorAll('.inpage-link');
    if (!inpageLinks.length) return;

    const sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;

    // Click handler - smooth scroll
    inpageLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Fuerza actualizar el estado activo después del scroll
          setTimeout(() => updateInPageNav(), 100);
        }
      });
    });

    // Función para actualizar el estado activo
    function updateInPageNav() {
      let current = '';
      
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        // Si la sección está en el viewport (con offset para el header sticky)
        if (rect.top <= 200 && rect.bottom > 200) {
          current = section.id;
        }
      });

      // Actualizar todos los links
      inpageLinks.forEach(link => {
        const href = link.getAttribute('href').substring(1); // remove #
        if (href === current) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    // Observer para detectar cambios de sección
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          inpageLinks.forEach(link => {
            const href = link.getAttribute('href').substring(1);
            if (href === id) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, { 
      threshold: 0.3,
      rootMargin: '-150px 0px -50% 0px'
    });

    sections.forEach(sec => observer.observe(sec));

    // También actualizar en scroll manual
    window.addEventListener('scroll', updateInPageNav, { passive: true });
  }

  function onReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 0);
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  // simple reveal observer and metric bar animation
  onReady(() => {
    injectFallbackAnimationCSS();
    loadInclude('header', '[data-include="header"]').then(() => {
      setTimeout(initHeaderBehavior, 0);
    });

    // Inicializar navegación interna
    setTimeout(initInPageNav, 50);

    // reveal elements
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(ent => {
          if (ent.isIntersecting) {
            ent.target.classList.add('visible');
            observer.unobserve(ent.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });
      revealElements.forEach(el => observer.observe(el));
    }

    // metric bar animate when container visible
    const metricContainers = document.querySelectorAll('.hero-sat-card, #metricas, .met-grid, .sat-metrics, .metric-row');
    if (metricContainers.length) {
      const barObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.querySelectorAll('.metric-bar[data-pct]').forEach(bar => {
            const pct = parseFloat(bar.getAttribute('data-pct')) || 0;
            bar.style.width = pct + '%';
          });
          barObserver.unobserve(entry.target);
        });
      }, { threshold: 0.28 });
      metricContainers.forEach(c => barObserver.observe(c));
    }

    // global filter function for testimonios (exposed)
    window.filterCards = function (sector, btn) {
      const allBtns = document.querySelectorAll('.filter-btn');
      allBtns.forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      document.querySelectorAll('#testGrid .test-card').forEach(card => {
        const s = card.getAttribute('data-sector') || 'todos';
        if (sector === 'todos' || sector === s) {
          card.style.display = '';
          card.classList.add('reveal'); // ensure reveal can animate if visible
        } else {
          card.style.display = 'none';
        }
      });
    };
  });
})();

