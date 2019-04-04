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

const {
  parseEvents,
  getSchedule,
  getNote,
  saveScheduleData,
  prepareScheduleData,
  SCHEDULE_DATA_KEY,
  SCHEDULES_CALENDAR_ID,
  EVENTS_CALENDAR_ID,
  CALENDAR_KEYWORDS,
  GOOGLE_API_KEY,
  FIRST_DAY,
  LAST_DAY,
  DEFAULT_NAMES: defaultNames,
  DEFAULT_COLOURS: defaultColours,
  THEME_COLOUR,
  DEFAULT_FAVICON_URL,
  APP_NAME,
  PERIOD_OPTION_PREFIX,
  UPDATER_URL
} = window.ugwishaOptions;

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
function updateView() {
  setSchedule(getSchedule(viewingDate));
  const day = viewingDate.getUTCDay();
  const weekSchedules = [];
  for (let i = 0; i < 7; i++) {
    weekSchedules.push(getSchedule(new Date(viewingDate.getTime() - (day - i) * 86400000)));
  }
  showWeekPreview(weekSchedules, day);
  dateElem.innerHTML = months[viewingDate.getUTCMonth()] + ' ' + viewingDate.getUTCDate();
  dayElem.innerHTML = days[day];
}

let viewingDate = params.day ? new Date(params.day) : getToday();
function getToday() {
  // return new Date('2018-11-16');
  return new Date(Date.UTC(...(d => [d.getFullYear(), d.getMonth(), d.getDate()])(new Date())));
}
document.addEventListener('DOMContentLoaded', e => {
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
          fetchEvents().then(updateView);
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
      updateView();
      updateStatus();
    },
    showSELF() {
      updateView();
    },
    quickTransitions(yes) {
      if (yes) document.body.classList.add('quick-transitions');
      else document.body.classList.remove('quick-transitions');
    },
    showEvents(yes) {
      if (yes && eventsWrapper.style.display) renderEvents();
      eventsWrapper.style.display = yes ? null : 'none';
    }
  };
  Array.from(document.getElementsByClassName('toggle-setting'), toggle => {
    const prop = toggle.dataset.option;
    if (options[prop] === undefined) options[prop] = toggle.dataset.default === 'true';
    toggle.checked = options[prop];
    const onchange = optionChange[prop] || onoptionchange[prop];
    if (onchange) onchange(toggle.checked);
    toggle.addEventListener('change', e => {
      options[prop] = toggle.checked;
      if (onchange) onchange(toggle.checked);
      save();
    });
  });

  // simple date navigation buttons
  const dateWrapper = document.getElementById('date-wrapper');
  const backDay = document.getElementById('back-day');
  const forthDay = document.getElementById('forth-day');
  dateWrapper.addEventListener('click', e => {
    window.history.pushState({}, '', dateWrapper.href);
    e.preventDefault();
  });
  window.updateDateWrapperLink = () => {
    const viewingTime = viewingDate.getTime();
    backDay.disabled = viewingTime <= FIRST_DAY;
    forthDay.disabled = viewingTime >= LAST_DAY;
    dateWrapper.href = (params['no-sw'] ? '?no-sw&' : '?') + 'day=' + viewingDate.toISOString().slice(0, 10);
    renderEvents();
  };
  updateDateWrapperLink();
  backDay.addEventListener('click', e => {
    viewingDate.setUTCDate(viewingDate.getUTCDate() - 1);
    updateView();
    updateDateWrapperLink();
  });
  forthDay.addEventListener('click', e => {
    viewingDate.setUTCDate(viewingDate.getUTCDate() + 1);
    updateView();
    updateDateWrapperLink();
  });
  document.getElementById('today').addEventListener('click', e => {
    viewingDate = getToday();
    updateView();
    updateDateWrapperLink();
  });
  updateStatus(true, 0);

  // date selector
  const dateSelector = document.getElementById('date-selector');
  const monthSelect = document.getElementById('months');
  const dateSelect = document.getElementById('date-input');
  const actualDateSelect = document.getElementById('actually-select-date');
  const error = document.getElementById('error');
  const cancelBtn = document.getElementById('cancel-select-date');
  const schoolMonths = [];
  const firstDay = new Date(FIRST_DAY);
  const firstYear = firstDay.getUTCFullYear();
  const firstMonth = firstDay.getUTCMonth();
  const tempDate = new Date(Date.UTC(firstYear, firstMonth, 1));
  while (tempDate.getTime() <= LAST_DAY) {
    schoolMonths.push(months[tempDate.getUTCMonth()] + ' ' + tempDate.getUTCFullYear());
    tempDate.setUTCMonth(tempDate.getUTCMonth() + 1);
  }
  monthSelect.appendChild(createFragment(schoolMonths.map((m, i) => createElement('option', { attributes: { value: i }, html: m }))));
  document.getElementById('select-date').addEventListener('click', e => {
    dateSelector.classList.remove('hidden');
    monthSelect.value = 'CHOOSE';
    monthSelect.disabled = false;
    dateSelect.disabled = true;
    actualDateSelect.disabled = true;
    error.innerHTML = '';
    dateSelect.value = '';
  });
  monthSelect.addEventListener('change', e => {
    monthSelect.disabled = true;
    dateSelect.disabled = false;
    actualDateSelect.disabled = false;
    dateSelect.focus();
  });
  cancelBtn.addEventListener('click', e => {
    dateSelector.classList.add('hidden');
    monthSelect.disabled = true;
    dateSelect.disabled = true;
    actualDateSelect.disabled = true;
  });
  actualDateSelect.addEventListener('click', e => {
    const errors = [];
    if (monthSelect.value === 'CHOOSE') errors.push('You did not choose a month.');
    const date = +dateSelect.value;
    if (isNaN(date)) errors.push('The date is not a number.');
    if (date % 1 !== 0) errors.push('The date is not an integer.');
    const dateObj = new Date(Date.UTC(firstYear, firstMonth + +monthSelect.value, date));
    if (dateObj.getTime() < FIRST_DAY || dateObj.getTime() > LAST_DAY)
      errors.push('The date is not during the school year.');
    if (errors.length) {
      error.innerHTML = errors.join('<br>') + '<br>You have issues.';
    } else {
      viewingDate = dateObj;
      updateView();
      updateDateWrapperLink();
      cancelBtn.click();
    }
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
