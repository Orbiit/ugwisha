/**
 * A schedule to be rendered by Ugwisha
 * @typedef {Period[]} Schedule
 * @property {boolean} noSchool True if there's no school
 * @property {boolean} alternate True if it should be marked as an alternate schedule
 * @property {Date} date The date of the schedule
 */

/**
 * An Ugwisha period; can hold extra data which Ugwisha will ignore
 * @typedef {object} Period
 * @property {string} period The period ID used by period.js for colours and names
 * @property {number} start Number of minutes from the start of the day until
 *                          the start of the period
 * @property {number} end Same as start but until the end of the period
 */

const ready = [];
const onconnection = [isOnline => window.isOnline = isOnline];
const onoptionchange = {};
window.UgwishaEvents = {
  connection: new Promise(res => onconnection.push(res)),
  status: [], // when there's a new minute
  resize: [] // when sidebar resized
};
window.Ugwisha = {version: 'dev'};

// avoid crashing if accessing localStorage in private mode results in an
// error (eg Edge)
try {
  window.storage = localStorage;
} catch (e) {
  window.storage = {
    getItem: a => storage[a],
    setItem: (a, b) => storage[a] = b,
    removeItem: a => delete storage[a]
  }
}

// likewise for caches, which is disabled in cross-origin iframes
try {
  window.caches = caches;
} catch (e) {
  window.caches = {open: () => Promise.reject()};
}

try {
  window.options = JSON.parse(storage.getItem('[ugwisha] options'));
  if (typeof window.options !== 'object' || window.options === null) window.options = {};
} catch (e) {
  window.options = {};
  console.log(e);
}

/**
 * Saves options to localStorage
 */
function save() {
  storage.setItem('[ugwisha] options', JSON.stringify(window.options));
}
window.options.save = save;

// URL PARAMETERS
// no-sw    - destroys service workers and keeps them destroyed
// reset-sw - destroys service workers and redirects back
// get-alts - fetches alternate schedules
// then     - URL to redirect to after fetching alternate schedules
// day      - date to view (yyyy-mm-dd)
const params = {};
if (window.location.search) {
  window.location.search.slice(1).split('&').forEach(entry => {
    const equalSignLoc = entry.indexOf('=');
    if (~equalSignLoc) {
      params[entry.slice(0, equalSignLoc)] = entry.slice(equalSignLoc + 1);
    } else {
      params[entry] = true;
    }
  });
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
]
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
let dayElem, backDay, forthDay, dateElem;

/**
 * Rerenders the schedule and week preview. Call this directly when the schedule
 * may have changed, but not the date.
 */
function renderSchedule() {
  setSchedule(getSchedule(viewingDate));
  const day = viewingDate.getUTCDay();
  const weekSchedules = [];
  for (let i = 0; i < 7; i++) {
    weekSchedules.push(getSchedule(new Date(viewingDate.getTime() - (day - i) * 86400000)));
  }
  showWeekPreview(weekSchedules, day);
}

/**
 * Rerenders the date and calls renderSchedule. Call this if the date has
 * changed.
 */
function updateView() {
  renderSchedule();
  dateElem.innerHTML = months[viewingDate.getUTCMonth()] + ' ' + viewingDate.getUTCDate();
  dayElem.innerHTML = days[viewingDate.getUTCDay()];
  const viewingTime = viewingDate.getTime();
  backDay.disabled = viewingTime <= FIRST_DAY;
  forthDay.disabled = viewingTime >= LAST_DAY;
  dayElem.href = (params['no-sw'] ? '?no-sw&' : '?') + 'day=' + viewingDate.toISOString().slice(0, 10);
  renderEvents();
}

let viewingDate = params.day ? new Date(params.day) : getToday();

/**
 * Returns a Date object representing the current date in UTC; UTC methods (eg
 * getUTCMonth) should be used on it.
 * @return {Date} Today's date
 */
function getToday() {
  // return new Date('2019-05-28'); // TEMP
  return new Date(Date.UTC(...(d => [d.getFullYear(), d.getMonth(), d.getDate()])(new Date())));
}

document.addEventListener('DOMContentLoaded', e => {
  dateElem = document.getElementById('select-date');
  dayElem = document.getElementById('weekday');
  backDay = document.getElementById('back-day');
  forthDay = document.getElementById('forth-day');

  const checkboxes = Array.from(document.getElementsByClassName('toggle-setting'));
  checkboxes.forEach(toggle => {
    const prop = toggle.dataset.option;
    if (options[prop] === undefined) {
      options[prop] = toggle.dataset.default === 'true';
    }
  });

  // ready functions - it's important to do this first because updateView relies
  // on period.js
  ready.forEach(r => r());

  // tab focus
  let tabFocus = false;
  document.addEventListener('keydown', e => {
  	if (e.keyCode === 9 || e.keyCode === 13) {
    	document.body.classList.add('tab-focus');
      tabFocus = true;
    }
  });
  document.addEventListener('keyup', e => {
  	if (e.keyCode === 9 || e.keyCode === 13) {
      tabFocus = false;
    }
  });
  document.addEventListener('focusin', e => {
  	if (!tabFocus) {
      document.body.classList.remove('tab-focus');
    }
  });

  // psa & offline detection
  const psaDialog = document.getElementById('psa');
  const psaContent = document.getElementById('psa-content');
  const psaClose = document.getElementById('psa-close');
  const psaOpen = document.getElementById('psa-btn');
  const psaVersionRegex = /<!--\s*#(\d+)((?:\|[a-z0-9\-_=./]*)*)\s*-->/gi;
  let canHidePSA = false;
  fetch('./psa.html?v=' + Date.now()).then(r => r.text()).then(html => {
    psaContent.innerHTML = html; // WARNING: prone to XSS
    const [, version, paramString] = psaVersionRegex.exec(html);
    const params = {};
    /**
     * REFETCH - indicate that the alternate schedules should be fetched again
     * HIDE_B4 - will only show the new PSA when the user has updated to the given version
     * INSTALL_EXTENSION - adds the extension
     */
    paramString.split('|').forEach(str => {
      if (str) {
        const [key, value] = str.split('=');
        params[key] = value || true;
      }
    });
    if (options.lastPSA && options.lastPSA !== version
        && (!params.HIDE_B4 || +params.HIDE_B4 <= Ugwisha.version || Ugwisha.version === 'dev')) {
      psaDialog.classList.remove('hidden');
      psaClose.focus();
      document.body.style.overflow = 'hidden';
    }
    if (!options.lastPSA) {
      options.lastPSA = version;
      save();
    }
    psaClose.addEventListener('click', e => {
      canHidePSA = true;
      psaDialog.classList.add('disappear');
      if (options.lastPSA !== version) {
        options.lastPSA = version;
        save();
        if (!fetchedAlts && params.REFETCH) {
          fetchedAlts = true;
          fetchEvents().then(renderSchedule);
        }
        if (params.INSTALL_EXTENSION) {
          newExtension(params.INSTALL_EXTENSION);
        }
      }
      psaOpen.focus();
      document.body.style.overflow = null;
    });
    psaDialog.addEventListener('click', e => {
      if (e.target === psaDialog) psaClose.click();
    });
    psaDialog.addEventListener('keydown', e => {
      if (e.keyCode === 27) psaClose.click();
    });
    psaDialog.addEventListener('transitionend', e => {
      if (canHidePSA) psaDialog.classList.add('hidden');
    });
    onconnection.forEach(listener => listener(true));
  }).catch(() => {
    document.getElementById('offline-msg').classList.remove('hidden');
    const reloadBtn = document.getElementById('reload');
    reloadBtn.tabIndex = 0;
    reloadBtn.addEventListener('click', e => {
      window.location.reload();
      e.preventDefault();
    });
    psaOpen.disabled = true;
    onconnection.forEach(listener => listener(false));
  });

  // window size
  let windowWidth = window.innerWidth, windowHeight = window.innerHeight;
  window.addEventListener('resize', e => {
    windowWidth = window.innerWidth, windowHeight = window.innerHeight;
  });

  // jump button
  const jumpBtn = document.getElementById('jump');
  let smoothScrolling = false;
  function smoothScroll(stopY) {
    let y = window.scrollY;
    function scroll() {
      if (Math.abs(y - stopY) > 1) {
        y += (stopY - y) / 5;
        window.scrollTo(0, y);
        smoothScrolling = window.requestAnimationFrame(scroll);
      } else {
        window.scrollTo(0, stopY);
        smoothScrolling = false;
      }
    }
    scroll();
  }
  document.addEventListener('wheel', e => {
    window.cancelAnimationFrame(smoothScrolling);
    smoothScrolling = false;
  }, {passive: true});
  document.addEventListener('touchstart', e => {
    window.cancelAnimationFrame(smoothScrolling);
    smoothScrolling = false;
  }, {passive: true});
  document.addEventListener('scroll', e => {
    if (window.scrollY > windowHeight / 3) jumpBtn.classList.add('up');
    else jumpBtn.classList.remove('up');
  });
  jumpBtn.addEventListener('click', e => {
    if (smoothScrolling) window.cancelAnimationFrame(smoothScrolling);
    smoothScroll(jumpBtn.classList.contains('up') ? 0 : windowHeight - 50);
  });

  // tabs
  const tabs = document.getElementById('tabs');
  let currentTab = null, currentTabSection = null;
  tabs.addEventListener('click', e => {
    if (e.target.dataset.for) {
      let oldCurrentTab = currentTab;
      if (currentTab) {
        currentTab.classList.remove('selected');
        currentTabSection.classList.remove('show');
        currentTab = null;
        currentTabSection = null;
      }
      if (oldCurrentTab !== e.target) {
        if (e.target.dataset.for === 'psa') {
          canHidePSA = false;
          psaDialog.classList.remove('hidden');
          psaDialog.classList.remove('disappear');
          psaClose.focus();
          document.body.style.overflow = 'hidden';
        } else {
          currentTab = e.target;
          currentTabSection = document.getElementById(e.target.dataset.for);
          e.target.classList.add('selected');
          currentTabSection.classList.add('show');
        }
      }
    }
  });

  // checkboxes
  const eventsWrapper = document.getElementById('events-wrapper');
  const optionChange = {
    metricTime() {
      renderSchedule();
      updateStatus();
    },
    showSELF() {
      renderSchedule();
      todayDate = null;
      updateStatus();
    },
    showEvents(yes) {
      if (yes) renderEvents();
      eventsWrapper.style.display = yes ? null : 'none';
    },
    dynamicContrast(yes) {
      if (yes) document.body.classList.add('dark-text-ok');
      else document.body.classList.remove('dark-text-ok');
    }
  };
  checkboxes.forEach(toggle => {
    const prop = toggle.dataset.option;
    toggle.checked = options[prop];
    const onchange = optionChange[prop] || onoptionchange[prop];
    toggle.addEventListener('change', e => {
      options[prop] = toggle.checked;
      if (onchange) onchange(toggle.checked);
      save();
    });
  });
  if (!options.showEvents) eventsWrapper.style.display = 'none';
  if (options.dynamicContrast) document.body.classList.add('dark-text-ok');

  // simple date navigation buttons
  dayElem.addEventListener('click', e => {
    window.history.pushState({}, '', dayElem.href);
    e.preventDefault();
  });
  backDay.addEventListener('click', e => {
    viewingDate = new Date(viewingDate.getTime() - 86400000);
    updateView();
  });
  forthDay.addEventListener('click', e => {
    viewingDate = new Date(viewingDate.getTime() + 86400000);
    updateView();
  });
  document.getElementById('today').addEventListener('click', e => {
    viewingDate = getToday();
    updateView();
    updateViewingDay();
  });

  // change sidebar width
  const sidebar = document.getElementById('content');
  const handle = document.getElementById('drag-handle');
  function pointerMove(e) {
    const pointer = e.type[0] === 'm' ? e : e.changedTouches[0];
    options.sidebarWidth = Math.max(250, Math.min(700, windowWidth - 200, pointer.clientX - 100));
    sidebar.style.setProperty('--custom-width', (options.sidebarWidth || 250) + 'px');
    UgwishaEvents.resize.forEach(fn => fn(options.sidebarWidth || 250));
    e.preventDefault();
  }
  function pointerEnd(e) {
    document.removeEventListener(e.type === 'mouseup' ? 'mousemove' : 'touchmove', pointerMove);
    document.removeEventListener(e.type, pointerEnd);
    e.preventDefault();
    save();
  }
  handle.addEventListener('mousedown', e => {
    document.addEventListener('mousemove', pointerMove);
    document.addEventListener('mouseup', pointerEnd);
    e.preventDefault();
  });
  handle.addEventListener('touchstart', e => {
    document.addEventListener('touchmove', pointerMove, {passive: false});
    document.addEventListener('touchend', pointerEnd, {passive: false});
    e.preventDefault();
  }, {passive: false});
  sidebar.style.setProperty('--custom-width', (options.sidebarWidth || 250) + 'px');
}, {once: true});

if ('serviceWorker' in navigator) {
  if (params['no-sw'] || params['reset-sw']) {
    navigator.serviceWorker.getRegistrations().then(regis => {
      Promise.all(regis.map(regis => {
        // regis.active.postMessage({type: 'disable'});
        return regis.unregister();
      })).then(() => {
        if (params['reset-sw']) window.location = UPDATER_URL;
        else if (regis.length) window.location.reload();
      });
    }).catch(err => console.log(err));
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(regis => {
        regis.onupdatefound = () => {
          const installingWorker = regis.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New update! Redirecting you away and back');
              options.natureLoaded = false;
              window.location.replace(UPDATER_URL);
            }
          };
        };
      }, err => {
        console.log(':( Couldn\'t register service worker', err);
      });
      navigator.serviceWorker.addEventListener('message', ({data}) => {
        switch (data.type) {
          case 'version':
            console.log('Service worker version ' + data.version);
            break;
          default:
            console.log(data);
        }
      });
    }, {once: true});
  }
}
