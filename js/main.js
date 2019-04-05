/**
 * A schedule to be rendered by Ugwisha
 * @typedef {Period[]} Schedule
 * @property {boolean} noSchool True if there's no school
 * @property {boolean} alternate True if it should be marked as an alternate schedule
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

const months = 'jan. feb. mar. apr. may jun. jul. aug. sept. oct. nov. dec.'.split(' ');
const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
let dateWrapper, backDay, forthDay;

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
  dateWrapper.href = (params['no-sw'] ? '?no-sw&' : '?') + 'day=' + viewingDate.toISOString().slice(0, 10);
  renderEvents();
}

let viewingDate = params.day ? new Date(params.day) : getToday();

/**
 * Returns a Date object representing the current date in UTC; UTC methods (eg
 * getUTCMonth) should be used on it.
 * @return {Date} Today's date
 */
function getToday() {
  // return new Date('2019-03-26');
  return new Date(Date.UTC(...(d => [d.getFullYear(), d.getMonth(), d.getDate()])(new Date())));
}

document.addEventListener('DOMContentLoaded', e => {
  dateWrapper = document.getElementById('date-wrapper');
  backDay = document.getElementById('back-day');
  forthDay = document.getElementById('forth-day');

  // ready functions - it's important to do this first because updateView relies
  // on period.js
  ready.forEach(r => r());
  UgwishaExtensions.start();

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
  const psaOpen = document.getElementById('last-psa');
  fetch('./psa.html?=' + Date.now()).then(r => r.text()).then(html => {
    psaContent.innerHTML = html;
    const version = html.slice(6, 9);
    if (options.lastPSA && options.lastPSA !== version) {
      psaDialog.classList.remove('hidden');
      psaClose.focus();
    }
    if (!options.lastPSA) {
      options.lastPSA = version;
      save();
    }
    psaClose.addEventListener('click', e => {
      psaDialog.classList.add('hidden');
      if (options.lastPSA !== version) {
        options.lastPSA = version;
        save();
        if (!fetchedAlts && html.includes('[REFETCH]')) {
          fetchedAlts = true;
          fetchEvents().then(renderSchedule);
        }
      }
      psaOpen.focus();
    });
    psaOpen.addEventListener('click', e => {
      psaDialog.classList.remove('hidden');
      psaClose.focus();
    });
    onconnection.forEach(listener => listener(true));
  }).catch(() => {
    document.getElementById('offline-msg').classList.remove('hidden');
    const reloadBtn = document.getElementById('reload');
    reloadBtn.tabindex = 0;
    reloadBtn.addEventListener('click', e => {
      window.location.reload();
      e.preventDefault();
    });
    psaOpen.disabled = true;
    if (!options.natureLoaded) {
      document.getElementById('nature-back').disabled = true;
    }
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

  // settings wrapper
  const settingsWrapper = document.getElementById('settings');
  const toggleSettings = document.getElementById('toggle-settings');
  const btnText = document.createTextNode('show settings');
  toggleSettings.appendChild(btnText);
  toggleSettings.addEventListener('click', e => {
    settingsWrapper.classList.toggle('hidden');
    btnText.nodeValue = settingsWrapper.classList.contains('hidden') ? 'show settings' : 'hide settings';
  });

  // checkboxes
  const eventsWrapper = document.getElementById('events-wrapper');
  const optionChange = {
    showDuration(yes) {
      if (yes) document.body.classList.add('show-duration');
      else document.body.classList.remove('show-duration');
    },
    showTime(yes) {
      if (yes) document.body.classList.add('show-time');
      else document.body.classList.remove('show-time');
    },
    metricTime() {
      renderSchedule();
      updateStatus();
    },
    showSELF() {
      renderSchedule();
      todayDate = null;
      updateStatus();
    },
    quickTransitions(yes) {
      if (yes) document.body.classList.add('quick-transitions');
      else document.body.classList.remove('quick-transitions');
    },
    showEvents(yes) {
      if (yes) renderEvents();
      eventsWrapper.style.display = yes ? null : 'none';
    }
  };
  if (options.showDuration) document.body.classList.add('show-duration');
  if (options.showTime) document.body.classList.add('show-time');
  if (options.quickTransitions) document.body.classList.add('quick-transitions');
  if (!options.showEvents) eventsWrapper.style.display = 'none';
  Array.from(document.getElementsByClassName('toggle-setting'), toggle => {
    const prop = toggle.dataset.option;
    if (options[prop] === undefined) options[prop] = toggle.dataset.default === 'true';
    toggle.checked = options[prop];
    const onchange = optionChange[prop] || onoptionchange[prop];
    toggle.addEventListener('change', e => {
      options[prop] = toggle.checked;
      if (onchange) onchange(toggle.checked);
      save();
    });
  });

  // simple date navigation buttons
  dateWrapper.addEventListener('click', e => {
    window.history.pushState({}, '', dateWrapper.href);
    e.preventDefault();
  });
  backDay.addEventListener('click', e => {
    viewingDate.setUTCDate(viewingDate.getUTCDate() - 1);
    updateView();
  });
  forthDay.addEventListener('click', e => {
    viewingDate.setUTCDate(viewingDate.getUTCDate() + 1);
    updateView();
  });
  document.getElementById('today').addEventListener('click', e => {
    viewingDate = getToday();
    updateView();
  });
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
