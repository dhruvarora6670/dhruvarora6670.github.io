/* Dhruv Arora — portfolio behaviour.
   Theme toggle, mobile menu, header state over the hero, and the nav link for the section on
   screen. The page works without this file: the header stays solid and the toggles stay hidden. */
(function () {
  'use strict';

  var root = document.documentElement;
  var header = document.getElementById('site-header');
  var themeBtn = document.querySelector('.theme-toggle');
  var menuBtn = document.querySelector('.menu-toggle');
  var menu = document.getElementById('mobile-menu');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var desktopQuery = window.matchMedia('(min-width: 901px)');
  var THEME_BG = { light: '#FFFFFF', dark: '#0A0A0A' };

  function onChange(query, fn) {
    if (query.addEventListener) query.addEventListener('change', fn);
    else if (query.addListener) query.addListener(fn);
  }

  /* ---------- Theme ---------- */
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return darkQuery.matches ? 'dark' : 'light';
  }

  function syncTheme() {
    var theme = currentTheme();
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
    // An explicit choice overrides the system-based browser UI colour too.
    if (root.hasAttribute('data-theme')) {
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', THEME_BG[theme]);
    }
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      // Switch every colour at once: no element fades on its own while the rest snaps.
      root.classList.add('theme-switching');
      root.setAttribute('data-theme', next);
      void root.offsetWidth;
      window.requestAnimationFrame(function () {
        root.classList.remove('theme-switching');
      });
      try {
        localStorage.setItem('theme', next);
      } catch (e) {
        // Storage blocked (private mode, strict settings): the theme still applies for this visit.
      }
      syncTheme();
    });
  }
  onChange(darkQuery, syncTheme);
  syncTheme();

  /* ---------- Mobile menu ---------- */
  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (header) header.classList.toggle('menu-open', open);
  }

  if (menu && menuBtn) {
    menuBtn.addEventListener('click', function () {
      setMenu(menu.hidden);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && header && !header.contains(e.target)) setMenu(false);
    });
    onChange(desktopQuery, function () {
      if (desktopQuery.matches) setMenu(false);
    });
  }

  /* ---------- Header: transparent over the hero, solid once the page scrolls ---------- */
  if (header && 'IntersectionObserver' in window) {
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none;';
    document.body.insertBefore(sentinel, document.body.firstChild);
    new IntersectionObserver(function (entries) {
      header.classList.toggle('at-top', entries[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ---------- Mark the nav link for the section in the middle of the screen ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-desktop a[href^="#"]'));
  if (navLinks.length && 'IntersectionObserver' in window) {
    var inBand = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        inBand[entry.target.id] = entry.isIntersecting;
      });
      var active = null;
      navLinks.forEach(function (link) {
        if (!active && inBand[link.getAttribute('href').slice(1)]) active = link;
      });
      navLinks.forEach(function (link) {
        if (link === active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (link) {
      var section = document.getElementById(link.getAttribute('href').slice(1));
      if (section) spy.observe(section);
    });
  }

  /* ---------- Footer year ---------- */
  var year = String(new Date().getFullYear());
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = year;
  });
})();
