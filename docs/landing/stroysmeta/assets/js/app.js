/* СтройСмета — демо-лендинг. Вся логика в одном файле, без зависимостей. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nf = new Intl.NumberFormat('ru-RU');
  var money = function (v) { return nf.format(Math.round(v)) + ' ₽'; };
  var money100 = function (v) { return nf.format(Math.round(v / 100) * 100) + ' ₽'; };
  var dec = function (v) { return String(v).replace('.', ','); };

  /* ---------------------------------------------------------------- данные */
  var TECH = {
    gazobeton:  { title: 'Газобетон',  mat: 'Газобетон D500',            unit: 'м³', price: 7800,  qty: 107, work: 'Кладка блока',        wprice: 4800 },
    keramoblok: { title: 'Керамоблок', mat: 'Керамоблок 44 Porotherm',   unit: 'м³', price: 9600,  qty: 107, work: 'Кладка керамоблока',  wprice: 5400 },
    karkas:     { title: 'Каркас',     mat: 'Стойка 200×50 + минвата',   unit: 'м²', price: 3450,  qty: 286, work: 'Сборка каркаса',      wprice: 2100 },
    monolit:    { title: 'Монолит',    mat: 'Бетон B25 + арматура',      unit: 'м³', price: 11200, qty: 64,  work: 'Опалубка и заливка',  wprice: 7300 }
  };
  var PLANS = {
    free:     { title: 'Бесплатный',  month: 0,     year: 0 },
    standard: { title: 'Стандартный', month: 5000,  year: 4000 },
    full:     { title: 'Полный',      month: 10000, year: 8000 }
  };
  var ROWS = [
    { key: 'tech',    label: 'Технология',      step: 'шаг 2', fmt: function (v) { return TECH[v] ? TECH[v].title : ''; } },
    { key: 'area',    label: 'Типовой объект',  step: 'шаг 1', fmt: function (v) { return v + ' м²'; } },
    { key: 'renders', label: 'Рендеры клиенту', step: 'шаг 3', fmt: function (v) { return v ? 'Да, пакет генераций' : 'Не нужны'; } },
    { key: 'volume',  label: 'Смет в месяц',    step: 'шаг 4', fmt: function (v) { return v + ' шт'; } },
    { key: 'plan',    label: 'Тариф',           step: 'шаг 5', fmt: function (v) { return PLANS[v].title; } }
  ];

  var KEY = 'stroysmeta.raschet.v1';
  var state = { tech: 'gazobeton', area: null, renders: null, volume: null, plan: null, period: 'month' };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      Object.keys(state).forEach(function (k) { if (saved[k] !== undefined) state[k] = saved[k]; });
    }
  } catch (e) { /* приватный режим — работаем без сохранения */ }
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  /* ------------------------------------------------------- плавная прокрутка */
  function scrollToSel(sel) {
    var el = $(sel); if (!el) return;
    var off = 68 + (chipnav && chipnav.classList.contains('is-on') ? 46 : 0);
    var top = el.getBoundingClientRect().top + window.pageYOffset - off;
    window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-scroll]');
    if (t) { e.preventDefault(); scrollToSel(t.getAttribute('data-scroll')); return; }
    var a = e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href').length > 1 && !a.hasAttribute('data-modal-close')) {
      e.preventDefault(); scrollToSel(a.getAttribute('href'));
    }
  });

  /* ------------------------------------------------ вертикальная навигация */
  var sections = $$('section[data-nav]');
  var railNav = $('#railNav'), chipnav = $('#chipnav');
  var railItems = [], chipItems = [];

  sections.forEach(function (sec, i) {
    var no = ('0' + (i + 1)).slice(-2);
    var b = document.createElement('button');
    b.className = 'rail__item'; b.type = 'button';
    b.setAttribute('aria-current', i === 0 ? 'true' : 'false');
    b.innerHTML = '<span class="rail__idx num">' + no + '</span><span class="rail__dot"></span>' +
                  '<span class="rail__label">' + sec.getAttribute('data-nav') + '</span>';
    b.addEventListener('click', function () { scrollToSel('#' + sec.id); });
    railNav.appendChild(b); railItems.push(b);

    var a = document.createElement('a');
    a.href = '#' + sec.id; a.textContent = sec.getAttribute('data-nav');
    a.setAttribute('aria-current', i === 0 ? 'true' : 'false');
    chipnav.appendChild(a); chipItems.push(a);
  });

  var railFill = $('#railFill'), railPct = $('#railPct'), progFill = $('#progFill');
  var crumbNo = $('#crumbNo'), crumbTxt = $('#crumbTxt'), topbar = $('#topbar');
  var activeIdx = -1;

  function setActive(i) {
    if (i === activeIdx) return;
    activeIdx = i;
    railItems.forEach(function (b, n) { b.setAttribute('aria-current', n === i ? 'true' : 'false'); });
    chipItems.forEach(function (b, n) {
      b.setAttribute('aria-current', n === i ? 'true' : 'false');
      if (n === i && chipnav.classList.contains('is-on')) {
        chipnav.scrollTo({ left: Math.max(0, b.offsetLeft - 60), behavior: reduce ? 'auto' : 'smooth' });
      }
    });
    crumbNo.textContent = ('0' + (i + 1)).slice(-2);
    crumbTxt.textContent = sections[i].getAttribute('data-nav');
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      var y = window.pageYOffset;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, y / h)) : 0;
      progFill.style.width = (p * 100).toFixed(2) + '%';
      if (railPct) railPct.textContent = Math.round(p * 100) + '%';
      if (railFill) {
        var track = railFill.parentNode.querySelector('.rail__track');
        if (track) railFill.style.height = (track.offsetHeight * p) + 'px';
      }
      topbar.classList.toggle('is-stuck', y > 12);
      chipnav.classList.toggle('is-on', y > window.innerHeight * 0.5);

      var mid = y + window.innerHeight * 0.35, cur = 0;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= mid) cur = i;
      }
      setActive(cur);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* -------------------------------------------------- появление при скролле */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        if (en.target.hasAttribute('data-count')) runCount(en.target);
        if (en.target.hasAttribute('data-meter')) {
          en.target.querySelector('i').style.width = en.target.getAttribute('data-meter') + '%';
        }
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
    $$('.rv,.step,.wall,.checks,[data-count],[data-meter]').forEach(function (el) { io.observe(el); });
  } else {
    $$('.rv,.step,.wall,.checks').forEach(function (el) { el.classList.add('in'); });
  }

  function runCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduce) { el.textContent = nf.format(target); return; }
    var t0 = null, dur = 900;
    function tick(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      el.textContent = nf.format(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ----------------------------------------------------- ползунки: заливка */
  function paintRange(r) {
    var min = parseFloat(r.min), max = parseFloat(r.max), v = parseFloat(r.value);
    r.style.setProperty('--fill', ((v - min) / (max - min) * 100).toFixed(1) + '%');
  }
  $$('input[type=range]').forEach(function (r) {
    paintRange(r);
    r.addEventListener('input', function () { paintRange(r); });
  });

  /* ================================================================ ДОК */
  var dock = $('#dock'), dockRows = $('#dockRows'), dockTotal = $('#dockTotal'), dockSub = $('#dockSub');
  var ringFg = $('#ringFg'), ringTxt = $('#ringTxt'), miniVal = $('#miniTotalVal');
  var summaryRows = $('#summaryRows'), sumTotal = $('#sumTotal'), sumFilled = $('#sumFilled'), doneRows = $('#doneRows');
  var C = 2 * Math.PI * 14.5;

  function rowHTML(r, filled) {
    return '<div class="dock__row' + (filled ? '' : ' dock__row--empty') + '">' +
      '<dt><span class="dock__tick"></span>' + r.label + '</dt>' +
      '<dd>' + (filled ? r.fmt(state[r.key]) : '— ' + r.step) + '</dd></div>';
  }

  function planPrice() {
    if (!state.plan) return null;
    return PLANS[state.plan][state.period];
  }

  function renderDock(pulse) {
    var filled = 0, html = '';
    ROWS.forEach(function (r) {
      var ok = state[r.key] !== null && state[r.key] !== undefined;
      if (ok) filled++;
      html += rowHTML(r, ok);
    });
    dockRows.innerHTML = html;
    if (summaryRows) summaryRows.innerHTML = html;
    if (doneRows) doneRows.innerHTML = html;
    if (sumFilled) sumFilled.textContent = filled;

    var pct = filled / ROWS.length;
    ringFg.setAttribute('stroke-dasharray', C.toFixed(1));
    ringFg.setAttribute('stroke-dashoffset', (C * (1 - pct)).toFixed(1));
    ringTxt.textContent = Math.round(pct * 100) + '%';

    var p = planPrice();
    var per = state.period === 'year' ? ' / мес, оплата за год' : ' / мес';
    var txt = p === null ? 'тариф не выбран' : (p === 0 ? '0 ₽' : money(p));
    dockTotal.textContent = txt;
    var mini = $('#miniTotal');
    if (mini) {
      mini.hidden = p === null;
      if (p !== null) miniVal.textContent = p === 0 ? '0 ₽' : money(p);
    }
    if (sumTotal) sumTotal.textContent = (p === null ? 'выберите тариф' : (p === 0 ? '0 ₽' + per : money(p) + per));

    var left = ROWS.length - filled;
    dockSub.textContent = left === 0
      ? 'Готов. Осталось указать почту.'
      : filled + ' из ' + ROWS.length + ' · ' +
        (filled === 1 ? 'собирается, пока вы читаете'
                      : 'ещё ' + left + ' ' + (left === 1 ? 'шаг' : left < 5 ? 'шага' : 'шагов'));

    if (pulse && !reduce) {
      dock.classList.remove('dock__pulse');
      void dock.offsetWidth;
      dock.classList.add('dock__pulse');
    }
    save();
  }

  function setSlot(key, value) {
    var was = state[key] !== null && state[key] !== undefined;
    state[key] = value;
    renderDock(!was);
  }

  $('#dockToggle').addEventListener('click', function () {
    setCollapsed(!dock.classList.contains('is-collapsed'));
  });
  $('#dockReset').addEventListener('click', function () {
    state.area = null; state.renders = null; state.volume = null; state.plan = null;
    state.tech = 'gazobeton'; state.period = 'month';
    $$('#techSeg button').forEach(function (b, i) { b.setAttribute('aria-selected', i === 0 ? 'true' : 'false'); });
    applyTech('gazobeton');
    $$('#plans .plan').forEach(function (p) { p.setAttribute('data-picked', 'false'); });
    renderDock(false);
    setCollapsed(false);
  });
  $('#miniTotal').addEventListener('click', function () {
    setCollapsed(false);
    dock.classList.add('dock__pulse');
    setTimeout(function () { dock.classList.remove('dock__pulse'); }, 1000);
  });

  function setCollapsed(on) {
    dock.classList.toggle('is-collapsed', on);
    $('#dockToggle').setAttribute('aria-expanded', String(!on));
  }

  if ('IntersectionObserver' in window) {
    /* прячем док, когда на экране финальная сводка — она дублирует его содержимое */
    new IntersectionObserver(function (e) {
      dock.classList.toggle('is-hidden', e[0].isIntersecting);
    }, { threshold: 0.14 }).observe($('#zayavka'));

    /* Секции с собственной панелью справа (смета в первом экране, третья
       карточка тарифов) док бы перекрыл. На них он сворачивается в полоску:
       кольцо прогресса видно, содержимое не мешает. На узком экране обратно
       сам не разворачивается — там он занял бы половину экрана. */
    var onScreen = [];
    var fo = new IntersectionObserver(function (list) {
      list.forEach(function (e) {
        var i = onScreen.indexOf(e.target);
        if (e.isIntersecting && i < 0) onScreen.push(e.target);
        if (!e.isIntersecting && i >= 0) onScreen.splice(i, 1);
      });
      /* сворачиваем сами, разворачиваем — только по клику пользователя:
         фиксированная панель не должна закрывать контент без его просьбы */
      if (onScreen.length) setCollapsed(true);
    }, { threshold: 0.25 });
    $$('[data-dock-fold]').forEach(function (el) { fo.observe(el); });
  }

  /* =============================================== hero: площадь и смета */
  var areaRange = $('#areaRange'), areaVal = $('#areaVal'), estArea = $('#estArea');
  var estTotal = $('#estTotal'), chipArea = $('#chipArea'), phonePrice = $('#phonePrice');
  var estRows = $$('#hero .tbl tbody tr');

  function recalcEstimate(area) {
    var total = 0;
    estRows.forEach(function (tr) {
      var sumCell = tr.querySelector('[data-sum]');
      if (!sumCell) return;
      var rate = parseFloat(sumCell.getAttribute('data-sum'));
      var volCell = tr.querySelector('[data-vol]');
      var k = volCell ? parseFloat(volCell.getAttribute('data-vol')) : 1;
      /* объём округляем до целых метров, сумму — до сотен рублей, и складываем
         уже округлённые строки: столбец в смете обязан сходиться */
      var v = Math.round(area * k);
      if (volCell) volCell.textContent = v + ' м²';
      var sum = Math.round(v * rate / 100) * 100;
      total += sum;
      sumCell.textContent = money(sum);
    });
    estTotal.textContent = money(total);
    if (phonePrice) phonePrice.textContent = money(total);
    if (estArea) estArea.textContent = area;
    if (chipArea) chipArea.textContent = area;
  }

  areaRange.addEventListener('input', function () {
    var v = parseInt(this.value, 10);
    areaVal.textContent = v;
    recalcEstimate(v);
  });
  areaRange.addEventListener('change', function () { setSlot('area', parseInt(this.value, 10)); });
  if (state.area) { areaRange.value = state.area; paintRange(areaRange); areaVal.textContent = state.area; }
  recalcEstimate(parseInt(areaRange.value, 10));

  /* ================================================= технология и раздел */
  var matName = $('#matName'), matQty = $('#matQty'), matUnit = $('#matUnit'), matPrice = $('#matPrice'),
      matSum = $('#matSum'), workName = $('#workName'), workQty = $('#workQty'), workUnit = $('#workUnit'),
      workPrice = $('#workPrice'), workSum = $('#workSum'), secTotal = $('#secTotal'), chipTech = $('#chipTech');

  function recalcSection() {
    var t = TECH[state.tech];
    var q = Math.max(1, Math.min(600, parseInt(matQty.value, 10) || 1));
    matSum.textContent = money(q * t.price);
    workQty.textContent = q;
    workSum.textContent = money(q * t.wprice);
    secTotal.textContent = money(q * (t.price + t.wprice));
  }
  function applyTech(k) {
    var t = TECH[k];
    matName.textContent = t.mat; matUnit.textContent = t.unit; matPrice.textContent = money(t.price);
    workName.textContent = t.work; workUnit.textContent = t.unit; workPrice.textContent = money(t.wprice);
    matQty.value = t.qty;
    if (chipTech) chipTech.textContent = t.title;
    recalcSection();
  }
  $$('#techSeg button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('#techSeg button').forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
      b.setAttribute('aria-selected', 'true');
      var k = b.getAttribute('data-tech');
      applyTech(k);
      setSlot('tech', k);
    });
  });
  matQty.addEventListener('input', recalcSection);
  matQty.addEventListener('blur', function () {
    var q = parseInt(this.value, 10);
    if (!q || q < 1) this.value = TECH[state.tech].qty;
    recalcSection();
  });
  $$('#techSeg button').forEach(function (b) {
    b.setAttribute('aria-selected', String(b.getAttribute('data-tech') === state.tech));
  });
  applyTech(state.tech);

  /* ========================================================= визуализация */
  var vizCaption = $('#vizCaption'), promptTxt = $('#promptTxt');
  var CAPS = { day: 'Главный фасад · дневной свет', evening: 'Терраса · синий час', drone: 'Дом и участок · съёмка с дрона' };
  function setView(view) {
    $$('#vizFrame img').forEach(function (im) { im.classList.toggle('is-on', im.getAttribute('data-view') === view); });
    $$('.viz__thumb').forEach(function (t) { t.setAttribute('aria-selected', String(t.getAttribute('data-view') === view)); });
    $$('.preset').forEach(function (p) {
      var on = p.getAttribute('data-view') === view;
      p.setAttribute('aria-pressed', String(on));
      if (on) promptTxt.textContent = p.getAttribute('data-prompt');
    });
    vizCaption.textContent = CAPS[view] || '';
  }
  $$('.viz__thumb,.preset').forEach(function (el) {
    el.addEventListener('click', function () { setView(el.getAttribute('data-view')); });
  });

  var rt = $('#rendersToggle');
  rt.addEventListener('change', function () { setSlot('renders', this.checked); });
  if (state.renders !== null) rt.checked = !!state.renders;

  /* ============================================================ ассистент */
  var qaAnswer = $('#qaAnswer');
  $$('.qa__q').forEach(function (q) {
    q.addEventListener('click', function () {
      var on = q.getAttribute('aria-pressed') === 'true';
      $$('.qa__q').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      if (on) { qaAnswer.hidden = true; qaAnswer.classList.remove('in'); return; }
      q.setAttribute('aria-pressed', 'true');
      qaAnswer.innerHTML = q.getAttribute('data-a');
      qaAnswer.hidden = false;
      requestAnimationFrame(function () { qaAnswer.classList.add('in'); });
    });
  });

  /* ============================================================ варианты */
  var VNOTE = {
    base: '<b>Базовый:</b> холодный чердак, окна с однокамерным стеклопакетом, черновая разводка инженерии. На 950 000 ₽ дешевле комфорта.',
    comfort: '<b>Комфорт:</b> тёплая кровля, двухкамерные стеклопакеты, разводка инженерии, черновая отделка. Разница с базовым — 950 000 ₽.',
    premium: '<b>Премиум:</b> фальцевая кровля, панорамное остекление, тёплые полы по первому этажу, благоустройство. На 2 510 000 ₽ дороже комфорта.'
  };
  var vnote = $('#variantNote');
  $$('.variant').forEach(function (v) {
    v.addEventListener('click', function () {
      $$('.variant').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      v.setAttribute('aria-pressed', 'true');
      vnote.innerHTML = VNOTE[v.getAttribute('data-variant')];
    });
  });

  /* ======================================================== ваша математика */
  var cntR = $('#cntRange'), hrsR = $('#hrsRange'), chkR = $('#chkRange');
  var cntV = $('#cntVal'), hrsV = $('#hrsVal'), chkV = $('#chkVal');
  var fCnt = $('#fCnt'), fHrs = $('#fHrs'), fTot = $('#fTot');
  var resHours = $('#resHours'), resDeal = $('#resDeal'), resYear = $('#resYear');

  function recalcMath() {
    var c = parseInt(cntR.value, 10), h = parseFloat(hrsR.value), m = parseFloat(chkR.value);
    var hours = Math.round(c * h);
    cntV.textContent = c; hrsV.textContent = dec(h); chkV.textContent = dec(m.toFixed(1));
    fCnt.textContent = c; fHrs.textContent = dec(h); fTot.textContent = hours;
    resHours.textContent = hours;
    resDeal.textContent = dec(m.toFixed(1)) + ' млн ₽';
    resYear.textContent = nf.format(hours * 12) + ' часов';
  }
  [cntR, hrsR, chkR].forEach(function (r) { r.addEventListener('input', recalcMath); });
  cntR.addEventListener('change', function () { setSlot('volume', parseInt(this.value, 10)); });
  if (state.volume) { cntR.value = state.volume; paintRange(cntR); }
  recalcMath();

  /* =============================================================== тарифы */
  function renderPrices() {
    Object.keys(PLANS).forEach(function (k) {
      var el = $('[data-price-' + k + ']');
      if (!el) return;
      var p = PLANS[k][state.period];
      el.textContent = p === 0 ? '0 ₽' : money(p);
      var per = el.nextElementSibling;
      if (per) per.textContent = state.period === 'year' ? '/ мес, оплата за год' : '/ месяц';
    });
  }
  $$('#periodSeg button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('#periodSeg button').forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
      b.setAttribute('aria-selected', 'true');
      state.period = b.getAttribute('data-period');
      renderPrices(); renderDock(false);
    });
  });
  $$('[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-pick');
      $$('#plans .plan').forEach(function (p) {
        p.setAttribute('data-picked', String(p.getAttribute('data-plan') === k));
      });
      setSlot('plan', k);
      b.blur();
      scrollToSel('#zayavka');
    });
  });
  if (state.plan) {
    $$('#plans .plan').forEach(function (p) {
      p.setAttribute('data-picked', String(p.getAttribute('data-plan') === state.plan));
    });
  }
  $$('#periodSeg button').forEach(function (b) {
    b.setAttribute('aria-selected', String(b.getAttribute('data-period') === state.period));
  });
  renderPrices();

  /* матрица отличий */
  var mTog = $('.matrix-tog'), mBody = $('#matrixBody');
  mTog.addEventListener('click', function () {
    var open = mTog.getAttribute('aria-expanded') === 'true';
    mTog.setAttribute('aria-expanded', String(!open));
    mBody.style.maxHeight = open ? '0px' : mBody.scrollHeight + 'px';
    mTog.firstChild.textContent = open ? 'Показать все отличия построчно' : 'Свернуть таблицу';
  });

  /* ================================================================= FAQ */
  $$('.acc__q').forEach(function (q) {
    var panel = q.nextElementSibling;
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') === 'true';
      $$('.acc__q').forEach(function (x) {
        if (x !== q) { x.setAttribute('aria-expanded', 'false'); x.nextElementSibling.style.maxHeight = '0px'; }
      });
      q.setAttribute('aria-expanded', String(!open));
      panel.style.maxHeight = open ? '0px' : panel.scrollHeight + 'px';
    });
  });

  /* ============================================================== модалка */
  var modal = $('#modal'), lastFocus = null;
  function openModal() {
    lastFocus = document.activeElement;
    modal.hidden = false; modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    $('.modal__x', modal).focus();
  }
  function closeModal() {
    modal.classList.remove('is-open'); modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-modal-open]').forEach(function (b) { b.addEventListener('click', openModal); });
  $$('[data-modal-close]').forEach(function (b) { b.addEventListener('click', closeModal); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    if (e.key === 'Tab' && modal.classList.contains('is-open')) {
      var f = $$('button,a[href],input', modal).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ================================================================ форма */
  var form = $('#theForm'), wrapForm = $('#leadForm');
  var s1 = $('[data-step="1"]', form), s2 = $('[data-step="2"]', form);
  var email = $('#email'), name = $('#name'), agree = $('#agree');
  var fEmail = $('#fEmail'), fName = $('#fName'), agreeErr = $('#agreeErr');
  var stepNo = $('#stepNo'), bar2 = $('#bar2');

  var emailRe = /^[^\s@]+@[^\s@]+\.[a-zа-я]{2,}$/i;
  function setErr(field, on, msg) {
    field.classList.toggle('is-err', on);
    var input = field.querySelector('input');
    if (input) input.setAttribute('aria-invalid', String(on));
    if (msg) { var t = field.querySelector('[data-err-text]'); if (t) t.textContent = msg; }
  }
  function validEmail(silent) {
    var v = email.value.trim();
    var ok = emailRe.test(v);
    if (!silent) setErr(fEmail, !ok, v === '' ? 'Без почты мы не сможем прислать стенд' : 'Проверьте адрес — похоже, в нём опечатка');
    return ok;
  }
  email.addEventListener('blur', function () { if (email.value.trim() !== '') validEmail(false); });
  email.addEventListener('input', function () { if (fEmail.classList.contains('is-err') && emailRe.test(email.value.trim())) setErr(fEmail, false); });
  name.addEventListener('blur', function () { if (name.value.trim() !== '') setErr(fName, false); });
  name.addEventListener('input', function () { if (fName.classList.contains('is-err') && name.value.trim().length > 1) setErr(fName, false); });
  agree.addEventListener('change', function () { if (agree.checked) agreeErr.style.display = 'none'; });

  $('#toStep2').addEventListener('click', function () {
    var okMail = validEmail(false);
    var okAgree = agree.checked;
    agreeErr.style.display = okAgree ? 'none' : 'flex';
    if (!okMail) { email.focus(); return; }
    if (!okAgree) { agree.focus(); return; }
    s1.hidden = true; s2.hidden = false;
    stepNo.textContent = '2'; bar2.classList.add('on');
    name.focus();
  });
  $('#backStep1').addEventListener('click', function () {
    s2.hidden = true; s1.hidden = false;
    stepNo.textContent = '1'; bar2.classList.remove('on');
    email.focus();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (name.value.trim().length < 2) { setErr(fName, true, 'Напишите имя — так письмо будет не от робота'); name.focus(); return; }
    var btn = $('#submitBtn');
    btn.classList.add('is-loading');
    btn.setAttribute('aria-disabled', 'true');
    setTimeout(function () {
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-disabled');
      wrapForm.classList.add('is-done');
      $('#doneTxt').textContent = 'Стенд собирается. Письмо со ссылкой уйдёт на ' + email.value.trim() +
        (name.value.trim() ? ', ' + name.value.trim() + '.' : '.');
      renderDock(false);
      wrapForm.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }, 950);
  });

  /* ============================================================ конвейер */
  $$('#pipe .pipe__step').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('#pipe .pipe__step').forEach(function (x) { x.setAttribute('aria-current', 'false'); });
      b.setAttribute('aria-current', 'true');
    });
  });

  /* ================================================================ старт */
  /* стартовое состояние — свёрнут (в разметке), первый экран его не разворачивает */
  setView('day');
  renderDock(false);
})();
