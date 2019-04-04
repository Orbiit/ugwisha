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
  /**
   * Extracts an alternate schedule (if any) from the day's events.
   * @param {ParserEvent[]} events The events of the day
   * @param {Date} dateObj The date of the day
   * @return {boolean} True if a different schedule was derived from the events
   *                   compared to previous parsings (will trigger saveScheduleData)
   */
  parseEvents,

  /**
   * Gets a schedule given a date
   * @param {Date} dateObj The date of the desired schedule
   * @return {Schedule} The schedule of that day
   */
  getSchedule,

  /**
   * Can add a small note to a period card.
   * @param {Period} periodData The period, which may contain extra data that
   *                            getNote can use to generate the note.
   * @return {?string} The note content
   */
  getNote,

  /**
   * It is expected that the schedule data is kept track of somewhere, and
   * this is an opportunity for it to save it to localStorage. The data can
   * be encoded to a more compact format.
   * @return {string} The schedule data to be stored into localStorage
   */
  saveScheduleData,

  /**
   * Allows the stored schedule data from localStorage to be put in a more
   * readable format for getSchedule to use.
   * @param {string} storedSchedules The schedule data from localStorage
   */
  prepareScheduleData,

  /**
   * The localStorage key for the schedules; it should (but doesn't have to)
   * start with '[ugwisha]' so it doesn't collide with keys from other apps
   * in the domain.
   * @type {string}
   */
  SCHEDULE_DATA_KEY,

  /**
   * The Google Calendar ID of the calendar whose events contain schedule data.
   * @type {string}
   */
  SCHEDULES_CALENDAR_ID,

  /**
   * The Google Calendar ID of the calendar whose events will be displayed in
   * Ugwisha under the "Events" section. Note that Ugwisha also tries to
   * parse events from this calendar as well.
   * @type {string}
   */
  EVENTS_CALENDAR_ID,

  /**
   * Keywords to search for when fetching events throughout the entire year;
   * this results in less events per request (but results in more requests made)
   * because there is a limit to how many events are returned from the Google
   * Calendar API.
   * @type {string[]}
   */
  CALENDAR_KEYWORDS,

  /**
   * The Google API key to use for the Google Calendar API. Please change this
   * to your own key when you fork Ugwisha.
   * @type {string}
   */
  GOOGLE_API_KEY,

  /**
   * The first day of the year in UTC in milliseconds since the UNIX epoch
   * @type {number}
   */
  FIRST_DAY,

  /**
   * The last day of the year in UTC in milliseconds since the UNIX epoch
   * @type {number}
   */
  LAST_DAY,

  /**
   * Mapping the period IDs that getSchedule returns to their default display name
   * @type {Object.<string, string>}
   */
  DEFAULT_NAMES: defaultNames,

  /**
   * Mapping the period IDs that getSchedule returns to their default colours in
   * six-digit hexadecimal format (without the hash character)
   * @type {Object.<string, string>}
   */
  DEFAULT_COLOURS: defaultColours,

  /**
   * The CSS colour of the background of a custom favicon set by setFavicon;
   * white text should at least be somewhat legible on it.
   * @type {string}
   */
  THEME_COLOUR,

  /**
   * The URL of the favicon used after school or on no school days. If you
   * change this, don't forget to also change the HTML.
   * @type {string}
   */
  DEFAULT_FAVICON_URL,

  /**
   * The tab title text content used after school or on no school days. If you
   * change this, don't forget to also change the HTML.
   * @type {string}
   */
  APP_NAME,

  /**
   * The prefix used for storing period names and colours in localStorage;
   * the options object is the same for all instances of Ugwisha on the same
   * domain, so this can be used to avoid collisions.
   * @type {string}
   */
  PERIOD_OPTION_PREFIX,

  /**
   * The URL of a page to redirect to that will redirect back to Ugwisha when
   * there's an update; this is done to kill the old service worker.
   * @type {string}
   */
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
let dateWrapper, backDay, forthDay;

/**
 * Rerenders the schedule and week preview
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
 * Rerenders the date and calls renderSchedule
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

  // date selector
  const dateSelector = document.getElementById('date-selector');
  const monthName = document.getElementById('date-selector-month-year');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];
  const daysWrapper = document.getElementById('date-selector-days');
  const months = [];
  const days = {};
  let daysCreated = false;
  function createDays() {
    const fragment = document.createDocumentFragment();
    const firstDay = new Date(FIRST_DAY);
    const tempDate = new Date(Date.UTC(
      firstDay.getUTCFullYear(),
      firstDay.getUTCMonth(),
      firstDay.getUTCDate() - firstDay.getUTCDay()
    ));
    let currentMonth;
    let weekNum = -1;
    while (tempDate.getTime() <= LAST_DAY) {
      const month = tempDate.getUTCMonth();
      if (tempDate.getUTCDay() === 0) weekNum++;
      if (currentMonth !== month) {
        currentMonth = month;
        const wrapper = createElement('span', {
          classes: 'date-selector-month'
        });
        fragment.appendChild(wrapper);
        months.push({
          month,
          year: tempDate.getUTCFullYear(),
          wrapper,
          start: weekNum
        });
      }
      const entry = months[months.length - 1];
      const time = tempDate.getTime();
      const date = tempDate.getUTCDate();
      // so that if there's only a single day in the first week, it doesn't claim the entire week
      if (date <= 5) entry.start = weekNum;
      const outOfBounds = time < FIRST_DAY || time > LAST_DAY;
      const dayID = tempDate.toISOString().slice(0, 10);
      const day = createElement('span', {
        classes: [
          'date-selector-day',
          outOfBounds ? 'date-selector-out-of-bounds' : null
        ],
        children: [date],
        data: {
          date: dayID,
          week: weekNum
        }
      });
      if (!outOfBounds) days[dayID] = day;
      entry.wrapper.appendChild(day);
      tempDate.setUTCDate(tempDate.getUTCDate() + 1);
    }
    daysWrapper.appendChild(fragment);
  }
  function updateDays() {
    const todayID = getToday().toISOString().slice(0, 10);
    Object.keys(days).forEach(dayID => {
      const day = days[dayID];
      const dateObj = new Date(dayID);
      const schedule = getSchedule(dateObj);
      day.classList[schedule.noSchool ? 'add' : 'remove']('date-selector-no-school');
      day.classList[schedule.alternate ? 'add' : 'remove']('date-selector-alternate');
      day.classList[dayID === todayID ? 'add' : 'remove']('date-selector-today');
    });
  }
  const WEEK_HEIGHT = 24; // in pixels
  const CALENDAR_HEIGHT = 6 * WEEK_HEIGHT;
  let selectedMonth, selectedDay;
  daysWrapper.addEventListener('scroll', e => {
    const scrollPos = (daysWrapper.scrollTop + CALENDAR_HEIGHT / 2) / WEEK_HEIGHT;
    const index = months.findIndex(month => month.start >= scrollPos);
    const month = months[(~index ? index : months.length) - 1];
    if (month && month !== selectedMonth) {
      if (selectedMonth) {
        selectedMonth.wrapper.classList.remove('date-selector-month-selected');
      }
      selectedMonth = month;
      month.wrapper.classList.add('date-selector-month-selected');
      monthName.textContent = monthNames[month.month] + ' ' + month.year;
    }
  });
  daysWrapper.addEventListener('click', e => {
    if (
      e.target.classList.contains('date-selector-day')
      && !e.target.classList.contains('date-selector-out-of-bounds')
    ) {
      viewingDate = new Date(e.target.dataset.date);
      updateView();
      if (selectedDay) selectedDay.classList.remove('date-selector-selected');
      e.target.classList.add('date-selector-selected');
      selectedDay = e.target;
    }
  });
  daysWrapper.addEventListener('keydown', e => {
    if (e.keyCode >= 37 && e.keyCode <= 40) {
      let offset;
      switch (e.keyCode) {
        case 37: offset = -1; break;
        case 38: offset = -7; break;
        case 39: offset = 1; break;
        case 40: offset = 7; break;
      }
      const newDate = new Date(
        viewingDate.getUTCFullYear(),
        viewingDate.getUTCMonth(),
        viewingDate.getUTCDate() + offset
      );
      if (newDate.getTime() >= FIRST_DAY && newDate.getTime() <= LAST_DAY) {
        viewingDate = newDate;
        updateView();
        const day = days[newDate.toISOString().slice(0, 10)];
        if (day) {
          if (selectedDay) selectedDay.classList.remove('date-selector-selected');
          day.classList.add('date-selector-selected');
          selectedDay = day;
        }
      }
      e.preventDefault();
    }
  });
  document.getElementById('select-date').addEventListener('click', e => {
    if (!daysCreated) {
      createDays();
      daysCreated = true;
    }
    updateDays();
    dateSelector.classList.remove('hidden');
    if (selectedDay) selectedDay.classList.remove('date-selector-selected');
    const day = days[viewingDate.toISOString().slice(0, 10)];
    if (day) {
      daysWrapper.scrollTop = (+day.dataset.week + 0.5) * WEEK_HEIGHT - CALENDAR_HEIGHT / 2;
      day.classList.add('date-selector-selected');
      selectedDay = day;
    }
    daysWrapper.focus();
  });
  document.getElementById('cancel-select-date').addEventListener('click', e => {
    dateSelector.classList.add('hidden');
  });
  document.getElementById('date-selector-day-headings')
    .appendChild(createFragment(dayInitials.map(d => createElement('span', {
      classes: 'date-selector-day-heading',
      html: d
    }))));
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
