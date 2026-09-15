// ==UserScript==
// @name         Google Homepage Dashboard
// @namespace    srazzano
// @version      2.7.1
// @description  Google with centered logo, wallpaper, date/digital time, resizable analog clock + draggable containers
// @author       Sonny Razzano a.k.a. srazzano
// @license      MIT
// @match        https://www.google.com/*
// @match        https://google.com/*
// @exclude      https://www.google.com/maps*
// @require      https://raw.githubusercontent.com/Razzano/Google_Homepage_Dashboard/main/Dashboard_Translations.js
// @icon         https://raw.githubusercontent.com/Razzano/Images/master/googleicon64.png
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

// =====================================================================================
// NOTE 1:
//   • To prevent a lot of scrolling, go into Settings in the top right, next to
//     Installed Userscripts, and scroll down to Editor and uncheck Word wrap checkbox.
// NOTE 2:
//   • To open all Google App Links in new tabs, download Tampermonkey script:
//     view code at ↓
//     https://github.com/Razzano/Google_App_Links/blob/main/Open_in_New_Tab.js
//     or install from ↓
//     https://raw.githubusercontent.com/Razzano/Google_App_Links/main/Open_in_New_Tab.js
// APPENDIX:
//   • GLOBAL CONSTANTS • DOM HELPERS • OBJECT GROUPS
//   • LOGO MANAGER                       (Section 1)
//   • WALLPAPER MANAGER                  (Section 2)
//   • CLOCK MANAGER                      (Section 3)
//   • DATE/TIME MANAGER                  (Section 4)
//   • CONTROL MANAGER                    (Section 5)
//   • SEARCH RESULTS BG OPACITY MANAGER  (Section 6)
//   • VIEW CONTAINERS                    (Section 7)
//   • UI MANAGER                         (Section 8)
//   • EVENT LISTENERS                    (Section 9)
//   • CSS                                (Section 10)
// =====================================================================================

(() => {

  'use strict';

  if (window.top !== window.self) return; // Prevents Search Results iframe from accessing script

// =====================================================================================
// GLOBAL CONSTANTS
// =====================================================================================

  // Manually Adjust Positioning of Clock Elements =======================================
  const BASE_SIZE = 360; // Clock diameter
  const DAY_BANNER_WIDTH_PADDING = 1; // 0 default, +2 expands left/right
  const DAY_BANNER_HEIGHT_PADDING = 0; // 0 default, +2 expands top/bottom
  const DAY_BANNER_TEXT_TOP = 0; // +2 down, -2 up
  const DATE_TEXT_TOP = 0; // +2 down, -2 up
  const TIME_TEXT_TOP = 0; // +2 down, -2 up
  const AMPM_TEXT_TOP = 0; // +2 down, -2 up
  // =====================================================================================

  const LANGUAGE_COUNTRY = ['ar-SA','bn-BD','cs-CZ','da-DK','de-DE','el-GR','en-US','es-ES','es-MX',
    'fi-FI','fr-CA','fr-FR','he-IL','hi-IN','hu-HU','it-IT','ja-JP','ko-KR','nl-NL','no-NO','pl-PL',
    'pt-BR','pt-PT','ro-RO','ru-RU','sk-SK','sv-SE','tr-TR','uk-UA','zh-CN','zh-TW'];
  const SHORT_DAY_LOCALES = ['ar','cs','da','el','en','es','fi','fr','he',
    'hi','hu','it','ja','ko','nl','no','pl','ro','sk','sv','tr','uk','zh'];
  const LONG_DAY_LOCALES = ['bn','de','pt','ru'];
  const DAY_ABBR = ['Sun.','Mon.','Tue.','Wed.','Thu.','Fri.','Sat.'];
  const DAY_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const IMAGE_COUNT = 18; // 0 - 17
  const WALLPAPER_COUNT = 52;
  const WALLPAPER_MANUAL = 0;
  const WALLPAPER_HOURLY = 1;
  const WALLPAPER_DAILY = 2;
  const WALLPAPER_WEEKLY = 3;
  const WALLPAPER_MONTHLY = 4;
  const WALLPAPER_START_DATE = new Date(2026, 0, 1);
  const _SECOND = 1000;
  const _SECONDS = 5000;
  const body = document.body;
  WALLPAPER_START_DATE.setHours(0, 0, 0, 0);

  const Settings = {
    get(key, fallback) {
      return GM_getValue(key, fallback);
    },
    set(key, value) {
      GM_setValue(key, value);
      return value;
    }
  };

  const USER_LOCALE = Intl.DateTimeFormat().resolvedOptions().locale;
  const localeTestingUnlocked = Settings.get('localeTestingUnlocked', false);
  let testLocaleIndex = Settings.get('testLocaleIndex', 0);
  const LOCALE = localeTestingUnlocked ? LANGUAGE_COUNTRY[testLocaleIndex] : USER_LOCALE;
  const LANG_LONG = (LOCALE ?? USER_LOCALE);
  const LANG_SHORT = (LOCALE ?? USER_LOCALE).split('-')[0];
  const DAY_BANNER_FMT = new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long'
  });
  const DATE_FMT = new Intl.DateTimeFormat(LOCALE, {
    month: 'short', day: '2-digit'
  });
  const TIME_FMT = new Intl.DateTimeFormat(LOCALE, { // with am/pm
    hour: 'numeric', minute: '2-digit', hour12: true
  });
  const TIME_ONLY_FMT = new Intl.DateTimeFormat(LOCALE, { // w/o am/pm
    hour: 'numeric', minute: '2-digit'
  });
  const AMPM_FMT = new Intl.DateTimeFormat(LOCALE, {
    hour: 'numeric', hour12: true
  });

  const TESTING_LOCALE_PIN_HASH = '9d1247a5806e85493ef1eef4e88fff16a16ccbfd5aee1bf18293930de1393778';
  const hashPIN = async (pin) => {
    const data = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };
  const toggleTestLocale = (e) => {
    if (e.button !== 0) return;
    const currentIndex = testLocaleIndex;
    if (e.shiftKey) {
      testLocaleIndex = (currentIndex - 1 + LANGUAGE_COUNTRY.length) % LANGUAGE_COUNTRY.length;
    } else {
      testLocaleIndex = (currentIndex + 1) % LANGUAGE_COUNTRY.length;
    }
    Settings.set('testLocaleIndex', testLocaleIndex);
    location.reload();
  };
  const showTestingLocalePIN = () => {
    if ($id('testingLocalePINPopup')) return;
    const overlay = document.createElement('div');
    overlay.id = 'testingLocalePINPopup';
    overlay.innerHTML = `
      <div class="testing-locale-pin-box">
        <div class="testing-locale-pin-title">Testing Locale</div>
        <input
          id="testingLocalePINInput"
          type="password"
          inputmode="numeric"
          maxlength="20"
          autocomplete="off"
          placeholder="Enter PIN"
        ></input>
        <div id="testingLocalePINError" class="testing-locale-pin-error"></div>
        <div class="testing-locale-pin-buttons">
          <button id="testingLocalePINCancel">Cancel</button>
          <button id="testingLocalePINOK">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const inp = $id('testingLocalePINInput');
    const error = $id('testingLocalePINError');
    const ok = $id('testingLocalePINOK');
    const cancel = $id('testingLocalePINCancel');
    const close = () => {
      overlay.remove();
    };
    const verifyPIN = async () => {
      const pin = inp.value.trim();
      if (!pin) {
        error.textContent = 'Enter PIN';
        inp.focus();
        return;
      }
      const enteredHash = await hashPIN(pin);
      if (enteredHash === TESTING_LOCALE_PIN_HASH) {
        Settings.set('localeTestingUnlocked', true);
        close();
        location.reload();
      } else {
        error.textContent = 'Incorrect PIN';
        inp.select();
        inp.focus();
      }
    };
    ok.addEventListener('click', verifyPIN);
    cancel.addEventListener('click', close);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        verifyPIN();
      } else if (e.key === 'Escape') {
        close();
      }
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
      }
    });
    inp.focus();
  };

// =====================================================================================
// DOM HELPERS
// =====================================================================================

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SVG_TAGS = new Set([
    'circle','clipPath','defs','desc','feBlend','feComposite','feColorMatrix','feDistantLight','feDropShadow','feFlood','feFuncA',
    'feFuncB','feFuncG','feFuncR','feGaussianBlur','feImage','feMerge','feMergeNode','feMorphology','feOffset','feSpecularLighting',
    'feSpotLight','filter','foreignObject','g','image','line','linearGradient','marker','mask','path','pattern','polyline','polygon',
    'radialGradient','rect','script','stop','style','svg','symbol','text','textPath','title','tspan','use'
  ]);

  const $el = (tag, props = {}, ...children) => {
    const isSVG = SVG_TAGS.has(tag);
    const el = isSVG ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
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
      if (key === 'title') {
        if (isSVG) {
          el.querySelector(':scope > title')?.remove();
          const titleEl = document.createElementNS(SVG_NS, 'title');
          titleEl.textContent = value;
          el.prepend(titleEl);
        } else {
          el.title = value;
        }
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

  const getLocaleName = (locale) => {
    const [lang, region] = locale.split('-');
    const languageName = new Intl.DisplayNames('en', { type: 'language' }).of(lang);
    const regionName = new Intl.DisplayNames('en', { type: 'region' }).of(region);
    return `${locale} ${languageName}-${regionName}`;
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
      if (e.target.closest('#controlsGroup')) return;
      if (dragSelector) {
        if (!e.target.closest(dragSelector)) return;
      } else {
        if (e.target.closest('button,image,image,img,input,select,span,textarea')) return;
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

  const State = {
    analog: {
      animationId: null,
      intervalId: null,
      running: false,
    },
    wallpaper: {
      timer: null,
      style: null,
    },
    digital: {
      interval: null,
    }
  };

// =====================================================================================
// OBJECT GROUPS
// =====================================================================================

  const BANNER_STYLES = {
    gold: {
      background: 'url(#bannerGradientGold)',
      border: '#666',
      highlight: '#fff',
      highlightOpacity: 0.35,
      font: '600 5px "Segoe UI", sans-serif',
      text: '#000',
      textShadow: '1px 1px #ddd',
    },
    red: {
      background: 'url(#bannerGradientRed)',
      border: '#666',
      highlight: '#fff',
      highlightOpacity: 0.35,
      font: '400 5px "Segoe UI", sans-serif',
      text: '#fff',
      textShadow: '1px 1px #000',
    },
    green: {
      background: 'url(#bannerGradientGreen)',
      border: '#666',
      highlight: '#fff',
      highlightOpacity: 0.35,
      font: '400 5px "Segoe UI", sans-serif',
      text: '#fff',
      textShadow: '1px 1px #000',
    },
    blue: {
      background: 'url(#bannerGradientBlue)',
      border: '#666',
      highlight: '#fff',
      highlightOpacity: 0.35,
      font: '400 5px "Segoe UI", sans-serif',
      text: '#fff',
      textShadow: '1px 1px #000',
    },
    classic: {
      background: 'url(#bannerGradientClassic)',
      border: '#666',
      highlight: '#fff',
      highlightOpacity: 0.35,
      font: '600 5px "Segoe UI", sans-serif',
      text: '#000',
      textShadow: '1px 1px #fff',
    },
    dark: {
      background: 'url(#bannerGradientDark)',
      border: '#666',
      highlight: '#fff',
      highlightOpacity: 0.35,
      font: '400 5px "Segoe UI", sans-serif',
      text: '#fff',
      textShadow: '1px 1px #000',
    },
    none: {
      display: 'none',
    }
  };

  const savedBannerStyle = Settings.get('bannerStyle', 'gold');

  let bannerStyle = BANNER_STYLES[savedBannerStyle] ? savedBannerStyle : 'gold';

  const ICONS = {
    banner74: 'data:image/png;base64,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',
    bulb32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFqUlEQVR4AZyXW2xUVRSGv5lpy6VKgSKFmkBRQETAiEEuUdsXrYjxwTTIA4KYqCgxxHhX4gPxEoUgBgIpxgQx4cFoggmKgmJHsK1Qr7EKlluhlF5o6XWmnZlzjv867ROdoTNOzpqz99r//6+1915nn5kgGX6aD1DafTi4I1qZUx07lnu2//joMz1Hc6qb9gd32ViGcqSdQMsBHoxXZ9VOnDnlm+vmrHhm5JwNC7Nv3ViUM2vjtNx5bywsuKvsSRszjGHTTSStBDq+Y/OEmyZ+lTXr9dlMPQL55ZD7LIxeLXscctfJ9zFMqcAwhjVOOkkMm0DHIXbmTZ/7QqBoL4x5FYKieOfAa5L+oFnbfKFsH2NY4xhXoGteUks93rSfJ/Km3bKWwm2QfYeAjeBU6/6vEqgD99SAeWpzUmNVGhPGsOIY1zTkTHkFU45oYEJB9iYmv6lZF6nXB4nvFbBedpGBFWjRvVl2CVz5XI0ZBmGD4ojra4id6gqmGqjfxyuhwrLxZM2HQEIB/lECteApqNumeyc4veBGZGq7l8FTMglhXGGNI65pmBYpPikTyMvlUfJWiKbgjoLGKhRQgZ0r4HZDIgaOJ3PV14zN52jMESZmWHEQVxq+lpSSXSkTGDMubx45M8BrBVd7HPkNEh0Q79FdM3ei4DmyOFg7Ll+iCx9jWOMYVxq+VrLo8iVNoKacWYFRRSG8fgU4D66sT8vbp5nHLYiW3ZY/oRn7SZlf1i8zjGGN44knDdMyTcUbciVNoKubXAIjBNbsHRVYXJXtaqaBkSrISRCaAjmFsjGQPQqy8uWbCJ7ahjGscYyLNKTla0rx6it4tcP6dc100K8Ze5qtFZejpSdHQW5W0MWyeyCrBLKXqH03jCyFEdaeO4AxrHGMaxrS8jUZ+gkOdcHTmzjd0Vrfiat9dazCZU5E+9+uPVZxJVQTjgrNKj5xRn71A+Mha7bawhjWNY5MGqZlmsliBZM5zVd3jiNE/gBXdWD77Sag51do3wld+2VHoVeHUq/ukYPQuRva3sXHGNbniCsNX8tEk1jKBE7Ws5vGzyGopY/HUCaafYzwhU8J171G+MSLhP9aM2C1a9V/ivC5D32MjzWOcaXha0kh2ZUygcfe5ouqyvM1RC8M8PS44zgU56+keGyp7mUUF6yh+IbVFE9YTvG4++VbiWEwrLHENQ3Tsm4yS5mAgZesZcGpowfbsar2AuDZweNonx3CbVqdnrPQ10j48mcQGxwzjGHFMa5pmFYqu2YCRpqxnPy6ypoePBVhQEm4ChQYa0NKKKQZ6w1ovcA48McCGNY4xrWha9mwCRh55gquP1nTEMXR2ob0rKPANhCcDCE9/9YmACH5hTGscXz3MF9pJWAa31axJd6uA+m6RTD+PnPJRmkFVOlqMWICjL4TwxjWXOlY2gms386Gmr9pIKFVyJk3oO3o6I3rpLOe7XuiH8MY1lzpWNoJmNiFFr4k0qClHqwBO/G8bBvC3//oJXzMgCet74wS6IlSQ7xTwfReMPlEH25Mb0VrWwEmevEx1k/TMkqgr49GYnpHxGUWINFNj05rayor0CvZxww40vrOKIFLXZxuuNjq0FXFomgJ/dEokSgUni/xi7HjcpNjmLQiD4IySuCtTzi99xBbT1Qf4sca+DoMB3+Cn3+HX6rP8lI5PxhmUDutW0YJmOKMALMPd3oUlXk88M52lt0I67ecYOlzfYRmkmuYTCzjBFZ9tK1mzy7YsRkemr+O6S9X6u/VJMbnj2DP1ud1TGYSHnEzwxMgb8GyR6D0YVh8LzoTC3E4Q69+Kro02y+XjBQzXoFuVi3d8l64tfwDj+OVVvstmsVUevv/7Ohn77KMoguccQLi0EHJ+/sqxh6rOF4W6aQs0kZB7RVu168UMv78rwQUZZaeu4kebraHlwNegXy3yYZcwzn+AwAA///JnTNLAAAABklEQVQDAHDkmwoB1glBAAAAAElFTkSuQmCC',
    calendar32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABUklEQVR4AcySMU7DQBBFBx+Ag3CGINwhUdCAaJGg4xxcAyRaBA0FUjpHSZEmKXKU5ACJ/2ZHsXa8Ixcz60TZ/fYfa/7zeirq+TVNs++xg2VdEwAcwBpS48Yea7SDsMcazLixxxrtIAIguAW3E8D7ek9Y3XDcd5dlLfY6AiAkGsUkZlbirVuCenHZ7v1/01oLcTyB/qwirgDgN2TtUrDHalETAN2mJa7HB2gmW9q9XY2ykD3+CZT4zlqG2Qn8/H7T3f0tQdNAeLmaGcDn1wfNFzOCpgDwcjUzgJfnV7qe3BA0BYCXq5kBPD480f/flKApALxczQwgDR16f34A2sR61MQJaBPrURMA2sR61ASANrEeNQEwdHqtnjs/AI9J13qKE/CYdK2nAPCYdK2nAPCYdK2nALCa7qF9qrquL1ab5dDnzZ5DJrLDCeAChsfK9UQm3uYAAAD//6SULkcAAAAGSURBVAMAnK6TNOnKaHQAAAAASUVORK5CYII=',
    calendarDaily32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABP0lEQVR4AeyUsQ2DMBBFTx4iSio2YAwGyBhp01JkgNRp2CEFo1BnACsDpCV8pJN85kwUG0NDpC/b/8D3fOdgKPB7W9sHQrRkTAXgBDy6IJrHcY7xyD5G9niEB5lXXV+7suxZN6Lx5I/jkWxVEfsY3RjWrtzY3Ht+zHza9g6SraS2ADAXa+nZdZhOtGRsAnAuy7H0KBXmbnas4UOYLxEzfdPQljKnoqAtNWmBW9bQ/DD8QzSFnp/zowDmNvw3lgQwfFTwVZzk5Or4Ac1PAvATxKyTALQTASJUGc1PAkCyVEUB8En8MQYmCiAmUegdARDqaU5fAIQoc/oCgHvqJ8zpCwA/8RrrHUBUIOdtRzu1/QUAHlpbAiDnbcfBtP0FAB5aWzuAqIB2S9GSnL4AQLK1JQC0WwqgnL4AQLKl9Wu/LwAAAP//woGskAAAAAZJREFUAwAkmVFwmFXNUQAAAABJRU5ErkJggg==',
    calendarMonthly32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABWklEQVR4AeyXsW3DMBBF72uIwKm8gVJ6Aw+QMdKmdZEBUqfxDik8iuoMQGQAt7Q/gQN4pGTQokQ3NvBB3j+R90QeDKiTid+/c34iJUvmRgG0gI4xyJinec3pqD5H9XSkR3V/h8Pn0Pde9SUS3vxnsxG334v6HOMc41hx7ta6NNedT6dvkjxKo1dAmA/n5HcYOM20ZC4DeO/7cPQ8Ks7j6ozpU5wvkev88SiPVPe63cq9etvtZAmxbnYF8bG2mFcBeO+FSkHpUSV+FUBaYE5cBQBAAGR1ART7VQBZ5RlGAHi5/u3eoxl1JpcEgMlsg4QBYOdSaV161Bq+AUgLtIgNAFDevYQD6p83ANy0tZ4A5gTY6VR6DfSoNXwDkBZoERsAoL6rCQ2U72MAuLi1ngDmBNjpVHoN9Kg1fAOQFmgRGwCgvHsJB9Q/bwC4aWsFgOsXKz+5V9GtvfmyFwAAAP//r2BSKgAAAAZJREFUAwCNOZlwcm2b+AAAAABJRU5ErkJggg==',
    calendarWeekly32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABMklEQVR4AdSVsW3DMBBF7zhE4FTeQGN4gIyRNq2LDJA6jXdI4VFUZwAiA6Sl/QSccZBow4Vong088PQ/LB4/aTrJlc9fzuWKJWt61QZsAht9IzXNfPNsNJ3RNBvRIP3u9x/jMBTjU2Ra+fdmI3m3E9MZvcezx3u3vjf30v/x+EUnvahuAc285yw/40i5YE1v0cDbMEzRExW1n51ndKBew0vlcJCepNftVnqy2AIf6yPq527g5XxXwDwpNLhHf+4Eztcq/wvzhU4a3txAA6/HSID96gFJxEiATqCUIkDtQQOvUaMBtQcNvEaNBtRGrARUVVTVmruMqtpMj5EAv80eEHGMBOgE7C6g9rTUYyVg58CvnrqlHisBVvtoYiXQ8rSTbO39sRJoedpJoPb+5gkw8S1OAAAA//98QPg4AAAABklEQVQDAHIwmXCjuaaGAAAAAElFTkSuQmCC',
    clock32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAJIklEQVR4AaSXfWxb1RnGn3PvdeLETpy4SdOkSb/SNi0hodCyoW1iomJlTJsY+2NMICTYGBUbDDGxDLQBgaktoysDadP+mbROE6irVMGmdWgItbS0f4xBP9KvNE3TljZ2bSd1Yjuxr+/X3uc4qQplIIbj536c876/5z3nnnuSGPgMn+P9vdcOPdv7s8Hnev518tmehMiZUYJt7GPMZ0DiUwtI9K+uHXymu49GmM6/As99OFLffHOsY3lrU9cqq2n5KivWsWwe29jHGMYyh7mfVswnFjD0XM99eWWfQ75wb6xjqbV43R29nWtvWdDe2x5uaQ8Qrx9HPDaOlnal2MY+xjCWOcwl45OK+NgCWDmnNFTX8KdI64KmJd++69qWhVGELr2LiRP7MXLgJI4fmsTRo77W8UNZ3cY+xjCWOcwlgywyP66Qqwo42b+6Ka/Kw83Lrlu3aHU35q9YACT24szhYQydtnAuXYsEluBi401It61FquVmXIyt0W3sYwxjmcNcMsgik+yPFvGhAnSVqjwwb9WXWuNzynBG3kb62AEMnw0hPRnC6MI7kbt1A0K3PYGGL38Ptd1rEb/xW2j86n26jX2MYazOkVwyyCITwtYeV1TxoQJyRvm15pXXt9aHx1G+MIBT5xswfrGEZN0aON/8NeauuQ0tLS2IR6rQGK3B9m1/RTaTQqPcs419jGEsc5hLBllkkk2PK/xxuQAulkhD87rGJsBJD2M4EUe29Sso3bMd9Wt/iKbGGGpMBcs0RRZ818Ol8Symp4qoClXpNvYxhrHMYS4ZZJFJdkQ86DVbhC6A0xIEweZwfaNuz05HoNwiam9+QN9/ngMZZJFJDj3oRU/e6wJyvv0YHKcYX9yGcuY0xidCSC2+k/1aUcuHDB4mR2+FYIkcx0Uul8d0sYjq6mrdxnbGMJY5OlkOZJFJNj3oVVDOj6Wr8giUqfrnrrqpw5g+hwtJC5PmXNTd+B2E4WgZhgHTtMTEQmimCJqm0hlMTU2juiosfaGZPgumxDJnNp8sMsmmx1zxChBs1AVw6wzKdio6px5ufgLFkjzfG+5GOGRAzfwYhglToKZhwbIqch0fxempmQKqL7czhrHMmc0nyxcm2fSgFz3pbVgKt9fMaW22ghyy4w5KoRjCbcugfAeGjJwyDUNfm6acpRBLlMvnoRSkiCJMzoq0GSKTMRJvGhI7I7LIJJse9NKeCrcbvgpujbZ2VMHOYmKqCu6862RFG5wdKENVpBQMZUAZJkwRZyFfmEJIZiNXyCPwA7Ct6sAhRLe8BB2rZnKFAflYUhjZ9KAXPeltqAA94VhE3r0Syn4VVOs1gOfI6AwIQgty5BfyUSIaTE5OwjAqM+D5Pqq2bUfdffejeO89qMQqOc1ISSCZwqYHnBLoSW/pQbNp+PC8AAFMqJoGyJAgB8jrouU4ZbmXFjEyZbojtVGkUilMyluQSCRhPPkLhHbsQGHgEFRbG5RSlXghkiqZ8vU1OxAPetFTgppZAFTgy/VMkpxoLLkwZYqp6uqwnlaDQ5bIkbMjeGvXLnQtXohH3/gnDh4+jIMbNiAjs1IqlSAI1NSEUVtbo0UWmQE7JB8SUfEEWEDG4/QYMnr4CFwZrYzALpfhOk5FrgvHdWSWXJiWgb3v7IORHMXW3Xvxn6VL8GAuh58+/jh+8OBDWP+jR9H35NPY+PwWbP3zq1pkQZhkK/FQhiksB/LJGFLVEdspwjANWIaHYPycFKzAjxd40PI9+CLX82DbNrrzOWzbvQfP9nbj9fp6RKN1mNc6D8uWdmLJkkWYP78N4bDMmsyYISIrgNJsetCLnvQ2pIK3phNjgOzn0VoFK3kQjvRIwfA9f0ZSiJh7novgL6/ghg2bsO3l32Js2Qqs+cIX8fKLL+CFTRvw1C+fwBN9j+HRR9bjJ488iLu+e6cWWWSSTQ960ZPehhvgjemxTNEPDMxpqUdVYRReaQpc2TTU8l24Yh7b8DxqXnsdo/t24Za778KvnntKzB5CW2uLzKCCLzPGNcAtekLWQ6FQAKVZwiSbHvSiJ72Na/oHjsoLEJY3A+GIgbAZAKd2wzUseU5eRbLft31/vRgEuPDHP0BWCQpTBfCxlEpFTMuOyEdTlnVTljXkypryZN24UrSWsMgkmx70oie9DT4fea9/nhk+78MromNpKyIfvAOnMAE3CKBSaXR9/Q5kv7EOyccehitgLkhXXk27bKMsZ95TrixU9mvRXB6lKyKLTLLpQS96am8eokHo91P5Kde2ZQasLOLxOtTs/51sTArxHX/Hqc0bkbn9a2LuyC+ysn4jaMj9QUuMK/dOJUbuXdkdHV2sq1lkhoVND3rRk956Btr635+Wlbk+l5lkG+rqamTNerBSR3B+/QOY6unW7f/PwUod0ywymU8PetGT97oAXix/+sjW3MUxpzhZQF08wILmWlQd34nwni0yzTJyWaSVEVVGWZY9Qo9aRuvINR8J7/VjUCZsWRvhPS+i6sROzSKTbHrQi57U5QJ4UxvUNCRPpeBkE4i3R7AgkpN9Oou63ZvgnnkXtmyjjozHkT/HuNBoTJXleTvympZhwA5MuMP7ENv7G7TUh7C4vUmzyCSbHvSa1WwBig0yLbbnhZrPD6Zhp0cQ74igo7MGnYsaMGdkJ+p2bQSO/gPlSxdg2yXY8pxtWc5luwhb2tSRv6Fu90Y0fbAbnT1daF8UQoP8dU0WmWTTg14i7TlbwOzZ6+p/f6zWC0USQ6lgYnQMSt6ZaGQCK65rQ2dnC9oKg5hz9FXE9r+E2NsbEdsjkuvmo9swv3QWy7qXo2vNUkSCU0AugezpYZBFJtli7In41Z76IHeB6PJXqpzufPqYMZbM3T948II3eS4NlT+LaHUSC5fHsOL6RehevRIrr+/Fyht65foarFi9FAu66lErxipzCJMjoxgcSHpjqfz9ZJF52aByoQuZLYC/DmevK91y5GKJIVyfzpT7hgYybmLgDEpnBhCkDsCcOIDQlKjA6/fgX/w3SkPvYZT/QR0Zc9Pjbh9zyRDU//xeacoirgpk5cufGdjc9cyR0GTR6Dl/we4bHsy+OXQ4lRw6mHS1DqeTwyeyb54fLfflSmYPY5nD3KuAH2n4LwAAAP//7vP5FgAAAAZJREFUAwCaWgZGzFGC6wAAAABJRU5ErkJggg==',
    clock74: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEoAAABKCAYAAAAc0MJxAAAQAElEQVR4AbxcCXxU1fX+7iSZLCxZgBDWLCRhX0RUQBCURQQCxYKtigotCgqIgAKtBQvYKvqrxQW1rn+s4ooWxaJi/6CitSKKC4oCIuLCIossSSaTzPR8582dvJlMQmKg87vfu/eeu7x7vnfu+l7iwf/+Z+SWnQSLBW8L9gnKBMFqUC7yY4JPBUsFZwtYh3j/O/e/IipTVLpLcEAQEGwR/EHQV9BMkCCozsVJQgNBZ8EMwQYB6/CL//+C0wWn3J1Kolj3ItGgWLBXMF2QIThZLl4qOlfwvoDEvSx+W8EpcVTmZFecJhWuE1QIpnfs2DFZ/Gpdy5at0bp1W+Tk5OGss/rEzNe+fccq8qysLOTn56Nr164oLCw0TZs2G26M2ZWUlMQunFalQD0FJ5Mor7RlnTT2UII3fqCE6dI+//xz+sjJyUH79u2FjLMwdOhQXHrxJbhq0pUYNnQIikYMV79Ht664evIUTLtmKiZfNQlTJl+p/jn9++Caqyfj4l9fhAuGDUX/fn3RvHlzeDweBINBNG7cGM2aNdVwaWkp2Aav10vC2Ca9f30vJ4uohdI4X0JC/EA23F/G8RfIy8tT9O3bVwk677zz1AIKCgqQ2bQpEr1epKemIjEhAamNGqFZkyYKypplpIPIbJIBIt5j0FRk7cWKunXuhNNOOw3du3cHLcvn8yE+Pl5lJIRtKCvj/ACfxOcI6u089awhU8ofMMazgI3z+x2CcnOz0aVzIToLhg4ZiJ49uyKzWTri4gJIS01Bs6apaN6yKbJzW6NV2xZoV5iDtrmtkJ3XGm1yWobCORLORlarliLPRdfuXdG5axd06NwRLVq3Qk52S3Ts0A6dOxWiT+/Tkd8uG/FSf/dunFAR/qWkpCwRy6N1sa1heV0D9SFqqtxsb3JySkYwyLEUIEHdunVBly6dQCvKyc5BIBBAQnyCdJVMtGndWsajNphx3VxMnjIDv510DSb+ZgrGXzYJl1z6G4wdN16xe/du9cddNF7kE0Gfab/69eUgpk6bpXW0adNGxqcCFBQWSrcuVKvt2LEDzujVXZrmuOLiYjCfWDwnlImOtO7Xn0vUS3KrewQoKSlGhw4dpMH5QlAX9O5zJrKzs5GUlIImTZogL6+dKNEeU6fNxlWTr8UVE65isWrx1ztuqTYtOoHkkeBJk6bKvbuiW7fuin79+uOCCy7Q+5511lloJN1aBnx2z0ekjscFdXaeOpcAvpQyg7OyWooHISIPDRoko1evXkJQG3i9iUjPSENmZjN56nPEcq4FrUAz1+Iyc9bvQNQia0SWESMvVMsrKCgUYhqqVZ1//vkQS9JBP0HGwfLycpa5VC7vCerk6krUj1J7Upu2uUl79nwvQaCgoB3OOOMMNGmaAW9iAjLSUjFr5u/EgmZpem0vY0aPwo/7f8B/3t2Afzy/UnHTfK5Ja1uDk2/wkOEa6Na9Fzp37oxhw4bJA8xGghDVrVs3tTLJcIaAD1y82rm6ELVHqjzUNju3ze5vdkoQGDlyuBBViAYNk5GSkiRjVK5aQ126DysiMZy5khJTsO3LHTKeNcc55wzEoEFD8KtxFzFLrcF7cww899xBGDv2InTs2BGcbbt06aJ1JCUloVOnTgwXyEzJQZ7hE6K2RJF9Vpr/zS6HpLFjL0ROTi7i4o2YeiO0a9cO4y/9LdjQE941KkMnefJeWSocP34cw4cPl3Gmm1rAjh07rFJRJaqPRnfbwYOHyvhZqJbVv39/nVx4L9aQnp4OCVMvRmuEp8ZUJ/EV8VoJsgTo0KkjLr70En3qSUmJ4mcKSXkYN3Y8k9WibGNpKSqUizss0Ugni0aOJRx0CYb/9a+12Lt3P2bPviEyb4zY1s+2gN30480fxkgFevfui8zMTHDMGjx4sObp2bMnMjIyEFpvUUeVV3c5EVFs5dDsNm1TWEGnwvbo2akrMlIaITnJixZZzdEuNw8jR/ySyREgMXfds0xlDN/8Z2c2Ky0tUZn7kpTSAGXlFYiXiaA8EMTz/1iFxjLWXTNtMg4e3u/OGjO8detWbNz0PgIIxkynsGfPXjj77P5qWSSMXZ0reqYJhgqoq3ixXU1EZUqR2wQmNTUVhTLNs59nyR6LN2gt+7NCIW7o+UWSpar7xYWV5I0oGqXbDOYypuotaUHSBSALQ6xfv17x/PPPY8GCBXjhhRdYrEaMHFWEprLS9/v9NeZjInUZMGAAhgwZgmPHjunqXuQ8tqGu1FmiVV3VVlfm2WqDHDs6ybahRcsWSExMBMniXqtf/3Ntlhr9uLi4cLoMoBquqOCeGeCUvWnjezIZpGD1i6t0oTpy+AUYfN4gDDxnAMSaJX8Afj93IxIMuYoKv3SbUpUHpeuyHvd9QtmqeAUF7WW4aI6ioiKdFUNdz+YL62wF1q+OqFslQ3J+fp4MhPlo07YV2rZtgzjut5o1kZmuHYZdENuSpFwVR4vxyAaWCVYZGydxtL4nnngC9PnE6Y/6xRiMHnMhRo4aLWSQ1Mqm0nK44md9BIlifVZWVuYQyLRYyJGTih49emL8+PFq6YWF+aCukjdZQN3Fi3SVd6+UeyU4NzMzI4lTfoI3TskSjsS8M9CqVRb6DKidJUk96mg9VgkKGKdyDBNMYzwCAYOA8GMQB4+JVyD045rIks8wyWec4dLSYjAcylqjx60NyaKO1JU6S4G5AnIgXqXzVAbDoTcYaiYr66PHjoLbE44fnOG4pzp/5Bgm14iADMw2AwdN99OmnHGC4bqgojxysCZBtC767EI8YmFbbZ3R3dXKrU/L4hqLOlJX6hxKUw5CYfWiiUoTae+83PZi7mUyFjVHTk62rmlatW6JweePlOSaXbAiAE98nK6sr502FWteXo0X//ECrrt2uspYmk+c1sMwwTh9N4zxwMSAzRMf74UxcUhOTpZ6X0CPHj3ww3ff65jHh8A6aWE2f3U+81LHLJnB/f4yUHfJ21uQJgg7TzjkBF5iAzhOsDtwEekr9aGlDOLjr7jKySHXlU89JlfHcaf/3DPP4dmnnwXDJs6pkuNMLDilACqC0M8dDok03RMXRDRsuvXLZf/2y3FjMXfuXFwgB4B8AGw7SSovDyhxS5fegdWrX8SKFY/jtdcil0yZmVmgjtSV5ag7OZD6XxKEnaOVE2W4X6uWbXH06FFw1dqiRQs0ktNDxt0r7vsfXu6UkOvdd9+JsReNxbhfjcOdd/5VJECFzEi8qUZOdAnKjCgwiEcYxsB4AhElAxVGxiwTIeNYJ6c4Yv0V8HjixfITQSUTEhJVZjN7vUlymjACI0YUYfnyv+Pdd9+1Sbhz6RJkyAqdulJn6koOJEM/ATkRDwgHJHaXHHJxSS839egeiWc5mZmZklTpuHhs2bJlWLBv375wmMcqjHg8Hq2DYQs+aYatz3BMGBnBYyRYy3IncWxy34thK2M+jlccI9vLEXQgUIG0tDQ5/knCtm3bmKwkMcC9IXXlvpB1sBy5kDS+ORIvkqgrHVKCsndrKNNmqi7xuaXgloRgCXYnNoZhwhhDT8GnwkAsMowxeqZdJZ3EuKEZ4nitF6gsK/B6E2SDfY5YmxdbtmwBiRsxYgST5BhoroIRbmcaN05V3SErfIcLXMk0wlpUc4l42a/JbJ6cdRtjhKgm+OWFF0tSpHMT4Q5zvGBOjyeeXhUY45BqjONXyWAFJM6G6+nHxcWrdb/88sva5R5++GEdVqKrvW7GXBhj9HyNHJALyeMVkBtYohaKQPq1X8akBkhMSlBmJ7gGcKZbGFOpKFftVu4OW5klzx/aXhhTWdbmUV/GKRAaOXkXYwwefPBBvPnmmzh06BDuvvtuGacqx1j3nRo1aujo3riBchFKU24sUWo2DRs2lOPbdGE8FTdcX/2hmTGVytpxyZggNm/eHKpbvJDSXHlLTEw/gV71oBUR1efAz0niMMHxhuNUkpxF0VIGDhwYs6rZs36vujdpkg5yEcqk3FiiGlPIp8+Rv0GDBozGBAfzohEjZe2yUtNvvHE+XnppFV588UUsWnSzysIXkkWEBVEBSYt/YoUMCXEOmCwyBCsfBEX1xWWXXYbLL78cV199NaZPny7bsbZaZVmZT333hbqTA3IRkis3JOq0kEDNjbtwOxBaudvnYG5BObcBRUWjZZM5Wt92QA47KAetw0IFVS/xK/6OhtOuBn1NJUkaEKJOIlm0Klq2MQYMG+NMLF451olexnjlAJEc2KECzu80EjXGCUPWPxUyfXrROLV6i7J5Y/nOTVllKJWKE6Go26MlkSTK6CtZllhTDkhXxkn40TLcEw6rtHGSx+UAZRYzZsxUDrhGszLxx1CrIRJQd+TIEXmj0gC/lXdtKjjBxVbGp8Ss7ps6pImUyovndm6SrJxkgaQSVniSfLaF5Bhj1BhIEOMkMdYt2P3IhSttCIkqsAJW2KF9vo2e0CdBvKEljOVtIWMMtPuh6q9cjpKP3XNfREJQXomb/d85smCCDAM+J1yPK9tljNFp3xijNfFhUs6Iu72MW7D7RaUVkKgmNkMjeVFow25/l7xQ+PDDTfjqq+2ydyqTA/pyQUBh85EwY4wuKhkmiTZN/ShLcZMVjE+AkT1b49NPhzl4ADA+2SHEXouhDj9jjK6hSA7BdkF+xpiwHDF+ebltZXnUyJ3ShESFBa3llXc44grce++9svjMwKpVqxQkwRijT8pmM8aJG+P4UU8EiNEFSdbhQz/hyJbPEGzYCEaOZht364gGw0ci4Y+L4D98CD/3R1KMcdrCMOthu0tKSvDss8/i008/xU03LVDCmBaNaC4iiOJ6I7rAV199BZ6Vc3vCV0kPPfQQeO4Tna8+8WCzFjjysZAlyxJTXAzP7m+RsnQpGsnisC71Vnk4MQpzNuNelTrl5xeA+sTIpkfTbnkEUTRPJvJEgGCY+Pbbb5X5AwcOSNcrB5f4lNcHgYDMbK4KgmnpKO/WHRVtsxH37W5UyKvxuP/8x5Wj5iCtxhgTzmSMibB4m8Dh5eyzz8Zbb72lD5xxm8aTBBu2XITjNkCfN6M/ffoMlPuLGZQul4YWctzy9ttv47PPPpPz8gI0lqMXTZSLMc64JMEanTEmnM4uQIQF7JaCij59EPfNLlS074C4bV8qZJoKZ6spYIyJSQzLGGPoKagjLY/faPGVuwpDl/iEFCxbdrfGmE8DoUuERdnZgGn2tCAtLQMTJvwGA+Sc3O+vwIwZ18miLQHuqdyYUEM4YBOsgD4RCgcDlbfylwXgLy+F8fiZGkbprNkgAvLqKdA8Cx45wmk4fFg43R1gfURYxntZhIWRASrPB0Rr4ekAN//uHFOnTgdBmZsLxitbLzF2LfGquG+++UZ33nxx2KlTZ+1+NhMbSyhxFIplhMOMV4NEOUwLBoRwd7qMUaXzF+D46pdx5LPPUd63L+Lfk1dZo4vgPod3F6lL2BjH+l9/fa087Djdm/Llaaw6ormIIOq7776rUoaDH49H+SlgGvyywAAADYVJREFUdna2nudwY1klIwUkyfoMEzZOX6Ckil8hJ5biVe/k8O/Yy2vgHzQIXtn5Nxp/acy8rI+ImRhDyFkvMTEJHEo4hMyePTtGLiCaCxIlCxcnL82yYaMMJ+K68gCf5koR80SbJeUKmj4D0T5lShrAI16eVqI2P6nn+LOrUCZHuAmvrkHKxAnhUqzHDV1+8B5EOFdkgDokygvcgQMH6mFev3791LIiczkx6umE9HqARG3ToFyMMTq7wfWj9bCQMY7ZGmOq5EGsnyipjWcawwTDdQGVFhQ//jjKxl0Er7zNSZETAK2C9VUHzRB54QBOcPvCB83xij6Jc+ckmY1Tm0ZPDNtI1FqbkYVYgY1bn0TZsPWNMVqZMY5v5RG+VUSUJWnsIkZeIiTEe8FGs1tH5I8VYR0iL37gQZSNvxzep1YgedZMkVTjeK9QGXcOEuCOkyRjjFsUNgByQC5ciWtJ1HoR6PTDyux34SKLcKzYEsYwFbcwJnRDNpKl6LtBmYBdJYhymfHKtFG0VhHX7FhPKEexLEB9V05B4qOPIOn3c0PSGJ6rTIxUFRnjtFl1EQl1F0/O1T8BObBxkfkF60nUOgno9MPd9AcffCDRSMcnT4aNcSq3hNlcQVFeSbMC68d4sjapLr6nXJrJugSli/+EElnnJd2/DEkLF0RWUwNBgUAgIi8JMsaAerkT4mVzTg7IRUhObtZ5JBIUHBHIjt2PL7/8UqbNSLL45FkxX1vzhq+++ireeOMNPPnkkzh8+DCLVoUopUL6MUDzZp18CJqvhksgXpQkCYJgYjx8ixahZM5cJN15BxKXyKmqyKMfFOtnW3kPKv3FF1/gxx9/1KUN4yTEprmsB5wVyYGrXeQmSKLYxCd5Ibg9ibW24I1J2Pbt2/TYl+/sORtu3Pgei1WFbTx9m8pwCMYYnXFYJ2rziyLbN28+SubfhOQltyLxL3+pXAAzn9RHq2ebiZ9++glTpkzRKZ/n5pYY60t2dVwvUndyoALnotxYom6ijEzzLOaf//wno1XAM+b09AzdyvAk4eDBgzjjjDOr5FMBG0wwEiKHwZ+NGHX4Zt6A4sV/RvLNi+C9y3lLbeunNRnjDBXsSlyF04L4Xo8EMZ15GaZvQd3JAbkIyZQbS9ReEZZxNcoPTDdv3oyPP/5YRJWOppqQ4NW3ExdffDGeeeZpPP3006BJR98M7h/JioY7vZpwULY8buhqn/VE5S+bei2Kb70dKX+cD++9+jcCmoPtJTE8/eBCmW2k8vQ1Q4wLhxHqTg7IhWQpE5Cb8Hs9ieNBXgh2Kb5VYdiC/Zs3WbFiBXgcs3z5Y5g3bx5uvvlmhCq1WR3fWkAsP4bCTqHKqzHmxMuPUPayq67G8b8sRcof5iHxoQdUSsshWbSQr7/eCXY/nkGxK2oGuVAf8dR9//33OqRQdxU4lzAn1qIovpYXgoMZB2wyyzi72N8fc8rwPPmHH37Qk0z+tUJ+fj7YIOZzg9ZAK7C+Oy164I1IsxFLsI3X4FN5/8RJOL70HiTPmQXvQw/q+Mehgn+TU15eoeu2igrnaIcEEe4qOYhTZ+rukoc5cRMlUws2WEY//fRjrFzpvLtb/n9/Q2JSqpYvKirSj8tee+01sO/PnDlTLUwToy5sDJUwxoCklfs5wUZlqi5KqyOqS3fJeYzMaNllV+DYncuQcsP18D78kLxNScaZZ54JfjLNd3WdO3eRU5sKZo0AP3qlrtSZCSEONkiYnIiHiK5HQRGZ5Yesubnt8Nxzz8lSYTMuu/xKXHPNNUzXtzQ86RwxYgQGDBgAHpmSEE2Muhhj1PJULBYSn2A0eDIunNXC9SRwqQPtqn5ZvfPFRcr1s2Hk/AzyM8aA3xzQuqJn2dLSEmzfvl11pc7UnRxIsYiPVN0WJWngoujdY0eP4sgRBgN4/PHHZFHmNAShHxtZLi8DCM4elihaD+MEu1d5hQ8JXg+4Iue6pKLCeZqan9biQriLiozbnNCtwh7rZP3GGF3Vs27eA1E/3otn8Uc2fYiEF1dpKocGe28VyIXfexHGGNUR8uKWOlN3SX5XQALEc5zH8SKuA4rlAJ5kkFkuLF9//XUcO3ZEM9mLMUa/J2ADqIQxRp8oSTDG6OJu/vw/YP78+bjllltw22236WKP+Umwrae2vq2XZPF+XPzyW/Tbbpe6QyBJtr5AXh6Kr79Bo8YYHbPg+tmDybfe2qCLZ+pKnam7ZBsgiHCxiCqTxizhTMavU6jUAw88AM4KESUlIvmULDacYRFpV2N4//798pp9lP5ZBWccEsQny8YwX33BcYR1jRo1CsScOXP03rZeWrAxxkZj+r8Y82vQCKgjdaXO0vYlkpnLAvEqXSyimDpPFDvECsj03r17sXTpUuzd+wPTIsAnTQHJkjI6WDJcWFioH9fn5ubqWotLCRJFBaggy9QFrFOUCFst77Vr1y5QwQ4dOihJzMO62Sbei/FY92AbKKdF8uMy6khdpU6+H5vHtGhURxTzdeD3jLwpX0+98847+p1RSclxpkWgvNyvps28drBkg40xWLJkCfghKhtORZnORhljVGnKCJalzyXJpk2b9DtS5uONmEYwLMpoF2Z9fBgcfGnxXM8xD0lgHuZlnL4bPl+pLhXuv/9+bNy4ERs2vKljHnWVfB0EMV1NRPHjzDl79uzRdRIbwG0LF5zRZCXK0SqV5B3o2wby+052wd69e+sTZxrzkET6jBtjGNTGr1mzBrwf37mxayUnJ6qc+ag8fWOMKsY4/y0AZ90JEybgqaeeAn+8N/PZMH0LZw9ndGHJB/+qnJoyjfcUf45gnyCmq4koFrhdbvoqxyc2zOfzgU+Cb1qdmzJLJYxxlJYyai0rVz6HyZMn646cFsCcrIddgmCcoHJffLFVnu5bIKm0OpLp8/m1Kxtj1GKNcZYbrGP58uX6bo5l+UEFz78R+lFmjNOWkEjbEBfn0TFp3bp1+k2XTZP2virh2wXVuhMRxYLDpGHb+FmfVKhd4p577sGKFU9omBmiYYyjUI8ep+lfLyXKOTWJIYwxqjTkx/qMcRSi4vv27ddD/7/97X7s3LlT85E0uX/YsowxKr/iiivA3f5HH32EV155Bf/+979R04/3Wi1vd9grnnzyiXBWWq5EhglqdLUhihUUynS8l7OCR96OcAC99977dMpn36alMZMF8xhjwDc3qanOit4YhzzmIWFBOeyzqAiUYd/+Pejdpxf6n9MXAwb2x8JFC8C1Upm/BMzHqZ9+IOgHAfnxS7quXbvqH/9INOy4PrIRn4xJhw8flrXS4+AWhb3DpvEBykA+ycZr8mtLFOvIkkoPcN8XFxenh3wcU2bMmAE+fT51hH5sKGG7W0gMNowkkijK6HPA5tPmnrFBg4Y6lvEpc0zkRtzr9YbHJN6X5VmG5WsC78969+zZi/vuu0+7Ndv59ttvaTHWy3tK5GHBCV1diGJlTX0+3zY+FZKwf/8+cIaaOnWqbgG4HZB05sMVEyar774wzRijipMkY4yOZZAf/8qJZ9VcinAM4cfx3J8xnyTres2Wp5KUVYfrZs7DtOnXY+3a15QkDtxHjx7D++87h4wszz/pkKWBqa6OaHldiWL5QrGe1V9//ZV+k8BBfZ+8+r7jjjtwww1z9CiZ/wzCdjkWsCC5fMrGGJ1JaSFsNK2kTZs2WCRHvPzOYeLEibqiN8aEiWQ5WqStqzqf+XgGtWzZMjkve0YfJJcA69fzX01BH5IMI4PkoZjq6ogl/zlEsZ4iuUzjTOXxGB1c7VqLSi5atFCPXSE/n4wR4kU4ynwyg1IopIfJYNwNDuTGVOrji1EX84viINhVH330UXBxvHbtWjz//HNhKzJG6/lILJSDpsMaC9cSP5coVr9MLs337dt7cNeunX5aBgdNHlm89NJqGWAvxY033oitW78AxxSC1idlZKxKEiQyGAGSxrGFoPVFJEokUdZr4qkjacxPcIX+yCOPYOHCheBB3SeffIJ33tmg+dLl6JqWK5Y2XQQ9BJGbVhHUxtWHKNbPBVoTCdyyffuX8PlK9Bjm8OFDOHjwkDaaFjZ27FhQka+//loHaz59ebJSLNJRIUqGjxij5DJsQWLc5ThIc/G7ePFiECvl7IzH13wYH330oRYzxuDQoYNfCZk5Iqg8J5ZILVxElvoSZSu7SQKJsmxYv3PnDiUjLS1N92FcPnDM4NrrkksuAd/ecAPLMY1/diHltNtYEs4bNBzt23cQ0n1MgiWUlslZllsino1xW0RyKPtCXkWJxei6TixcuzJnTpGdJZW0E+wS1MudLKLYiDK5nCuNSz969Mj6LVs+wf79e+W4ZR92796lkC4qB4EfYPnyR/GnPy3G6NFF+icVzZs3A8E/rRg48ByVZWVlqk9ZenoqKJ8w4XJZu90q7xOfkDXRGjkeWSeTx1bFpk0bZZmyAzt2bC+WNgyXpQwHpfekTSfFnUyibIMOS+BcQZxgsaBEcKodz5j5ji1bbtRAsEZwUt2pIMo2MCCBBYIUQXMBv/k7KD4dFaNfH/BNwTqpoJeAevCP8L6R8ClxvMEpqTiqUg76fKPBgZ/37CLpNwveEewX+AXVuQpJOC7YIrhT0E/AOng+fZ6ENwlOufsvAAAA//+Y4ZUuAAAABklEQVQDAPsqVSrOqFk5AAAAAElFTkSuQmCC',
    face74: 'data:image/png;base64,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',
    gear32: 'data:image/png;base64,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',
    github32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAClElEQVR4AcxXS27UUBCs9o4tXAPChk2ARS7BXIBECIRCIoRgAQdACJDYIi5ALjHhz4kiITJO1XvuUfvFnng+jhJ1zev36apy254kFfzn4fQBdqf1pUBajW42sDf9AMNX3LwOwW7fALY2i8TZ8CctadJEBbmpcShhzlPUpzUwI9JsMx+16CoDBBmRJrUr+JV36cjE/i1AUL4KVCvEWmnJBLUr5dcM6AIOtlDTuqBciOc0j+jaU62gc3FfubSTgZN/M5zDsyyuQ4JIhBOuOzSP8HWNvq5aQXOtRx2tJwNKhkJEjrLG1zWWe33zbIBtZq/RQl/FuutRi1zZQHxAPOfmKOH8GinQGGA2K8DpKBF1KNAY4EsqRxHcHCUKjWwg3hfPR1EnqfNr5DQbiG1R/uYOn0d2hQc2GentIDekIZC8MUCxojXcGy9ciwpXxIDuRwSdjRquRZHcASateP0XZvwF0Vpcf2JGTnJHpmzgP5+BEq/+bNSEGcXJiahDJ9mAt6QcX/7eiAkzipOLr9a5r/tsQK9EibfbSK/Li/VMmFGcHImr1Jh3wF8LH99t0yxvC8f0l9HzXyt1wozirE0czh3HTgPv72ZxbqYvDs4TweHPpUyYUZw1qTaKxpwa+RbwYuE4aAslEx/vAUTKWXRRmFGcPHNO5y5HEmUD0ZXy/R+tq5WwwPPDQzwXgWzdBlT49HvLBM8OjmT2030+xLxkcfWBjP0GVPTk28omyL2EARrtvV+Pswkz3tfEusTHIl7tkWpxB9QF4dExQJgtaUK1izDYgJOwIEZzEWkp5mlBH17XN/JMxdZPCAzC7hS2dzxH1ZPrDP/JHcI5qfBl5wiGI5q53JAmtfMz8HlHXZiM4aCTs8YE0gRwBgAA//8vS1YNAAAABklEQVQDAO6zxt0iGMONAAAAAElFTkSuQmCC',
    hand32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADUUlEQVR4AaxVW27TQBQ941RWf6BxygcUCdoC7YraD7qLLgTWwAcg0V+6hrIHPhCoCCEV0qotbRLbwzkTO/Vj4tiByMeee+c+jq/v3ARY4vf7XWhzLOFeculMYPg+/BA920YOyaWIHYXOBKzFXjFHVS7utVm3ItCm3G1sfIQWElCJ+9tbELT2BZE+2t1B9HwTWvts5ukWEiiWeO3Fbqn8edD+zs5MX7TP95ueXgLVchpjYAyRTPyxkhQQrDec3yfT1jxUQpVS0Dqza370GEZotvLu0rOsL5awv/V0Vtqy1f+TagSWCj2OAWEJ544EjD+Fogj+3Ubtkm6NMTtt+gmkFhBahrKJhdDSvGTmJWDZiULJskEwqz0I80x0mnS0f70Na03tJTAv0DJ6Je5vDPaiR2sIgvL/iOJ5CZg0gSCDXqnv+GmkrGLCQSRU9EoePR7A2gSWcVjYlhVIx+wBIolxb/MJwzIBCJO6v2EqZpf+lskWDkyE7OeSb6w7yXJKCk6o3IKKPBXp4EZrMoKxTBxzBBMuiJJUIL0AElYAl1xvLtKsZsDaX/y8xODlmHWQxR38BO72O62GX787e5XdLbLb8McFPwP2M7H08BOwnGwOevtbfo6Rg9EbeqB+Of/yzQXuP7zvnrpZ2ubJ1w/GR9JV4SWQMrmgANA/YEoiQkIy/CyoIH9zJTfGwLKHBJXdWPt6XnKR8RLQRlsMT8+cqUveW3Hr4i06mBwW5eraSyDgZBPArrc8O2AjCW6tptSUJHzJZWPoL1ST+WQvARvfQDCjPzATnoDJDUCYET/BLdfUQ2DE6EEIE1M/ugIIt07pQ3BqfKZJ4+Ul0OhR2IwGqwWpvByejRFY+7GsrUteAoZlFsB5YNNbWDbiFGOADQr0GEngIw2o4qSLiZndhBvgFDAnbtFw8xIAh45DMmbwCVthOpqNBlDKI5pcA0KaHU+lEtgrlr4Ccx43dT/33VUjYHhs3M4/3C4uV8DefdMmRI1ACnMyvA4/5c4BPwc4UKbgJ+AbuuqUnqxETNAuS77f5u2Vo0ZAjsz5qkhChndIuayCKl7Dq1Bv3jo5XVAjIOWMxFV4KnkRlFhg2TslV1wvAW04EhaH59fhkYI3gfbH85Jzr/H6CwAA//+awg9tAAAABklEQVQDAIAsDJVGvEoWAAAAAElFTkSuQmCC',
    hourglass32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABHElEQVR4AeyVMQ7CMAxFAxITMysciOOwMjJwFo7CLWBFbHQCqehVihRFcWxLUZWhlX7r2N/fv+7QdRCuz+00toIwYkqLBqbqDLd+DbyP19AKtUX2u4Ga65a1ZQP9buCw3axafGtNp7qB2Lx/nYMXmI/9xBKqBmhC5Lm7EJoBnz5Lg2oAEcQQJdYAD77Gi3WTAciIIk4sgTo8qV7Kmw3QjDhDiHOQp57ntbPLAGIMYRhxBGfy8ex5ug14xC3cxYB7A4/hO5ZWK+VL3DTnMqAN0erp4BibDVjFrTyXAa+oh69uwCMW34qnta9qwCrCwBIs/aIBS3NpaJ7TdEQD2v8/HeThpn3EogGKc6BfA8P9F1qhtsl+N1Bz7alp3D8AAAD//86YKMgAAAAGSURBVAMAIwACgNtrihwAAAAASUVORK5CYII=',
    ibb32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD/ElEQVR4AbxVTWhdRRQ+Z1BwY3BhcS24E0Gh+FNcZONCV27cFRFcVWwilhQ3olJQqxU0/iy0C+lKHkJVrFVQEpOmqbRCW4uQtjQkhfdKaWjTNs3ry/3p982duW/u3PTn0ff6mG9mzvm+OefcmTv3GQl+r4w3Nmz/u7VtbLq5d+tUc6JfGEUsxmRs5ghSSlnA6J9nN+tjz5z+4czyrl1Hl17+8ujSsMdXx5aG7wbjWM+YjM0czOWLsAVs2b+w+dCF9p7GyeWhxeWO5GkukgFOlWPaDyxeWZPG6ctDzMWcDG9e/LCxYe5q8vU/rWsqcRYWMQAwF3Myt3n48Y2vzjZXhiRDPTHigvplIw9zMrdprabPrybYY+SvNQjXLexu/UjEnMxtLnbSh+x5D2Crbxf31L8HnzAdPn24tWNPisTohQ+1nMexaNMPJHhok7AATMpqsT05SA+YxY3Y/pQIAYfnOMIs+DAG59QSEFDnAbPUZ2muJktxoGjlWVtF1JGHqxIEdtnIxwB5O32GBzVJiheQFXtgYa2Rg1NV0XebqrPJx4BM1fGYs6k622mzDDuQZigAlYgHlKoqqgVgiuV2HLHTWke/XxuO9NfEcNDvdTDtl7Dcfm4jnJX2ARLT/+7Girs06PegzoO+UhRM6HfIUxGTJCC5C+8hAQGzcnbkCOfHYJsqP5w5NqeAdXI9tQQcjIPBNtW6/sI3rz9q0gRlBAvCRXYlOcIa3S7WlTa1RFdqZyVvLZ4qjh5zY19CngkMVUUfNXI7no6cUn1HJPj1qO9ewyAGp6quGJ4pHOETqDoO/lrrUW/sLXBbFiaxgd85JPYDZY2oIxe5rOli2XnY3URv0jWcBbctFPs5/R8/663q2Ce/yRLs2c7nKsFV3RaDIhHujKrjQPTDjyMosoTBELton1YLK5y36LcdvAVZp+5/4e1F0965abhOib3f6/m9LyxY1e3KZ5s8XRvX1Wf4FFMZkt5WLYKGnGrho8ZD1fnemrGuXvX2U6zqgtgQYu+4uJ9ql2NwD9Kqjhs5IP62qDofBF7LEWY3rtfj9M0Do5OTnlTVrujNaRECpGrhV62OoApNhptE9KjHR1yNpPgzeGNKJAYDErE/tqkJEfOxHWoffESMXj63Yp8k7PBAcg+g7attk879dVwzHEaYMKxykPP56QXTObG3cd/K+ev2JRpksnViry0cmTCycul4duCLb017Oa8UEe7IAOa6b3SfdK5N8Rpm6fzMiEx8tMdcnO9IZzV8GwYy11+3/pY3j+1G8GkWgBHXeHH2teznkS0y8/kfcuLHMzK3vwm07hj//9KSw7uB7yqQw9Zuyuz4vPw+Ninfv/R+fu6/T5D0J0BuAAAA///HA+GJAAAABklEQVQDAM03o6PZlLPYAAAAAElFTkSuQmCC',
    mask38B: 'data:image/png;base64,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',
    mask38G: 'data:image/png;base64,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',
    mask38R: 'data:image/png;base64,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',
    mask38W: 'data:image/png;base64,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',
    mask38Y: 'data:image/png;base64,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',
    nocalendar32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB80lEQVR4AbyXsU7DMBCGL5kYEAOPwchc1GxIDCwgRkAgFp6BsW+BQMCIYGFAYktFBxY68CAMwMAW/Me9Nsb2xU7dVjmfc79z9+V0HZKT+lVEFUxt66ssS3Vbb60ltZarSurSddSm4gLstaJXjrHXUb1yjL2O6pVj7HVUr3UH9Fav/aLQmyWteUakLjJ+U4jBuKKmNU8149jHapPzdQeywXhyO3NTiFko7W4CnddvqFK7IKqLTaWYVzFaMwONu2hNQdQd4ByhEHw+hTcAkFCC4Ddkj/NsHGPPcXiOsUeMzQKAIEFAT2lOABRYFkRe9r7o+3zDaT+fv2AxDIPpOx8bR21vB7iqC2J1fYXluX0rACosEiIIIATi4fGedna3CR7nm4aYTwsGQEKpE9e3V/Q6GhI8zjYNMZ8WBYCkPoiTo1Pa6vUJHueahphPiwZAYhfE8dkhPT+90P7eAY4YhphP6wSA7C6ILv+OzgCpICwAaWJdWkgnXM/hBWAWgDSxPq0NwvecE0CaWEm7ubxDPsN4JqTnrA5IE9um+TohPWcBGK/Q4cYH4UuVHACFYiAsAGliY7RQCAtAmthYLQTCApAmtovWBmEBSBPbVZMgLAAM0SLMBYGPn7woiuz9420RNa2cLoi6AwwBkNT2P9+wLKdg6qM0+wMAAP//7kyDNAAAAAZJREFUAwBWM7DxUFYM6wAAAABJRU5ErkJggg==',
    noclock32: 'data:image/png;base64,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',
    nopanel32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAgCAYAAACcuBHKAAACv0lEQVR4AbxXvW4TQRCezyCBkJAoKCgoeAUiEBJC1EjUyWtQ0RkQyBWi4S3APAOvkDT0KSiQoABFgCxMcnzf3q29tzd3XhvH1n47Pzsz+93cbhyPjJ/KrBJscljtDkf73DqMUdg8qGQy3mu0XYhqygeeaqfQCSkRlYgI0ZFK+SNSf9TjmmT0pVL+iNq/b5Oj/REmh7WZzOxOYrXVSi+u7WpZ669X09AJl4gYt8qfnxFIGDeEs0d4NY5/266aBKuGNjqt3gWRBQnyqMcmRNhJdVMFgKaniU/+IXRJKHoDIupkDpUqwYIEAAMSONlDt8YJL3bVJHRNBabpaSjMaHu3hkzD8janmsRARY+I1xEg6WKjD5RtLa0koWhoyhBujQ6f/OyaOic17WT0yT+EIhKhgHdYw0LBJLICQ4HmkWQL9JWTYHD4rpVMEDqS2H2qOpQjxq5HQlleR5on0vImKCYBgBejgbNTaUecVCsj4Ry80lsTNwWaB0hkXCsjEaMz6RFhuwxZXLglehD6dS4owt+h4KfxXySYbx6RMy5cqDRTKRgdEkDnOVplgO66R+Tvszt28ey0lSsD6Oa3SahlEcrIEdckszWPyPz5Xbt0Ol9GKi9i6S08mEnCkOoRmb24Z1fms6G0FSR0/3MMljP3jPx6ed+u/vltfZ/260ijtDltneYImhb/eQl6z+R15OTVA7s2++lmLElo0xQM1+YUi7Gw07gevXv8zL5PHtr1GL+oau3XoU0ikpiOGmNWSe+75hur3SDSsewEvQAMqEGzdwB1DFAgnSrH9N08+cq5HksSE/4ISsF1AJyXA2jsNK5Az8/IZZb8/PqR3frxhZrpdeAgaPmk4vQBaHen8XNprZETUfLxm8d28Onjk5GNb3+gQ6DIhjbMkYUUmwz0iLx/9/Rt/TrGe+xGT0eYvM2RE4EZ/gEAAP//mNj8pQAAAAZJREFUAwDl+HUsjIQZXAAAAABJRU5ErkJggg==',
    offpalette74: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEoAAABKCAYAAAAc0MJxAAAQAElEQVR4AezbR2zdxRMH8N3QQggQeugJvfeIDqGLqoAEFxBCgMSVG0eQkGgHDlwQl9ARAoFEB9FMr4HQe++99/L++1l7nn5+fraf7dgg8bc83v3tzs7OfHdmdvf3nqel///0hMC/GqhHHnmkdccdd7Ruv/32SjfffHMLedaO8PRk6QSZ/lVAMRoIwFi4cGHrtddeS5988kn69NNPK7300kupr68vFb708MMPp6effrqWl1xySQUScBPEY9jh/wqgGMjYRYsWpTfffDN9+eWXQxT+4osv0o8//piWX375dt+vv/6afv/99/Tbb7/VcW+88UYih7w20xKq/GNAXXHFFa3LL7+8ddFFF7Wee+659M0331STZs6cWcvmn6+++qoCMn369NSkFVdcMa277rrJmFarVQEjh7zzzz+/yk9L6GfKgQqAPv744/Tee++lb7/9tprCUxjsYamllkorrLBCpR9++EHTIICAtdJKK6W5c+dWnr///jsZs+yyy9aSl/G+999/P1144YUtc1YhE/gzpUBdfPHFLQC99dZb1UPoHQABhrFKQOgLEAHQJCBtsskmaeWVV05AChkxDi8ez3/99Vcyp7nJHC9NCVBW9JxzzmlJzD///HNb1xkzZlSPYNDSSy+dGKiT8UD6448/qocAEOnDu95669X28LY///yzht3XX3+d1I1F+HPOdVHMfcEFF7S0jYcmHSjKSdA//fRT1Q8gAOINcoz6csstl9C0adOqh3z//fcJSHVA408TJKEF0F9++SWhCLd33303ffDBB3VDWLx4cfruu+/qApjXIp133nnjAmtSgeJFDOL+PIKygBEWgIIBD+BJ+hgOUPxAQ3jQMsssk8KTQiZeAAF5zTXXTOQKXfx45DyJ3bN5AY1/PGBNClBC7eyzz24xhNEBEnBmzZpVveWpp55KV155ZbrsssvSQw89VFe+yc+4IAY2QbLDATXnXFnWWmutxDvJ1wAgJbAswOeff177gQgwfWMFa4kDde6557bsZs44ALLalFtllVVqPrITXX/99emqq65KL7zwQqVbbrkl3X///ckYRiBjgQGktddeu+YkhgNJvz5y1SNXqUvsyqA11lijhiY99AFUybOkheAbrVyiQAFJbmEwQ62msBISymeffTbd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',
    onpalette74: 'data:image/png;base64,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',
    panel32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAgCAYAAACcuBHKAAAB1klEQVR4AbxXbbKDIAzM9kavd2lP05+epr2LPZJvFwQRPwYt0skCCTG7pNqxNwuf7vuwrh/agXwjtxfR9W+zgRijTSbyOV6zm6kDZg/H+7qbBbhANoQ9zdmWcxUPcIFsCHua/Ra7/32wE1TkA24chsHNW0P9/eFNEVt07eJehNojkBcAR5p8gcurzYsgi9qcg+EmFkX8xKaOCSwCHO9kHREkz7son+EiiyIAGDBHUYUKSV5E15sJLBhPIF9g7GrzIiqwAPMuAiiuWiZCN53AssBYXL7AmOvi2LUznSwTQSIVz8FwmUmswGxgeYhiEbz+J8sPID8UbCYiEK7NxSIAXPYIl4nQTSfwGLGN8gXGSgzYPkSZiBKWvRyJFZizdog2Iki+ZwsRAPby3X2xlwAcv34uQi0LWGMKe5or7s9FrBVuENsXoV+5HBeI2hYhchLqbg6g69/G3aLeMIkQaQpyiJxTtOineWfXsarxf0fiiCQgCS+WIefsnBecOsEdAO4RBEBv2wDEPOD4Oq88idBjl4KZADhOBox+mnd2PZXV14Fn4k9LFacHIJ6abnwNdOsqA543e/19WEvglJmE5MhSit31xI/4/dfxurMbGx1Zv7hClHyO1+wfAAD//wq8t+QAAAAGSURBVAMAVWZkK6vGdI8AAAAASUVORK5CYII=',
    test32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACNklEQVR4AayUQU4CQRREEWNkwW08B+xw5128Dzu4AKdw5ylmQwgJzjPWpLrnd08zaKz831X1fxcDmeVixt9ms7lFmLFqMSvAnItKMw8FOBwOC1Ba3sIXA/CI8wVwIOd1RgM6q0actDCABlQx931HdWy32wVwjt69fX/7434rvWMUQAMycQb9ed2j9X/NDPCB/IyWBHAD3y3A9AjYAbTD74BLAhyPxyfIKeCLMDWHzhxVSAJAysB3C+CE77ePV+nivKLhcY4dAA6d6hgFcNF7hr8+3y/ORT0evJEWcaMA+XfEULQQXwT8oDSD5kgCsNBF+vyRwoHoAnjfEc26jj8JAJGDR5pzOk+FqM1qx5JEgkjV0gXSqSUPO0s6mjD5BFgCGKBGKIWIvDk3BOBlAXKDn2sh3FfruQPIMwQQMVWjEBE3tUf6EICXBZBQq36h97UZadwBdB4CiGitXAxa/SXfkh+QkJv+44J8J2fdR21+ApgZvgf6ALXZJEBk1BIujnT4GjSvWVXNJAEgu657oTq0BI4FgL4Vmo92jwKcTqdry2JCRCjNEiLaPQqAkSW8LAA9gAf0NRCqpEfzSYDIkC/DA+B3u90zoHfcEyIJ4IO8LIAv9p4Q5/P5Cugd+HwXZwdenZMAkPkgZ4DWCl1Qm5NnFIBLNKgKt1qtXqkOfiPAOXr3+g40/ICeEGEAxHxwv99f4AB6BDSA13U4P3tfDOCmUs9vBJR05xUCP5D2UAAtqVXXFEIc5x8AAAD//z/KxQUAAAAGSURBVAMAoWhxZpeEA0wAAAAASUVORK5CYII=',
    test74: 'data:image/png;base64,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',
    tools32: 'data:image/png;base64,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',
  };

  const IMAGES = {
    github: 'https://raw.githubusercontent.com/Razzano/My_Images/main/',
    ibb: 'https://i.ibb.co/',
    images: {
      1: 'google1', 2: 'google2', 3: 'world', 4: 'search2', 5: 'google3',
      6: 'google4', 7: 'bulb', 8: 'search1', 9: 'google5', 10: 'google6',
      11: 'flag', 12: 'face', 13: 'eagle', 14: 'monkey', 15: 'globe',
      16: 'eyes', 17: undefined, 51: 'TMCbzH45/google1', 52: 'N8dvQ21/google2',
      53: 'y9gns0g/world', 54: 'jvmTQX6J/search2', 55: 'YBdjTJMg/google3',
      56: 'k2s1wg0h/google4', 57: 'nqQYvY9b/bulb', 58: '99L5BJkp/search1',
      59: 'CKGqDHzn/google5', 60: 'TM9S5VXg/google6', 61: 'Q1WQxJ1/flag',
      62: 'Txq5BXr2/face', 63: 'sJW6hkvw/eagle', 64: 'rKhh1VGF/monkey',
      65: 'nsqttmjb/globe', 66: 'V0QSfJFb/eyes', 67: undefined,
    },
    url(num) {
      const host = Settings.get('wallpaperHost', 'github');
      const image = host === 'github'
        ? `${this.github}${this.images[num]}.png`
        : `${this.ibb}${this.images[num + 50]}.png`;
      return image;
    }
  };

  const LOGO_CONFIG = {
    1: { top: '100px', transform: 'translateX(-50%)' }, 2: { top: '100px', transform: 'translateX(-50%)' },
    3: { top: '45px', transform: 'translateX(-50%)' }, 4: { top: '128px', transform: 'translateX(-50%)' },
    5: { top: '30px', transform: 'translateX(-50%)' }, 6: { top: '60px', transform: 'translateX(-50%)' },
    7: { top: '60px', transform: 'translateX(-50%)' }, 8: { top: '120px', transform: 'translateX(-180%)' },
    9: { top: '70px', transform: 'translateX(-50%)' }, 10: { top: '80px', transform: 'translateX(-50%)' },
    11: { top: '75px', transform: 'translateX(-50%)' }, 12: { top: '15px', transform: 'translateX(-50%)' },
    13: { top: '45px', transform: 'translateX(-50%)' }, 14: { top: '75px', transform: 'translateX(-50%)' },
    15: { top: '65px', transform: 'translateX(-50%)' }, 16: { top: '80px', transform: 'translateX(-50%)' },
  };

  const STRING_HTML = {
    main: 'html[itemtype="http://schema.org/WebPage"]',
    search: 'html[itemtype="http://schema.org/SearchResultsPage"]',
  };

  const STRING_TOOLTIP = {
    brightnessTitle: '• Left-click for BG Brightness 50%\n• Shift + Left-click for BG Brightness 100%\n• Ctrl + Left-click for BG Brightness 0%',
    brightnessMinusTitle: 'Background Darker by 5%',
    brightnessPlusTitle: 'Background Brighter by 5%',
  };

  const {
    STRING_TRANSLATIONS,
    TITLE_TRANSLATIONS,
  } = window.GoogleDashboardResources;

  const localizedString = {
    ...(STRING_TRANSLATIONS.en ?? {}),
    ...(STRING_TRANSLATIONS[LANG_SHORT] ?? {}),
    ...(STRING_TRANSLATIONS[LANG_LONG] ?? {}),
  };

  const localizedTitle = {
    ...(TITLE_TRANSLATIONS.en ?? {}),
    ...(TITLE_TRANSLATIONS[LANG_SHORT] ?? {}),
    ...(TITLE_TRANSLATIONS[LANG_LONG] ?? {}),
  };

  let viewImage = Settings.get('viewImg', 'red');

  const VIEW_IMAGES = {
    red: {
      next: 'green',
      src: ICONS.mask38G
    },
    green: {
      next: 'blue',
      src: ICONS.mask38B
    },
    blue: {
      next: 'yellow',
      src: ICONS.mask38Y
    },
    yellow: {
      next: 'white',
      src: ICONS.mask38W
    },
    white: {
      next: 'red',
      src: ICONS.mask38R
    }
  };

  const WALLPAPERS = {
    github: 'https://raw.githubusercontent.com/Razzano/My_Wallpaper_Images/master/image',
    ibb: 'https://i.ibb.co/',
    images: {
      1: 'nqqpD5vV', 2: 'N2ghpbyg', 3: 'hJrcmcSL', 4: 'x8zpWT0N',
      5: 'wh14qStz', 6: 'NdCZSVzs', 7: 'yBpwcNQ1', 8: 'Xr37SNBV',
      9: 'C3Zgc08Y', 10: 'PG2c2dT9', 11: 'nMbj7YxK', 12: 'Lzgbj01N',
      13: 'GfMvNb1M', 14: 'hhQrGPj', 15: 'SXrbZ6q9', 16: 'HpXF12Wq',
      17: 'G4m6ww4B', 18: 'Dx73gtB', 19: 'hxRzvG2Z', 20: 'nWhq1DM',
      21: 'v4p4rZcf', 22: 'tTftHJ1b', 23: 'N6tR4Xxb', 24: 'XfdYrwHQ',
      25: 'wZffdgsV', 26: 'mVYG75vH', 27: 'TxVSfQ60', 28: 'B5Y2f9W2',
      29: 'DDQFgxR5', 30: 'V0TTMQx7', 31: 'yBWP54Rt', 32: '8gt1zNfT',
      33: 'x8qbLzcT', 34: 'tT5S5617', 35: '6JYJYyyL', 36: 'kgsQRF2d',
      37: 'qL2kZ9Cx', 38: 'LhzMW50z', 39: 'jvnXbbzK', 40: 'JJPQTnr',
      41: 'PzGzxJKS', 42: 'LzStYHY7', 43: 'yFzWRFvd', 44: '1f0ZXrcj',
      45: '5Xq48R9x', 46: 'wrdMKcwP', 47: 'Z6RtCxvz', 48: 'v82SrWg',
      49: '4nQs54Pf', 50: '39dXTzcj', 51: 'ch7mVBLx', 52: 'DP3KyhPK',
    },
    url(num) {
      const host = Settings.get('wallpaperHost', 'github');
      const image = host === 'github'
        ? `${this.github}${num}.jpg`
        : `${this.ibb}${this.images[num]}/image${num}.jpg`;
      return image;
    }
  };

  const WALLPAPER_MODES = [
    { src: ICONS.hand32, key: 'wallpaperManualTitle' },
    { src: ICONS.hourglass32, key: 'wallpaperHourlyTitle' },
    { src: ICONS.calendarDaily32, key: 'wallpaperDailyTitle' },
    { src: ICONS.calendarWeekly32, key: 'wallpaperWeeklyTitle' },
    { src: ICONS.calendarMonthly32, key: 'wallpaperMonthlyTitle' },
  ].map(mode => ({
    src: mode.src,
    title: localizedTitle[mode.key],
  }));

  const WALLPAPER_SITES = [
    {
      host: 'ibb',
      icon: ICONS.ibb32,
      titleKey: 'ibbTitle',
    },
    {
      host: 'github',
      icon: ICONS.github32,
      titleKey: 'githubTitle',
    }
  ];

// =====================================================================================
// LOGO MANAGER (Section 1)
// =====================================================================================

  const applyLogo = (num) => {
    const existing = $id('logoGoogle');
    if (existing) existing.remove();
    num = parseInt(num, 10);
    if (isNaN(num) || num < 0 || num > (IMAGE_COUNT + 1)) {
      num = 0;
    }
    const config = LOGO_CONFIG[num] || {
      top: '40px',
      transform: 'translateX(-50%)'
    };
    GM_addStyle(`
      img[alt='Google'], #hplogo, #logo, .k1zIA img, .k1zIA svg, svg.ESTs9d,
      ${STRING_HTML.main} #LS8OJ img,
      ${STRING_HTML.main} #LS8OJ .k1zIA {
        display: ${num === 0 ? 'block' : 'none'} !important;
        visibility: ${num === 0 ? 'visible' : 'hidden'} !important;
      }
      div:has(> img[alt='Google']) {
        display: ${num === 0 ? 'block' : 'none'} !important;
      }
      ${STRING_HTML.main} #logoGoogle {
        top: ${config.top} !important;
      }
    `);
    if (num !== 0) {
      const src = IMAGES.url(num);
      if (src) {
        const logoCopy = $el('img', {
          id: 'logoGoogle',
          class: 'logo',
          src
        });
        logoCopy.style.cssText = `
          top: ${config.top};
          transform: ${config.transform};
        `;
        logoCopy.onerror = () => {
          console.warn(`Logo #${num} not found`);
          logoCopy.remove();
        };
        STRING_HTML.main > body.prepend(logoCopy);
    } }
    const inp = $id('inputLogo');
    if (inp) {
      inp.value = num;
    }
    Settings.set('logoImageNum', num);
  };

  const logoClick = (id) => {
    let current = Settings.get('logoImageNum', 1);
    const next = (id.includes('up') || id === 'buttonLogo') ? (current + 1) % IMAGE_COUNT : (current - 1 + IMAGE_COUNT) % IMAGE_COUNT;
    applyLogo(next);
  };

  const handleLogoInput = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) return;
    val = Math.max(0, Math.min((IMAGE_COUNT + 1), val));
    applyLogo(val);
  };

// =====================================================================================
// WALLPAPER MANAGER (Section 2)
// =====================================================================================

  const getCurrentWallpaperNumber = () => {
    switch (Settings.get('wallpaperMode', WALLPAPER_MANUAL)) {
      case WALLPAPER_HOURLY: return getHourlyWallpaper();
      case WALLPAPER_DAILY: return getDailyWallpaper();
      case WALLPAPER_WEEKLY: return getWeeklyWallpaper();
      case WALLPAPER_MONTHLY: return getMonthlyWallpaper();
      default: return Settings.get('wallpaperImage', 0);
    }
  };

  const applyWallpaper = (num) => {
    if (State.wallpaper.style) {
      State.wallpaper.style.remove();
      State.wallpaper.style = null;
    }
    num = parseInt(num, 10) || 0;
    if (num === 0) return;
    const image = WALLPAPERS.url(num);
    if (!image) return;
    const css = `
      body { background: url('${image}') no-repeat center center / cover fixed !important; }
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
    const months = (today.getFullYear() - WALLPAPER_START_DATE.getFullYear()) * 12 + (today.getMonth() - WALLPAPER_START_DATE.getMonth());
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
    if (mode === WALLPAPER_MANUAL) return;
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

  const setThemerState = enabled => {
    ['buttonThemer', 'inputThemer', 'downThemer'].forEach(id => {
      const el = $id(id);
      if (!el) return;
      el.classList.toggle('disabled', !enabled);
    });
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

  const toggleWallpaperHost = () => {
    const current = Settings.get('wallpaperHost', 'github');
    let index = WALLPAPER_SITES.findIndex(site => site.host === current);
    if (index === -1) index = 0;
    const next = WALLPAPER_SITES[(index + 1) % WALLPAPER_SITES.length];
    Settings.set('wallpaperHost', next.host);
    const img = $id('hostImg');
    if (img) {
      img.src = next.icon;
      img.title = localizedTitle[next.titleKey];
    }
    applyCurrentWallpaper();
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

// =====================================================================================
// CLOCK MANAGER (Section 3)
// =====================================================================================

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

  const createClockDefs = () => $el('defs', {
    },
    $el('linearGradient', {
      id: 'bezelOuterGradient',
      x1: '0%', y1: '0%',
      x2: '0%', y2: '100%'
      },
      $el('stop', { offset: '0%', 'stop-color': '#ffffff' }),
      $el('stop', { offset: '8%', 'stop-color': '#f3f3f3' }),
      $el('stop', { offset: '18%', 'stop-color': '#c9c9c9' }),
      $el('stop', { offset: '32%', 'stop-color': '#7a7a7a' }),
      $el('stop', { offset: '50%', 'stop-color': '#4f4f4f' }),
      $el('stop', { offset: '68%', 'stop-color': '#8d8d8d' }),
      $el('stop', { offset: '84%', 'stop-color': '#d9d9d9' }),
      $el('stop', { offset: '94%', 'stop-color': '#f5f5f5' }),
      $el('stop', { offset: '100%', 'stop-color': '#7a7a7a' }),
    ),
    $el('linearGradient', {
      id: 'bezelInnerGradient',
      x1: '0%', y1: '0%',
      x2: '0%', y2: '100%',
      },
      $el('stop', { offset: '0%', 'stop-color': '#ffffff' }),
      $el('stop', { offset: '20%', 'stop-color': '#d8d8d8' }),
      $el('stop', { offset: '55%', 'stop-color': '#8c8c8c' }),
      $el('stop', { offset: '100%', 'stop-color': '#4e4e4e' }),
    ),
    $el('linearGradient', {
      id: 'numeralGradient',
      gradientTransform: 'rotate(90)',
      },
      $el('stop', { offset: '0%', 'stop-color': 'var(--numeral-top)' }),
      $el('stop', { offset: '100%', 'stop-color': 'var(--numeral-bottom)' }),
    ),
    $el('linearGradient', {
      id: 'bannerGradientGold',
      gradientTransform: 'rotate(90)',
      },
      $el('stop', { offset: '0%', 'stop-color': 'rgba(255 250 210 / .6)' }),
      $el('stop', { offset: '100%', 'stop-color': 'rgba(160 125 30 / .6)' }),
    ),
    $el('linearGradient', {
      id: 'bannerGradientRed',
      gradientTransform: 'rotate(90)',
      },
      $el('stop', { offset: '0%', 'stop-color': 'rgba(250 0 0 / .6' }),
      $el('stop', { offset: '100%', 'stop-color': 'rgba(100 0 0 / .6)' }),
    ),
    $el('linearGradient', {
      id: 'bannerGradientGreen',
      gradientTransform: 'rotate(90)',
      },
      $el('stop', { offset: '0%', 'stop-color': 'rgba(145 255 200 / .6' }),
      $el('stop', { offset: '100%', 'stop-color': 'rgba(0 117 58 / .6' }),
    ),
    $el('linearGradient', {
      id: 'bannerGradientBlue',
      gradientTransform: 'rotate(90)',
      },
      $el('stop', { offset: '0%', 'stop-color': 'rgba(168 211 255 / .6' }),
      $el('stop', { offset: '100%', 'stop-color': 'rgba(0 88 176 / .6' }),
    ),
    $el('linearGradient', {
      id: 'bannerGradientClassic',
      gradientTransform: 'rotate(90)',
      },
      $el('stop', { offset: '0%', 'stop-color': 'rgba(186 188 189 / .5)' }),
      $el('stop', { offset: '100%', 'stop-color': 'rgba(0 0 0 / .75)' }),
    ),
    $el('linearGradient', {
      id: 'bannerGradientDark',
      gradientTransform: 'rotate(90)',
      },
      $el('stop', { offset: '0%', 'stop-color': 'rgba(0 0 0 / .5)' }),
      $el('stop', { offset: '100%', 'stop-color': 'rgba(0 0 0 / .5)' }),
    ),
    $el('linearGradient', {
      id: 'panelGradient',
      gradientTransform: 'rotate(90)',
      },
      $el('stop', { offset: '0%', 'stop-color': '#fff' }),
      $el('stop', { offset: '100%', 'stop-color': '#4f4f4f' }),
    ),
    $el('radialGradient', {
      id: 'faceGradient',
      cx: '50%', cy: '50%', r: '50%',
      gradientUnits: 'objectBoundingBox',
      },
      $el('stop', {
        offset: '0%',
        'stop-color': 'var(--face-inner)',
      }),
      $el('stop', {
        offset: '70%',
        'stop-color': '#f7f7f7',
      }),
      $el('stop', {
        offset: '100%',
        'stop-color': 'var(--face-outer)',
      })
    )
  );

  const defs = createClockDefs();

  const createClockFace = () => {
    const ticks = [];
    const hourNumbers = [];
    const bezelGroup = $el('g', {
      className: 'Analog-Bezel clock-elem',
      },
      $el('circle', {
        className: 'Analog-BezelOuter',
        cx: 50, cy: 50, r: 48.8,
        fill: 'none',
        stroke: 'url(#bezelOuterGradient)', 'stroke-width': 7.5,
      }),
      $el('circle', {
        className: 'Analog-BezelInner',
        cx: 50, cy: 50, r: 48.8,
        fill: 'none',
        stroke: 'url(#bezelInnerGradient)', 'stroke-width': 1.0,
      }),
      $el('circle', {
        className: 'Analog-BezelShadow',
        cx: 50, cy: 50, r: 49,
        fill: 'none',
      }),
      $el('circle', {
        className: 'Analog-BezelHighlight',
        cx: 50, cy: 50, r: 48.1,
        fill: 'none',
      }),
      $el('circle', {
        className: 'Analog-BezelFinish',
        cx: 50, cy: 50, r: 47,
        fill: 'none',
        stroke: 'rgba(0 0 0 / .3)', 'stroke-width': .5,
      })
    );
    const clockFace = $el('circle', {
      className: 'Analog-Face clock-elem',
      cx: 50, cy: 50, r: 47,
      fill: 'url(#faceGradient)',
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
          x1: 50 + innerRadius * Math.cos(rad), y1: 50 + innerRadius * Math.sin(rad),
          x2: 50 + outerRadius * Math.cos(rad), y2: 50 + outerRadius * Math.sin(rad),
          stroke: isHourMark ? 'var(--tick-hourmark)' : 'var(--tick-secondmark)',
          strokeWidth: isHourMark ? '1.5' : '0.75',
          strokeLinecap: 'round',
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
        x: 50 + radius * Math.cos(rad), y: 50.5 + radius * Math.sin(rad),
        textContent: hour,
        fill: 'url(#numeralGradient)',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      }));
    }
    return {
      bezelGroup,
      clockFace,
      ticks,
      hourNumbers,
    };
  };

  const {
    bezelGroup,
    clockFace,
    ticks,
    hourNumbers,
  } = createClockFace();

  const createClockHands = () => {
    const hourHand = $el('path', {
      className: 'Analog-Hour-Hand',
      d: `M 50 50 L 49.0 48 L 48.8 30 L 50 26 L 51.2 30 L 51.0 48 Z`,
    });
    const minuteHand = $el('path', {
      className: 'Analog-Minute-Hand',
      d: `M 50 50 L 49.4 48 L 49.15 30 L 49.0 24 L 50 18 L 51.0 24 L 50.85 30 L 50.6 48 Z`,
    });
    const secondHand = $el('g', {
      className: 'Analog-Second-Hand',
      },
      $el('path', {
        className: 'Analog-Second-Needle',
        d: `M 49.8 55 L 50.2 55 L 50.2 17 L 50 14 L 49.8 17 Z`,
      }),
      $el('line', {
        className: 'Analog-Second-Tail',
        x1: 50, y1: 55,
        x2: 50, y2: 56,
      }),
      $el('polygon', {
        className: 'Analog-Second-Counter',
        points: `50,61 49.2,60.4 49.2,56.8 50,56 50.8,56.8 50.8,60.4`,
      })
    );
    return { hourHand, minuteHand, secondHand };
  };

  const {
	   hourHand,
	   minuteHand,
	   secondHand,
  } = createClockHands();

  const createHub = () => {
    const hubOuter = $el('circle', {
      className: 'Analog-HubOuter',
      cx: 50, cy: 50, r: 2.6,
    });
    const hubInner = $el('circle', {
      className: 'Analog-HubInner',
      cx: 50, cy: 50, r: 1.55,
    });
    const hubPin = $el('circle', {
      className: 'Analog-HubPin',
      cx: 50, cy: 50, r: 0.58,
    });
    const hubHighlight = $el('circle', {
      className: 'Analog-HubHighlight',
      cx: 49.2, cy: 49.1, r: 0.32,
    });
    return { hubOuter, hubInner, hubPin, hubHighlight };
  };

  const {
    hubOuter,
    hubInner,
    hubPin,
    hubHighlight,
  } = createHub();

  const createDayBanner = () => {
    const dayBannerBg = $el('rect', {
      id: 'dayBannerBg',
      rx: 2, ry: 2,
    });
    const dayBannerBorder = $el('rect', {
      id: 'dayBannerBorder',
    });
    const dayBannerHighlight = $el('rect', {
      id: 'dayBannerHighlight',
    });
    const dayBannerText = $el('text', {
      id: 'dayBannerText',
      x: 50.5,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });
	   const applyBannerStyle = () => {
      const style = BANNER_STYLES[bannerStyle];
      if (bannerStyle === 'none') {
        dayBannerBg.style.display = style.display;
        dayBannerBorder.style.display = style.display;
        dayBannerHighlight.style.display = style.display;
        dayBannerText.style.display = style.display;
        return;
      }
      dayBannerBg.style.display = '';
      dayBannerHighlight.style.display = '';
      dayBannerText.style.display = '';
      dayBannerBg.setAttribute('fill', style.background);
      dayBannerBg.setAttribute('stroke', style.border);
      dayBannerHighlight.setAttribute('fill', style.highlight);
      dayBannerHighlight.setAttribute('fill-opacity', style.highlightOpacity);
      dayBannerText.setAttribute('fill', style.text);
      dayBannerText.style.font = style.font;
      dayBannerText.style.textShadow = style.textShadow;
    };
    const toggleBannerStyle = (e) => {
      const styles = Object.keys(BANNER_STYLES);
      const currentIndex = styles.indexOf(bannerStyle);
      if (e.button === 0 && e.ctrlKey) {
        bannerStyle = styles[(currentIndex - 1 + styles.length) % styles.length];
      } else if (e.button === 0 && e.shiftKey) {
        bannerStyle = styles[(currentIndex - 1 + styles.length) % styles.length];
      } else if (e.button === 0) {
        bannerStyle = styles[(currentIndex + 1) % styles.length];
      }
      Settings.set('bannerStyle', bannerStyle);
      applyBannerStyle();
    };
    return {
      dayBannerBg,
      dayBannerBorder,
      dayBannerHighlight,
      dayBannerText,
      applyBannerStyle,
      toggleBannerStyle,
    }
  };

  const {
    dayBannerBg,
    dayBannerBorder,
    dayBannerHighlight,
    dayBannerText,
    applyBannerStyle,
    toggleBannerStyle,
  } = createDayBanner();

  const applyClockPointerEvents = () => {
    const enabled = Settings.get('clockPointerEvents', true);
    GM_addStyle(`
      #analogClockContainer {
        pointer-events: ${enabled ? 'all' : 'none'} !important;
      }
      #analogClockContainer #controlsGroup {
        pointer-events: all !important;
      }
    `);
  };

  const ANALOG_CLOCK_OPACITY_DEFAULT = 50;
  const ANALOG_CLOCK_OPACITY_MIN = 0;
  const ANALOG_CLOCK_OPACITY_MAX = 100;
  const ANALOG_CLOCK_OPACITY_STEP = 5;

  const applyAnalogClockOpacity = (e) => {
    let analogClockOpacity = Settings.get('analogClockOpacity', ANALOG_CLOCK_OPACITY_DEFAULT);
    if (e.button !== 0) return;
    if (e.button === 0 && e.shiftKey) {
    //const increaseSearchResultsBgOpacity = () => {
    //searchResultsBgOpacity = Math.min(SEARCH_RESULTS_BG_OPACITY_MAX, searchResultsBgOpacity + SEARCH_RESULTS_BG_OPACITY_STEP);
      analogClockOpacity = Math.min(ANALOG_CLOCK_OPACITY_MAX, analogClockOpacity + ANALOG_CLOCK_OPACITY_STEP);
    } else if (e.button === 0 && e.ctrlKey) {
      analogClockOpacity = Math.min(ANALOG_CLOCK_OPACITY_MAX, analogClockOpacity - ANALOG_CLOCK_OPACITY_STEP);
    } else if (e.button === 0) {
      analogClockOpacity = ANALOG_CLOCK_OPACITY_DEFAULT;
    }
    Settings.set('analogClockOpacity', analogClockOpacity);
    document.documentElement.style.setProperty('--analog-clock-opacity', analogClockOpacity / 100);
  };

  const applyAnalogClock = () => {
    if (!Settings.get('analogClock', true)) return;
    let currentDay = -1;
    let displayedSecondDeg = 0;
    const date = new Date();
    const smoothSecondHand = Settings.get('smoothSecondHand', true);
    const spacer3 = $el('span', {id: 'spacer3', class: 'spacerX', textContent: localizedString.spacerXText});
    const dateText = $el('text', {
      id: 'dateText',
      className: 'Analog-MonthDateText',
      x: 50.5,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });
    const timeText = $el('text', {
      id: 'timeText',
      className: 'Analog-timeText',
      x: 50.5,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'xml:space': 'preserve',
    });
    const ampmText = $el('text', {
      className: 'Analog-AMPMText',
      x: 50.5,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });
    const dateTimeGroup = $el('g', {
      id: 'dateTimeGroup',
    }, [
      dateText,
      timeText,
      ampmText,
    ]);
    const panelRect = $el('rect', {
      id: 'controlsPanel',
      className: 'controls-panel',
      x: 19, y: 105,
      width: 62.5, height: 12,
      rx: 2,
      fill: 'url(#panelGradient)',
      stroke: '#555',
      'stroke-width': .6,
    });
    const themeImg = $el('image', {
      id: 'themeImg',
      className: 'controls-img',
      href: ICONS.onpalette74,
      x: 21, y: 106,
      width: 10, height: 10,
      title: localizedTitle.themeImgTitle,
    });
    const secondHandImg = $el('image', {
      id: 'clockImg',
      className: 'controls-img',
      href: ICONS.clock74,
      x: 33.2, y: 106,
      width: 10, height: 10,
      title: localizedTitle.secondHandImgTitle,
    });
    const anaCalImg = $el('image', {
      id: 'anaCalImg',
      className: 'controls-img',
      href: ICONS.face74,
      x: 45.4, y: 106,
      width: 10, height: 10,
      title: localizedTitle.anaCalImgTitle,
      onclick: () => toggleCalendarInfo(),
    });
    const bannerImg = $el('image', {
      id: 'bannerImg',
      className: 'controls-img',
      href: ICONS.banner74,
      x: 57.6, y: 106,
      width: 10, height: 10,
      title: localizedTitle.bannerImgTitle,
      onclick: (e) => toggleBannerStyle(e),
    });
    const localeImg = $el('image', {
      id: 'localeImg',
      className: 'controls-img',
      href: ICONS.test74,
      x: 69.8, y: 106,
      width: 10, height: 10,
      title: localeTestingUnlocked ? getLocaleName(LOCALE) : 'Developer Testing Only',
      onclick: (e) => {
        if (!localeTestingUnlocked) {
          showTestingLocalePIN();
          return;
        }
        if (e.ctrlKey) {
          Settings.set('localeTestingUnlocked', false);
          Settings.set('testLocaleIndex', 0);
          location.reload();
          return;
        }
        toggleTestLocale(e);
      }
    });
    const controlsGroup = $el('g', {
      id: 'controlsGroup'
      },
      panelRect,
      themeImg,
      secondHandImg,
      anaCalImg,
      bannerImg,
      localeImg,
    );
    // =======================
    // ATTACH TO SVG
    // =======================
    const svg = $el('svg', {
      className: 'Analog',
      viewBox: '0 0 100 100',
      },
      defs,
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
      dayBannerBg,
      dayBannerBorder,
      dayBannerHighlight,
      dayBannerText,
      dateTimeGroup,
      controlsGroup,
    );
    const setSecondMode = (smooth) => {
      Settings.set('smoothSecondHand', smooth);
    };
    setSecondMode(Settings.get('smoothSecondHand', true));
    secondHandImg.onclick = () => {
      Settings.set('smoothSecondHand', !Settings.get('smoothSecondHand', true));
      startAnalogClock();
    };
    const toggleCalendarInfo = () => {
      const hidden = clockInfo.classList.toggle('hidden');
      dateTimeGroup.classList.toggle('hidden', !hidden);
      Settings.set('calendarInfo', !hidden);
    };
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
      title: localizedTitle.percentageDisplayTitle,
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
    const setTheme = (dark) => {
      Clock.classList.toggle('dark', dark);
      themeImg.setAttribute('href', dark ? ICONS.offpalette74 : ICONS.onpalette74);
      Settings.set('clockDarkTheme', dark);
    };
    setTheme(Settings.get('clockDarkTheme', true));
    themeImg.onclick = () => {
      const dark = !Settings.get('clockDarkTheme', true);
      setTheme(dark);
    };
    const clockInfo = $el('div', {
      id: 'clockInfo',
    });
    const showControlsPref = Settings.get('controlsPanel', true);
    controlsGroup.classList.toggle('hidden', !showControlsPref);
    const savedPercent = Settings.get('clockSizePercent', 100);
    setClockPercentage(savedPercent);
    const analogClockContainer = $el('div', {
      id: 'analogClockContainer', className: 'ClockContainer'
      },
      Clock
    );
    makeDraggable(analogClockContainer, 'analogClockContainer', '.Analog-Bigclock');
    restorePosition(analogClockContainer, 'analogClockContainer');
    const rect = analogClockContainer.getBoundingClientRect();
    if (rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) {
      analogClockContainer.style.left = '16px';
      analogClockContainer.style.top = '100px';
    }
    STRING_HTML.main > body.prepend(analogClockContainer);
    const updateAnalogClock = () => {
      if (!$id('analogClockContainer')) return;
      const smoothSecondHand = Settings.get('smoothSecondHand', true);
      const now = new Date();
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
      const isShortDay = SHORT_DAY_LOCALES.includes(LANG_SHORT);
      const isLongDay = LONG_DAY_LOCALES.includes(LANG_SHORT);
      const marginTop = DAY_BANNER_TEXT_TOP;
      const padding = DAY_BANNER_HEIGHT_PADDING;
      if (isShortDay) {
        if (LANG_LONG === 'en-US') {
          dayBannerText.textContent = DAY_BANNER_FMT.format(now).toLocaleUpperCase(LANG_LONG);
        } else {
          dayBannerText.textContent = DAY_BANNER_FMT.format(now);
        }
        if (LANG_LONG === 'ar-SA' || LANG_LONG === 'el-GR') {
          dayBannerText.setAttribute('y', 22.6 + marginTop);
        } else if (LANG_LONG === 'hi-IN') {
          dayBannerText.setAttribute('y', 23.2);
        } else {
          dayBannerText.setAttribute('y', 23 + marginTop);
        }
        dayBannerBg.setAttribute('y', 18 - (padding / 2));
        dateText.setAttribute('y', 31 + (padding / 2) + DATE_TEXT_TOP);
      } else if (isLongDay) {
        dayBannerText.textContent = DAY_BANNER_FMT.format(now);
        if (LANG_LONG === 'ru-RU') {
          dayBannerText.setAttribute('y', 25.5);
        } else if (LANG_LONG === 'bn-BD') {
          dayBannerText.setAttribute('y', 26.2);
        } else {
          dayBannerText.setAttribute('y', 26);
        }
        dayBannerBg.setAttribute('y', 21 - (padding / 2));
        dateText.setAttribute('y', 34 + (padding / 2) + DATE_TEXT_TOP);
      }
      const width = dayBannerText.getComputedTextLength();
      const bgWidth = Math.ceil(width + DAY_BANNER_WIDTH_PADDING);
      const bgX = (100 - bgWidth) / 2;
      dayBannerBg.setAttribute('width', bgWidth + 1);
      dayBannerBg.setAttribute('x', bgX);
      dayBannerBg.setAttribute('height', 8.5 + padding);
      dateText.textContent = DATE_FMT.format(now);
      const parts = TIME_FMT.formatToParts(now);
      timeText.textContent = parts.filter(part => part.type !== 'dayPeriod').map(part => part.value).join('').trim();
      timeText.setAttribute('y', 77 + TIME_TEXT_TOP)
      ampmText.textContent = parts.find(part => part.type === 'dayPeriod')?.value ?? '';
      ampmText.setAttribute('y', 82 + AMPM_TEXT_TOP);
    };
    const showCalendarInfo = Settings.get('calendarInfo', false);
    if (!showCalendarInfo) {
      clockInfo.classList.add('hidden');
    }
    dateTimeGroup.classList.toggle('hidden', showCalendarInfo);
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
    applyBannerStyle();
    applyClockPointerEvents();
  };

  const toggleAnalogClock = (e) => {
    const clock = Settings.get('analogClock', true);
    const cont = $id('analogClockContainer');
    const panelTog = $id('panelToggler');
    const scalerCtn = $id('scalerContainer');
    const scaler = $qa('.scaler', scalerCtn);
    if (e.shiftKey) {
      Settings.set('clockPointerEvents', false);
      applyClockPointerEvents();
      return;
    }
    if (e.ctrlKey) {
      Settings.set('clockPointerEvents', true);
      applyClockPointerEvents();
      return;
    }
    if (e.button === 0) {
      if (clock) {
        stopAnalogClock();
        Settings.set('analogClock', false);
        cont?.remove();
      } else {
        Settings.set('analogClock', true);
        applyAnalogClock();
      }
      const bool = Settings.get('analogClock', true);
      panelTog.classList.toggle('disabled', !bool);
      scaler.forEach(el => el.classList.toggle('disabled', !bool));
      const btn = $id('analogClockBtn');
      const pref = bool ? ICONS.clock32 : ICONS.noclock32;
      const tip = '• Left-click: Show/Hide Analog Clock\n• Shift + Left-click: 🔒 Clock position\n• Ctrl + Left-click: 🔓 Clock position';
      btn.replaceChildren(
        $el('img', {
          src: pref,
          title: tip,
          alt: 'Clock'
        })
      );
    }
  };

// =====================================================================================
// DATE/TIME MANAGER (Section 4)
// =====================================================================================

  const applyDateTime = () => {
    const dtContainer = $el('div', {
      id: 'dateTimeContainer'
    });
    const digCalBtn = $el('button', {
      id: 'digCalBtn',
      title: localizedTitle.digCalBtnTitle,
      onclick: dateTimeToggle}
    );
    const dateTime = $el('span', {
      id: 'dateTime',
      title: localizedTitle.dateTimeTitle,
      onclick: dateTimeToggleSeconds
    });
    dtContainer.append(digCalBtn, dateTime);
    dtContainer.append(dateTime);
    STRING_HTML.main > body.prepend(dtContainer);
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
    const date = new Intl.DateTimeFormat(LOCALE, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(now);
    const time = new Intl.DateTimeFormat(LOCALE, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(now);
    const timeNoSeconds = new Intl.DateTimeFormat(LOCALE, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(now);
    const secView = Settings.get('secondsView', false);
    digitalClock.textContent = secView ? `${date} 🕑 ${time}` : `${date} 🕑 ${timeNoSeconds}`;
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
    if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    const digitalClock = $id('dateTime');
    const calImg = $id('calendar32Img');
    digitalClock.hidden = !digitalClock.hidden;
    Settings.set('dateTimeView', !digitalClock.hidden);
    if (digitalClock.hidden) {
      clearInterval(State.digital.interval);
      State.digital.interval = null;
      calImg.src = ICONS.nocalendar32
    } else {
      calImg.src = ICONS.calendar32;
      startDigitalClock();
    }
  };

  const dateTimeToggleSeconds = (e) => {
    if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    const enabled = !Settings.get('secondsView', false);
    Settings.set('secondsView', enabled);
    startDigitalClock();
  };

// =====================================================================================
// CONTROL MANAGER (Section 5)
// =====================================================================================

  const applyControlContainer = () => {
    const controlContainer = $el('div', {
      id: 'controlContainer'
    });
    const host = Settings.get('wallpaperHost', 'github');
    const hostImg = $el('img', {
      id: 'hostImg',
      src: ICONS.ibb32,
    });
    const hostToggler = $el('button', {
      id: 'hostToggler',
      className: 'toggler host-toggler',
      onclick: toggleWallpaperHost,
      }, hostImg
    );
    const toggleImg = $el('img', {
      id: 'toggleImg',
      src: ICONS.hand32,
    });
    const wallpaperToggler = $el('button', {
      id: 'wallpaperToggler',
      className: 'toggler wallpaper-toggler',
      onclick: wallpaperToggleHandler
    }, toggleImg);
    const buttonThemer = $el('button', {
      id: 'buttonThemer',
      className: 'button themer',
      textContent: localizedString.buttonThemerText,
      title: localizedTitle.changeWallpaperTitle,
      onclick: wallpaperButtonChanger,
    });
    const inputThemer = $el('input', {
      id: 'inputThemer',
      className: 'input themer',
      type: 'number',
      value: Settings.get('wallpaperImage', 0),
      title: localizedTitle.inputThemerTitle,
      oninput: wallpaperInputChanger,
    });
    const downThemer = $el('button', {
      id: 'downThemer',
      className: 'button themer',
      textContent: localizedString.downThemerText,
      title: localizedTitle.changeWallpaperTitle,
      onclick: wallpaperButtonChanger,
    });
    const spacer1 = $el('span', {
      id: 'spacer1',
      className: 'spacerX',
      textContent: localizedString.spacerXText,
    });
    const buttonLogo = $el('button', {
      id: 'buttonLogo',
      className: 'button logo',
      textContent: localizedString.buttonLogoText,
      title: localizedTitle.changeLogoTitle,
      onclick: e => logoClick(e.target.id),
    });
    const inputLogo = $el('input', {
      id: 'inputLogo',
      className: 'input logo',
      type: 'number',
      value: Settings.get('logoImageNum', 1),
      title: localizedTitle.inputLogoTitle,
      oninput: handleLogoInput,
    });
    const downLogo = $el('button', {
      id: 'downLogo',
      className: 'button logo',
      textContent: localizedString.downLogoText,
      title: localizedTitle.changeLogoTitle,
      onclick: e => logoClick(e.target.id),
    });
    const scalerContainer = $el('div', {
      id: 'scalerContainer',
    });
    let currentPercent = Settings.get('clockSizePercent', 100);
    const setClockPercentage = (percent) => {
      currentPercent = Math.max(30, Math.min(200, percent));
      const pixelSize = Math.round((currentPercent / 100) * BASE_SIZE);
      const clock = document.querySelector('.Analog-Bigclock');
      if (clock) {
        clock.style.setProperty('--clock-size', `${pixelSize}px`);
      }
      percentageDisplay.value = String(currentPercent);
      Settings.set('clockSizePercent', currentPercent);
    };
    const savedPercent = Settings.get('clockSizePercent', 100);
    const toggleControls = () => {
      const controlsGroup = $id('controlsGroup');
      const hidden = controlsGroup.classList.toggle('hidden');
      const panelImg = $id('panel32Img');
      Settings.set('controlsPanel', !hidden);
      if (!hidden) {
        panelImg.src = ICONS.panel32;
      } else {
        panelImg.src = ICONS.nopanel32;
      }
    };
    const bool = Settings.get('analogClock', true);
    const pref = bool ? ICONS.clock32 : ICONS.noclock32;
    const tip = '• Left-click: Show/Hide Analog Clock\n• Shift + Left-click: 🔒 Clock position\n• Ctrl + Left-click: 🔓 Clock position';
    const analogClockBtn = $el('button', {
      id: 'analogClockBtn',
      className: 'toggler analog-clock-btn',
      title: tip,
      onclick: (e) => toggleAnalogClock(e),
      },
      $el('img', {
        id: 'clock32Img',
        className: 'image',
        src: pref,
      })
    );
    const bulbImg = $el('button', {
      id: 'opacityToggler',
      className: 'toggler',
      title: '• Left-click: Default 50% Brightness\n• Shift + Left-click: Increase Brightness\n• Ctrl + Left-click: Decrease Brightness',
      onclick: (e) => applyAnalogClockOpacity(e),
      },
      $el('img', {
        id: 'bulb32',
        className: 'image',
        src: ICONS.bulb32,
      })
    );
    const panelToggler = $el('button', {
      id: 'panelToggler',
      className: 'toggler',
      title: localizedTitle.controlsBtnTitle,
      onclick: toggleControls,
      },
      $el('img', {
        id: 'panel32Img',
        className: 'image',
        src: ICONS.panel32,
      })
    );
    const scalerReset = $el('button', {
      id: 'scalerReset',
      className: 'scaler scaler-reset',
      textContent: localizedString.scalerBtnResetText,
      title: localizedTitle.scalerResetTitle,
      onclick: () => setClockPercentage(100),
    });
    const scalerMinus = $el('button', {
      id: 'scalerMinus',
      className: 'scaler scaler-btn',
      textContent: localizedString.scalerBtnMinusText,
      title: localizedTitle.scalerBtnDownTitle,
      onclick: () => setClockPercentage(currentPercent - 5),
    });
    const percentageDisplay = $el('input', {
      id: 'scalerInput',
      className: 'scaler scaler-inp',
      type: 'number',
      value: '100',
      min: '30',
      max: '200',
      step: '1',
      title: localizedTitle.percentageDisplayTitle,
      oninput(e) {
        const val = e.target.value;
        if (val === '') return;
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
          setClockPercentage(num);
      } }
    });
    const scalerPlus = $el('button', {
      id: 'scalerPlus',
      className: 'scaler scaler-btn',
      textContent: localizedString.scalerBtnPlusText,
      title: localizedTitle.scalerBtnUpTitle,
      onclick: () => setClockPercentage(currentPercent + 5),
    });
    const digitalCalBtn = $el('button', {
      id: 'digitalCalBtn',
      className: 'toggler digital-cal-btn',
      title: localizedTitle.calBtnTitle,
      onclick: dateTimeToggle,
      },
      $el('img', {
        id: 'calendar32Img',
        className: 'image',
        src: ICONS.calendar32,
      })
    );
    setClockPercentage(savedPercent);
    controlContainer.append(
      hostToggler,
      wallpaperToggler,
      buttonThemer,
      inputThemer,
      downThemer,
      spacer1,
      buttonLogo,
      inputLogo,
      downLogo,
    );
    scalerContainer.append(
      analogClockBtn,
      bulbImg,
      panelToggler,
      scalerReset,
      scalerMinus,
      percentageDisplay,
      scalerPlus,
      digitalCalBtn,
    );
    STRING_HTML.main > body.prepend(controlContainer);
    STRING_HTML.main > body.prepend(scalerContainer);
    makeDraggable(controlContainer, 'controlContainer');
    restorePosition(controlContainer, 'controlContainer');
    makeDraggable(scalerContainer, 'scalerContainer');
    restorePosition(scalerContainer, 'scalerContainer');
  };

// =====================================================================================
// SEARCH RESULTS BG OPACITY CONTROL (Section 6)
// =====================================================================================

  const SEARCH_RESULTS_BG_OPACITY_DEFAULT = 50;
  const SEARCH_RESULTS_BG_OPACITY_MIN = 0;
  const SEARCH_RESULTS_BG_OPACITY_MAX = 100;
  const SEARCH_RESULTS_BG_OPACITY_STEP = 5;

  let searchResultsBgOpacity = Settings.get('searchResultsBgOpacity', SEARCH_RESULTS_BG_OPACITY_DEFAULT);
  const applySearchResultsBgOpacity = () => {
    document.documentElement.style.setProperty('--search-results-bg-brightness', searchResultsBgOpacity / 100);
    let int = ((100 - searchResultsBgOpacity) / 100);
    document.documentElement.style.setProperty('--search-results-logo-brightness',
      int > 0.1 ? ((100 - searchResultsBgOpacity) / 100) - 0.1 : int === 0.1
                ? ((100 - searchResultsBgOpacity) / 100) - 0.05 : int === .05
                ? ((100 - searchResultsBgOpacity) / 100) - 0.025 : 0
    );
    Settings.set('searchResultsBgOpacity', searchResultsBgOpacity);
  };

  const setString = () => {
    let searchResultsBgOpacity = Settings.get('searchResultsBgOpacity', SEARCH_RESULTS_BG_OPACITY_DEFAULT);
    let str = 'BG Brightness ' + (100 - searchResultsBgOpacity) + '%';
    const btn = $id('brightnessBtn');
    btn.textContent = str;
  };

  const increaseSearchResultsBgOpacity = () => {
    searchResultsBgOpacity = Math.min(SEARCH_RESULTS_BG_OPACITY_MAX, searchResultsBgOpacity + SEARCH_RESULTS_BG_OPACITY_STEP);
    applySearchResultsBgOpacity();
    setString();
  };

  const defaultResultsBgOpacity = (e) => {
    if (e.button !== 0) return;
    if (e.button === 0 && e.shiftKey) {
      searchResultsBgOpacity = SEARCH_RESULTS_BG_OPACITY_MIN;
    } else if (e.button === 0 && e.ctrlKey) {
      searchResultsBgOpacity = SEARCH_RESULTS_BG_OPACITY_MAX;
    } else if (e.button === 0) {
      searchResultsBgOpacity = SEARCH_RESULTS_BG_OPACITY_DEFAULT;
    }
    applySearchResultsBgOpacity();
    setString();
  };

  const decreaseSearchResultsBgOpacity = () => {
    searchResultsBgOpacity = Math.max(SEARCH_RESULTS_BG_OPACITY_MIN, searchResultsBgOpacity - SEARCH_RESULTS_BG_OPACITY_STEP);
    applySearchResultsBgOpacity();
    setString();
  };

  const buildBrightnessContainer = () => {
    const brightnessContainer = $el('div', {
      id: 'brightnessContainer',
      },
      $el('svg', {
        id: 'brightnessPlus',
        className: 'button',
        title: STRING_TOOLTIP.brightnessPlusTitle,
        viewBox: '0 0 16 16',
        onclick: decreaseSearchResultsBgOpacity,
        },
        $el('path', {
          d: 'M 7 2 H 9 V 7 H 14 V 9 H 9 V 14 H 7 V 9 H 2 V 7 H 7 Z',
        })
      ),
      $el('button', {
        id: 'brightnessBtn',
        className: 'button',
        textContent: '',
        title: STRING_TOOLTIP.brightnessTitle,
        onclick: (e) => defaultResultsBgOpacity(e),
      }),
      $el('svg', {
        id: 'brightnessMinus',
        className: 'button',
        title: STRING_TOOLTIP.brightnessMinusTitle,
        viewBox: '0 0 16 16',
        onclick: increaseSearchResultsBgOpacity,
        },
        $el('path', {
          d: 'M 2 7 H 14 V 9 H 2 Z',
        })
      )
    );
    makeDraggable(brightnessContainer, 'brightnessContainer');
    restorePosition(brightnessContainer, 'brightnessContainer');
    STRING_HTML.search > body.prepend(brightnessContainer);
  }

// =====================================================================================
// VIEW CONTAINERS (Section 7)
// =====================================================================================

  const viewControls = Settings.get('viewControls', true);
  const containerView = (e) => {
    if (e.button !== 0) return;
    if (e.shiftKey || e.ctrlKey || e.altKey) {
      const image = $id('viewContainersImg');
      const view = VIEW_IMAGES[viewImage];
      viewImage = view.next;
      image.src = VIEW_IMAGES[viewImage].src;
      Settings.set('viewImg', viewImage);
      return;
    }
    const enable = Settings.get('viewControls', true);
    const hidden = !enable;
    Settings.set('viewControls', hidden);
    $id('scalerContainer').classList.toggle('hidden', hidden);
    $id('controlContainer').classList.toggle('hidden', hidden);
  };

  const viewCnt = () => {
    const viewContainers = $el('div', {
      id: 'viewContainersDiv',
      },
      $el('img', {
        id: 'viewContainersImg',
        src: ICONS.mask32R,
        title: '• Left-click: Show/Hide Containers\n• Shift/Ctrl/Alt + Left-click: Toggle Images red, green, blue, yellow',
        onclick: (e) => containerView(e),
      })
    );
    body.prepend(viewContainers);
    const viewContainersDiv = $id('viewContainersDiv');
    makeDraggable(viewContainersDiv, 'viewContainersDiv');
    restorePosition(viewContainersDiv, 'viewContainersDiv');
  };

// =====================================================================================
// UI MANAGER (Section 8)
// =====================================================================================
  const init = () => {
    const textArea = $id('ti6dpd');
    if (textArea) textArea.placeholder = localizedString.placeholderText;
    applyCurrentWallpaper();
    scheduleWallpaperUpdate();
    applyLogo(Settings.get('logoImageNum', 1));
    applyControlContainer();
    updateWallpaperControls();
    applyDateTime();
    startDigitalClock();
    const showClock = Settings.get('analogClock', true);
    const clock = $id('analogClockContainer');
    const scalerCtn = $id('scalerContainer');
    const controlCtn = $id('controlContainer');
    const scaler = $qa('.scaler', scalerCtn);
    const panelTog = $id('panelToggler');
    if (showClock) {
      requestAnimationFrame(() => applyAnalogClock());
    } else {
      clock?.remove();
    }
    panelTog.classList.toggle('disabled', !showClock);
    scaler.forEach(el => el.classList.toggle('disabled', !showClock));
    const btn = $id('analogClockBtn');
    const pref = showClock ? ICONS.clock32 : ICONS.noclock32;
    const tip = '• Left-click: Show/Hide Analog Clock\n• Shift + Left-click: 🔒 Clock position\n• Ctrl + Left-click: 🔓 Clock position';
    btn.replaceChildren($el('img', { title: tip, src: pref }));
    const img = $id('hostImg');
    const current = Settings.get('wallpaperHost', 'github');
    const currentSite = WALLPAPER_SITES.find(site => site.host === current);
    let index = WALLPAPER_SITES.findIndex(site => site.host === current);
    if (index === -1) index = 0;
    index = index % WALLPAPER_SITES.length;
    img.src = WALLPAPER_SITES[index].icon;
    if (currentSite) {
      img.title = localizedTitle[currentSite.titleKey];
    }
    if (Settings.get('wallpaperHost') !== currentSite.host) {
      Settings.set('wallpaperHost', currentSite.host);
    }
    const dtView = Settings.get('dateTimeView', false);
    const calImg = $id('calendar32Img');
    if (dtView) {
      calImg.src = ICONS.calendar32
    } else {
      calImg.src = ICONS.nocalendar32
    }
    const panelImg = $id('panel32Img');
    const imgPanel = Settings.get('controlsPanel', false);
    if (imgPanel) {
      panelImg.src = ICONS.panel32;
    } else {
      panelImg.src = ICONS.nopanel32;
    }
    applySearchResultsBgOpacity();
    buildBrightnessContainer();
    viewCnt();
    setString();
    scalerCtn.classList.toggle('hidden', Settings.get('viewControls', true));
    controlCtn.classList.toggle('hidden', Settings.get('viewControls', true));
    const image = $id('viewContainersImg');
    const view = VIEW_IMAGES[viewImage];
    image.src = VIEW_IMAGES[viewImage].src;
    const clockOpacity = Settings.get('analogClockOpacity', ANALOG_CLOCK_OPACITY_DEFAULT);
    document.documentElement.style.setProperty('--analog-clock-opacity', clockOpacity / 100);
  };

// =====================================================================================
// EVENT LISTENERS (Section 9)
// =====================================================================================

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

// =====================================================================================
// CSS (Section 10)
// =====================================================================================

  // GOOGLE PAGE
  GM_addStyle(`
    ${STRING_HTML.main} .hidden,
    ${STRING_HTML.main} #brightnessContainer,
    ${STRING_HTML.main} div.o3j99.n1xJcf.CoM3Df > a.w5hRs,
    ${STRING_HTML.main} #gb > div.gb_Q.gb_6.gb_Vf.gb_3f > div:nth-child(2) > a,
    ${STRING_HTML.main} #gb > div.gb_Ad.gb_6.gb_L,
    ${STRING_HTML.main} div.KxwPGc.SSwjIe > div.KxwPGc.AghGtd,
    ${STRING_HTML.main} div.KxwPGc.SSwjIe > div.KxwPGc.ssOUyb,
    ${STRING_HTML.main} div.KxwPGc.SSwjIe > div.KxwPGc.iTjxkf > a,
    ${STRING_HTML.main} div.RNNXgb div.fzj3ad,
    ${STRING_HTML.main} div.o3j99.qarstb > div:nth-child(3),
    ${STRING_HTML.main} #EUjKDc,
    ${STRING_HTML.main} #gbqfbb,
    ${STRING_HTML.main} div.k1zIA.kKvsb > div.IzOpfd,
    ${STRING_HTML.main} div.o3j99.qarstb > div:nth-child(2),
    ${STRING_HTML.main} a.w5hRs,
    ${STRING_HTML.main} div.g55egf > a,
    ${STRING_HTML.main} promo-middle-slot,
    ${STRING_HTML.main} .IzOpfd,
    ${STRING_HTML.main} div.RNNXgb > div.SDkEP > div.fM33ce.dRYYxd > div {
      display: none !important;
    }
    ${STRING_HTML.mainHTML} #gb > div.gb_Q.gb_6.gb_Vf.gb_3f {
      padding-right: 0px !important;
    }
    ${STRING_HTML.main} header a {
      color: #FFF !important;
      text-decoration: none !important;
    }
    ${STRING_HTML.main} header a > svg {
      fill: #FFF !important;
    }
    ${STRING_HTML.main} div.L3eUgb > div:nth-child(13) > div,
    ${STRING_HTML.main} div.Ij8KCd {
      background: transparent !important;
    }
    ${STRING_HTML.main} div.KxwPGc.SSwjIe {
      background: transparent !important;
      float: right !important;
    }
    ${STRING_HTML.main} g-popup > div.CcNe6e > div {
      background: rgba(0 0 0 / .2) !important;
      border: 1px solid #303134 !important;
      border-radius: 6px !important;
      padding: 8px 16px !important;
    }
    ${STRING_HTML.main} g-popup > div.CcNe6e > div:hover {
      border-color: #666 !important;
      text-decoration: none !important;
    }
    ${STRING_HTML.main} #LS8OJ > div.k1zIA.rSk4se > svg {
      fill: #FFF !important;
    }
    ${STRING_HTML.main} div.plsC5e.RqyYHe > div.acUsEb.Q6KTif.KEY6ib > form > div:nth-child(1) > div > div.RNNXgb,
    ${STRING_HTML.main} div.L3eUgb input.gNO89b,
    ${STRING_HTML.main} form center > input[type="submit"],
    ${STRING_HTML.main} div.plsC5e.RqyYHe div.RNNXgb div.bvUkz {
      background: rgba(0 0 0 / .2) !important;
    }
    ${STRING_HTML.main} #APjFqb {
      filter: brightness(2) !important;
      text-shadow: 1px 1px 2px #000 !important;
    }
    ${STRING_HTML.main} div.fM33ce.dRYYxd > div.ywK6Rd,
    ${STRING_HTML.main} > body div.RNNXgb div.fM33ce.dRYYxd {
      background: none !important;
    }
    ${STRING_HTML.main} #gb > div.gb_z > div:nth-child(2) {
      height: calc(-70px + 100vh) !important;
    }
    ${STRING_HTML.main} #gb > div.gb_R.gb_8.gb_1f.gb_8f {
      background: transparent !important;
      border-radius: 8px !important;
      padding: 9px 10px 0px 0px !important;
      height: 28px !important;
      margin-top: -4px !important;
    }
    ${STRING_HTML.main} #gbwa > div {
      padding: 0 !important;
    }
    ${STRING_HTML.main} #gbwa > div > a {
      height: 36px !important;
      margin-top: -2px !important;
      padding: 4px !important;
      width: 36px !important;
    }
    ${STRING_HTML.main} #gb > div.gb_z {
      margin-top: -8px !important;
    }
    ${STRING_HTML.main} div.Qe0THe {
      z-index: 99999;
    }
    ${STRING_HTML.main} > body > div.plsC5e.RqyYHe center > input.gNO89b {
      left: -50px !important;
      position: relative !important;
    }
    ${STRING_HTML.main} > body div.g55egf.rWLVme > span > span {
      left: calc(30px + 50vw) !important;
      position: absolute !important;
      top: 457px !important;
    }
  `);

  // VIEW CONTAINERS
  GM_addStyle(`
    #viewContainersDiv {
      left: 0;
      margin-left: -10px;
      position: fixed;
      padding-left: 10px;
      padding-right: 10px;
      top: 0px;
      z-index: 99999;
    }
    #viewContainersImg {
      background: rgba(0 0 0 / .2);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      height: 24px;
      padding: 7px 10px;
      opacity: .7;
      width: 38px;
    }
    #viewContainersImg:hover {
      opacity: 1;
    }
  `);

  // ANALOG CLOCK
  GM_addStyle(`
    #analogClockContainer {
      left: 22px;
      position: fixed;
      top: 110px;
    }
    #analogClockContainer .clock-elem {
      opacity: var(--analog-clock-opacity) !important;
    }
    #analogClockContainer .hidden {
      display: none;
    }
    .ClockContainer {
      align-items: center;
      display: flex;
      flex-direction: column;
      font-family: "Segoe UI", sans-serif;
      left: 50px;
      position: absolute;
      right: auto;
      top: 100px;
      user-select: none;
      z-index: 999;
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
      filter: drop-shadow(0px 0px 2px #000);
    }
    .Analog-Number {
      font-family: "Segoe UI", sans-serif;
      font-size: 8px;
      font-weight: 500;
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
      --numeral-top: rgba(0 0 0 / 1);
      --numeral-bottom: rgba(0 0 0 / 1);
      --tick-hourmark: rgba(0 0 0 / .7);
      --tick-secondmark: rgba(0 0 0 / .3);
    }
    .dark-theme {
      --numeral-top: rgba(0 0 0 / 1);
      --numeral-bottom: rgba(0 0 0 / 1);
      --tick-hourmark: rgba(0 0 0 / .7);
      --tick-secondmark: rgba(0 0 0 / .3);
    }
    #dayBannerBg {
      filter: drop-shadow(1px 1px 4px #000);
      stroke-width: .1;
    }
    #dayBannerText {
    }
    .Analog-MonthDateText {
      color: #000;
      fill: #000;
      filter: drop-shadow(1px 1px 1px #666);
      font: 400 6px "Segoe UI", sans-serif;
    }
    .Analog-Bigclock.dark .Analog-MonthDateText {
      color: #FFF;
      fill: #FFF;
    }
    .Analog-timeText {
      color: #000;
      fill: #000;
      filter: drop-shadow(1px 1px 1px #666);
      font: 400 7px "Segoe UI", sans-serif;
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
      font: 400 4px "Segoe UI", sans-serif;
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
      fill: rgba(255 255 255 / .75);
    }
    .Analog-BezelInner {
      filter: drop-shadow(1px 1px 3px #000);
    }
    .Analog-BezelShadow {
      stroke: rgba(0 0 0 / .14);
      stroke-width: .9;
    }
    .Analog-BezelHighlight {
      stroke: rgba(255 255 255 / .85);
      stroke-width: .18;
    }
  `);

  // CONTROLS GROUP
  GM_addStyle(`
    #analogClockContainer #controlsGroup {
      cursor: pointer;
      opacity: 1 !important;
    }
    #controlsGroup > image:hover {
      opacity: 1;
      filter: drop-shadow(1px 1px 3px #000);
    }
    .controls-img {
      opacity: 1;
    }
  `);

  // CONTROL CONTAINER
  GM_addStyle(`
    #controlContainer .disabled {
      cursor: default;
      opacity: 0.3;
      pointer-events: none;
    }
    #controlContainer ::-webkit-inner-spin-button,
    #controlContainer ::-webkit-outer-spin-button {
      display: none;
    }
    #controlContainer {
      align-items: center;
      background: rgba(0 0 0 / .2);
      border: none;
      border-radius: 8px;
      display: flex;
      height: 38px;
      justify-content: center;
      left: 400px;
      min-width: 380px;
      padding: 0px 10px;
      box-sizing: border-box;
      pointer-events: auto;
      position: fixed;
      text-shadow: 1px 1px 2px #000;
      top: 0px;
      user-select: none;
      z-index: 2;
    }
    #controlContainer.dragged {
      transform: none;
    }
    #controlContainer > * {
      pointer-events: auto;
    }
    #hostToggler {
      cursor: pointer;
      filter: none;
      height: 32px;
      margin: 0px;
      opacity: .6;
      width: 32px;
    }
    #wallpaperToggler {
      cursor: pointer;
      height: 32px;
      margin: 0px 4px;
      opacity: .6;
      width: 32px;
    }
    #hostToggler:hover,
    #wallpaperToggler:hover {
      filter: drop-shadow(0px 0px 3px #000);
      opacity: 1;
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
      color: #FFF;
      cursor: pointer;
      height: 22px;
      margin: 0px 4px;
      opacity: .7;
      padding: 4px 0px;
      text-align: center;
      text-shadow: 1px 1px 2px #000;
      width: 30px;
    }
    #downThemer {
      color: #FFF;
      cursor: pointer;
      opacity: .7;
      text-shadow: 1px 1px 2px #000;
      width: 22px;
    }
    #inputThemer:hover {
      background: rgba(255 255 255 / .9);
      color: #000;
      filter: drop-shadow(0px 0px 3px #000);
      font-weight: 700;
      text-shadow: none;
    }
    #spacer1 {
      color: #FFF;
      filter: brightness(2);
      margin: 9px 16px 0px 16px;
      opacity: 1;
      pointer-events: none;
      position: relative;
      text-align: center;
      top: -4px;
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
      color: #FFF;
      cursor: pointer;
      height: 22px;
      margin: 0px 4px;
      opacity: .7;
      padding: 4px 0px;
      text-align: center;
      text-shadow: 1px 1px 2px #000;
      width: 30px;
    }
    #inputLogo:hover {
      background: rgba(255 255 255 / .9);
      color: #000;
      font-weight: 700;
      text-shadow: none;
    }
    #downLogo {
      color: #FFF;
      cursor: pointer;
      opacity: .7;
      text-shadow: 1px 1px 2px #000;
      width: 22px;
    }
    #controlContainer > button,
    #controlContainer > input {
      font-family: "Segoe UI", sans-serif;
      font-size: 18px;
    }
    #controlContainer > button:not(.toggler):hover {
      filter: brightness(2);
      opacity: 1;
    }
    #inputThemer:hover,
    #inputThemer:focus-within,
    #inputLogo:hover,
    #inputLogo:focus-within {
      border-color: #999;
      filter: drop-shadow(0px 0px 3px #000);
      opacity: 1;
    }
    #buttonThemer,
    #inputThemer,
    #downThemer,
    #buttonLogo,
    #inputLogo,
    #downLogo {
    }
  `);

  // SCALER CONTAINER
  GM_addStyle(`
    #scalerContainer ::-webkit-inner-spin-button,
    #scalerContainer ::-webkit-outer-spin-button {
      display: none;
    }
    #scalerContainer {
      align-items: center;
      background: rgba(0 0 0 / .2);
      border: none;
      border-radius: 8px;
      box-sizing: border-box;
      height: 38px;
      left: 56px;
      padding: 0px 6px;
      pointer-events: auto;
      position: fixed;
      text-shadow: 1px 1px 2px #000;
      top: 0px;
      user-select: none;
      width: auto;
      z-index: 2;
    }
    #scalerReset {
      padding: 2px 8px;
      width: auto;
    }
    #scalerContainer > .scaler-btn {
      font-size: 18px;
      width: 26px;
    }
    #scalerInput {
      font-weight: 600;
      height: 23px;
      padding: 0px;
      width: auto;
    }
    #scalerContainer > .scaler {
      background: rgba(255 255 255 / .1);
      border: 1px solid #000;
      border-radius: 13px;
      color: #fff;
      display: inline-flex;
      filter: drop-shadow(0px 0px 3px #000);
      font-size: 16px;
      font-weight: 700;
      justify-content: center;
      margin: 0px 5px;
      opacity: .6;
      position: relative;
      text-align: center;
      top: -7px;
    }
    #scalerContainer > .toggler {
      height: 32px;
      margin: 0 5px;
      opacity: .6;
      pointer-events: all;
      position: relative;
      top: 3px;
      width: 32px;
    }
    #scalerContainer > .toggler.disabled {
      opacity: .3;
      pointer-events: none;
      position: relative;
    }
    #scalerContainer > .scaler:hover,
    #scalerContainer > .scaler-inp:focus-within {
      background: rgba(255 255 255 / .9);
      color: #000;
      cursor: pointer;
      filter: drop-shadow(0px 0px 3px #000);
      opacity: 1;
    }
    #scalerContainer > .toggler:hover {
      cursor: pointer;
      filter: drop-shadow(0px 0px 3px #000);
      opacity: 1;
    }
  `);

  // DATE/TIME CONTAINER
  GM_addStyle(`
    #digCalBtn {
      display: none;
    }
    #dateTimeContainer {
      align-items: center;
      box-sizing: border-box;
      display: flex;
      font-family: "Segoe UI", sans-serif;
      font-size: 18px;
      left: 0px;
      pointer-events: auto;
      position: fixed;
      top: 44px;
      user-select: none;
      z-index: 2;
    }
    #dateTimeContainer.dragged {
      transform: none;
    }
    #dateTimeContainer > * {
      pointer-events: auto;
    }
    #dateTime {
      background: rgba(0 0 0 / .2);
      border: none;
      border-radius: 8px;
      box-shadow: none;
      color: #FFF;
      cursor: pointer;
      height: auto;
      margin: 0px 8px;
      padding: 7px 10px 6px 10px;
      pointer-events: auto;
      text-shadow: 1px 1px 2px #000;
      user-select: none;
      width: auto;
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
      filter: drop-shadow(0 4px 12px rgba(0 0 0 / .3));
      height: auto;
      left: 50%;
      max-width: 100%;
      opacity: var(--analog-clock-opacity);
      position: fixed;
      right: auto;
      z-index: 99999;
    }
  `);

  // DEVELOPER LOCALE TESTING
  GM_addStyle(`
    #testingLocalePINPopup {
      align-items: center;
      background: rgba(0 0 0 / .45);
      display: flex;
      inset: 0;
      justify-content: center;
      position: fixed;
      z-index: 999999;
    }
    .testing-locale-pin-box {
      background: #eee;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0 0 0 / .45);
      color: #000;
      font-family: "Segoe UI", sans-serif;
      padding: 16px;
      text-align: center;
      width: 220px;
    }
    .testing-locale-pin-title {
      align-content: center;
      background: url('${ICONS.test32}') no-repeat;
      color: #000;
      font-size: 16px;
      font-weight: bold;
      height: 32px;
      margin-bottom: 8px;
    }
    #testingLocalePINInput {
      background: #3b3b3b;
      border: 1px solid #aaa;
      border-radius: 5px;
      box-sizing: border-box;
      color: #fff;
      font-size: 15px;
      letter-spacing: 3px;
      outline: none;
      padding: 7px 9px;
      text-align: center;
      width: 100%;
    }
    #testingLocalePINInput:focus {
      border-color: #666;
    }
    .testing-locale-pin-error {
      color: #c00;
      font-size: 14px;
      font-weight: 600;
      height: 20px;
      margin-top: 5px;
    }
    .testing-locale-pin-buttons {
      color: #000;
      display: flex;
      gap: 7px;
      justify-content: flex-end;
      margin-top: 5px;
    }
    .testing-locale-pin-buttons button {
      border: 1px solid #aaa;
      border-radius: 5px;
      cursor: pointer;
      color: #000;
      padding: 5px 12px;
    }
    .testing-locale-pin-buttons button:hover {
      background: #3b3b3b;
      color: #fff;
    }
  `);

  // SEARCH RESULTS PAGE
  GM_addStyle(`
    ${STRING_HTML.search} > body#gsr #logoGoogle,
    ${STRING_HTML.search} > body#gsr #viewContainersDiv,
    ${STRING_HTML.search} > body#gsr #dateTimeContainer,
    ${STRING_HTML.search} > body#gsr #scalerContainer,
    ${STRING_HTML.search} > body#gsr #controlContainer {
      display: none !important;
    }
    ${STRING_HTML.search} > body#gsr #logoGoogle {
      filter: brightness(var(--search-results-logo-brightness)) !important;
      z-index: 0 !important;
    }
    ${STRING_HTML.search} *:not(#analogClockContainer):not(#analogClockContainer *) {
      text-shadow: 2px 2px 4px #000;
    }
    ${STRING_HTML.search} > body#gsr #analogClockContainer {
      left: calc(100vw - 400px) !important;
      pointer-events: none;
      text-shadow: none;
    }
    body#gsr #brightnessContainer {
      align-items: center;
      display: inline-flex;
      left: 1134px;
      pointer-events: auto;
      position: fixed;
      top: 6px;
      z-index: 99999;
    }
    body#gsr #brightnessContainer > .button {
      background: linear-gradient(#666, #333);
      border: none;
      border-radius: 20px;
      color: #fff;
      cursor: pointer;
      fill: #fff;
      padding: 10px;
      stroke-width: .7;
      stroke: #000;
      text-align: center;
    }
    body#gsr #brightnessPlus,
    body#gsr #brightnessMinus {
      height: 20px;
      width: 20px;
    }
    body#gsr #brightnessPlus {
      margin: 0px 4px 0px 8px;
    }
    body#gsr #brightnessMinus {
      margin: 0px 8px 0px 4px;
    }
    body#gsr #brightnessBtn {
      font-size: 16px;
      height: 40px;
      min-width: 170px;
    }
    body#gsr #brightnessContainer > .button:hover {
      background: #fff;
      color: #000;
      fill: #000;
    }
    body#gsr .emcav.A8SBwf.pD4qTd,
    body#gsr #tsf > div:nth-child(1) > div {
      transform: none !important;
    }
    body#gsr #cnt {
      background: rgba(0 0 0 / var(--search-results-bg-brightness)) !important;
    }
    body#gsr > span.LoygGf,
    body#gsr > span.LoygGf.VHFyob {
      height: 62px !important;
    }
    body#gsr .xrOgrb {
     padding-top: 0px !important;
    }
    body#gsr #searchform {
      position: relative !important;
      top: -10px !important;
    }
    body#gsr .XDyW0e,
    body#gsr #footcnt,
    body#gsr #gb > div.gb_td.gb_0.gb_I > div,
    body#gsr div.logo,
    body#gsr picture > img,
    body#gsr #gb > div.gb_Ad.gb_6.gb_L > div,
    body#gsr #gb > div.gb_cd.gb_0.gb_I > div {
      display: none !important;
    }
    body#gsr #cnt > div.JryvJ > div,
    body#gsr .GLcBOb {
      border-bottom: none !important;
    }
    body#gsr #searchform,
    body#gsr #searchform > div.NDnoQ.P3mIxe {
      background: #000 !important;
    }
    body#gsr #hdtb-sc {
      margin-top: 30px !important;
    }
    body#gsr #gbwa > div,
    body#gsr #gb > div.gb_z {
      padding: 0 !important;
    }
    body#gsr #gbwa > div > a:hover {
      background-color: #181A1B !important;
      border: 1px solid #333 !important;
      color: #FFF !important;
    }
    body#gsr .gb_Aa {
      height: 40px !important;
      position: relative !important;
      top: -4px !important;
      width: 40px !important;
    }
    body#gsr .sfbg {
      opacity: 0 !important;
    }
    body#gsr .sfbg,
    body#gsr #pTwnEc,
    body#gsr .appbar,
    body#gsr #searchform div:last-of-type:not(.Q3DXx) {
      background: transparent !important;
    }
    body#gsr > #searchform {
      margin-top: -2px !important;
      top: 0 !important;
    }
    body#gsr #tsf > div:nth-child(1) > div {
      width: auto !important;
    }
    body#gsr .RNNXgb {
      background: linear-gradient(#666, #333) !important;
      border: none !important;
      border-radius: 24px !important;
      margin: 0 !important;
    }
    body#gsr .jOAHU {
      border-left: none !important;
    }
    body#gsr #gb > div.gb_z > div:nth-child(2) {
      height: calc(-70px + 100vh) !important;
    }
    body#gsr div.dodTBe {
      height: auto !important;
      min-height: 0 !important;
    }
    body#gsr .bzXtMb {
      max-width: 100vw !important;
    }
    body#gsr .zLSRge {
      border-bottom: none !important;
    }
    body#gsr div.RDmXvc.Jzkafd.LrrQLb {
      margin: 0px !important;
      padding: 0px !important;
    }
  `);

})();
