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

  const setupHeroVideo = () => {
    const video = document.querySelector('.lp-hero-video');
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    video.play().catch((error) => {
      console.warn('Hero video playback is unavailable; showing the poster instead.', error);
    });
  };

  const setupThemeToggle = () => {
    const wrapper = document.querySelector('.lp-wrapper');
    const toggle = document.getElementById('lp-theme-toggle');
    if (!wrapper || !toggle) return;

    const storageKey = 'haven-landing-theme';
    const applyTheme = (theme) => {
      const isLight = theme === 'light';
      wrapper.dataset.theme = isLight ? 'light' : 'dark';
      document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
      toggle.setAttribute('aria-pressed', String(isLight));
      toggle.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} mode`);
      toggle.querySelector('.lp-theme-label').textContent = `${isLight ? 'Dark' : 'Light'} mode`;
      toggle.querySelector('.lp-theme-icon').textContent = isLight ? '☾' : '☀';
    };

    let savedTheme = 'dark';
    try {
      savedTheme = localStorage.getItem(storageKey) || 'dark';
    } catch (error) {
      console.warn('Unable to load the saved color theme.', error);
    }
    applyTheme(savedTheme);

    toggle.addEventListener('click', () => {
      const nextTheme = wrapper.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      try {
        localStorage.setItem(storageKey, nextTheme);
      } catch (error) {
        console.warn('Unable to save the selected color theme.', error);
      }
    });
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

    navMenu.addEventListener('click', (event) => {
      if (event.target.closest('a[href^="#"]')) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('is-open');
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || toggleBtn.getAttribute('aria-expanded') !== 'true') return;
      toggleBtn.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('is-open');
      toggleBtn.focus();
    });
  };

  const setupScrollNavigation = () => {
    const links = document.querySelectorAll('.lp-nav-link[href^="#"]');
    const sections = ['home', 'about', 'properties', 'how-it-works', 'faq']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!links.length || !sections.length) return;

    const setCurrentSection = (sectionId) => {
      const navTarget = sectionId === 'faq' ? 'how-it-works' : sectionId;
      links.forEach((link) => {
        if (link.getAttribute('href') === `#${navTarget}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };

    const updateFromHash = () => {
      setCurrentSection(window.location.hash.slice(1) || 'home');
    };

    window.addEventListener('hashchange', updateFromHash);
    updateFromHash();

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      const current = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (current) setCurrentSection(current.target.id);
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

    sections.forEach(section => observer.observe(section));
  };

  const propertyStorageKey = 'haven-property-listings';
  const propertyImageFallbacks = {
    Apartment: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
    Condominium: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85',
    Townhouse: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=85',
    'Single-family': 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=85',
    Commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85'
  };

  const safePropertyImage = (image, type) => {
    if (/^data:image\/jpeg;base64,/i.test(image || '')) return image;
    if (image) {
      try {
        const url = new URL(image, window.location.href);
        if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
      } catch (error) {
        console.error('Unable to use the saved property image URL.', error);
      }
    }
    return propertyImageFallbacks[type] || propertyImageFallbacks.Apartment;
  };

  const createAdminPropertyCard = (property) => {
    const card = document.createElement('article');
    card.className = 'lp-property-card lp-reveal lp-reveal-up is-visible';
    card.dataset.adminPropertyCard = '';
    card.dataset.location = `${property.location || ''} ${property.name || ''}`.toLowerCase();
    card.dataset.type = String(property.type || '').toLowerCase();

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'lp-card-image-wrapper';
    const image = document.createElement('img');
    image.className = 'lp-card-image';
    image.src = safePropertyImage(property.image, property.type);
    image.alt = `${property.name || 'Property'} exterior`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.width = 600;
    image.height = 400;
    imageWrapper.append(image);
    const badge = document.createElement('span');
    badge.className = 'lp-badge';
    badge.textContent = 'For Rent';
    imageWrapper.append(badge);

    const content = document.createElement('div');
    content.className = 'lp-card-content';
    const title = document.createElement('h3');
    title.className = 'lp-card-title';
    title.textContent = property.name || 'Property';
    const location = document.createElement('p');
    location.className = 'lp-card-location';
    location.textContent = property.location || '';
    const details = document.createElement('div');
    details.className = 'lp-card-details';
    const type = document.createElement('span');
    type.textContent = property.type || 'Property';
    const units = Number(property.units) || 0;
    const occupied = Number(property.occupied) || 0;
    const availability = document.createElement('span');
    availability.textContent = `${Math.max(0, units - occupied)} of ${units} units available`;
    details.append(type, availability);

    const footer = document.createElement('div');
    footer.className = 'lp-card-footer';
    const price = document.createElement('span');
    price.className = 'lp-card-price';
    price.textContent = `₱${(Number(property.rent) || 0).toLocaleString('en-PH')} / mo`;
    const link = document.createElement('a');
    link.className = 'lp-btn lp-btn-outline';
    link.href = `../LOGIN%20PANEL/Index.html?property=${encodeURIComponent(property.id || '')}`;
    link.textContent = 'View Details';
    footer.append(price, link);
    content.append(title, location, details, footer);
    card.append(imageWrapper, content);
    return card;
  };

  const setupPropertyListings = () => {
    const grid = document.getElementById('lp-property-grid');
    if (!grid) return;

    const renderSavedProperties = () => {
      grid.querySelectorAll('[data-admin-property-card]').forEach(card => card.remove());
      try {
        const storedProperties = localStorage.getItem(propertyStorageKey);
        if (storedProperties === null) return;
        const properties = JSON.parse(storedProperties);
        if (!Array.isArray(properties)) throw new Error('Saved property data is not a list.');
        properties
          .filter(property => property && property.status === 'Active')
          .forEach(property => grid.append(createAdminPropertyCard(property)));
      } catch (error) {
        console.error('Unable to load saved property listings.', error);
        const status = document.getElementById('lp-search-status');
        if (status) {
          status.hidden = false;
          status.textContent = 'Admin property listings could not be loaded in this browser.';
        }
      }
    };

    renderSavedProperties();
    window.addEventListener('storage', event => {
      if (event.key === propertyStorageKey || event.key === null) renderSavedProperties();
    });
  };

  // Filter sample and admin-managed listings together.
  const setupSearchForm = () => {
    const form = document.getElementById('lp-search-form');
    const status = document.getElementById('lp-search-status');
    const emptyState = document.getElementById('lp-search-empty');
    const clearButton = document.getElementById('lp-clear-search');
    const locationInput = document.getElementById('lp-location');
    const typeInput = document.getElementById('lp-type');
    if (!form || !status || !emptyState || !clearButton || !locationInput || !typeInput) return;

    const normalizeText = (value) => value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    const typeAliases = {
      apartment: ['apartment'],
      house: ['house', 'single family'],
      villa: ['villa'],
      condominium: ['condominium', 'condo'],
      townhouse: ['townhouse'],
      commercial: ['commercial'],
      'single-family': ['single family', 'house']
    };

    const getPropertyCards = () => Array.from(document.querySelectorAll('.lp-property-card'));
    const showAllListings = () => {
      const propertyCards = getPropertyCards();
      locationInput.value = '';
      typeInput.value = 'all';
      propertyCards.forEach(card => { card.hidden = false; });
      emptyState.hidden = true;
      status.hidden = false;
      status.textContent = `Showing all ${propertyCards.length} listings.`;
      document.getElementById('properties').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const locationTerms = normalizeText(locationInput.value).split(/\s+/).filter(Boolean);
      const type = typeInput.value;
      const aliases = typeAliases[type] || [];
      const propertyCards = getPropertyCards();
      let matches = 0;

      propertyCards.forEach((card) => {
        const searchableText = normalizeText([
          card.dataset.location,
          card.querySelector('.lp-card-title')?.textContent,
          card.querySelector('.lp-card-location')?.textContent
        ].filter(Boolean).join(' '));
        const matchesLocation = locationTerms.every(term => searchableText.includes(term));
        const cardType = normalizeText(`${card.dataset.type || ''} ${card.querySelector('.lp-card-title')?.textContent || ''}`);
        const matchesType = type === 'all' || aliases.some(alias => cardType.includes(normalizeText(alias)));
        const isMatch = matchesLocation && matchesType;
        card.hidden = !isMatch;
        if (isMatch) matches += 1;
      });

      status.hidden = false;
      status.textContent = matches
        ? `${matches} ${matches === 1 ? 'listing matches' : 'listings match'} your search.`
        : 'No matching listings found.';
      emptyState.hidden = matches > 0;
      if (window.location.hash === '#properties') {
        document.getElementById('properties').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.location.hash = 'properties';
      }
    });

    clearButton.addEventListener('click', showAllListings);
  };

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    setupScrollReveals();
    setupStickyNav();
    setupHeroVideo();
    setupThemeToggle();
    setupMobileNav();
    setupScrollNavigation();
    setupPropertyListings();
    setupSearchForm();
  });

})();