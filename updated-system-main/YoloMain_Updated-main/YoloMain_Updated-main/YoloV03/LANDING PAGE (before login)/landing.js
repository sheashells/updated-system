(function initLandingPage() {
  'use strict';

  // 1. Intersection Observer for lightweight, performant scroll animations
  const setupScrollReveals = () => {
    // Respect user preferences for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const revealElements = document.querySelectorAll('.lp-reveal');
    if (!('IntersectionObserver' in window)) {
      revealElements.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Disconnect observer after animation to save performance
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));
  };

  // 2. Sticky Navigation Logic
  const setupStickyNav = () => {
    const header = document.getElementById('lp-header');
    if (!header) return;

    const handleScroll = () => {
      if (window.scrollY > 50) {
        header.classList.add('lp-scrolled');
      } else {
        header.classList.remove('lp-scrolled');
      }
    };

    // Passive event listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Trigger on load
  };

  // 3. Mobile Navigation Toggle
  const setupMobileNav = () => {
    const toggleBtn = document.getElementById('lp-mobile-toggle');
    const navMenu = document.getElementById('lp-nav-menu');
    
    if (!toggleBtn || !navMenu) return;

    toggleBtn.addEventListener('click', () => {
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('is-open');
    });

    navMenu.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        toggleBtn.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('is-open');
      });
    });
  };

  // Search is a frontend-only entry point to the login panel.
  const setupSearchForm = () => {
    const form = document.getElementById('lp-search-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      window.location.assign(form.action);
    });
  };

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    setupScrollReveals();
    setupStickyNav();
    setupMobileNav();
    setupSearchForm();
  });

})();