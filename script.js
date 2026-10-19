/* ============================================================
   花忆动漫社 · 站点脚本
   原生 JS，无依赖；Chromium / Edge 优先
   模块：菜单 / 滚动状态 / 活动档案切换 / 灯箱 / 进场动画 / 表单校验
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. 头部滚动态 + 回到顶部
     --------------------------------------------------------- */
  var header = document.getElementById('site-header');
  var toTop = document.getElementById('to-top');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (toTop) toTop.classList.toggle('is-visible', y > 480);
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

  /* ---------------------------------------------------------
     2. 移动端菜单
     --------------------------------------------------------- */
  var nav = document.getElementById('site-nav');
  var menuToggle = document.getElementById('menu-toggle');

  function closeMenu() {
    if (!nav || !menuToggle) return;
    nav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开导航菜单');
  }

  if (nav && menuToggle) {
    menuToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------------------------------------------------------
     3. 活动档案：单页内多活动切换（ARIA tablist）
     --------------------------------------------------------- */
  (function archive() {
    var root = document.querySelector('[data-archive]');
    if (!root) return;

    var tabs = [].slice.call(root.querySelectorAll('[role="tab"]'));
    var panels = [].slice.call(root.querySelectorAll('[role="tabpanel"]'));
    if (!tabs.length || tabs.length !== panels.length) return;

    var status = document.getElementById('act-status');
    var narrow = window.matchMedia('(max-width: 900px)');
    var current = -1;

    function keyOf(el) { return el.getAttribute('data-act'); }

    function indexFromHash() {
      var id = location.hash.slice(1);
      if (!id) return -1;
      for (var i = 0; i < panels.length; i++) {
        if (keyOf(panels[i]) === id) return i;
      }
      return -1;
    }

    function activate(i) {
      if (i < 0 || i >= panels.length || i === current) return;
      current = i;

      tabs.forEach(function (t, j) {
        var on = j === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });

      panels.forEach(function (p, j) {
        p.classList.toggle('is-active', j === i);
      });

      if (status) {
        var name = tabs[i].querySelector('.t');
        status.textContent = '已切换到：' + (name ? name.textContent.trim() : '第 ' + (i + 1) + ' 场');
      }
    }

    function writeHash(i, replace) {
      var id = '#' + keyOf(panels[i]);
      if (location.hash === id) return;
      try {
        if (replace) history.replaceState(null, '', id);
        else history.pushState(null, '', id);
      } catch (err) { /* 个别环境禁止改 URL，忽略 */ }
    }

    function ensureVisible(i) {
      var el = panels[i];
      if (!el) return;
      var top = el.getBoundingClientRect().top;
      var hh = header ? header.offsetHeight : 0;
      if (top >= hh + 12 && top <= window.innerHeight * 0.6) return;
      el.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function (e) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        activate(i);
        writeHash(i, false);
        if (narrow.matches) ensureVisible(i);
      });
    });

    var tablist = root.querySelector('[role="tablist"]');
    var step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };

    if (tablist) {
      tablist.addEventListener('keydown', function (e) {
        var tab = e.target.closest('[role="tab"]');
        if (!tab) return;
        var i = tabs.indexOf(tab);
        if (i < 0) return;

        var next = -1;
        if (e.key in step) next = (i + step[e.key] + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(i);
          writeHash(i, false);
          return;
        } else return;

        e.preventDefault();
        activate(next);
        writeHash(next, true);
        tabs[next].focus({ preventScroll: true });
        ensureVisible(next);
      });
    }

    window.addEventListener('popstate', function () {
      var i = indexFromHash();
      if (i > -1) activate(i);
    });
    window.addEventListener('hashchange', function () {
      var i = indexFromHash();
      if (i > -1) activate(i);
    });

    var start = indexFromHash();
    activate(start > -1 ? start : 0);
    if (start > -1) ensureVisible(start);
  })();

  /* ---------------------------------------------------------
     4. 灯箱（影集 / 图片墙）
     --------------------------------------------------------- */
  (function lightbox() {
    var box = document.getElementById('lightbox');
    if (!box) return;

    var img = box.querySelector('img');
    var cap = box.querySelector('.lb-cap');
    var closeBtn = box.querySelector('.lb-close');
    var lastFocus = null;

    function open(href, caption, alt) {
      lastFocus = document.activeElement;
      img.src = href;
      img.alt = alt || '';
      if (cap) cap.textContent = caption || '';
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      box.hidden = true;
      document.body.style.overflow = '';
      img.src = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[data-lightbox]');
      if (!link) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      open(link.getAttribute('href'), link.getAttribute('data-caption'), link.getAttribute('data-alt'));
    });

    if (closeBtn) closeBtn.addEventListener('click', close);

    box.addEventListener('click', function (e) {
      if (e.target === box) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !box.hidden) close();
    });
  })();

  /* ---------------------------------------------------------
     5. 进场动画
     --------------------------------------------------------- */
  (function reveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    var targets = document.querySelectorAll(
      '.section-head, .stats, .card, .brief, .wall, .act-figure, .steps li, .dept figure, .team article, .timeline li, .next-up, .gal-group'
    );
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });

    [].forEach.call(targets, function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = Math.min(i % 4, 3) * 60 + 'ms';
      io.observe(el);
    });
  })();

  /* ---------------------------------------------------------
     6. 报名表单：只做校验 + 组装邮件（站点没有后端）
     --------------------------------------------------------- */
  (function joinForm() {
    var form = document.getElementById('join-form');
    if (!form) return;

    var note = document.getElementById('form-note');
    var MAIL = form.getAttribute('data-mailto') || '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.querySelector('#name');
      var contact = form.querySelector('#contact');
      var dept = form.querySelector('#dept');
      var msg = form.querySelector('#message');
      var fields = [name, contact, msg];

      var empty = fields.filter(function (el) { return !el.value.trim(); });

      if (note) {
        note.classList.remove('is-error');
        note.textContent = '';
      }

      if (empty.length) {
        if (note) {
          note.textContent = '还有' + (empty.length > 1 ? '几项' : '一项') + '没填：' + empty.map(function (el) {
            var lab = el.closest('.field');
            var span = lab ? lab.querySelector('span') : null;
            return span ? span.textContent.trim() : '必填项';
          }).join('、');
          note.classList.add('is-error');
        }
        empty[0].focus();
        return;
      }

      var body = [
        '姓名：' + name.value.trim(),
        '联系方式：' + contact.value.trim(),
        '意向部门：' + (dept && dept.value ? dept.value : '还没想好'),
        '',
        '想说的话：',
        msg.value.trim()
      ].join('\n');

      if (MAIL) {
        if (note) note.textContent = '正在打开邮件客户端……如果没有反应，就把信息直接发到社团邮箱。';
        window.location.href = 'mailto:' + MAIL +
          '?subject=' + encodeURIComponent('【入社报名】' + name.value.trim()) +
          '&body=' + encodeURIComponent(body);
        return;
      }

      /* 没有配置社团邮箱时：把整理好的内容复制到剪贴板，交给用户粘贴发送 */
      function done(ok) {
        if (!note) return;
        note.classList.remove('is-error');
        note.textContent = ok
          ? '报名信息已复制到剪贴板，粘贴发给现任负责人就算提交完成。'
          : '请把下面的内容复制后发给负责人：' + body.replace(/\n/g, ' / ');
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
  })();
})();
