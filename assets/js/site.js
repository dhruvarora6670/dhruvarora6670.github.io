/* Dhruv Arora — portfolio behaviour.
   Theme toggle, mobile menu, header state over the hero, the hero's mouse trail, and the nav link
   for the section on screen. The page works without this file: the header stays solid and the
   toggles stay hidden. */
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

  /* ---------- Hero: the background dots glow behind the mouse, then fade ---------- */
  function startHeroTrail(hero) {
    var REACH = 96; // how far from the mouse the dots light up, in px
    var LAG_MS = 70; // how far the glow drifts behind the mouse
    var RISE_MS = 60; // how quickly a dot brightens
    var FADE_MS = 400; // how slowly a dot dims
    var GROWTH = 1.2; // extra dot radius at full brightness, in px

    var spacing = parseFloat(getComputedStyle(hero).backgroundSize);
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var lit = {}; // the dots glowing right now, by grid position
    var mouse = null;
    var head = null; // the moving end of the trail, easing towards the mouse
    var lastScroll = 0;
    var lastFrame = 0;
    var running = false;

    canvas.className = 'hero-trail';
    canvas.setAttribute('aria-hidden', 'true');
    hero.insertBefore(canvas, hero.firstChild);

    function prepareCanvas() {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var width = Math.round(hero.clientWidth * ratio);
      var height = Math.round(hero.clientHeight * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = getComputedStyle(hero).getPropertyValue('--accent').trim();
    }

    // Lights the dots near the line the trail just travelled, brightest along its centre.
    function lightDotsAlong(x0, y0, x1, y1) {
      var dx = x1 - x0;
      var dy = y1 - y0;
      var lengthSq = dx * dx + dy * dy;
      var firstCol = Math.max(0, Math.floor((Math.min(x0, x1) - REACH) / spacing));
      var lastCol = Math.ceil((Math.max(x0, x1) + REACH) / spacing);
      var firstRow = Math.max(0, Math.floor((Math.min(y0, y1) - REACH) / spacing));
      var lastRow = Math.ceil((Math.max(y0, y1) + REACH) / spacing);

      for (var col = firstCol; col <= lastCol; col++) {
        for (var row = firstRow; row <= lastRow; row++) {
          var x = (col + 0.5) * spacing;
          var y = (row + 0.5) * spacing;
          var along = lengthSq ? Math.min(1, Math.max(0, ((x - x0) * dx + (y - y0) * dy) / lengthSq)) : 0;
          var offX = x - (x0 + dx * along);
          var offY = y - (y0 + dy * along);
          var closeness = 1 - (offX * offX + offY * offY) / (REACH * REACH);
          if (closeness <= 0) continue;
          var key = col + ',' + row;
          var dot = lit[key] || (lit[key] = { x: x, y: y, target: 0, level: 0 });
          dot.target = Math.max(dot.target, closeness * closeness);
        }
      }
    }

    function drawFrame(now) {
      var elapsed = lastFrame ? Math.min(now - lastFrame, 50) : 16;
      lastFrame = now;

      var moving = false;
      if (mouse) {
        var ease = 1 - Math.exp(-elapsed / LAG_MS);
        var x = head.x + (mouse.x - head.x) * ease;
        var y = head.y + (mouse.y - head.y) * ease;
        moving = Math.abs(mouse.x - x) + Math.abs(mouse.y - y) > 0.1;
        if (moving) lightDotsAlong(head.x, head.y, x, y);
        head = { x: x, y: y };
      }

      var rise = 1 - Math.exp(-elapsed / RISE_MS);
      var fade = Math.exp(-elapsed / FADE_MS);
      var glowing = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var key in lit) {
        var dot = lit[key];
        dot.target *= fade;
        dot.level += (dot.target - dot.level) * rise;
        if (dot.target < 0.01 && dot.level < 0.01) {
          delete lit[key];
          continue;
        }
        glowing = true;
        ctx.globalAlpha = dot.level;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1 + dot.level * GROWTH, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stops completely once everything has faded: nothing runs while the mouse is still.
      if (moving || glowing) {
        window.requestAnimationFrame(drawFrame);
      } else {
        running = false;
        lastFrame = 0;
      }
    }

    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var box = hero.getBoundingClientRect();
      mouse = { x: e.clientX - box.left, y: e.clientY - box.top };
      // A scroll moves the page under a still mouse. Start from here instead of drawing a line.
      if (!head || window.pageYOffset !== lastScroll) head = { x: mouse.x, y: mouse.y };
      lastScroll = window.pageYOffset;
      if (!running) {
        running = true;
        prepareCanvas();
        window.requestAnimationFrame(drawFrame);
      }
    });

    hero.addEventListener('pointerleave', function () {
      mouse = null;
      head = null;
    });
  }

  var heroSection = document.getElementById('top');
  if (heroSection && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    startHeroTrail(heroSection);
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
