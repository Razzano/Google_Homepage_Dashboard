// ==UserScript==
// @name         Google Homepage Dashboard
// @namespace    srazzano
// @version      2.5.0-alpha.2
// @description  Modernized Google with centered logo, wallpaper, date/digital time, resizeable analog clock + draggable containers
// @author       Sonny Razzano a.k.a. srazzano
// @match        https://www.google.com/*
// @match        https://google.com/*
// @exclude      https://www.google.com/search*
// @exclude      https://google.com/search*
// @exclude      https://www.google.com/maps*
// @icon         https://raw.githubusercontent.com/Razzano/Images/master/googleicon64.png
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(() => {

  'use strict';

  // ===========================================================================
  // NOTE: To open all Google App Links in new tabs, download Tampermonkey script:
  // https://github.com/Razzano/Google_App_Links/blob/main/Open_in_New_Tab.js
  // ===========================================================================

  // ===========================================================================
  // Google Homepage Dashboard Changelog
  // -----------------------------------
  // Version : 2.5.0-alpha.1
  // ✅ Renamed Object groups.
  // ✅ Added Settings helper.
  // ✅ Added State manager.
  // ✅ Beginning internal refactor.
  // ✅ No feature changes.
  // -----------------------------------
  // Version: 2.5.0-alpha.2
  // ✅ Implemented Settings helper.
  // ✅ Implemented State manager.
  // ✅ Removed global runtime variables.
  // ✅ Reorganized source into eight sections.
  // -----------------------------------
  // Version 2.5.0-alpha.3
  // ✅ Remove PNG day images
  // ✅ Create SVG Day Banner
  // ✅ Dynamic day text
  // ✅ Move date/time layout
  // ☐ Glass banner styling
  // ☐ Theme-aware colors
  // ☐ CSS style attributes
  // ☐ Final spacing adjustments
  // ☐ Code cleanup
  // ===========================================================================

  // ===========================================================================
  // GLOBAL CONSTANTS
  // ===========================================================================

  const BASE_SIZE = 334; // 314
  const DAY_ABBR = ['Sun.','Mon.','Tue.','Wed.','Thu.','Fri.','Sat.'];
  const DAY_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const IMAGE_COUNT = 18; // 17 images + zero
  const WALLPAPER_COUNT = 52;
  const WALLPAPER_MANUAL = 0;
  const WALLPAPER_HOURLY = 1;
  const WALLPAPER_DAILY = 2;
  const WALLPAPER_WEEKLY = 3;
  const WALLPAPER_MONTHLY = 4;
  const WALLPAPER_START_DATE = new Date(2026, 0, 1);
  WALLPAPER_START_DATE.setHours(0, 0, 0, 0);
  const _SECOND = 1000;
  const _SECONDS = 5000;
  const _aURL = 'https://raw.githubusercontent.com/Razzano/My_Images/master/';
  const _githubSite = 'https://raw.githubusercontent.com/Razzano/My_Wallpaper_Images/master/image';
  const body = document.body;

  // ===========================================================================
  // DOM HELPERS
  // ===========================================================================

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SVG_TAGS = new Set([
    'circle','defs','feDropShadow','feGaussianBlur','feMerge','feOffset','filter','foreignObject','g','image','line','linearGradient',
    'marker','path','polyline','polygon','radialGradient','rect','script','stop','style','svg','text','textPath','use'
  ]);

  const $el = (tag, props = {}, ...children) => {
    const isSVG = SVG_TAGS.has(tag);
    const el = isSVG
      ? document.createElementNS(SVG_NS, tag)
      : document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value == null) continue;
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
        continue;
      }
      if (key === 'className' || key === 'class') {
        el.setAttribute('class', Array.isArray(value) ? value.join(' ') : value);
        continue;
      }
      if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
        continue;
      }
      if (key === 'textContent') {
        el.textContent = value;
        continue;
      }
      if (isSVG) {
        el.setAttribute(key, value);
        continue;
      }
      if (key in el) {
        el[key] = value;
      } else {
        el.setAttribute(key, value);
    } }
    children.flat(Infinity).forEach(child => {
      if (child != null) el.append(child);
    });
    return el;
  };

  const $id = (id) => document.getElementById(id);
  const $q = (sel, ctx = document) => ctx?.querySelector(sel) ?? null;
  const $qa = (sel, ctx = document) => Array.from(ctx?.querySelectorAll(sel) ?? []);

  const getCurrentWallpaperNumber = () => {
    switch (Settings.get('wallpaperMode', WALLPAPER_MANUAL)) {
      case WALLPAPER_HOURLY:
        return getHourlyWallpaper();
      case WALLPAPER_DAILY:
        return getDailyWallpaper();
      case WALLPAPER_WEEKLY:
        return getWeeklyWallpaper();
      case WALLPAPER_MONTHLY:
        return getMonthlyWallpaper();
      default:
        return Settings.get('wallpaperImage', 0);
    }
  };

  const insertAfter = (newEl, refEl) => {
    if (!refEl || !refEl.parentNode) {
      console.warn('insertAfter: refEl is null or has no parentNode', refEl);
      return null;
    }
    refEl.after(newEl);
    return newEl;
  };

  const makeDraggable = (elmnt, storageKey, dragSelector = null) => {
    let startX, startY, startLeft, startTop;
    let isDragging = false;
    const dragMouseDown = (e) => {
      if (dragSelector) {
        if (!e.target.closest(dragSelector)) return;
      } else {
        if (e.target.closest('button,input,select,textarea,img,span')) return;
        if (e.target !== elmnt) return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      if (elmnt.style.position !== 'fixed') {
        const rect = elmnt.getBoundingClientRect();
        elmnt.style.position = 'fixed';
        elmnt.style.left = rect.left + 'px';
        elmnt.style.top = rect.top + 'px';
        elmnt.style.transform = 'none';
        elmnt.classList.add('dragged');
      }
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseFloat(elmnt.style.left) || 0;
      startTop = parseFloat(elmnt.style.top) || 0;
      isDragging = true;
      document.addEventListener('mousemove', elementDrag, { passive: false });
      document.addEventListener('mouseup', closeDragElement, { once: true });
    };
    const elementDrag = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = startLeft + dx;
      let newTop = startTop + dy;
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - elmnt.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - elmnt.offsetHeight));
      elmnt.style.left = `${newLeft}px`;
      elmnt.style.top = `${newTop}px`;
    };
    const closeDragElement = () => {
      isDragging = false;
      document.removeEventListener('mousemove', elementDrag);
      Settings.set(storageKey + '_top', elmnt.style.top);
      Settings.set(storageKey + '_left', elmnt.style.left);
    };
    elmnt.style.cursor = 'move';
    elmnt.style.userSelect = 'none';
    elmnt.addEventListener('mousedown', dragMouseDown);
  };

  const removeDupes = (className) => {
    const [first, ...dupes] = document.querySelectorAll('.' + className);
    dupes.forEach(el => el.remove());
  };

  const restorePosition = (el, key) => {
    const savedTop = Settings.get(key + '_top');
    const savedLeft = Settings.get(key + '_left');
    if (savedTop != null && savedLeft != null) {
      el.style.top = savedTop;
      el.style.left = savedLeft;
      el.style.transform = 'none';
    }
  };

  const setThemerState = enabled => {
    ['buttonThemer', 'inputThemer', 'downThemer'].forEach(id => {
      const el = $id(id);
      if (!el) return;
      el.classList.toggle('disabled', !enabled);
    });
  };

  const Settings = {
    get(key, fallback) {
      return GM_getValue(key, fallback);
    },
    set(key, value) {
      GM_setValue(key, value);
      return value;
    }
  };

  const State = {
    analog: {
      animationId: null,
      intervalId: null,
      running: false
    },
    wallpaper: {
      timer: null,
      style: null
    },
    digital: {
      interval: null
    }
  };

  // ===========================================================================
  // OBJECT GROUPS
  // ===========================================================================

  const DAY_BANNER = [
    { text: 'Sunday', x: 42 },
    { text: 'Monday', x: 42 },
    { text: 'Tuesday', x: 40 },
    { text: 'Wednesday', x: 38 },
    { text: 'Thursday', x: 40 },
    { text: 'Friday', x: 42 },
    { text: 'Saturday', x: 40 }
  ];

  const Icons = {
    AMPM1: _aURL + 'AMPM1.png',
    AMPM2: _aURL + 'AMPM2.png',
    calendar16: _aURL + 'calendar16.png',
    calendar22: _aURL + 'calendar22.png',
    calendarD: _aURL + 'calendarD.png',
    calendar32D: _aURL + 'calendar32D.png',
    calendarM: _aURL + 'calendarM.png',
    calendarW: _aURL + 'calendarW.png',
    clock16: _aURL + 'clock16.png',
    clock22: _aURL + 'clock22.png',
    clock22L: _aURL + 'clock22L.png',
    clock26: _aURL + 'clock26.png',
    hand22: _aURL + 'hand22.png',
    hourglass22: _aURL + 'hourglass22.png',
    moon16: _aURL + 'moon16.png',
    moon22: _aURL + 'moon22.png',
    panel33: _aURL + 'panel33.png',
    sun16: _aURL + 'sun16.png',
    sun22: _aURL + 'sun22.png',
  };

  const Images = {
    logo1: _aURL + 'logoGoogle.png',
    logo2: _aURL + 'imageGoogle.png',
    logo3: _aURL + 'world.png',
    logo4: _aURL + 'search8.png',
    logo5: _aURL + 'silverG.png',
    logo6: _aURL + 'googleLogo12.png',
    logo7: _aURL + 'bulb.png',
    logo8: _aURL + 'search3.png',
    logo9: _aURL + 'googleLogo15.png',
    logo10: _aURL + 'googleLogo17.png',
    logo11: _aURL + 'flag.png',
    logo12: _aURL + 'face2.png',
    logo13: _aURL + 'eagle6.png',
    logo14: _aURL + 'monkey1.png',
    logo15: _aURL + 'globe2.png',
    logo16: _aURL + 'eyes7.png',
    logo17: '',
  };

  const Strings = {
    amText: 'AM',
    bodyIdText: 'googleDashboard',
    buttonLogoText: 'Logo 🠉',
    buttonThemerText: 'Wallpaper 🠉',
    downLogoText: '🠋 Logo',
    downThemerText: '🠋 Wallpaper',
    hideText: ' Hide',
    placeholderText: 'Search Look-up',
    pmText: 'PM',
    scalerBtnMinusText: '–',
    scalerBtnPlusText: '+',
    scalerBtnResetText: 'Reset',
    showText: ' Show',
    spacerXText: '|',
  };

  const Titles = {
    anaCalBtnTitle: 'Show/Hide Calendar Info',
    analogClockBtnTitle: 'Analog Clock',
    buttonLogoTitle: 'Left-click To Change Logos',
    buttonThemerTitle: 'Left-click To Change Wallpaper',
    controlsBtnTitle: 'Show/Hide Controls Panel',
    dateTimeElTitle: 'Left-click → Show/Hide Seconds',
    digCalBtnTitle: 'Left-click → Show/Hide Calendar & Digital Time',
    downLogoTitle: 'Left-click To Change Logos',
    downThemerTitle: 'Left-click To Change Wallpaper',
    inputLogoTitle: `Manually Enter:\n • 0 - ${IMAGE_COUNT - 1} (0 = Default Google Logo, 17 = No Logo)`,
    inputThemerTitle: `Manually Enter:\n • 1 - ${WALLPAPER_COUNT} (0 = Default Google Background)`,
    percentageDisplayTitle: 'Manually Enter Percentage:\n • Min. 30% = 90px Ø\n • Reset 100% = 300px Ø\n • Max. 200% = 600px Ø',
    scalerBtnDownTitle: 'Scale Down In 5% Increments',
    scalerBtnUpTitle: 'Scale Up In 5% Increments',
    scalerResetTitle: 'Reset To 100%',
    secondHandBtnTitle: 'Toggle Between Smooth/Tick Second Hand Movement',
    themeBtnTitle: 'Toggle Between Dark/Light Theme',
  };

  // ===========================================================================
  // LOGO MANAGER (Section 1)
  // ===========================================================================

  const Logo = [null];

  for (let i = 1; i <= 16; i++) {
    Logo.push($el('img', {id: 'logoGoogle', class: 'logo', src: Images[`logo${i}`]}));
  }

  const applyLogo = (num) => {
    const existing = $id('logoGoogle');
    if (existing) existing.remove();
    num = parseInt(num, 10);
    if (isNaN(num) || num < 0 || num > (IMAGE_COUNT + 1)) {
      num = 0;
    }
    const logoConfig = {
      3: { marginTop: '15px', transform: 'translateX(-50%)' },
      4: { marginTop: '64px', transform: 'translateX(-50%)' },
      5: { marginTop: '5px', transform: 'translateX(-50%)' },
      7: { marginTop: '25px', transform: 'translateX(-50%)' },
      8: { marginTop: '60px', transform: 'translateX(-180%)' },
      12: { marginTop: '5px', transform: 'translateX(-50%)' },
      13: { marginTop: '15px', transform: 'translateX(-50%)' },
      15: { marginTop: '25px', transform: 'translateX(-50%)' },
    };
    const config = logoConfig[num] || { marginTop: '40px', transform: 'translateX(-50%)' };
    GM_addStyle(`
      img[alt='Google'], #hplogo, #logo, .k1zIA img, .k1zIA svg, #${Strings.bodyIdText} #LS8OJ img, #${Strings.bodyIdText} #LS8OJ .k1zIA {
        display: ${num === 0 ? 'block' : 'none'} !important;
        visibility: ${num === 0 ? 'visible' : 'hidden'} !important;
      }
      div:has(> img[alt='Google']) {
        display: ${num === 0 ? 'block' : 'none'} !important;
      }
      #${Strings.bodyIdText} #logoGoogle {
        margin-top: ${config.marginTop} !important;
      }
    `);
    if (num !== 0 && Logo[num]) {
      const logoCopy = Logo[num].cloneNode(false);
      logoCopy.id = 'logoGoogle';
      logoCopy.className = 'logo';
      logoCopy.style.cssText = `
        left: 50%;
        position: absolute;
        top: ${config.marginTop} !important;
        transform: ${config.transform} !important;
      `;
      body.prepend(logoCopy);
    } else if (num !== 0) {
      console.warn(`Logo #${num} not found`);
    }
    const inp = $id('inputLogo');
    if (inp) {
      inp.value = num;
    }
    Settings.set('logoImageNum', num);
  };

  const logoClick = (id) => {
    let current = Settings.get('logoImageNum', 1);
    const next =
      (id.includes('up') || id === 'buttonLogo')
        ? (current + 1) % IMAGE_COUNT
        : (current - 1 + IMAGE_COUNT) % IMAGE_COUNT;
    applyLogo(next);
  };

  const handleLogoInput = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) return;
    val = Math.max(0, Math.min((IMAGE_COUNT + 1), val));
    applyLogo(val);
  };

  // ===========================================================================
  // WALLPAPER MANAGER (Section 2)
  // ===========================================================================

  const WALLPAPER_MODES = [
    { src: Icons.hand22, title: 'Manually Change Wallpaper' },
    { src: Icons.hourglass22, title: 'Hourly Change Wallpaper' },
    { src: Icons.calendarD, title: 'Daily Change Wallpaper' },
    { src: Icons.calendarW, title: 'Weekly Change Wallpaper' },
    { src: Icons.calendarM, title: 'Monthly Change Wallpaper' }
  ];

  const applyWallpaper = (num) => {
    if (State.wallpaper.style) {
      State.wallpaper.style.remove();
      State.wallpaper.style = null;
    }
    num = parseInt(num, 10) || 0;
    if (num === 0) return;
    const css = `
      body {
        background: url(${_githubSite}${num}.jpg) no-repeat center center / cover fixed !important;
      }
    `;
    State.wallpaper.style = GM_addStyle(css);
  };

  const getHourlyWallpaper = () => {
    const now = new Date();
    const hours = Math.floor((now - WALLPAPER_START_DATE) / 3600000);
    return ((hours % WALLPAPER_COUNT + WALLPAPER_COUNT) % WALLPAPER_COUNT) + 1;
  };

  const getDailyWallpaper = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.floor((today - WALLPAPER_START_DATE) / 86400000);
    return ((days % WALLPAPER_COUNT + WALLPAPER_COUNT) % WALLPAPER_COUNT) + 1;
  };

  const getWeeklyWallpaper = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeks = Math.floor((today - WALLPAPER_START_DATE) / (7 * 86400000));
    return ((weeks % WALLPAPER_COUNT + WALLPAPER_COUNT) % WALLPAPER_COUNT) + 1;
  };

  const getMonthlyWallpaper = () => {
    const today = new Date();
    const months = (today.getFullYear() - WALLPAPER_START_DATE.getFullYear()) * 12 +
      (today.getMonth() - WALLPAPER_START_DATE.getMonth());
    return ((months % WALLPAPER_COUNT + WALLPAPER_COUNT) % WALLPAPER_COUNT) + 1;
  };

  const applyCurrentWallpaper = () => {
    const num = getCurrentWallpaperNumber();
    applyWallpaper(num);
    const inp = $id('inputThemer');
    if (inp) {
      inp.value = num;
    }
  };

  const scheduleWallpaperUpdate = () => {
    clearTimeout(State.wallpaper.timer);
    const mode = Settings.get('wallpaperMode', WALLPAPER_MANUAL);
    if (mode === WALLPAPER_MANUAL) {
      return;
    }
    const now = new Date();
    const next = new Date(now);
    switch (mode) {
      case WALLPAPER_HOURLY:
        next.setHours(next.getHours() + 1, 0, 0, 0);
        break;
      case WALLPAPER_DAILY:
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
        break;
      case WALLPAPER_WEEKLY: {
        const day = next.getDay();
        let days = (8 - day) % 7;
        if (days === 0) days = 7;
        next.setDate(next.getDate() + days);
        next.setHours(0, 0, 0, 0);
        break;
	     }
      case WALLPAPER_MONTHLY:
        next.setMonth(next.getMonth() + 1, 1);
        next.setHours(0, 0, 0, 0);
        break;
    }
    State.wallpaper.timer = setTimeout(() => {
      applyCurrentWallpaper();
      scheduleWallpaperUpdate();
    }, next - now);
  };

  const wallpaperButtonChanger = (e) => {
    const inp = $id('inputThemer');
    let val = parseInt(inp.value) || 0;
    val = e.target.id.includes('down') ? val - 1 : val + 1;
    if (val > WALLPAPER_COUNT) {
      val = 0;
    }
    if (val < 0) {
      val = WALLPAPER_COUNT;
    }
    inp.value = val;
    Settings.set('wallpaperMode', WALLPAPER_MANUAL);
    Settings.set('wallpaperImage', val);
    applyCurrentWallpaper();
    scheduleWallpaperUpdate();
  };

  const wallpaperInputChanger = () => {
    const inpThemer = $id('inputThemer');
    let val = parseInt(inpThemer.value) || 0;
    val = Math.max(0, Math.min(WALLPAPER_COUNT, val));
    inpThemer.value = val;
    Settings.set('wallpaperMode', WALLPAPER_MANUAL);
    Settings.set('wallpaperImage', val);
    applyCurrentWallpaper();
    scheduleWallpaperUpdate();
  };

  const wallpaperToggleHandler = () => {
    const mode = (Settings.get('wallpaperMode', WALLPAPER_MANUAL) + 1) % WALLPAPER_MODES.length;
    const tog = $id('toggleImg');
    Settings.set('wallpaperMode', mode);
    setThemerState(mode === 0);
    tog.src = WALLPAPER_MODES[mode].src;
    tog.title = WALLPAPER_MODES[mode].title;
    applyCurrentWallpaper();
    scheduleWallpaperUpdate();
  };

  const updateWallpaperControls = () => {
    const mode = Settings.get('wallpaperMode', WALLPAPER_MANUAL);
    const tog = $id('toggleImg');
    const inp = $id('inputThemer');
    setThemerState(mode === WALLPAPER_MANUAL);
    if (tog) {
      tog.src = WALLPAPER_MODES[mode].src;
      tog.title = WALLPAPER_MODES[mode].title;
    }
    if (inp) {
      inp.value = getCurrentWallpaperNumber();
    }
  };

  // ===========================================================================
  // CLOCK MANAGER (Section 3)
  // ===========================================================================

  const stopAnalogClock = () => {
    State.analog.running = false;
    if (State.analog.animationId) {
      cancelAnimationFrame(State.analog.animationId);
      State.analog.animationId = null;
    }
    if (State.analog.intervalId) {
      clearInterval(State.analog.intervalId);
      State.analog.intervalId = null;
    }
  };

  const applyAnalogClock = () => {
    if (!Settings.get('analogClock', true)) return;
    let currentDay = -1;
    let displayedSecondDeg = 0;
    const date = new Date();
    const smoothSecondHand = Settings.get('smoothSecondHand', true);
    const ticks = [];
    const hourNumbers = [];
    const spacer3 = $el('span', {id: 'spacer3', class: 'spacerX', textContent: Strings.spacerXText});
    // =======================
    // GRAPHICAL OBJECTS
    // =======================
    const defs = $el('defs', {
      },
      $el('linearGradient', {
        id: 'bezelOuterGradient',
        x1: '0%',
        y1: '0%',
        x2: '0%',
        y2: '100%'
        },
        $el('stop', { offset: '0%', 'stop-color': '#ffffff' }),
        $el('stop', { offset: '8%', 'stop-color': '#f3f3f3' }),
        $el('stop', { offset: '18%', 'stop-color': '#c9c9c9' }),
        $el('stop', { offset: '32%', 'stop-color': '#7a7a7a' }),
        $el('stop', { offset: '50%', 'stop-color': '#4f4f4f' }),
        $el('stop', { offset: '68%', 'stop-color': '#8d8d8d' }),
        $el('stop', { offset: '84%', 'stop-color': '#d9d9d9' }),
        $el('stop', { offset: '94%', 'stop-color': '#f5f5f5' }),
        $el('stop', { offset: '100%', 'stop-color': '#7a7a7a' })
      ),
      $el('linearGradient', {
        id: 'bezelInnerGradient',
        x1: '0%',
        y1: '0%',
        x2: '0%',
        y2: '100%'
        },
        $el('stop', { offset: '0%', 'stop-color': '#ffffff' }),
        $el('stop', { offset: '20%', 'stop-color': '#d8d8d8' }),
        $el('stop', { offset: '55%', 'stop-color': '#8c8c8c' }),
        $el('stop', { offset: '100%', 'stop-color': '#4e4e4e' })
      ),
      $el('radialGradient', {
        id: 'faceGradient',
        cx: '50%',
        cy: '50%',
        r: '50%',
        gradientUnits: 'objectBoundingBox'
        },
        $el('stop', {
          offset: '0%',
          'stop-color': 'var(--face-inner)'
        }),
        $el('stop', {
          offset: '70%',
          'stop-color': '#f7f7f7'
        }),
        $el('stop', {
          offset: '100%',
          'stop-color': 'var(--face-outer)'
        })
      ),
      $el('linearGradient', {
        id: 'numeralGradient',
        gradientTransform: 'rotate(90)'
        },
        $el('stop', { offset: '0%', 'stop-color': 'var(--numeral-top)' }),
        $el('stop', { offset: '100%', 'stop-color': 'var(--numeral-bottom)' })
      ),
      $el('linearGradient', {
        id: 'bannerGradient',
        gradientTransform: 'rotate(90)'
        },
        $el('stop', { offset: '0%', 'stop-color': 'var(--banner-top)' }),
        $el('stop', { offset: '100%', 'stop-color': 'var(--banner-bottom)' })
      )
    );
    // =======================
    // CREATE SVG ELEMENTS
    // =======================
    const panelImage = $el('image', {
      id: 'panelImage',
      href: Icons.panel33,
      width: 12,
      height: 12,
      x: -2,
      y: -2,
      style: 'cursor: pointer;',
      onclick: () => toggleControls()
    });
    const bezelGroup = $el('g', {
      className: 'Analog-Bezel'
      },
      $el('circle', {
        className: 'Analog-BezelOuter',
        cx: 50,
        cy: 50,
        r: 48.8,
        fill: 'none',
        stroke: 'url(#bezelOuterGradient)',
        'stroke-width': 7.5
      }),
      $el('circle', {
        className: 'Analog-BezelInner',
        cx: 50,
        cy: 50,
        r: 48.8,
        fill: 'none',
        stroke: 'url(#bezelInnerGradient)',
        'stroke-width': 1.0
      }),
      $el('circle', {
        className: 'Analog-BezelShadow',
        cx: 50,
        cy: 50,
        r: 49,
        fill: 'none'
      }),
      $el('circle', {
        className: 'Analog-BezelHighlight',
        cx: 50,
        cy: 50,
        r: 48.1,
        fill: 'none'
      }),
      $el('circle', {
        className: 'Analog-BezelFinish',
        cx: 50,
        cy: 50,
        r: 47,
        fill: 'none',
        stroke: 'rgba(0, 0, 0, .3)',
        'stroke-width': .5
      })
    );
    const clockFace = $el('circle', {
      className: 'Analog-Face',
      cx: 50,
      cy: 50,
      r: 47,
      fill: 'url(#faceGradient)'
    });
    for (let i = 0; i < 60; i++) {
      const angleDeg = i * 6 - 90;
      const rad = angleDeg * Math.PI / 180;
      const isHourMark = (i % 5 === 0);
      const innerRadius = isHourMark ? 42 : 44.5;
      const outerRadius = 47;
      ticks.push(
        $el('line', {
          className: 'Analog-Ticks',
          x1: 50 + innerRadius * Math.cos(rad),
          y1: 50 + innerRadius * Math.sin(rad),
          x2: 50 + outerRadius * Math.cos(rad),
          y2: 50 + outerRadius * Math.sin(rad),
          stroke: isHourMark ? 'var(--tick-hourmark)' : 'var(--tick-secondmark)',
          strokeWidth: isHourMark ? '1.5' : '0.75',
          strokeLinecap: 'round'
        })
      );
    }
    for (let i = 0; i < 12; i++) {
      const hour = i === 0 ? 12 : i;
      const angleDeg = i * 30 - 90;
      const rad = angleDeg * Math.PI / 180;
      const radius = 38;
      hourNumbers.push($el('text', {
        className: 'Analog-Number',
        x: 50 + radius * Math.cos(rad),
        y: 50.5 + radius * Math.sin(rad),
        textContent: hour,
        fill: 'url(#numeralGradient)',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle'
      }));
    }
    const hourHand = $el('path', {
      className: 'Analog-Hour-Hand',
      d: `M 50 50 L 49.0 48 L 48.8 30 L 50 26 L 51.2 30 L 51.0 48 Z`
    });
    const minuteHand = $el('path', {
      className: 'Analog-Minute-Hand',
      d: `M 50 50 L 49.4 48 L 49.15 30 L 49.0 24 L 50 18 L 51.0 24 L 50.85 30 L 50.6 48 Z`
    });
    const secondHand = $el('g', {
      className: 'Analog-Second-Hand'
      },
      $el('path', {
        className: 'Analog-Second-Needle',
        d: `M 49.8 55 L 50.2 55 L 50.2 17 L 50 14 L 49.8 17 Z`
      }),
      $el('line', {
        className: 'Analog-Second-Tail',
        x1: 50,
        y1: 55,
        x2: 50,
        y2: 56
      }),
      $el('polygon', {
        className: 'Analog-Second-Counter',
        points: `
          50,61
          49.2,60.4
          49.2,56.8
          50,56
          50.8,56.8
          50.8,60.4
        `
      })
    );
    const hubOuter = $el('circle', {
      className: 'Analog-HubOuter',
      cx: 50,
      cy: 50,
      r: 2.6
    });
    const hubInner = $el('circle', {
      className: 'Analog-HubInner',
      cx: 50,
      cy: 50,
      r: 1.55
    });
    const hubPin = $el('circle', {
      className: 'Analog-HubPin',
      cx: 50,
      cy: 50,
      r: 0.58
    });
    const hubHighlight = $el('circle', {
      className: 'Analog-HubHighlight',
      cx: 49.2,
      cy: 49.1,
      r: 0.32
    });
    const dayBannerBg = $el('rect', {
      id: 'dayBannerBg',
      x: 36,
      y: 18,
      width: 29,
      height: 7.5,
      rx: 2,
      ry: 2,
      fill: 'url(#bannerGradient)'
    });
    const dayBannerBorder = $el('rect', {
      id: 'dayBannerBorder',
      //x: 36,
      //y: 16,
      //width: 29,
      //height: 8,
      //rx: 2,
      //ry: 2
    });
    const dayBannerHighlight = $el('rect', {
      id: 'dayBannerHighlight',
      //x: 36,
      //y: 16,
      //width: 29,
      //height: 8,
      //rx: 2,
      //ry: 2
    });
    const dayBannerText = $el('text', {
      id: 'dayBannerText',
      y: 23.8,
      textAnchor: 'middle',
      dominantBaseline: 'middle'
    });
    const dayBannerGroup = $el('g', {
      id: 'dayBanner',
      className: 'DayBanner'
      }, [
      dayBannerBg,
      dayBannerBorder,
      dayBannerHighlight,
      dayBannerText
    ]);
    const dateText = $el('text', {
      id: 'dateText',
      className: 'Analog-MonthDateText',
      x: 41,
      y: 31,
      textAnchor: 'start',
      dominantBaseline: 'middle'
    });
    const timeText = $el('text', {
      id: 'timeText',
      className: 'Analog-timeText',
      y: 79,
      textAnchor: 'end',
      dominantBaseline: 'middle',
      'xml:space': 'preserve'
    });
    const ampmText = $el('text', {
      className: 'Analog-AMPMText',
      x: 47,
      y: 84,
      textAnchor: 'middle',
      dominantBaseline: 'middle'
    });
    const dateTimeGroup = $el('g', {
      id: 'dateTimeGroup'
    }, [
      dateText,
      timeText,
      ampmText
    ]);
    // =======================
    // ATTACH TO SVG
    // =======================
    const svg = $el('svg', {
      className: 'Analog',
      viewBox: '0 0 100 100'
      },
      defs,
      panelImage,
      bezelGroup,
      clockFace,
      ...ticks,
      ...hourNumbers,
      hourHand,
      minuteHand,
      hubOuter,
      secondHand,
      hubInner,
      hubPin,
      hubHighlight,
      dayBannerGroup,
      dateTimeGroup
    );

    // =======================
    // NON SVG
    // =======================

    const Clock = $el('div', { className: 'Analog-Bigclock' }, svg);
    const ampmView = Settings.get('ampmView', true);
    ampmText.style.display = ampmView ? '' : 'none';
    let currentPercent = 100;
    const percentageDisplay = $el('input', {
      className: 'scaler-text',
      type: 'number',
      value: '100',
      min: '30',
      max: '200',
      step: '1',
      title: Titles.percentageDisplayTitle,
      oninput(e) {
        const val = e.target.value;
        if (val === '') return;
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
          setClockPercentage(num);
      } }
    });
    const setClockPercentage = (percent) => {
      currentPercent = Math.max(30, Math.min(200, percent));
      const pixelSize = Math.round((currentPercent / 100) * BASE_SIZE);
      Clock.style.setProperty('--clock-size', pixelSize + 'px');
      percentageDisplay.value = String(currentPercent);
      Settings.set('clockSizePercent', currentPercent);
    };
    const sunImg = $el('img', {
      id: 'sunImg',
      src: Icons.sun22
    });
    const themeBtn = $el('button', {
      className: 'ClockThemeToggle',
      title: Titles.themeBtnTitle
    }, sunImg);
    const setTheme = (dark) => {
      Clock.classList.toggle('dark', dark);
      sunImg.src = dark ? Icons.moon22 : Icons.sun22;
      Settings.set('clockDarkTheme', dark);
    };
    setTheme(Settings.get('clockDarkTheme', true));
    themeBtn.onclick = () => {
      setTheme(!Clock.classList.contains('dark'));
    };
    const clockImg = $el('img', {
      id: 'clockImg',
      src: Icons.clock22L
    });
    const secondHandBtn = $el('button', {
      className: 'ClockSecondToggle',
      title: Titles.secondHandBtnTitle
    }, clockImg);
    const setSecondMode = (smooth) => {
      Settings.set('smoothSecondHand', smooth);
    };
    setSecondMode(Settings.get('smoothSecondHand', true));
    secondHandBtn.onclick = () => {
      Settings.set('smoothSecondHand', !Settings.get('smoothSecondHand', true));
      startAnalogClock();
    };
    const calendarImg = $el('img', {
      id: 'calendarImg',
      src: Icons.calendar22
    });
    const calendarText = $el('div', {
      className: 'Analog-CalendarText'
    });
    const clockInfo = $el('div', {
      id: 'clockInfo',
      className: 'Analog-Info' },
      calendarText
    );
    const toggleCalendarInfo = () => {
      const hidden = clockInfo.classList.toggle('hidden');
      dateTimeGroup.classList.toggle('hidden', !hidden);
      Settings.set('calendarInfo', !hidden);
    };
    const anaCalBtn = $el('button', {
      id: 'anaCalBtn',
      className: 'scaler-info',
      title: Titles.anaCalBtnTitle,
      onclick: () => toggleCalendarInfo()
    }, calendarImg);
    const ampmImg = $el('img', {
      id: 'ampmImg',
      src: Icons.AMPM1
    });
    const scalerControls = $el('div', {
      id: 'scalerControls',
      className: 'scaler-controls' },
      themeBtn,
      secondHandBtn,
      anaCalBtn,
      spacer3,
      $el('button', {
        className: 'scaler-reset',
        textContent: Strings.scalerBtnResetText,
        title: Titles.scalerResetTitle,
        onclick: () => setClockPercentage(100)
      }),
      $el('button', {
        className: 'scaler-btn',
        textContent: Strings.scalerBtnMinusText,
        title: Titles.scalerBtnDownTitle,
        onclick: () => setClockPercentage(currentPercent - 5)
      }),
      percentageDisplay,
      $el('button', {
        className: 'scaler-btn',
        textContent: Strings.scalerBtnPlusText,
        title: Titles.scalerBtnUpTitle,
        onclick: () => setClockPercentage(currentPercent + 5)
      })
    );
    const controlsPanel = $el('div', {
      id: 'controlsPanel'
      },
      scalerControls,
      clockInfo
    );
    const toggleControls = () => {
      const hidden = controlsPanel.classList.toggle('hidden');
      Settings.set('controlsPanel', !hidden);
    };
    const showControlsPref = Settings.get('controlsPanel', true);
    controlsPanel.classList.toggle('hidden', !showControlsPref);
    const savedPercent = Settings.get('clockSizePercent', 100);
    setClockPercentage(savedPercent);
    const container = $el('div', {
      id: 'analogClockContainer', className: 'ClockContainer' },
      Clock,
      controlsPanel
    );
    makeDraggable(container, 'analogClockContainer', '.Analog-Bigclock');
    restorePosition(container, 'analogClockContainer');
    const rect = container.getBoundingClientRect();
    if (rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) {
      container.style.left = '20px';
      container.style.top = '20px';
    }
    body.prepend(container);
    const updateAnalogClock = () => {
      if (!$id('analogClockContainer')) return;
      const smoothSecondHand = Settings.get('smoothSecondHand', true);
      const now = new Date();
      const day = now.getDay();
      const seconds = smoothSecondHand ? now.getSeconds() + now.getMilliseconds() / 1000 : now.getSeconds();
      const secondDeg = seconds * 6;
      const minuteDeg = now.getMinutes() * 6 + seconds * 0.1;
      const hourDeg = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5 + seconds * (0.5 / 60);
      let targetDeg = secondDeg;
      if (targetDeg < displayedSecondDeg - 180) targetDeg += 360;
      displayedSecondDeg = targetDeg;
      Clock.style.setProperty('--secondDeg', `${displayedSecondDeg}deg`);
      Clock.style.setProperty('--minuteDeg', `${minuteDeg}deg`);
      Clock.style.setProperty('--hourDeg', `${hourDeg}deg`);
      const dt = now.getDate(), mth = now.getMonth(), yr = now.getFullYear();
      const dayAbbr = DAY_ABBR[day], dayFull = DAY_FULL[day], monthAbbr = MONTH_ABBR[mth], monthFull = MONTH_FULL[mth];
      const suffix = ['th', 'st', 'nd', 'rd'][(dt % 10 > 3 || Math.floor(dt / 10) === 1 ? 0 : dt % 10)] || 'th';
      const ordinal = dt + suffix;
      const h12 = String(now.getHours() % 12 || 12);
      const min = String(now.getMinutes()).padStart(2, '0');
      const sec = String(now.getSeconds()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const monthday = String(now.getDate()).padStart(2, '0');
      const monthAbb = MONTH_ABBR[now.getMonth()];
      dateText.textContent = `${monthAbb} ${monthday}`;
      timeText.textContent = `${h12}:${min}`;
      timeText.setAttribute('x', h12 < 10 ? 42 : 41);
      const ampm = now.getHours() < 12 ? Strings.amText : Strings.pmText;
      ampmText.textContent = ampm;
      calendarText.textContent = `${monthFull} ${ordinal}, ${yr} 🕑 ${h12}:${min} ${ampm}`;
      dayBannerText.textContent = DAY_BANNER[day].text.toUpperCase();
      dayBannerText.setAttribute('x', DAY_BANNER[day].x);
    };
    const showCalendarPref = Settings.get('calendarInfo', false);
    if (!showCalendarPref) {
      clockInfo.classList.add('hidden');
    }
    dateTimeGroup.classList.toggle('hidden', showCalendarPref);
    const startAnalogClock = () => {
      stopAnalogClock();
      State.analog.running = true;
      displayedSecondDeg = 0;
      const smooth = Settings.get('smoothSecondHand', true);
      if (smooth) {
        const tick = () => {
          if (!State.analog.running) return;
          updateAnalogClock();
          State.analog.animationId = requestAnimationFrame(tick);
        };
        tick();
      } else {
        updateAnalogClock();
        State.analog.intervalId = setInterval(updateAnalogClock, _SECOND);
      }
    };
    startAnalogClock();
  };

  const toggleAnalogClock = () => {
    const clock = Settings.get('analogClock', true);
    const cont = $id('analogClockContainer');
    if (clock) {
      stopAnalogClock();
      Settings.set('analogClock', false);
      cont?.remove();
    } else {
      Settings.set('analogClock', true);
      applyAnalogClock();
    }
    const btn = $id('analogClockBtn');
    btn.replaceChildren(
      $el('img', {
        src: Icons.clock26,
        alt: 'Clock'
      }),
      Settings.get('analogClock', true) ? Strings.hideText : Strings.showText
    );
  };

  // ===========================================================================
  // DATE/TIME MANAGER (Section 4)
  // ===========================================================================

  const applyDateTime = () => {
    const dtContainer = $el('div', {
      id: 'dateTimeContainer'
    });
    const imageCalendar = $el('img', {
      id: 'imageCalendar',
      src: Icons.calendar32D
    });
    const digCalBtn = $el('button', {
      id: 'digCalBtn',
      title: Titles.digCalBtnTitle,
      onclick: dateTimeToggle},
      imageCalendar
    );
    const dateTimeEl = $el('span', {
      id: 'dateTime',
      title: Titles.dateTimeElTitle,
      onclick: dateTimeToggleSeconds
    });
    dtContainer.append(digCalBtn, dateTimeEl);
    body.prepend(dtContainer);
    dtContainer.style.position = 'fixed';
    dtContainer.style.top = '590px';
    dtContainer.style.left = '50%';
    dtContainer.style.transform = 'translateX(-50%)';
    makeDraggable(dtContainer, 'dtContainer');
    restorePosition(dtContainer, 'dtContainer');
  };

  const updateDigitalClock = () => {
    const digitalClock = $id('dateTime');
    if (!digitalClock) {
      clearInterval(State.digital.interval);
      State.digital.interval = null;
      return;
    }
    const now = new Date();
    const dayFull = DAY_FULL[now.getDay()];
    const monthFull = MONTH_FULL[now.getMonth()];
    const dt = now.getDate();
    const yr = now.getFullYear();
    const suffix = ['th','st','nd','rd']
      [(dt % 10 > 3 || Math.floor(dt / 10) === 1 ? 0 : dt % 10)] || 'th';
    const h12 = String(now.getHours() % 12 || 12);
    const min = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');
    const ampm = now.getHours() < 12 ? Strings.amText : Strings.pmText;
    const secView = Settings.get('secondsView', false);
    digitalClock.textContent = secView
      ? `${dayFull} ⇒ ${monthFull} ${dt}${suffix}, ${yr} 🕑 ${h12}:${min}:${sec} ${ampm}`
      : `${dayFull} ⇒ ${monthFull} ${dt}${suffix}, ${yr} 🕑 ${h12}:${min} ${ampm}`;
  };

  const startDigitalClock = () => {
    clearInterval(State.digital.interval);
    State.digital.interval = null;
    const digitalClock = $id('dateTime');
    const dtPref = Settings.get('dateTimeView', false);
    if (!dtPref || digitalClock.hidden) {
      digitalClock.hidden = !dtPref;
      return;
    }
    const delay = Settings.get('secondsView', false) ? _SECOND : _SECONDS;
    State.digital.interval = setInterval(updateDigitalClock, delay);
    updateDigitalClock();
  };

  const dateTimeToggle = (e) => {
    if (e.button !== 0) return;
    if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
      const dtEl = $id('dateTime');
      dtEl.hidden = !dtEl.hidden;
      Settings.set('dateTimeView', !dtEl.hidden);
      if (dtEl.hidden) {
        clearInterval(State.digital.interval);
        State.digital.interval = null;
      } else {
        startDigitalClock();
    } }
  };

  const dateTimeToggleSeconds = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const enabled = !Settings.get('secondsView', false);
    Settings.set('secondsView', enabled);
    startDigitalClock();
  };

  // ===========================================================================
  // CONTROL MANAGER (Section 5)
  // ===========================================================================

  const applyControlContainer = () => {
    const controlContainer = $el('div', {
      id: 'controlContainer'
    });
    const toggleImg = $el('img', {
      id: 'toggleImg',
      src: Icons.hand22
    });
    const wallpaperToggler = $el('button', {
      id: 'wallpaperToggler',
      onclick: wallpaperToggleHandler
    }, toggleImg);
      const buttonThemer = $el('button', {
      id: 'buttonThemer',
      textContent: Strings.buttonThemerText,
      title: Titles.buttonThemerTitle,
      onclick: wallpaperButtonChanger
    });
    const inputThemer = $el('input', {
      id: 'inputThemer',
      type: 'number',
      value: Settings.get('wallpaperImage', 0),
      title: Titles.inputThemerTitle,
      oninput: wallpaperInputChanger
    });
    const downThemer = $el('button', {
      id: 'downThemer',
      textContent: Strings.downThemerText,
      title: Titles.downThemerTitle,
      onclick: wallpaperButtonChanger
    });
    const spacer1 = $el('span', {
      id: 'spacer1',
      class: 'spacerX',
      textContent: Strings.spacerXText
    });
    const buttonLogo = $el('button', {
      id: 'buttonLogo',
      textContent: Strings.buttonLogoText,
      title: Titles.buttonLogoTitle,
      onclick: e => logoClick(e.target.id)
    });
    const inputLogo = $el('input', {
      id: 'inputLogo',
      type: 'number',
      value: Settings.get('logoImageNum', 1),
      title: Titles.inputLogoTitle,
      oninput: handleLogoInput
    });
    const downLogo = $el('button', {
      id: 'downLogo',
      textContent: Strings.downLogoText,
      title: Titles.downLogoTitle,
      onclick: e => logoClick(e.target.id)
    });
    const spacer2 = $el('span', {
      id: 'spacer2',
      class: 'spacerX',
      textContent: Strings.spacerXText
    });
    const analogClockBtn = $el('button', {
      id: 'analogClockBtn',
      title: Titles.analogClockBtnTitle,
      onclick: toggleAnalogClock},
      $el('img', {
        src: Icons.clock26,
        alt: 'Clock'
      }), ' Show'
    );
    controlContainer.append(
      wallpaperToggler,
      buttonThemer,
      inputThemer,
      downThemer,
      spacer1,
      buttonLogo,
      inputLogo,
      downLogo,
      spacer2,
      analogClockBtn
    );
    body.prepend(controlContainer);
    controlContainer.style.position = 'fixed';
    controlContainer.style.top = '516px';
    controlContainer.style.left = '50%';
    controlContainer.style.transform = 'translateX(-50%)';
    makeDraggable(controlContainer, 'controlContainer');
    restorePosition(controlContainer, 'controlContainer');
  };

  // ===========================================================================
  // UI MANAGER (Section 6)
  // ===========================================================================

  const init = () => {
    if (!body) return;
    body.id = Strings.bodyIdText;
    const textArea = $id('APjFqb');
    if (textArea) textArea.placeholder = Strings.placeholderText;
    applyCurrentWallpaper();
    scheduleWallpaperUpdate();
    applyLogo(Settings.get('logoImageNum', 1));
    applyControlContainer();
    updateWallpaperControls();
    applyDateTime();
    startDigitalClock();
    const showClock = Settings.get('analogClock', true);
    const clock = $id('analogClockContainer');
    if (showClock) {
      requestAnimationFrame(() => applyAnalogClock());
    } else {
      clock?.remove();
    }
    const btn = $id('analogClockBtn');
    btn.replaceChildren($el('img', {src: Icons.clock26, alt: 'Clock'}),
      Settings.get('analogClock', true) ? Strings.hideText : Strings.showText
    );
  };

  // ===========================================================================
  // EVENT LISTENERS (Section 7)
  // ===========================================================================

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Settings.get('analogClock', true)) {
      if (!$id('analogClockContainer')) {
        applyAnalogClock();
    } }
  });

  window.addEventListener('pageshow', () => {
    if (Settings.get('analogClock', true) && !$id('analogClockContainer')) {
      applyAnalogClock();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ===========================================================================
  // CSS (Section 8)
  // ===========================================================================

  // GLOBAL
  GM_addStyle(`
    #${Strings.bodyIdText} .disabled {
      cursor: default;
      opacity: 0.3;
      pointer-events: none;
    }
    #${Strings.bodyIdText} .hidden {
      display: none;
    }
    #${Strings.bodyIdText} ::-webkit-inner-spin-button,
    #${Strings.bodyIdText} ::-webkit-outer-spin-button {
      display: none;
    }
  `);

  // GOOGLE PAGE
  GM_addStyle(`
    #${Strings.bodyIdText} div.o3j99.n1xJcf.CoM3Df > a.w5hRs,
    #${Strings.bodyIdText} #gb > div.gb_Q.gb_6.gb_Vf.gb_3f > div:nth-child(2) > a,
    #${Strings.bodyIdText} #gb > div.gb_Ad.gb_6.gb_L,
    #${Strings.bodyIdText} div.KxwPGc.SSwjIe > div.KxwPGc.AghGtd,
    #${Strings.bodyIdText} div.KxwPGc.SSwjIe > div.KxwPGc.ssOUyb,
    #${Strings.bodyIdText} div.KxwPGc.SSwjIe > div.KxwPGc.iTjxkf > a,
    #${Strings.bodyIdText} div.RNNXgb div.fzj3ad,
    #${Strings.bodyIdText} div.o3j99.qarstb > div:nth-child(3),
    #${Strings.bodyIdText} #EUjKDc,
    #${Strings.bodyIdText} #gbqfbb,
    #${Strings.bodyIdText} div.k1zIA.kKvsb > div.IzOpfd,
    #${Strings.bodyIdText} div.o3j99.qarstb > div:nth-child(2){
      display: none !important;
    }
    #${Strings.bodyIdText} #gb > div.gb_Q.gb_6.gb_Vf.gb_3f {
      padding-right: 0px !important;
    }
    #${Strings.bodyIdText} header a {
      color: #FFF !important;
      text-decoration: none !important;
    }
    #${Strings.bodyIdText} header a > svg {
      fill: #FFF !important;
    }
    #${Strings.bodyIdText} > div.L3eUgb > div:nth-child(13) > div {
      background: transparent !important;
    }
    #${Strings.bodyIdText} div.KxwPGc.SSwjIe {
      background: transparent !important;
      float: right !important;
    }
    #${Strings.bodyIdText} g-popup > div.CcNe6e > div {
      background: #2A3A4B !important;
      border-radius: 6px !important;
      padding: 8px 16px !important;
    }
    #${Strings.bodyIdText} #LS8OJ > div.k1zIA.rSk4se > svg {
      fill: #FFF !important;
    }
    #${Strings.bodyIdText} > div.L3eUgb div.RNNXgb,
    #${Strings.bodyIdText} > div.L3eUgb input.gNO89b {
      background: rgba(0,0,0,.2) !important;
    }
    #${Strings.bodyIdText} #APjFqb {
      filter: brightness(2) !important;
      text-shadow: 1px 1px 2px #000 !important;
    }
    #${Strings.bodyIdText} div.fM33ce.dRYYxd > div.ywK6Rd {
      background: none !important;
    }
    #${Strings.bodyIdText} #gb > div.gb_z > div:nth-child(2) {
      height: calc(-70px + 100vh) !important;
    }
  `);

  // ANALOG CLOCK
  GM_addStyle(`
    #analogClockContainer:hover #panelImage {
      display: block;
    }
    #panelImage {
      display: none;
    }
    .ClockContainer {
      align-items: center;
      display: flex;
      flex-direction: column;
      font-family: Consolas;
      left: 50px;
      position: absolute;
      top: 100px;
      user-select: none;
      z-index: 3;
    }
    .Analog-Bigclock {
      align-self: center;
      cursor: move;
      flex-shrink: 0;
      height: var(--clock-size);
      margin: 0 auto;
      stroke: none;
      width: var(--clock-size);
      --face-inner: #bbb;
      --face-outer: #fff;
    }
    .Analog-Bigclock.dark {
      --face-inner: #2c3e50;
      --face-outer: #1a252f;
    }
    .Analog {
      height: 100%;
      overflow: visible;
      width: 100%;
    }
    .Analog-Ticks {
      filter: drop-shadow(1px 1px 1px #666);
    }
    .Analog-Number {
      font-family: 'sans-serif';
      font-size: 8px;
      font-weight: 700;
      paint-order: stroke fill;
      stroke: none;
      filter: drop-shadow(1px 1px 1px #666);
    }
    .Analog-Bigclock.dark .Analog-Number {
      fill: #fff;
    }
    .Analog-Second-Hand,
    .Analog-Minute-Hand,
    .Analog-Hour-Hand {
      transform-origin: 50% 50%;
    }
    .Analog-Second-Hand {
      fill: #b50000;
      stroke: #maroon;
      stroke-width: .25;
      transform: rotate(var(--secondDeg));
    }
    .Analog-Second-Needle {
      fill: #b50000;
      stroke-linejoin: round;
      stroke-width: .20;
    }
    .Analog-Second-Tail {
      stroke: #b50000;
      stroke-linecap: round;
      stroke-width: .35;
    }
    .Analog-Second-Counter {
      fill: #b50000;
      stroke: #b50000;
      stroke-width: .35;
    }
    .Analog-Minute-Hand {
      fill: #000;
      filter: drop-shadow(1px 1px 2px #666);
      stroke: #000;
      stroke-linejoin: round;
      stroke-width: .30;
      transform: rotate(var(--minuteDeg));
    }
    .Analog-Bigclock.dark .Analog-Minute-Hand {
      fill: #f3f6f8;
      stroke: #bcc5cd;
    }
    .Analog-Hour-Hand {
      fill: #000;
      filter: drop-shadow(1px 1px 2px #666);
      stroke: #000;
      stroke-linejoin: round;
      stroke-width: .5;
      transform: rotate(var(--hourDeg));
    }
    .Analog-Bigclock.dark .Analog-Hour-Hand {
      fill: #eef2f5;
      stroke: #aeb7c0;
    }
    :root {
      --banner-top: rgba(255, 250, 210, .6);
      --banner-bottom: rgba(120, 90, 0, .6);
      --numeral-top: rgba(0, 0, 0, 1);
      --numeral-bottom: rgba(0, 0, 0, 1);
      --tick-hourmark: rgba(0, 0, 0, .7);
      --tick-secondmark: rgba(0, 0, 0, .3);
    }
    .dark-theme {
      --banner-top: rgba(90, 90 ,90, .45);
      --banner-bottom: rgba(15, 15, 15, .45);
      --numeral-top: rgba(0, 0, 0, 1);
      --numeral-bottom: rgba(0, 0, 0, 1);
      --tick-hourmark: rgba(0, 0, 0, .7);
      --tick-secondmark: rgba(0, 0, 0, .3);
    }
    #dayBannerBg {
      filter: drop-shadow(1px 1px 4px #000);
      stroke: #996600;
      stroke-width: .1;
    }
    #dayBannerText {
      fill: #000;
      font: 600 5px Consolas;
    }
    .Analog-Bigclock.dark #dayBannerText {
      fill: #fff;
      font: 400 5px Consolas;
      text-shadow: 1px 1px #000;
    }
    .Analog-MonthDateText {
      color: #000;
      fill: #000;
      filter: drop-shadow(1px 1px 1px #666);
      font: 400 6px Consolas;
    }
    .Analog-Bigclock.dark .Analog-MonthDateText {
      color: #FFF;
      fill: #FFF;
    }
    .Analog-timeText {
      color: #000;
      fill: #000;
      filter: drop-shadow(1px 1px 1px #666);
      font: 400 7px Consolas;
    }
    .Analog-Bigclock.dark .Analog-timeText {
      color: #FFF;
      fill: #FFF;
      filter: drop-shadow(1px 1px 1px #666);
    }
    .Analog-AMPMText {
      color: #000;
      fill: #000;
      filter: drop-shadow(1px 1px 1px #666);
      font: 400 5px Consolas;
    }
    .Analog-Bigclock.dark .Analog-AMPMText {
      color: #FFF;
      fill: #fff;
    }
    .Analog-HubOuter {
      fill: #ccc;
      filter: drop-shadow(1px 1px 2px #666);
      stroke: #fff;
      stroke-width: .1;
    }
    .Analog-HubInner {
      fill: #b50000;
      stroke: maroon;
      stroke-width: .2;
    }
    .Analog-HubPin {
      fill: #fff;
      stroke: #000;
      stroke-width: .1;
    }
    .Analog-HubHighlight {
      fill: rgba(255, 255, 255, .75);
    }
    .Analog-BezelInner {
      filter: drop-shadow(1px 1px 3px #000);
    }
    .Analog-BezelShadow {
      stroke: rgba(0, 0, 0, .14);
      stroke-width: .9;
    }
    .Analog-BezelHighlight {
      stroke: rgba(255, 255, 255, .85);
      stroke-width: .18;
    }
  `);

  // CONTROLS PANEL
  GM_addStyle(`
    #controlsPanel {
      background-image: linear-gradient(to bottom, #fff, #333);
      border: 2px solid #666;
      box-shadow: 0 0 0 2px #999, 0 0 0 3px #333, 0 0 0 4px #000;
      border-radius: 8px;
      margin-top: 22px;
      width: 332px;
    }
    #scalerControls {
      align-items: center;
      color: #000;
      cursor: default;
      display: flex;
      gap: 10px;
      height: 32px;
      justify-content: center;
      width: 332px;
    }
    .ClockThemeToggle,
    .ClockSecondToggle,
    .scaler-info,
    .am-pm {
      border: none;
      cursor: pointer;
      margin: 0px;
      padding: 0px;
      width: 32px;
    }
    #spacer3 {
      color: #000;
      margin: 0px;
      opacity: 1;
      pointer-events: none;
      text-align: center;
    }
    .scaler-reset {
      background: none;
      border: 1px solid transparent;;
      cursor: pointer;
      font-size: 14px;
      height: 22px;
      justify-content: center;;
      margin: 0px;
      padding: 0px;
      text-align: center;
      width: 54px;
    }
    .scaler-reset:hover {
      background: rgba(255,255,255,.9);
      border-color: #000;
      border-radius: 11px;
      cursor: pointer;
      filter: drop-shadow(1px 1px 3px #000);
      font-size: 14px;
      margin: 0px;
      padding: 0px;
    }
    .scaler-btn {
      background: rgba(255,255,255,.1);;
      border: 1px solid #000;
      border-radius: 11px;
      cursor: pointer;
      filter: drop-shadow(1px 1px 3px #000);
      font-size: 18px;
      height: 22px;
      line-height: 1;
      opacity: .7;
      width: 22px;
    }
    .scaler-btn:hover {
      background: rgba(255,255,255,.9);
      opacity: 1;
    }
    .scaler-text {
      background: rgba(255,255,255,.1);
      border: 1px solid #666;
      border-radius: 14px;
      color: #000;
      filter: drop-shadow(1px 1px 3px #000);
      font-size: 14px;
      font-weight: 500;
      margin-top: 0px;
      min-width: 32px;
      padding: 2px 2px 0px 0px;
      text-align: center;
    }
    .scaler-text:hover,
    .scaler-text:focus-within {
      background: rgba(255,255,255,.9);
    }
    .scaler-controls > button {
      color: #000;
      opacity: .7;
    }
    .scaler-controls > button:hover {
      cursor: pointer;
      opacity: 1;
    }
  `);

  // CLOCK INFO
  GM_addStyle(`
    #clockInfo {
      align-items: center;
      color: #000;
      cursor: default;
      display: inline-flex;
      justify-content: center;
      padding-bottom: 4px;
	     text-align: center;
      width: 332px;
    }
    .Analog-CalendarText {
      display: inline-block;
      color: #fff;
      font: 600 16px Consolas;
      text-shadow: 1px 1px 2px #000;
      white-space: nowrap;
    }
  `);

  // CONTROL CONTAINER
  GM_addStyle(`
    #controlContainer {
      align-items: center;
      background: #2A3A4B;
      border: none;
      border-radius: 8px;
      height: 32px;
      min-width: 380px;
      padding: 0px 10px;
      box-sizing: border-box;
      pointer-events: auto;
      text-shadow: 1px 1px 2px #000;
      user-select: none;
      z-index: 2;
    }
    #controlContainer.dragged {
      transform: none;
    }
    #controlContainer > * {
      pointer-events: auto;
    }
    #wallpaperToggler {
      height: 22px;
      width: 22px;
    }
    #toggleImg {
      height: 22px;
      margin-left: 8px;
      position: relative;
      right: 14px;
      top: 5px;
      width: 22px;
    }
    #buttonThemer {
      color: #FFF;
      cursor: pointer;
      opacity: .7;
      text-shadow: 1px 1px 2px #000;
    }
    #inputThemer {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(2555, 255, 255, 0.15);
      color: #FFF;
      cursor: pointer;
      height: 22px;
      margin: 0px 4px;
      opacity: .7;
      padding: 4px 0px;
      position: relative;
      text-align: center;
      top: 0px;
      width: 30px;
    }
    #downThemer {
      color: #FFF;
      cursor: pointer;
      opacity: .7;
      text-shadow: 1px 1px 2px #000;
    }
    #spacer1,
    #spacer2 {
      color: #FFF;
      filter: brightness(2);
      margin: 9px 16px 0px 16px;
      opacity: 1;
      pointer-events: none;
      text-align: center;
    }
    .spacerX {
      text-shadow: 1px 1px 2px #000;
    }
    #buttonLogo {
      color: #FFF;
      cursor: pointer;
      opacity: .7;
      text-shadow: 1px 1px 2px #000;
    }
    #inputLogo {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(255,255,255,0.15);
      color: #FFF;
      cursor: pointer;
      height: 22px;
      margin: 0px 4px;
      opacity: .7;
      padding: 4px 0px;
      position: relative;
      text-align: center;
      top: 0px;
      width: 30px;
    }
    #downLogo {
      color: #FFF;
      cursor: pointer;
      opacity: .7;
      text-shadow: 1px 1px 2px #000;
    }
    #controlContainer > button,
    #controlContainer > input {
      font-family: Consolas;
      font-size: 18px;
    }
    #analogClockBtn {
      color: #fff;
      opacity: .7;
    }
    #analogClockBtn > img {
      height: 22px;
      position: relative;
      top: 5px;
      width: 22px;
    }
    #analogClockBtn:not(img):hover {
      color: orange;
      opacity: 1;
    }
    #controlContainer > button:not(#analogClockBtn):not(#wallpaperToggler):hover {
      filter: brightness(2);
      opacity: 1;
    }
    #inputThemer:hover,
    #inputThemer:focus-within,
    #inputLogo:hover,
    #inputLogo:focus-within {
      border-color: #999;
      filter: brightness(2);
      opacity: 1;
    }
  `);

  // DATE/TIME CONTAINER
  GM_addStyle(`
    #dateTimeContainer {
      align-items: center;
      border-radius: 8px;
      box-sizing: border-box;
      display: inline-flex;
      font: 18px monospace;
      max-height: 32px;
      min-width: 32px;
      padding: 0px 8px;
      pointer-events: auto;
      user-select: none;
      z-index: 4;
    }
    #dateTimeContainer.dragged {
      transform: none;
    }
    #dateTimeContainer > * {
      pointer-events: auto;
    }
    #digCalBtn {
      border-radius: 8px;
      cursor: pointer;
      height: 33px;
      margin: 0px;
      width: 32px;
    }
    #imageCalendar {
      border-radius: 8px;
    }
    #dateTime {
      background: #34495e;
      border: 1px solid transparent;
      border-radius: 8px;
      box-shadow: none;
      color: #FFF;
      cursor: pointer;
      display: block;
      margin: 0px 0px 0px 2px;
      max-height: 32px;
      min-width: 0px;
      padding: 3px 10px;
      text-shadow: 1px 1px 2px #000;
      user-select: none;;
    }
    #dateTime[hidden] {
      background: none;
      border: none;
      display: none;
      padding: 0px;
      width: 0px;
    }
  `);

  // LOGOS
  GM_addStyle(`
    #logoGoogle {
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
      height: auto;
      left: 50%;
      max-width: 100%;
      opacity: 1;
      position: absolute;
      top: 0px;
      z-index: 999;
    }
  `);

})();
