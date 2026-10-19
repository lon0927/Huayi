/* ===========================================================
   花忆动漫社 · 脚本（首页 + 活动档案页通用）
   原生 JS，无依赖
   =========================================================== */
(function () {
  'use strict';

  var header = document.getElementById('site-header');
  var nav = document.getElementById('site-nav');
  var menuToggle = document.getElementById('menu-toggle');
  var toTop = document.getElementById('to-top');
  var form = document.getElementById('contact-form');
  var formNote = document.getElementById('form-note');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 移动端菜单 ---------- */
  function closeMenu() {
    if (!nav || !menuToggle) return;
    nav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开菜单');
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || menuToggle.contains(e.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------- 滚动状态 ---------- */
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (toTop) toTop.classList.toggle('is-visible', y > 500);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }, { passive: true });

  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 进场动画 ---------- */
  var revealTargets = document.querySelectorAll(
    '.section-head, .about-figure, .about-text, .stat, .card, .gallery figure, .record, .timeline li, .contact-card, .contact-form'
  );

  if (!reduceMotion && 'IntersectionObserver' in window && revealTargets.length) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });

    Array.prototype.forEach.call(revealTargets, function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = Math.min(i % 4, 3) * 60 + 'ms';
      revealer.observe(el);
    });
  }

  /* ---------- 联系表单（纯前端，没有后端） ---------- */
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.querySelector('#name');
      var contact = form.querySelector('#email');
      var message = form.querySelector('#message');
      var fields = [name, contact, message];

      var empty = fields.filter(function (el) {
        return el && !el.value.trim();
      });

      formNote.classList.remove('is-error');

      if (empty.length) {
        formNote.textContent = '还有内容没填完，检查一下吧。';
        formNote.classList.add('is-error');
        if (empty[0]) empty[0].focus();
        return;
      }

      /* 没有服务器：这里只做前端反馈。
         以后接后端，把下面这句换成 fetch() 提交即可。 */
      formNote.textContent = '收到啦，' + name.value.trim() + '！我们会尽快回复你。';
      form.reset();
    });
  }
})();
