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

  const BASE_SIZE = 340;
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
  const body = document.body;

  // ===========================================================================
  // DOM HELPERS
  // ===========================================================================

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SVG_TAGS = new Set([
    'circle','clipPath','defs','desc','feDropShadow','feGaussianBlur','feMerge','feOffset','filter','foreignObject',
    'g','image','line','linearGradient','marker','mask','path','pattern','polyline','polygon','radialGradient',
    'rect','script','stop','style','svg','symbol','text','textPath','title','tspan','use'
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
      }
    }
    children.flat(Infinity).forEach(child => {
      if (child != null) el.append(child);
    });
    return el;
  };

  const $id = (id) => document.getElementById(id);
  const $q = (sel, ctx = document) => ctx?.querySelector(sel) ?? null;
  const $qa = (sel, ctx = document) => Array.from(ctx?.querySelectorAll(sel) ?? []);

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
        if (e.target.closest('button,input,select,textarea,image,img,span')) return;
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

  const ICONS = {
    calendar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAA30lEQVR4AcySPQ7CMAyFTSYWGDgGAwsLA0POwzk4WAYGFhg4CANd2IqfK0VxZUXKTyVQXuR8KB8uriP+hBBGhEu1wBAF+QCGcKkWGAIoYhSS63OkNAJ5SxlqRrJQpxE4bU5EU91v5x+Tjv1tS8jcDIbUcBfOHxou+66BUzqed9Tj/D/ix+tOm91aPZTFijv23hO/q0rsDVYsHt5fOh5OSmyxYrEyZg7Li60BtLDYsTWAFhbF1gBaWBRn5lD11fLilkFZd2PHLYOy7kZxy6Csu1FcNaHMJcePscJ/1DNw/gAAAP//0v4bEwAAAAZJREFUAwD80vEZnRNbEwAAAABJRU5ErkJggg==',
    calendar32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAhCAYAAAC4JqlRAAABFklEQVR4AeyTMQrCQBBFh9xGCxs7K1sJiHgAe+3TeACb9Np7ABFBbPcCNjYeR5llB8JOdkwxEyFswP3m/zD7XPOL8az8xB/nHPPoGe2sgOg6HirvkPqbsJBHGmwv5JF6MyzkkQbbCwPwbo9LBmg9gd2+Tv4J2lkrQHJ3g4AB0C8kbe5JHqlGxgCaQ/v4ngGGcwKrZQnnUw2o8buDXipTO4H1Yg7TyQhQIbrQS2VqAJeHg+frDajR/t5LZWoA19sdNtsKUGMA9FKZGkC8adf7DMBOQKqMRcYApMpYZAwAa5SqjEXGAKTKWGQMoGt9tJ7LAOwELKomzWQAFlWTZjIAi6pJMxmARdWkmQxAq15d55gD/AL5O8AXAAD///IWSOwAAAAGSURBVAMAC9MOEoOWO8AAAAAASUVORK5CYII=',
    calendarD: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAABJElEQVR4AbSUPRIBQRCFe+YQikgu2IwjOIBAqMTIpII9gBCJRAkFAscg20DkAFMOIB3ztmraGD87+6c80/1af1v7amsleZ+7UtqzuM0zewPbRXsy0RTfPGOnXzuzJ0x5WyzmSRTpmEjD2DSbpPp9gmflzqxnT3dm98CRj9NpiaJK4aJvUQA+UYqOSYLyQ3lmDB5EURoBbge1S0UPH0IdMpN6u6U6JFvtNtUhjsK9vSrqIHDDPIKuQi4cBAZIa00Qamg0jul8uaJM5ffB4HTb+ZlNh7RaH9jx+2CwEIKEEAzqdTu038U/+yCweQeQK6b9KRjsZ1S2Z7CfUdmewVmZ5Z0z+E9chUYMLpupv8/gspn6+wzOm2HW/6V5B7ye+kJpfi6B+QQAAP//ZMuhpAAAAAZJREFUAwApJROw/1D9zwAAAABJRU5ErkJggg==',
    calendarM: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAABA0lEQVR4AbSVsQ2DMBBF73uIiFRswBgMkDHSpqXIAKnTsEMKRqHOAFYGSOv4I90JSIIMMoiv+3eHH/YJCSez6+V9mJUsXdObgHWhRiNG86sWy8OtPY0sumfTXPqqCleRwMK9KMTXtbCmGve0pnHc03XkuHfX3Whyii+djILws/fy6HvaL63pGfhUVcMIeBz6MZU56xR9Ss+FtpU95I5lKXvIRjE+Xg7vDvHz2kPJOw4hCKWnoaf+5clgBaTGZDAAAWBcAIt5MtiIicbAnBel6+iprbmBFZArGhhYnhmwrm/gXDtVjoE5T0ob9NTW3MAKyBUNDKybIbD8PMGI/yrJqXhqfAAAAP//CetdbQAAAAZJREFUAwANXx+wJdNnLAAAAABJRU5ErkJggg==',
    calendarW: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAABFUlEQVR4AcRUMQ6CQBDcvUcYrewt6PQJPsDC0lirnS0FD7BUGxpjaWHBM7SjsPIBFx9ge94SdgNoclyASJjs7kwY9o49FFSul9amQknpo5WM+UGO4miTX5yls5s1jkSqZxhu0yAwEYAh4tjvg55OgThGUWOOY1Hj58hHvZNkR0mboJeWtoLMV1rDNU0p/YKPJsazIMi2gJZDedGVauIJlNfRlIlj6AJqMBxCF5CtKC6vjfz/xotlBLf7Qxbjqmt3vFnPYX+4iLGrrm08GY/gfLLnLLd21apnj3AXkI6NMUDIG8ryJrUYs2FbUYwRERBRfBGxUa3sPxS6gHTsmktfXYxdc+mri7FrLn11mmOUL9ZSYs8FfgAAAP//+POvEAAAAAZJREFUAwB8Az2wNEQxIQAAAABJRU5ErkJggg==',
    clock: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAC/0lEQVR4AaSUS0hVURSGl9ZMUgdmkJklWZaZImkOBOmShFY06GUR0sNsUJQmQqUiotZATIskstsDKbXXIColrFuCA3sgifhIwzLTgTpQw1lh69vce/VgVzBlrXPWXuv/v733Ea63ePibmpparBmneV6zVvONM6npMVvswS7/BCsgRQ2vBn4OvX/e0Hi5vLIqtaCk1EZS02OGxqnV0hoWsIp8NMvV9FIBtoJLpfKlt09CgldKYkKCSWp6zNCgxaPpMxPtBjsH9uaWD5k5+UXiu8RXivNz5dC+PRIfu1nC14aZpKbHDA1aPAq1OxlaiuVTFKsg9U51rWQcSZPkpG1GMNcDDVo8eFVbrGnCnFh3StErZV6/eVcOH9hvTmamczyWBgQIyU3w4IUBC5u3Fvxns588eyFJWxMtUIwkwplJz37rtmzaGOGG44WhumyYnDhGd7K1d3RZro8ZIwDqRYOD6hEDonft6hU5c/ac6fHgs8CApesYwLbP7R2yITxc19bACADQstjoWdD0E8dlZHTUbYIBSxs2wFFf+75J6KoQXU8HBowu+I1Ku7ABG9FjhmbaIYYBS3tRgAPHxsbF389P19bACAAQQJKaHjOrWgwDlvYDAevbcwAA5FJQ03OtPb0BD/v7+8nY+LgnjfmOXT2d8u5Bjak9CWHA0vkw4LY1oaul73u/rhcWMGAppQ2wIzoyQjq7u3W9sIABSykOwK3BK5Y7IiPWS0Pja+39X+CFAUsJrd5eXl6/tSjbu3unNL5tku6eXl3OL/DghaHOMpicWLSo150qTp88KvcfPpoXHCgevDBgKdzy65aXEB9XdyztoFTdq571WYaGRuRPUBAed3J9tHjw6iBP04Q5MZXuNKnvdBVUlBbly8SvCckrKpGax0+l5eMncwtOR02PGRq0ePA6GVpaf4/5JJM6zNIr7cg6leEovJgj68JCpX/ghzQ1N5ukpscMDVo8mhzMQHm4T8zClSqq13q7mrbsSk66oIC6wtwcB0lNjxkap1ZLa/wFAAD//3R0xwUAAAAGSURBVAMA37ilSkZhjSsAAAAASUVORK5CYII=',
    clockHide: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAC/ElEQVR4AYSUXUgUURTHz94Zl0VXZ8YPWrMXJRCKsI9HMYIgKBAknyspqOgp6KEoosACewiCIiwwrHfBfCgIgkikp+ohCITQgtIN05nVURed2en8rzvjjN6tZc7uuef8z+/ePffOFVThExBpC43WE6feWHUMI0gYx5CDpkI5KcF2vfm+YBhekNXPO8d3ZPKXWyl/pWzsI4YcNNCq4AmwbZomi4NSXVUXYHNnW6jYXs1rj5VqJGPIQQMt/xvPranJxVSbKwZUBIGNpG6vUTrXRs09d6n95mdpYzWn6ORISfqIIQcNJnAPmZpXVTUbh0crFmUowLCGa2+pbt8JuEpDrvXiCNXuOUbuEYvcgwZ5uv4zFEsw+uRZ6TAW/S6a5qbvLkV+3NnZey+C+1ZaAwt5gZ1N+UHX3JkWmh84iljCQvjqymoi7o2ORmPA001tBAZYYAq70XrMM8kNaug8R3WOExWEDuAzM7PhkABd6euTv2EQtcQbCxaYQpRKp5c6LZlH3+Co4INjL5GSMECrh4dJ7+mRMXyFtWCBKcinTHE3HylkY6aCf/j+g1TQWBlJFjPl5uEvxJOhr4Ij13H7Fu3d3yEN44RxOzDeAMOrYCo4Vt7d3U2wCmXlF8SvlCbZU1X2+sNHNNB/Z3uqzBLchmLm28p2AUfC3cdGqVaO08KyxCNZGhVFSYgXtRPyTabFL68iURwa7v6/4GEtWGAK6499SeO7gU8HzU8MSbAKKhP8VQkua7kNYIEpUkR+oKXGm57/orW5KZoZufrfI6WC424BAyww5amwFpzDPJOffWfT0tc35A5dSBx+Xui2RwXHrQgWxBIMR/e8XdlPBQrh04O9iZ5DEzf0dOvdUkqlNl5hFkbg7PJyXl9fb85+dPymZ9yW/BTNjt6gyf4DSkNujTXhrQio5TgOM+UTgTEC3CwUdLG4Pp57ME2YIDPJR5E3BXlp7COGHDTQGoVCKg6FLgFGAIY+sVhPud5T8/XvIgC5+9MkjSdEDDlooEXNVvsLAAD//xH3ir0AAAAGSURBVAMAfdKC3CfqlkcAAAAASUVORK5CYII=',
    clockShow: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACmElEQVR4AYxUP2gTURj/3aXtULHUSgVFBwUxKP03u3VwkAaCdbRQcNDZRaRpDPmDdnFx0UEo1E0DwcFBsJs4NklRTgs6KCm0WEsqKaRNzu/3Xl688y5pHve99933+5P3vruLjS6j/GjshJOeyjjpyVdOeuq9DpVniHWRItR4IzV+1hHDgYPIDuAmxOCmrNM6wDxBjBxyBQ9cAWMnPXGrYds/xISGAYG/4CbIpcZfh3/HTnrSBawVyBgYvYDT8RwuLa6puJFv4s2xOZWzRowcocplrWitpK2rvWPvrx6/fA3n7+YxNHa9RQsuxMgh16BeD2Ws+6R3SuKZ2SXD9a3VP3u+e96QSw1zyGm1V6sVDTtyBzJ4NBIlDb32a/uhdWqoJWi8bP3aqCePk1dvE+sYlcpmR+yf1k3Q0x446Ltn2OybycPWUrmIw0IB1eHhAOzV0lN67EYDrA6F6VoNtfl5DC4vd2CYshsVY2vE3HZar0xOgKa5rW0snBrFROohWGOEa6wROxzwV72mq4ODCozFYpiZmVF52CTGrny2YZCusadmpzT9VCyB8TiTxVI2p0mB2d0RY8sJ1D0F09OnXzeUoQfqklqOXe8/fGIY1fW3Jm0//aHdXfTF4+16p8Srpac9/mD9N2BlIePXhxcyQ5manapCD5PRQrzoKa0AIs3Gc8iob39DJX9fMqhXqpedkkwNtcyNlzK+mCr/lL/JOQJ7n99hq/Gxp+OTT1NqmNNDewHKmMVosvSSK4PE789m4e0b694gRg65pu71aBsTjCaLFn+VOY+2WVjAl8xUaBAjh1xqtFbfcfYZsxCVnUeazXOQh4Ajh5Ull5r/qQFjEtinaHJtsd7fkM9dvTGvAWtVB5hniZFDLkLGXwAAAP//cw1IbAAAAAZJREFUAwCc1SaA5NDCrQAAAABJRU5ErkJggg==',
    github: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAB0UlEQVR4AaSUTU4CQRCFq9uEBTvlBm5NTAwujIl6Cr2AyQzxAm7degMh8QJ6CmOiG9DExI0LT+DPShdGp62vmWFKmBEChEdXV7330QwDXmofwUl6tytp/1aS/ocq5PqIPWainpp8NTjpK2SQSciuJMiWZpuq4tmMPWaJepLBWTGw61/w4c2KnurFGqbXIY0ZssZcghksNV511lLJfnuZ5V8ZT0vIwsgTJXip8ZT3IvQiWY2r7RlQnI17FD5iDMFcU5F4UkAEihUYooeoEXXhYc3V0ssSqBVc/81iAICoETWirldwXtL7nXrDnBNl6omzUxvnY9r9LPVkJjv1ek+u2/D0j2ndw3oiE2RdTyz25h86F39tAl4cU0EA/FnRX7T16cXJg6W4dGC3M9UTGWV6EX88np4wjhvMvtrrj710N66NL/5U2RNA1FVihqpmMPXETn+CrouB+5Fbh5X9fILlgoI13mt39FUuB+9y0HuWAj7XG+SsIRjqz1f8E7Jw3oDRzMoZ+Evw+fab5IMCzukxzSSyMHJzCabBoLfpRFwXOHKd+73vTEYPanqjhnqFDNmyKX/BxYDr1Gt7cX6vs9u6Wjt5lMbRXRQ1PWaCB2+RM+svAAAA//8Mg253AAAABklEQVQDAAIjsE3KyMjJAAAAAElFTkSuQmCC',
    hand: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAACMElEQVR4AYxU224TMRQcJyjqC2o25YUiQQkRfBE8wPfBQ/kqHioEEl1FbWmyF5uZE2zZyS5L1fHlXMbj47OZYeLv1+fF+9sviyBoPRGe3JPEzuG6erOGoHXKnFgMEkuZFArH+dGn+diX7weJpWy5fo3l23d5rK3lqzZX0GyGkSERS4EUCop1zsH1rZYFqs0GCCmt8OWbFEGeaymp1q9y/+l6nlJOfZnl/6KyBDRdvhtdTxC708SJjJhQhvkQ7aNz6KdjlFwQhzCd5M7myiugBxfUANFREDvfm32eKjBwUOstJg4irF6ssLw8L1qwIIZvgL7D06uXzCOB8/bFcWP/+vpAG8JBgJFeXpgv9Iy31WGYHaa/o5z9Hi4wqGthwSLJYDYergwpDWAsb7r9cQdW8oPsQkkc2EpGugM8DxDBEVSu+tuNcg2B/vr71kgvPjVfzcihIPYkViD0xXkq6XkAb4AMkbR6fo7A0kWlOSl5URDP1EqsYeCdwOvZrBuoDQWtmWUlYIxTPPfHpDSVxKF7hNv/hmv5G9FqTcW7R4A2ob65RfVswf09XLdD/fMB5E91FWFEodhJER8w+B0CyxH6BmB5APXuHNXqjNsewXw8nCxDamkuFYOdAJIFznokp27wfND+gW1I6EHZBfIpRgRjSIpXHxtX3/OajJyZchFSMQ+xA9O85yEdtndPMFYGUpSKI3k8QAGgwhzyCSIdK4PykmJtBJFrVvIQRKiYf5Eq/w8AAAD//2AAN3UAAAAGSURBVAMAEA1aWMtHw7oAAAAASUVORK5CYII=',
    hourglass: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAABHklEQVR4AbyTMY7CQAxFPSttt2eAvcEeZA/BISigAAEduQgFR+EMFCBKoECCCqTB3xokGNsMiRBRfjK2v984ifJF2XGcd2NdZQgJFViyb7go8P5/SnVlzaHAlqlJ7oPgSP1aEzp+NXH757six6w2ZJ/4VYFIgeGBubUb9lvbAbladsbwwW/JBMMY2tOKQjBfS/itQvibTeDz5ILRYMIPmzFqJT0Fo/kBztDSpOiBimCYBM6LV6FstT8eCvdan87y+Lf7fc1bFydOsFECjFKcQv/2FMyQyK03KC/lBBx5CbyLC2aoPL7XWKqb4NSUT5rvgcndzU0wE0pQtsjp+hQ4rnrR+o2BsfLwo5ZLgXND01iBT4sL1ZW1uQJbpia5KwAAAP//ZeibPAAAAAZJREFUAwBJyMT9o1gnygAAAABJRU5ErkJggg==',
    ibb: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAA5klEQVR4AdSQsQ3CQBAEX06pgJiEBuiEfhDdENAJDRCSUYFjW2NpX6vz/8uBPzDS6O5371bmhsvrN/VgSJ1+Bw0ev5/k6Dqu0UtXRXOkU/Mp/o97AkQHDVzzHg9co8/BPPakf/D5+U7Q+mrdszbjfv5i7gRaYkg9FQ/o8YBe4AFvvByMENEguv6Na95HvxlMIGhJFc2Rroq3KZjB0/VGqRL9YjA3igklzWeiXwz22/lyTdeM+6tgN31But+x5a+CNVyqCo331Kz7ORjRYdjf9Ggeiua4vwQzvBWWoTaPB0swzd4cL3gGAAD//6vZcxQAAAAGSURBVAMAImLHyZEJKAgAAAAASUVORK5CYII=',
    moon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAADFUlEQVR4AazUX0gUQRwH8O/sn1vvTu9SL0+TzIOIqx4LAstIsCgyK8SMyHoJygJ7CHqxSKWojMoH8SWhCCTNKDWC6s3QTJQyCiz/lPmH8s/ppd15tns7/fYuROsh0hv2tzszt/OZ380MKyACpet+Ef+TiQhsCmjQhqoW4BGBA9PTEJmOia6KOTwisKhoANcRazeh+MzeEB4R2BRDKxwYJRy4cDaXGkCEYAbdN4Hvb18A2gxuFh/kEYFtsSIEUYY9JQmeV89ReHz30jO+cXI7j7YIQHRKaAmsScmEBilCzcXfcnekgjEaP91Nt5+IciYAuro0OHvzWu5MFmGciLnQNZpAXxp851waZIkczgnnmPUFqKFTXV883F99hMcm0NrS+cVvWIl1QfOMEIzFwe8q83iCKwajQ16MDU8SZGTJ6ahNQYpLhOrX/h8evZfP16e7oWhTiF+mwGaRMfx5LIxrPoBJGOgZgZCzxUVT4Z+l5VI29z85zJevolfprzORgQkMkiTAbJIJpn6BnnSeV2ddZML1fRvAH2VztW4/by/L5Kf3rOMFO928unArf30ti09V5/FAfR5P22SG2UI7HqQ8pCg6YgIFIw2E09NYa9GMkU8/Qn1CYW0nvOMiJPo6bXRZUX50DSqPuXFomwPulSZ4JmegyEFaPwINNEh11Qvd7ATXqY8ui8MByBaomoLEzFIGKkJjey/r7NXg8woAjQkHvR3UIVri4VzhQF+PkSltUAjmYJODEFQPmN0B0WaFJKjgYjROnW8kMnyRBmRcfcze9OrwekRA40CQJiVLsNshWq2wxJkBIzuaDEYY9YAPzE+bpqlQdRtKylpwq6GDBs6DjWr6lQZW9mwAX/pNmPXT75S99K0PJt9XJEXP0mQ0oQHOD6ZgdNCC9PwalNxtokGGFI5QxuEqcLmxg6UW1bHW9xwfuxVMTzIEZyh1jZaB3FDWBGuqhP4uM+pqxuHMqWBtH4YWoIa3ADY6jMgor2fu0lpmO/GQPX2po7lVRluzgpYmGVUPpiDvqmaugtvsQHnDX6Ax3ohfAAAA///Q4S43AAAABklEQVQDAFx5QpKw11dEAAAAAElFTkSuQmCC',
    panel: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAhCAYAAAC803lsAAACx0lEQVR4AcyXP4oiQRSHH15hBgyNBE8gKAaCmaCJ9qSeYddz6OIJxNSONBMMDAQjUyMPYGCsiMJufY3PeVXj7qL0yg7z8f5WvV9XtaAZuf6VSqXIMW40Gj9fAbMc0XW8JEJcot/tdseOqNPpyCtglmPMbMRknBO5xDeCxWIRO+RFxMxkNho4keR43PC43+9HDnkRETMR44gy7+/viRCCy+UiSqvVuvmaU5tWjZkOQQMngp9wPp9FIaF+aNOqsY/iCTkej6LQoH5o06qxj+IJ4cmz2azAdDpNLD55C4ttbP1HavQqnhDeAS1YS95CzcbWf6RGr+IJ4cm0YC15CzUbW/+RGr3KFyGbzUag2WwmFt8Owmcx1pLP5wW4UizYOn64jljxhDx7xKzTDa0lb6EWxuTAE4JqhaL6ob1XIxfyt3W23xNiP6Y02dj692rL5VKAK8WCXYMfriNWPCH2CWiwMX6lUhHgPcACecu9dVoPa8SKJyS8Pxvj6yJryVuo2dj6YY1Y8YSociwNWAu5EFvHp469R1gjVjwhf1JPjSsB3gMskLewsY3x6/W6AP1YIE+v4gmxT0GDja3/aI3+EPazuf9TCB8xBbXqh/bR2nA4FOBKscCe7KN4J8K9KTSoH9q0auyjeEK4N4UG9UObVo19lN8KqdVqt29roZC0aioC6wkJr+BfxwhQPCHhkxPTWC6Xpd1uC5aYfBqwl+IJOZ1OElIsFsX97pBcLpdY4rDn2VhFYL8IWa/XYnl7e6PvBrGtP+sj/rapczwhvBOFQkEsu93OtX3+E9v6sz6zPncVyez3+/iaiO/d+2w2k/l8LtvtNrHE9/oez50Zm8xGAyeSBNVqNXIqY4f3C+9wOMhkMpHBYJBY4rDnyThmJmoccWa1WsW9Xu+HC4SCA/sKkp+6zEYDJyLO+e4SH454NBrJK2CW44PZHMIvAAAA///1QiXsAAAABklEQVQDAL7YF8EhtUD/AAAAAElFTkSuQmCC',
    postimages: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAABNElEQVR4AbyST0pCURTGL06aNWsLQQXNmkQjW0JE7aBNFAS1iXZQREvIUbNmggouQWfOHCm/h5/cd+7RexBU+Lzn3/d7x+ftXL9OFvtQJ+3psxE8HvVTVN5uLhggw093V+nr5SZNP28LUafPnOaJpQKsIYzv98epe3Gk2dZJnT5zNOQjRgWYIptgJJZOHn+TpBonc8wT53LB3fP2lgAxnZ5dcjQPaILVl52n7IOzn2+hHpytgeVywfkAsWDEyObUrEJga4rkIbD9x23uPagK5g5jFEyn6vR6gzlHS1Uw04J4UPq94Y5gzMAlcoltP37+la7P6sZct+fv2dqgACD1h7e/pmRvShWMi414QC6A1OlbKLUQGOM2AbIKga0pkh8WnL/LyHbeTLGx9y49Y61WgGuGaH8JAAD//+ycaQIAAAAGSURBVAMAErvEL4E+ypgAAAAASUVORK5CYII=',
    sun: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAADw0lEQVR4AYxVS28cRRD+umd2dzZj1mtjYrCMojwwSBgcsHgkkAM5IA4cOHDlwim/ACFhiUQiUkhQhEQOBsIhFwS/AIGQOCKIeEZGQglYAhwSybKzfmx2t7urqOpZr3cdibh3vq7q6qqvaqp7tBa7HO0zUxzmn+RdumNXxI3Tj3IgcbUWfOkoP//Q8F0TiPdgDSvvHWa6+Cy7+Wd4/fws3zz5GAdv4APgmw6h5fDFiQNYfmeaN09PsT97kP25gzzIgsGKP3ttP+dpAnIEI57UdqjMlFB+YQil4yMwR3Ngtozs6SpsSTKJD8PAVHOsfTDYJit7vef4vmFsrAY0Orextj+An6ogGSnBiJfCWgObGKS1BCMvjWHPy+OgR+qwe4ZwTy1H/5CQ7aUPBL+XQIfK20bRjCA+ohgjU1wUU3lfVfwB6RdeP3IvF1YUrbgxN81/vTnNnBB4MhEvebouLFIRA1SPyuBkhxO4tIX5V0YRLsyIlxCvnJpiLcIiBQ6nUBKWSZ6o6xTXVCRjinHYOcozQ0BSAtKy3JxjbIm0whSJ/AoCVi4ogUJ5WEhJlH7sJNY11YU0yNk4D/v7jRTkMrhDDhQYMbhfeirsYgtyWyI6BC8Ishc8I0L27OM5XKOJzkoD9rkPrxhmA59St0pEchaimEQrVb2LSCJ6lEJKkZwiOcnhK1f2xm/G6isojDrpK0tQj1R0EgQJCFFyrD70yKgglFjdV19TKikd7PcnZovTaJoYFPu6o0oN0MpICSIpR8LgVCo5gbp2WykjXDzCdrJW3NnKUi7O4iS9ihVpUA8EL3bt6zYCVHfS6y2Ey5twTQ+36WBbkolBIJbTlIpiX1XG1ycElboWxIR3SInt2vyaRbtFaN1qwx44/53Z6Hiw8cgXUwR16usnyVoRurYghQSxhZ5kiSHQQhtBPvkgHa6/faU4vIff/8E8+O7PRopDflNuhZAUfWUEJZF1iEQkvWQBFXa1SYtoWQrbSPHiJ39i76lfjXAXn7QqCitfn1nPUVsyUGKtkiSbkmrVCtWDJlNSkXbJIVvOoCX+8s96JIWM3nUTHZd+vCWZ5LrcHkbtWh31aymStRAPqf+gaNWjvABkC+PINiZgTRUhKSlFDwPEc18vmj9WW73NQDmy66OSpIba1Qz1xQyjf+fSrnH8u3I/2s0xNBuj6LQyPPDWZYO+MUCs9mMf/2Qmzn47AED+kmwF1XqGilzP+05+Y5648JWZPPepmTjzuRmb+9JobD/uIO7f3NI10fV1L5888OpHV7fM/yv/AwAA//+yOWhCAAAABklEQVQDAEqT4fvQlDynAAAAAElFTkSuQmCC',
  };

  const IMAGES = {
    logo1: _aURL + 'google1.png',
    logo2: _aURL + 'google2.png',
    logo3: _aURL + 'world.png',
    logo4: _aURL + 'search2.png',
    logo5: _aURL + 'google3.png',
    logo6: _aURL + 'google4.png',
    logo7: _aURL + 'bulb.png',
    logo8: _aURL + 'search1.png',
    logo9: _aURL + 'google5.png',
    logo10: _aURL + 'google6.png',
    logo11: _aURL + 'flag.png',
    logo12: _aURL + 'face.png',
    logo13: _aURL + 'eagle.png',
    logo14: _aURL + 'monkey.png',
    logo15: _aURL + 'globe.png',
    logo16: _aURL + 'eyes.png',
    logo17: '',
  };

  const LOGO_CONFIG = {
    3: { marginTop: '15px', transform: 'translateX(-50%)' },
    4: { marginTop: '64px', transform: 'translateX(-50%)' },
    5: { marginTop: '5px', transform: 'translateX(-50%)' },
    7: { marginTop: '25px', transform: 'translateX(-50%)' },
    8: { marginTop: '60px', transform: 'translateX(-180%)' },
    12: { marginTop: '5px', transform: 'translateX(-50%)' },
    13: { marginTop: '15px', transform: 'translateX(-50%)' },
    15: { marginTop: '25px', transform: 'translateX(-50%)' },
  };

  const STRINGS = {
    amText: 'AM',
    bodyIdText: 'googleDashboard',
    buttonLogoText: 'Logo 🠉',
    buttonThemerText: 'Wallpaper 🠉',
    downLogoText: '🠋',
    downThemerText: '🠋',
    hideText: ' Hide',
    placeholderText: 'Search Look-up',
    pmText: 'PM',
    scalerBtnMinusText: '–',
    scalerBtnPlusText: '+',
    scalerBtnResetText: 'Reset',
    showText: ' Show',
    spacerXText: '|',
  };

  const TITLES = {
    anaCalBtnTitle: 'Show/Hide Calendar Info',
    analogClockBtnHideTitle: 'Hide Analog Clock',
    analogClockBtnShowTitle: 'Show Analog Clock',
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

  const WALLPAPERS = {
    github: 'https://raw.githubusercontent.com/Razzano/My_Wallpaper_Images/master/image',
    ibb: 'https://i.ibb.co/',
    postimages: 'https://i.postimg.cc/',
    images: {
      1: 'ccpzdVPW/image1.jpg',
      2: 'tMPSxh3g/image2.jpg',
      3: 'gLjPrzf3/image3.jpg',
      4: 'LD8QxWYR/image4.jpg',
      5: '3y0DqWHk/image5.jpg',
      6: 'B2dSDb3H/image6.jpg',
      7: '8DK6RKvR/image7.jpg',
      8: '8nbpV53N/image8.jpg',
      9: 'Z6bC7T5M/image9.jpg',
      10: 'zTqBrTmM/image10.jpg',
      11: 'FkpXCBhv/image11.jpg',
      12: 'F4ffy4rm/image12.jpg',
      13: 'LwhVzS8/image13.jpg',
      14: '7dQmB94X/image14.jpg',
      15: 'pjncQL5x/image15.jpg',
      16: 'bg41CCm4/image16.jpg',
      17: 'yBpnshnY/image17.jpg',
      18: 'qYNQbwTH/image18.jpg',
      19: 'mCLFRqsV/image19.jpg',
      20: 'wFgNR5H8/image20.jpg',
      21: 'FqHtmDk1/image21.jpg',
      22: 'nNrstZRN/image22.jpg',
      23: '7xzvSYgp/image23.jpg',
      24: '7tfycjYy/image24.jpg',
      25: 'fdgjbMRm/image25.jpg',
      26: '9H6YcBKf/image26.jpg',
      27: '5gnFSxZt/image27.jpg',
      28: 'XZPngML0/image28.jpg',
      29: '7Nn8Y9Gv/image29.jpg',
      30: 'yck538br/image30.jpg',
      31: 'XxFHNjqt/image31.jpg',
      32: 'HfPmkHPp/image32.jpg',
      33: 'gMBv6CZG/image33.jpg',
      34: 'Ld3DY74b/image34.jpg',
      35: 'jPPF3mP1/image35.jpg',
      36: 'mVYVX4Kb/image36.jpg',
      37: '8gfncszx/image37.jpg',
      38: 'xKdRSKgk/image38.jpg',
      39: 'kgNXnpPL/image39.jpg',
      40: '8D2cPStZ/image40.jpg',
      41: 'bgS10X16/image41.jpg',
      42: 'W4WV39Ls/image42.jpg',
      43: 'Y7PRD86Q/image43.jpg',
      44: 'mr8rLLfm/image44.jpg',
      45: 'rRJMCTss/image45.jpg',
      46: 'dwL7nbp3/image46.jpg',
      47: 'fdjpz40P/image47.jpg',
      48: 'yFFtYM13/image48.jpg',
      49: 'bRC5r95C/image49.jpg',
      50: 'dyVJD2w/image50.jpg',
      51: 'PZx7gVyd/image51.jpg',
      52: 'CKKvMsDf/image52.jpg',
      101: 'Gp0dwbHF/image1.jpg',
      102: '5tcbdf6q/image2.jpg',
      103: 'q7f4Vpzc/image3.jpg',
      104: 'HLGdDTVt/image4.jpg',
      105: 'MGyxzgQf/image5.jpg',
      106: 'jjVt0RLX/image6.jpg',
      107: 'BvxsJRKD/image7.jpg',
      108: 'MGyxzgQB/image8.jpg',
      109: 'vmWMGCVf/image9.jpg',
      110: 'JhbmRSkj/image10.jpg',
      111: '254mCgZd/image11.jpg',
      112: 'hG9gKNdb/image12.jpg',
      113: 'wBhH9nmQ/image13.jpg',
      114: 'YS1ktTWx/image14.jpg',
      115: '5tw1fDC3/image15.jpg',
      116: 'pdDxP3Fk/image16.jpg',
      117: '3wg73zvn/image17.jpg',
      118: 'k5x97Lbs/image18.jpg',
      119: '6QdwBFvb/image19.jpg',
      120: '5tw1fDC7/image20.jpg',
      121: '254mCgZX/image21.jpg',
      122: 'tghy98xc/image22.jpg',
      123: 'HLQHTFyh/image23.jpg',
      124: 'FKjmhwLw/image24.jpg',
      125: 'TPrGTBDZ/image25.jpg',
      126: 'NMBtFb6C/image26.jpg',
      127: 'tghy986G/image27.jpg',
      128: 'wvgzMFXf/image28.jpg',
      129: 'wvgzMFXG/image29.jpg',
      130: 'Hxdmn3wN/image30.jpg',
      131: 'mDB4kVYv/image31.jpg',
      132: '3RYhN9jT/image32.jpg',
      133: '0QPvjZGv/image33.jpg',
      134: 'Ssk4RVLq/image34.jpg',
      135: '26rYyTdr/image35.jpg',
      136: '85NGcwd5/image36.jpg',
      137: 'DZnh05Q8/image37.jpg',
      138: 'gJmpj4yx/image38.jpg',
      139: 'vBbyTX7g/image39.jpg',
      140: 'RFdBHfG0/image40.jpg',
      141: 'Kzf2MLQK/image41.jpg',
      142: 'bJghtbLn/image42.jpg',
      143: 'SsdhM8Vs/image43.jpg',
      144: 'LXDp1fvf/image44.jpg',
      145: 'nz2JD7Tv/image45.jpg',
      146: 'sXmrhSK5/image46.jpg',
      147: 'SsdhM8VV/image47.jpg',
      148: 'fLCN9X5v/image48.jpg',
      149: '26GDZvTw/image49.jpg',
      150: 'DZ6TXs5B/image50.jpg',
      151: 'Hxzgy536/image51.jpg',
      152: 'g09mFGnH/image52.jpg'
    },
    url(num) {
      const host = Settings.get('wallpaperHost', 'ibb');
      if (host === 'github') {
        return `${this.github}${num}.jpg`;
      }
      if (host === 'postimages') num += 100;
      return this[host] + this.images[num];
    }
  };

  const WALLPAPER_MODES = [
    { src: ICONS.hand, title: 'Manually Change Wallpaper' },
    { src: ICONS.hourglass, title: 'Hourly Change Wallpaper' },
    { src: ICONS.calendarD, title: 'Daily Change Wallpaper' },
    { src: ICONS.calendarW, title: 'Weekly Change Wallpaper' },
    { src: ICONS.calendarM, title: 'Monthly Change Wallpaper' }
  ];

  const WALLPAPER_HOSTS = {
    ibb:    'https://i.ibb.co/',
    github: 'https://raw.githubusercontent.com/Razzano/My_Wallpaper_Images/master/image',
    postimages: 'https://i.postimg.cc/'
  };

  const WALLPAPER_SITES = [
    {
      host: 'ibb',
      src: ICONS.ibb,
      title: 'This is the ImgBB host site\nToggles to the GitHub host site'
    },
    {
      host: 'github',
      src: ICONS.github,
      title: 'This is the GitHub host site\nToggles to the Postimages host site'
    },
    {
      host: 'postimages',
      src: ICONS.postimages,
      title: 'This is the Postimages host site\nToggles to the ImgBB host site'
    }
  ];

  // ===========================================================================
  // LOGO MANAGER (Section 1)
  // ===========================================================================

  const Logo = [null];

  for (let i = 1; i <= 16; i++) {
    Logo.push($el('img', {id: 'logoGoogle', class: 'logo', src: IMAGES[`logo${i}`]}));
  }

  const applyLogo = (num) => {
    const existing = $id('logoGoogle');
    if (existing) existing.remove();
    num = parseInt(num, 10);
    if (isNaN(num) || num < 0 || num > (IMAGE_COUNT + 1)) {
      num = 0;
    }
    const config = LOGO_CONFIG[num] || { marginTop: '40px', transform: 'translateX(-50%)' };
    GM_addStyle(`
      img[alt='Google'], #hplogo, #logo, .k1zIA img, .k1zIA svg, #${STRINGS.bodyIdText} #LS8OJ img, #${STRINGS.bodyIdText} #LS8OJ .k1zIA {
        display: ${num === 0 ? 'block' : 'none'} !important;
        visibility: ${num === 0 ? 'visible' : 'hidden'} !important;
      }
      div:has(> img[alt='Google']) {
        display: ${num === 0 ? 'block' : 'none'} !important;
      }
      #${STRINGS.bodyIdText} #logoGoogle {
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
      body {
        background: url('${image}') no-repeat center center / cover fixed !important;
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
    const current = Settings.get('wallpaperHost', 'ibb');
    let index = WALLPAPER_SITES.findIndex(site => site.host === current);
    index = (index + 1) % WALLPAPER_SITES.length;
    const next = WALLPAPER_SITES[index];
    Settings.set('wallpaperHost', next.host);
    const img = $id('hostImg');
    img.src = next.src;
    img.title = next.title;
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
    const spacer3 = $el('span', {id: 'spacer3', class: 'spacerX', textContent: STRINGS.spacerXText});
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
      href: ICONS.panel,
      width: 12,
      height: 12,
      x: 0,
      y: 0,
      style: 'cursor: pointer;',
      onclick: () => toggleControls()
    }, [
      $el('title', {}, [TITLES.controlsBtnTitle])
    ]);
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
      title: TITLES.percentageDisplayTitle,
      oninput(e) {
        const val = e.target.value;
        if (val === '') return;
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
          setClockPercentage(num);
        }
      }
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
      src: ICONS.sun
    });
    const themeBtn = $el('button', {
      className: 'ClockThemeToggle',
      title: TITLES.themeBtnTitle
    }, sunImg);
    const setTheme = (dark) => {
      Clock.classList.toggle('dark', dark);
      sunImg.src = dark ? ICONS.moon : ICONS.sun;
      Settings.set('clockDarkTheme', dark);
    };
    setTheme(Settings.get('clockDarkTheme', true));
    themeBtn.onclick = () => {
      setTheme(!Clock.classList.contains('dark'));
    };
    const clockImg = $el('img', {
      id: 'clockImg',
      src: ICONS.clock
    });
    const secondHandBtn = $el('button', {
      className: 'ClockSecondToggle',
      title: TITLES.secondHandBtnTitle
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
      src: ICONS.calendar
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
      title: TITLES.anaCalBtnTitle,
      onclick: () => toggleCalendarInfo()
    }, calendarImg);
    const scalerControls = $el('div', {
      id: 'scalerControls',
      className: 'scaler-controls' },
      themeBtn,
      secondHandBtn,
      anaCalBtn,
      spacer3,
      $el('button', {
        className: 'scaler-reset',
        textContent: STRINGS.scalerBtnResetText,
        title: TITLES.scalerResetTitle,
        onclick: () => setClockPercentage(100)
      }),
      $el('button', {
        className: 'scaler-btn',
        textContent: STRINGS.scalerBtnMinusText,
        title: TITLES.scalerBtnDownTitle,
        onclick: () => setClockPercentage(currentPercent - 5)
      }),
      percentageDisplay,
      $el('button', {
        className: 'scaler-btn',
        textContent: STRINGS.scalerBtnPlusText,
        title: TITLES.scalerBtnUpTitle,
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
      const ampm = now.getHours() < 12 ? STRINGS.amText : STRINGS.pmText;
      dateText.textContent = `${monthAbb} ${monthday}`;
      ampmText.textContent = ampm;
      timeText.textContent = `${h12}:${min}`;
      timeText.setAttribute('x', h12 < 10 ? 42 : 41);
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
    const bool = Settings.get('analogClock', true);
    const pref = bool ? ICONS.clockHide : ICONS.clockShow;
    const tip = bool ? TITLES.analogClockBtnHideTitle : TITLES.analogClockBtnShowTitle;
    btn.replaceChildren(
      $el('img', {
        src: pref,
        title: tip,
        alt: 'Clock'
      })
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
      src: ICONS.calendar32
    });
    const digCalBtn = $el('button', {
      id: 'digCalBtn',
      title: TITLES.digCalBtnTitle,
      onclick: dateTimeToggle},
      imageCalendar
    );
    const dateTimeEl = $el('span', {
      id: 'dateTime',
      title: TITLES.dateTimeElTitle,
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
    const ampm = now.getHours() < 12 ? STRINGS.amText : STRINGS.pmText;
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
    if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    const dtEl = $id('dateTime');
    dtEl.hidden = !dtEl.hidden;
    Settings.set('dateTimeView', !dtEl.hidden);
    if (dtEl.hidden) {
      clearInterval(State.digital.interval);
      State.digital.interval = null;
    } else {
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

  // ===========================================================================
  // CONTROL MANAGER (Section 5)
  // ===========================================================================

  const applyControlContainer = () => {
    const controlContainer = $el('div', {
      id: 'controlContainer'
    });
    const host = Settings.get('wallpaperHost', 'ibb');
    const hostImg = $el('img', {
      id: 'hostImg',
      src: ICONS[host],
    });
    const hostToggler = $el('button', {
      id: 'hostToggler',
      onclick: toggleWallpaperHost
      }, hostImg
    );
    const toggleImg = $el('img', {
      id: 'toggleImg',
      src: ICONS.hand
    });
    const wallpaperToggler = $el('button', {
      id: 'wallpaperToggler',
      onclick: wallpaperToggleHandler
    }, toggleImg);
    const buttonThemer = $el('button', {
      id: 'buttonThemer',
      textContent: STRINGS.buttonThemerText,
      title: TITLES.buttonThemerTitle,
      onclick: wallpaperButtonChanger
    });
    const inputThemer = $el('input', {
      id: 'inputThemer',
      type: 'number',
      value: Settings.get('wallpaperImage', 0),
      title: TITLES.inputThemerTitle,
      oninput: wallpaperInputChanger
    });
    const downThemer = $el('button', {
      id: 'downThemer',
      textContent: STRINGS.downThemerText,
      title: TITLES.downThemerTitle,
      onclick: wallpaperButtonChanger
    });
    const spacer1 = $el('span', {
      id: 'spacer1',
      class: 'spacerX',
      textContent: STRINGS.spacerXText
    });
    const buttonLogo = $el('button', {
      id: 'buttonLogo',
      textContent: STRINGS.buttonLogoText,
      title: TITLES.buttonLogoTitle,
      onclick: e => logoClick(e.target.id)
    });
    const inputLogo = $el('input', {
      id: 'inputLogo',
      type: 'number',
      value: Settings.get('logoImageNum', 1),
      title: TITLES.inputLogoTitle,
      oninput: handleLogoInput
    });
    const downLogo = $el('button', {
      id: 'downLogo',
      textContent: STRINGS.downLogoText,
      title: TITLES.downLogoTitle,
      onclick: e => logoClick(e.target.id)
    });
    const spacer2 = $el('span', {
      id: 'spacer2',
      class: 'spacerX',
      textContent: STRINGS.spacerXText
    });
    const bool = Settings.get('analogClock', true);
    const pref = bool ? ICONS.clockHide : ICONS.clockShow;
    const tip = bool ? TITLES.analogClockBtnHideTitle : TITLES.analogClockBtnShowTitle
    const analogClockBtn = $el('button', {
      id: 'analogClockBtn',
      title: tip,
      onclick: toggleAnalogClock},
      $el('img', {
        src: pref,
        alt: 'Clock'
      })
    );
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
    body.id = STRINGS.bodyIdText;
    const textArea = $id('APjFqb');
    if (textArea) textArea.placeholder = STRINGS.placeholderText;
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
    const bool = Settings.get('analogClock', true);
    const pref = bool ? ICONS.clockHide : ICONS.clockShow;
    const tip = bool ? TITLES.analogClockBtnHideTitle : TITLES.analogClockBtnShowTitle;
    btn.replaceChildren($el('img', { title: tip, src: pref }));
    const img = $id('hostImg');
    const current = Settings.get('wallpaperHost', 'ibb');
    let index = WALLPAPER_SITES.findIndex(site => site.host === current);
    index = index % WALLPAPER_SITES.length;
    img.src = WALLPAPER_SITES[index].src;
    img.title = WALLPAPER_SITES[index].title;
  };

  // ===========================================================================
  // EVENT LISTENERS (Section 7)
  // ===========================================================================

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Settings.get('analogClock', true)) {
      if (!$id('analogClockContainer')) {
        applyAnalogClock();
      }
    }
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
    #${STRINGS.bodyIdText} .disabled {
      cursor: default;
      opacity: 0.3;
      pointer-events: none;
    }
    #${STRINGS.bodyIdText} .hidden {
      display: none;
    }
    #${STRINGS.bodyIdText} ::-webkit-inner-spin-button,
    #${STRINGS.bodyIdText} ::-webkit-outer-spin-button {
      display: none;
    }
  `);

  // GOOGLE PAGE
  GM_addStyle(`
    #${STRINGS.bodyIdText} div.o3j99.n1xJcf.CoM3Df > a.w5hRs,
    #${STRINGS.bodyIdText} #gb > div.gb_Q.gb_6.gb_Vf.gb_3f > div:nth-child(2) > a,
    #${STRINGS.bodyIdText} #gb > div.gb_Ad.gb_6.gb_L,
    #${STRINGS.bodyIdText} div.KxwPGc.SSwjIe > div.KxwPGc.AghGtd,
    #${STRINGS.bodyIdText} div.KxwPGc.SSwjIe > div.KxwPGc.ssOUyb,
    #${STRINGS.bodyIdText} div.KxwPGc.SSwjIe > div.KxwPGc.iTjxkf > a,
    #${STRINGS.bodyIdText} div.RNNXgb div.fzj3ad,
    #${STRINGS.bodyIdText} div.o3j99.qarstb > div:nth-child(3),
    #${STRINGS.bodyIdText} #EUjKDc,
    #${STRINGS.bodyIdText} #gbqfbb,
    #${STRINGS.bodyIdText} div.k1zIA.kKvsb > div.IzOpfd,
    #${STRINGS.bodyIdText} div.o3j99.qarstb > div:nth-child(2){
      display: none !important;
    }
    #${STRINGS.bodyIdText} #gb > div.gb_Q.gb_6.gb_Vf.gb_3f {
      padding-right: 0px !important;
    }
    #${STRINGS.bodyIdText} header a {
      color: #FFF !important;
      text-decoration: none !important;
    }
    #${STRINGS.bodyIdText} header a > svg {
      fill: #FFF !important;
    }
    #${STRINGS.bodyIdText} > div.L3eUgb > div:nth-child(13) > div {
      background: transparent !important;
    }
    #${STRINGS.bodyIdText} div.KxwPGc.SSwjIe {
      background: transparent !important;
      float: right !important;
    }
    #${STRINGS.bodyIdText} g-popup > div.CcNe6e > div {
      background: #2A3A4B !important;
      border-radius: 6px !important;
      padding: 8px 16px !important;
    }
    #${STRINGS.bodyIdText} #LS8OJ > div.k1zIA.rSk4se > svg {
      fill: #FFF !important;
    }
    #${STRINGS.bodyIdText} > div.L3eUgb div.RNNXgb,
    #${STRINGS.bodyIdText} > div.L3eUgb input.gNO89b {
      background: rgba(0,0,0,.2) !important;
    }
    #${STRINGS.bodyIdText} #APjFqb {
      filter: brightness(2) !important;
      text-shadow: 1px 1px 2px #000 !important;
    }
    #${STRINGS.bodyIdText} div.fM33ce.dRYYxd > div.ywK6Rd {
      background: none !important;
    }
    #${STRINGS.bodyIdText} #gb > div.gb_z > div:nth-child(2) {
      height: calc(-70px + 100vh) !important;
    }
  `);

  // ANALOG CLOCK
  GM_addStyle(`
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
      filter: drop-shadow(0px 0px 2px #000);
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
    .Analog > #panelImage {
      display: none;
    }
    .Analog:hover > #panelImage {
      display: block;
    }
  `);

  // CONTROLS PANEL
  GM_addStyle(`
    #controlsPanel {
      background-image: linear-gradient(to bottom, #fff, #4f4f4f);
      border: 2px solid #4f4f4f;
      box-shadow: 0 0 0 2px #999,
                  0 0 0 2px #ccc,
                  0 0 0 2px #4f4f4f;
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
    #hostImg {
      filter: none;
      margin: 0px 16px 0px -4px;
      position: relative;
      top: 5px;
      width: 22px;
    }
    #wallpaperToggler {
      height: 22px;
      width: 22px;
    }
    #toggleImg {
      height: 22px;
      margin-left: 8px;
      position: relative;
      right: 16px;
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
      width: 22px;
    }
    #spacer1,
    #spacer2 {
      color: #FFF;
      filter: brightness(2);
      margin: 9px 16px 0px 16px;
      opacity: 1;
      pointer-events: none;
      position: relative;
      text-align: center;
      top: -2px;
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
      width: 22px;
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
    #analogClockBtn:not(img):not(#hostToggler):hover {
      color: orange;
      opacity: 1;
    }
    #controlContainer > button:not(#analogClockBtn):not(#hostToggler):not(#wallpaperToggler):hover {
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
