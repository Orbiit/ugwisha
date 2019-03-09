/*
 * GIVEN: getSchedule, prepareScheduleData
 * GIVES: loadSW, splitEvents, firstDay, eventsMinDate, eventsMaxDate
 *
 * MAIN.js
 * defines helper functions, service workers, backgrounds, and other small things
 *
 * Schedule data should be an array of {period, start, end} where
 * `period` is the period ID used by periods.js for colours and names
 * and `start` and `end` are integers representing the number of minutes
 * (these objects can hold extra data).
 * The array should have a `noSchool` property if there's no school and
 * an `alternate` property if it's an alternate schedule.
 */

window.ready = [];

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
function save() {
  storage.setItem('[ugwisha] options', JSON.stringify(window.options));
}

const firstDay = new Date(Date.UTC(2018, 7, 13));
const lastDay = new Date(Date.UTC(2019, 4, 31));

const eventsMinDate = new Date(firstDay.getTime() + 25200000);
const eventsMaxDate = new Date(lastDay.getTime() + 111599999); // also adds a day - 1 to include last day

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

function deundefine(obj) {
  if (Array.isArray(obj)) return obj.filter(i => i !== undefined);
  else {
    Object.keys(obj).forEach(prop => obj[prop] === undefined && delete obj[prop]);
    return obj;
  }
}
function createElement(tag, data = {}) {
  const elem = document.createElement(tag);
  if (data.classes) {
    if (typeof data.classes === 'string') elem.className = data.classes;
    else deundefine(data.classes).forEach(c => elem.classList.add(c));
  }
  if (data.children) deundefine(data.children).forEach(c => elem.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  if (data.attributes) {
    Object.keys(deundefine(data.attributes)).forEach(attr => {
      if (elem[attr] !== undefined) elem[attr] = data.attributes[attr];
      else elem.setAttribute(attr, data.attributes[attr]);
    });
  }
  if (data.listeners) {
    Object.keys(deundefine(data.listeners)).forEach(ev => {
      elem.addEventListener(ev, data.listeners[ev]);
    });
  }
  if (data.styles) {
    Object.keys(deundefine(data.styles)).forEach(prop => {
      if (prop.slice(0, 2) === '--') {
        elem.style.setProperty(prop, data.styles[prop]);
      } else {
        elem.style[prop] = data.styles[prop];
      }
    });
  }
  if (data.html) elem.innerHTML = data.html;
  if (data.ripples) rippleify(elem);
  return elem;
}
function createFragment(elems) {
  const frag = document.createDocumentFragment();
  deundefine(elems).forEach(e => frag.appendChild(e));
  return frag;
}

function formatTime(minutes, noAMPM = false) {
  const hour = Math.floor(minutes / 60);
  const min = ('0' + minutes % 60).slice(-2);
  let time = options.metricTime ? `${hour}:${min}` : `${(hour + 11) % 12 + 1}:${min}`;
  if (options.metricTime || noAMPM) {
    return time;
  } else {
    return `${time} ${hour < 12 ? 'a' : 'p'}m`;
  }
}
function formatDuration(minutes, short = false, reallyShort = false) {
  if (!short) return minutes + ' minute' + (minutes === 1 ? '' : 's');
  // const hours = Math.floor(minutes / 60);
  // const mins = minutes % 60;
  // return (hours > 0 ? hours + ' hour' + (hours === 1 ? '' : 's') : '')
  //   + (hours > 0 && mins !== 0 ? ' and ' : '')
  //   + (mins !== 0 ? mins + ' minute' + (mins === 1 ? '' : 's') : '');
  return (reallyShort && minutes < 60 ? '' : Math.floor(minutes / 60)) + ':' + ('0' + minutes % 60).slice(-2);
}

function splitEvents({items}) {
  const events = [];
  items.forEach(ev => {
    if (ev.start.dateTime) events.push({
      summary: ev.summary,
      description: ev.description,
      date: ev.start.dateTime.slice(0, 10)
    });
    else {
      const dateObj = new Date(ev.start.date);
      const endDate = new Date(ev.end.date).getTime();
      while (dateObj.getTime() < endDate) {
        events.push({
          summary: ev.summary,
          description: ev.description,
          date: dateObj.toISOString().slice(0, 10)
        });
        dateObj.setUTCDate(dateObj.getUTCDate() + 1);
      }
    }
  });
  return events;
}
function fetchEvents() {
  const gCalURL = 'https://www.googleapis.com/calendar/v3/calendars/'
    + encodeURIComponent(SCHEDULES_CALENDAR_ID)
    + '/events?singleEvents=true&fields='
    + encodeURIComponent('items(description,end(date,dateTime),start(date,dateTime),summary)')
    + '&key=' + GOOGLE_API_KEY
    + `&timeMin=${encodeURIComponent(eventsMinDate.toISOString())}&timeMax=${encodeURIComponent(eventsMaxDate.toISOString())}`;
  altFetchBtn.disabled = true;
  return Promise.all(CALENDAR_KEYWORDS.map(k => fetch(gCalURL + '&q=' + k).then(r => r.json()))).then(eventData => {
    // assign each event to its day
    const events = {};
    eventData.map(splitEvents).forEach(data => data.forEach(event => {
      if (!events[event.date]) events[event.date] = [];
      events[event.date].push(event);
    }));

    // parse events per day
    const dateObj = new Date(firstDay.getTime());
    const endDate = lastDay.getTime();
    while (dateObj.getTime() <= endDate) {
      parseEvents(events[dateObj.toISOString().slice(0, 10)] || [], dateObj);
      dateObj.setUTCDate(dateObj.getUTCDate() + 1);
    }

    storage.setItem(SCHEDULE_DATA_KEY, saveScheduleData());
    altFetchBtn.disabled = false;
  });
}

function randomInt(int) {
  return Math.floor(Math.random() * int);
}
function randomGradient() {
  const colour1 = [randomInt(256), randomInt(256), randomInt(256)];
  // const colour2 = colour1.map(c => Math.max(Math.min(c + randomInt(101) - 5, 255), 0));
  const colour2 = [randomInt(256), randomInt(256), randomInt(256)];
  return `linear-gradient(${Math.random() * 360}deg, rgb(${colour1.join(',')}), rgb(${colour2.join(',')}))`;
}
function setBackground(css) {
  const transitioner = createElement('div', {classes: 'transition-background'});
  transitioner.style.backgroundImage = document.body.style.backgroundImage;
  const stopper = setTimeout(() => { // just in case
    document.body.removeChild(transitioner);
  }, 10000);
  transitioner.addEventListener('animationend', e => {
    document.body.removeChild(transitioner);
    clearTimeout(stopper);
  });
  document.body.insertBefore(transitioner, document.body.firstChild);
  document.body.style.backgroundImage = css;
}
async function newBackground(url, id) {
  const headers = new Headers();
  headers.append('pragma', 'no-cache');
  headers.append('Cache-Control', 'no-cache');
  const res = await fetch(url, {mode: 'no-cors', headers: headers, cache: 'no-cache'});
  const cache = await caches.open(BACKGROUND_CACHE_NAME);
  await cache.delete(new Request(id));
  await cache.put(new Request(id), res);
}

const months = 'jan. feb. mar. apr. may jun. jul. aug. sept. oct. nov. dec.'.split(' ');
const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
let dateElem, dayElem, altFetchBtn;
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

let viewingDate = getToday();
function getToday() {
  // return new Date('2018-11-16');
  return new Date(Date.UTC(...(d => [d.getFullYear(), d.getMonth(), d.getDate()])(new Date())));
}
if (params.day) {
  viewingDate = new Date(params.day);
}
const BACKGROUND_CACHE_NAME = 'ugwisha-backgrounds';
document.addEventListener('DOMContentLoaded', async e => {
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

  // window size
  let windowWidth = window.innerWidth, windowHeight = window.innerHeight;
  window.addEventListener('resize', e => {
    windowWidth = window.innerWidth, windowHeight = window.innerHeight;
  });

  // background
  const setBackgroundBtn = document.getElementById('set-back');
  const resetBackground = document.getElementById('reset-back');
  const nextBackground = document.getElementById('next-back');
  let randomGradientTimer = null;
  function startRandomGradients() {
    if (randomGradientTimer) clearInterval(randomGradientTimer);
    if (options.randomGradients) {
      randomGradientTimer = setTimeout(startRandomGradients, options.quickTransitions ? 5000 : 10000);
    } else {
      randomGradientTimer = null;
    }
    setBackground(randomGradient());
  }
  const queries = [];
  const terms = ['nature', 'water', 'wallpaper'];
  terms.forEach((term, i) => {
    const otherTerms = [...terms.slice(0, i), ...terms.slice(i + 1)];
    queries.push(term);
    queries.push(term + ',' + otherTerms[0]);
    queries.push(term + ',' + otherTerms[0] + ',' + otherTerms[1]);
    queries.push(term + ',' + otherTerms[1]);
    queries.push(term + ',' + otherTerms[1] + ',' + otherTerms[0]);
  });
  queries.push(...queries.map(q => q + ',' + Date.now()));
  let index = -1;
  function newNatureBackground() {
    nextBackground.disabled = true;
    index = (index + 1) % queries.length;
    newBackground('https://source.unsplash.com/random/1600x900/?' + queries[index], 'nature').then(() => {
      setBackground(`url("nature?n=${Date.now()}")`);
      options.natureLoaded = true;
      save();
      nextBackground.disabled = false;
    }).catch(err => {
      console.dir(err);
      setBackground(`url("./images/temp-sheep.png")`); // too lazy to make an error image right now
      nextBackground.disabled = false;
    });
  }
  function activateNatureBackground() {
    if (options.natureLoaded) {
      setBackground(`url("nature?n=${Date.now()}")`);
      nextBackground.disabled = false;
    }
    else newNatureBackground();
  }
  if (options.backgroundURL) {
    setBackground(`url("custom?n=${Date.now()}")`);
    resetBackground.disabled = false;
  } else if (options.natureBackground) {
    setBackground(`url("nature?n=${Date.now()}")`);
    nextBackground.disabled = false;
    caches.open(BACKGROUND_CACHE_NAME).then(cache => cache.match('nature')).then(r => {
      if (!r) {
        newNatureBackground();
      }
    });
  } else {
    startRandomGradients();
  }
  setBackgroundBtn.addEventListener('click', e => {
    const url = prompt('URL of image: (sorry for lack of proper UI)');
    if (url) {
      setBackgroundBtn.disabled = true;
      nextBackground.disabled = true;
      newBackground(url, 'custom').then(() => {
        setBackgroundBtn.disabled = false;
        resetBackground.disabled = false;
        setBackground(`url("custom?n=${Date.now()}")`);
        options.backgroundURL = url;
        save();
        if (randomGradientTimer) clearInterval(randomGradientTimer);
      }).catch(() => {
        setBackgroundBtn.disabled = false;
        if (!options.backgroundURL && options.natureBackground) nextBackground.disabled = false;
        alert(`The image couldn't be loaded. This might be because:
- You are offline
- The website hosting the image won't let Ugwisha load their images
- There's something wrong with the URL
(sorry again for lack of proper UI)`);
      });
    }
  });
  resetBackground.addEventListener('click', e => {
    options.backgroundURL = null;
    save();
    resetBackground.disabled = true;
    nextBackground.disabled = !options.natureBackground;
    if (options.natureBackground) {
      activateNatureBackground();
    }
    else startRandomGradients();
  });
  nextBackground.addEventListener('click', newNatureBackground);

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
        if (!fetched && html.includes('[REFETCH]')) {
          const refetch = /\[REFETCH\]/.exec(html);
          fetched = true;
          fetchEvents().then(updateView);
        }
      }
      psaOpen.focus();
    });
    psaOpen.addEventListener('click', e => {
      psaDialog.classList.remove('hidden');
      psaClose.focus();
    });
  }).catch(() => {
    document.getElementById('offline-msg').classList.remove('hidden');
    const reloadBtn = document.getElementById('reload');
    reloadBtn.tabindex = 0;
    reloadBtn.addEventListener('click', e => {
      window.location.reload();
      e.preventDefault();
    });
    altFetchBtn.disabled = nextBackground.disabled = setBackgroundBtn.disabled = psaOpen.disabled = true;
    if (!options.natureLoaded) {
      document.getElementById('nature-back').disabled = true;
    }
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

  // ready functions
  await Promise.all(window.ready.map(r => r()));

  // alternate schedules, preview days
  dateElem = document.getElementById('date');
  dayElem = document.getElementById('weekday');
  altFetchBtn = document.getElementById('fetch-alts');
  let fetched = false;
  if (params['get-alts'] || !storage.getItem(SCHEDULE_DATA_KEY)) {
    fetched = true;
    await fetchEvents();
    if (params.then) window.location.replace(params.then);
  }
  prepareScheduleData(storage.getItem(SCHEDULE_DATA_KEY));
  updateView();
  altFetchBtn.addEventListener('click', async e => {
    fetched = true;
    fetchEvents().then(updateView);
  });

  // events
  const eventsWrapper = document.getElementById('events-wrapper');
  const eventsList = document.getElementById('events');
  const events = {};
  const gCalURL = 'https://www.googleapis.com/calendar/v3/calendars/'
    + encodeURIComponent(EVENTS_CALENDAR_ID)
    + '/events?singleEvents=true&fields='
    + encodeURIComponent('items(description,end(date,dateTime),start(date,dateTime),summary)')
    + '&key=' + GOOGLE_API_KEY;
  function dateObjToMinutes(dateObj) {
    // local time
    return dateObj.getHours() * 60 + dateObj.getMinutes();
  }
  function toLocalTime(dateObj, offset = 0) {
    return new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate() + offset);
  }
  function removeDumbHTML(html) {
    return html.replace(/(<.*?) style=(?:"[^"]*"|\S*)(.*?>)/g, '$1$2');
  }
  async function renderEvents() {
    if (options.showEvents) {
      const dateName = viewingDate.toISOString().slice(0, 10);
      eventsList.innerHTML = `<span class="events-message">Loading...</span>`;
      if (!events[dateName]) {
        const {items} = await fetch(`${gCalURL}&timeMin=${encodeURIComponent(toLocalTime(viewingDate).toISOString())}&timeMax=${encodeURIComponent(toLocalTime(viewingDate, 1).toISOString())}`)
          .then(r => r.json())
          .catch(() => {
            eventsList.innerHTML = `<span class="events-message">Unable to fetch events.</span>`;
          });
        events[dateName] = items;
        if (parseEvents(splitEvents({items}), viewingDate)) {
          saveScheduleData();
          updateView();
        }
      }
      eventsList.innerHTML = '';
      eventsList.appendChild(events[dateName].length ? createFragment(events[dateName].map(event => createElement('div', {
        classes: 'event',
        children: [
          createElement('span', {
            classes: 'event-name',
            children: [event.summary]
          }),
          createElement('span', {
            classes: 'event-info',
            children: [
              event.start && event.start.dateTime ? createElement('span', {
                classes: 'event-time',
                html: formatTime(dateObjToMinutes(new Date(event.start.dateTime))) + ' &ndash; ' + formatTime(dateObjToMinutes(new Date(event.end.dateTime)))
              }) : undefined,
              event.location ? createElement('span', {
                classes: 'event-location',
                children: [event.location]
              }) : undefined
            ]
          }),
          event.description ? createElement('span', {
            classes: 'event-description',
            html: removeDumbHTML(event.description)
          }) : undefined
        ]
      }))) : createElement('span', {
        classes: 'events-message',
        html: 'Nothing happening today'
      }));
    }
  }

  // checkboxes
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
    natureBackground(yes) {
      if (options.backgroundURL) return;
      if (yes) {
        if (randomGradientTimer) clearInterval(randomGradientTimer);
        activateNatureBackground();
      } else {
        startRandomGradients();
        nextBackground.disabled = true;
      }
    },
    showSELF() {
      updateView();
    },
    quickTransitions(yes) {
      if (yes) document.body.classList.add('quick-transitions');
      else document.body.classList.remove('quick-transitions');
    },
    randomGradients(yes) {
      if (yes) {
        if (!options.natureBackground && !options.backgroundURL) startRandomGradients();
      }
      else if (randomGradientTimer) clearInterval(randomGradientTimer);
    },
    showEvents(yes) {
      if (yes && eventsWrapper.style.display) renderEvents();
      eventsWrapper.style.display = yes ? null : 'none';
    }
  };
  Array.from(document.getElementsByClassName('toggle-setting')).forEach(toggle => {
    const prop = toggle.dataset.option;
    if (options[prop] === undefined) options[prop] = toggle.dataset.default === 'true';
    toggle.checked = options[prop];
    if (optionChange[prop]) optionChange[prop](toggle.checked);
    toggle.addEventListener('change', e => {
      options[prop] = toggle.checked;
      if (optionChange[prop]) optionChange[prop](toggle.checked);
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
    backDay.disabled = viewingTime <= firstDay.getTime();
    forthDay.disabled = viewingTime >= lastDay.getTime();
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
  const firstYear = firstDay.getUTCFullYear();
  const firstMonth = firstDay.getUTCMonth();
  const tempDate = new Date(Date.UTC(firstYear, firstMonth, 1));
  for (const endTime = lastDay.getTime(); tempDate.getTime() <= endTime; tempDate.setUTCMonth(tempDate.getUTCMonth() + 1)) {
    schoolMonths.push(months[tempDate.getUTCMonth()] + ' ' + tempDate.getUTCFullYear());
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
    if (dateObj.getTime() < firstDay.getTime() || dateObj.getTime() > lastDay.getTime())
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

  UgwishaExtensions.start();
}, {once: true});

function loadSW(updateURL = '/ugwisha-updater.html') {
  if ('serviceWorker' in navigator) {
    if (params['no-sw'] || params['reset-sw']) {
      navigator.serviceWorker.getRegistrations().then(regis => {
        Promise.all(regis.map(regis => {
          // regis.active.postMessage({type: 'disable'});
          return regis.unregister();
        })).then(() => {
          if (params['reset-sw']) window.location = updateURL;
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
                window.location.replace(updateURL);
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
}
