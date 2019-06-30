/**
 * Size of the canvas for creating a custom favicon
 * @type {number}
 * @const
 */
const FAVICON_SIZE = 32;

/**
 * Formats a time string according to user preferences
 * @param {number} minutes Number of minutes since the beginning of the day
 * @param {boolean} [noAMPM=false] If the AM/PM should be excluded, regardless
 *                                 of if the user is using 12-hour
 * @return {string} The time string
 */
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

/**
 * Formats a duration
 * @param {number} minutes Number of minutes
 * @param {boolean} [short=false] False if the word "minutes" should be used
 * @param {boolean} [reallyShort=false] True if a leading 0 before the colon
 *                                      should be excluded (eg 0:03 -> :03);
 *                                      used in the favicon
 * @return {string} The duration string
 */
function formatDuration(minutes, short = false, reallyShort = false) {
  if (!short) return minutes + ' minute' + (minutes === 1 ? '' : 's');
  // const hours = Math.floor(minutes / 60);
  // const mins = minutes % 60;
  // return (hours > 0 ? hours + ' hour' + (hours === 1 ? '' : 's') : '')
  //   + (hours > 0 && mins !== 0 ? ' and ' : '')
  //   + (mins !== 0 ? mins + ' minute' + (mins === 1 ? '' : 's') : '');
  return (reallyShort && minutes < 60 ? '' : Math.floor(minutes / 60)) + ':' + ('0' + minutes % 60).slice(-2);
}

function getPdName(pd) {
  return options['periodName_' + PERIOD_OPTION_PREFIX + pd] || defaultNames[pd];
}
function setPdName(pd, newName) {
  return options['periodName_' + PERIOD_OPTION_PREFIX + pd] = newName;
}
function getPdColour(pd) {
  return options['periodColour_' + PERIOD_OPTION_PREFIX + pd] || defaultColours[pd];
}
function setPdColour(pd, newColour) {
  return options['periodColour_' + PERIOD_OPTION_PREFIX + pd] = newColour;
}

Ugwisha.formatTime = formatTime;
Ugwisha.formatDuration = formatDuration;
Ugwisha.getPdName = getPdName;
Ugwisha.getPdColour = getPdColour;

let scheduleWrapper, weekPreviewColumns;

const sheepImages = [ // 14 sheep
  'left-sheep-curious.svg',
  'left-sheep-running-sad-D.svg',
  'left-sheep-standing-blowing-caterpillars.svg',
  'right-sheep-D-mouth.svg',
  'right-sheep-fishing.svg',
  'right-sheep-hot-air-balloon.svg',
  'right-sheep-sleeping.svg',
  'standing-sheep-arms-out.svg',
  'standing-sheep-classy.svg',
  'standing-sheep-doing-ballet.svg',
  'standing-sheep-flowers.svg',
  'standing-sheep-hungry.svg',
  'two-sheep-ice-cream.svg',
  'two-sheep-stack.svg'
];


/**
 * Consistently selects a sheep based on a date for the day for no school days
 * @param {number} time The time of a Date object
 * @return {string} The URL of the sheep image to use
 */
function sheepFromDate(time) {
  // alternate between two sets of sheep so the same sheep never appears twice
  // in a row
  const even = time / 86400000 % 2 === 0;
  // not using modulo so it's not a cycle of sheep, though it might still end up
  // being one; using base 7 because there are 2 sets of a total of 14 sheep
  // character 9 seems to be somewhat more random than the others
  const index = +time.toString(7)[9];
  return sheepImages[(even ? 0 : 7) + index];
}

/**
 * Returns whether black text should be used on a colour for maximum contrast.
 * Code from https://stackoverflow.com/a/3943023
 * @param {string} hex The hexadecimal background colour
 * @return {boolean} Whether black text should be used
 */
function useBlackText(hex) {
  const [r, g, b] = [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4)]
    .map(c => {
      c = parseInt(c, 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179;
}

let currentPickerWrapper, currentPickerParent;
document.addEventListener('click', e => {
  if (currentPickerWrapper && !currentPickerParent.contains(e.target)) {
    const oldWrapper = currentPickerWrapper;
    tabbablify(oldWrapper, false);
    oldWrapper.classList.add('disappear');
    oldWrapper.addEventListener('transitionend', e => {
      oldWrapper.parentNode.removeChild(oldWrapper);
    }, {once: true});
    currentPickerWrapper = currentPickerParent = null;
  }
});

/**
 * Renders the given schedule
 * @param {Schedule} schedule The schedule to render
 */
function setSchedule(schedule) {
  empty(scheduleWrapper);
  currentPickerWrapper = currentPickerParent = null;
  if (schedule.alternate) {
    scheduleWrapper.appendChild(Elem('p', {className: 'alternate-note'}, ['This is an alternate schedule.']));
  }
  if (schedule.noSchool) {
    scheduleWrapper.appendChild(Elem('div', {
      className: 'no-school',
      style: {
        backgroundImage: `url('./images/sheep/${sheepFromDate(getToday().getTime())}')`
      }
    }, [Elem('span', {}, ['No school!'])]));
    return;
  }
  const periods = {}; // for updating duplicate periods' names/colours
  scheduleWrapper.appendChild(Fragment(schedule.map(pd => {
    const periodName = Elem('input', {
      className: 'period-name',
      type: 'text',
      placeholder: defaultNames[pd.period],
      value: getPdName(pd.period),
      onchange() {
        setPdName(pd.period, periodName.value);
        save();
        updateStatus();
        periods[pd.period].inputs.forEach(input => input !== periodName && (input.value = periodName.value));
      },
      onfocus() {
        if (currentPickerParent === wrapper) return;
        if (currentPickerWrapper) {
          const oldWrapper = currentPickerWrapper;
          tabbablify(oldWrapper, false);
          oldWrapper.classList.add('disappear');
          oldWrapper.addEventListener('transitionend', e => {
            oldWrapper.parentNode.removeChild(oldWrapper);
          }, {once: true});
        }
        currentPickerWrapper = colourPicker(
          colour => {
            setPdColour(pd.period, colour);
            save();
            updateStatus();
            periods[pd.period].cards.forEach(p => {
              if (colour === null) {
                p.classList.add('transparent');
                p.classList.remove('dark-text');
                p.style.setProperty('--colour', null);
              } else {
                p.classList.remove('transparent');
                p.style.setProperty('--colour', '#' + colour);
                if (useBlackText(colour)) p.classList.add('dark-text');
                else p.classList.remove('dark-text');
              }
            });
          },
          getPdColour(pd.period),
          true,
          defaultColours[pd.period] || '000000'
        );
        periodName.parentNode.insertBefore(currentPickerWrapper, periodName.nextElementSibling);
        currentPickerParent = wrapper;
      }
    });
    const note = getNote(pd);
    const wrapper = Elem('div', {
      className: [
        'period',
        getPdColour(pd.period) === null ? 'transparent'
          : useBlackText(getPdColour(pd.period)) ? 'dark-text' : null
      ],
      style: {
        '--colour': getPdColour(pd.period) && '#' + getPdColour(pd.period)
      }
    }, [
      periodName,
      Elem('span', {className: 'time-duration'}, [
        Elem('span', {
          className: 'time',
          innerHTML: formatTime(pd.start) + ' &ndash; ' + formatTime(pd.end)
        }),
        Elem('span', {className: 'duration'}, [(pd.end - pd.start) + ' min']),
        note ? Elem('span', {
          className: 'note',
          innerHTML: note
        }) : null
      ])
    ]);
    if (!periods[pd.period]) periods[pd.period] = {inputs: [], cards: []};
    periods[pd.period].inputs.push(periodName);
    periods[pd.period].cards.push(wrapper);
    return wrapper;
  })));
}

/**
 * Letters representing days of the week used in the week preview.
 * @type {string[]}
 */
const dayInitials = ['S', 'M', 'T', 'W', '&Theta;', 'F', 'S'];

/**
 * Renders the week preview
 * @param {Schedule[]} schedules Schedules of each day of the week
 * @param {number} selectedDay Index of the day being previewed
 */
function showWeekPreview(schedules, selectedDay) {
  weekPreviewColumns.forEach((col, i) => {
    if (selectedDay === i) col.wrapper.classList.add('week-preview-today');
    else col.wrapper.classList.remove('week-preview-today');
    empty(col.content);
    const schedule = schedules[i];
    if (schedule.alternate) col.wrapper.classList.add('week-preview-is-alternate');
    else col.wrapper.classList.remove('week-preview-is-alternate');
    col.date = schedule.date;
    col.content.appendChild(Fragment(schedule.noSchool
      ? []
      : schedule.map((pd, i) => Elem('span', {
        className: [
          'week-preview-cell',
          'week-preview-period',
          getPdColour(pd.period) === null ? 'week-preview-transparent' : null
        ],
        title: getPdName(pd.period),
        'aria-label': getPdName(pd.period),
        style: {
          backgroundColor: getPdColour(pd.period) && '#' + getPdColour(pd.period)
        }
      }))
    ));
  });
}

/**
 * Time zone offset of the user in minutes relative to GMT (so GMT-0700 becomes
 * 420)
 * @type {number}
 */
const timezone = new Date().getTimezoneOffset();

/**
 * Calculates the current time left
 * @param {Schedule} schedule Schedule to use for calculating time left
 * @param {number} [offset=0] Number of milliseconds to add to the current time
 *                            (for testing)
 * @return {Object} Some info to be used by updateStatus
 */
function timeLeft(schedule, offset = 0) {
  const now = Date.now() + offset;
  const minutes = Math.floor((now / 60000 - timezone) % 1440);
  const toNextMinute = now + 60000 - now % 60000;
  if (schedule.noSchool) {
    return { type: 'time', value: minutes, nextMinute: toNextMinute };
  }
  const period = schedule.find(pd => pd.end > minutes);
  const status = { secondCounter: null, nextMinute: toNextMinute };
  if (period) {
    status.period = period;
    if (period.start > minutes) {
      status.type = 'until';
      status.value = period.start - minutes;
    } else {
      status.type = 'left in';
      status.value = period.end - minutes;
      status.progress = (minutes - period.start) / (period.end - period.start);
    }
    // console.log(status.value);
    if (status.value <= 1) {
      status.secondCounter = () => {
        const now = Date.now() + offset;
        return {
          secondsLeft: 60 - now / 1000 % 60,
          stop: Math.floor((now / 60000 - timezone) % 1440) >= (period.start > minutes ? period.start : period.end)
        };
      };
    }
  } else {
    const lastPeriod = schedule[schedule.length - 1];
    status.period = lastPeriod;
    status.type = 'since';
    status.value = minutes - lastPeriod.end;
  }
  return status;
}

/**
 * Generates HTML for a "period chip" in the preview
 * @param {string} period The ID of the period
 * @return {string} The HTML
 */
function getPeriodChipHTML(period) {
  const colour = getPdColour(period);
  let str = '<span class="period-chip';
  if (colour === null) str += ' transparent';
  if (colour !== null && useBlackText(colour)) str += ' dark-text';
  str += '"';
  if (colour !== null) str += ` style="--colour: #${colour};"`;
  str += `>${getPdName(period)}</span>`;
  return str;
}

const faviconCanvas = Elem('canvas', {width: FAVICON_SIZE, height: FAVICON_SIZE});
const fc = faviconCanvas.getContext('2d');

/**
 * Sets the favicon
 * @param {string} text Content of the favicon (shorter is better)
 */
function setFavicon(text) {
  fc.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
  fc.font = `100px 'Roboto Condensed', sans-serif`;
  const {width} = fc.measureText(text);
  const fontSize = FAVICON_SIZE / (width / 100);
  fc.fillStyle = THEME_COLOUR;
  fc.fillRect(0, (FAVICON_SIZE - fontSize * 1.2) / 2, FAVICON_SIZE, fontSize);
  fc.font = `${fontSize}px 'Roboto Condensed', sans-serif`;
  fc.fillStyle = 'white';
  fc.fillText(text, FAVICON_SIZE / 2, FAVICON_SIZE / 2);
  favicon.setAttribute('href', faviconCanvas.toDataURL());
}

let previewTime, previewMsg, progressBar, favicon;
let todaySchedule, todayDate;

/**
 * Renders the preview. Call this when the schedule may have changed.
 * @param {boolean} [startInterval=false] Whether or not to start the clock
 * @param {number} [nextMinute=0] The time when the minute changes and the
 *                                preview would need rerendering
 */
function updateStatus(startInterval = false, nextMinute = 0) {
  const now = Date.now();
  if (startInterval) {
    if (now < nextMinute) {
      return setTimeout(() => updateStatus(true, nextMinute), Math.min(nextMinute - now, 1000));
    }
  }
  const today = getToday();
  const todayStr = today.toISOString().slice(0, 10);
  if (todayDate !== todayStr) {
    todayDate = todayStr;
    todaySchedule = getSchedule(today);
    if (todaySchedule.noSchool) {
      progressBar.style.opacity = 0;
      favicon.setAttribute('href', DEFAULT_FAVICON_URL);
      document.title = APP_NAME;
    }
  }
  const status = timeLeft(todaySchedule);
  if (todaySchedule.noSchool) {
    previewTime.textContent = formatTime(status.value, true);
    previewMsg.textContent = '';
  } else {
    if (status.type === 'left in') {
      progressBar.style.opacity = 1;
      progressBar.style.setProperty('--progress', status.progress * 100 + '%');
    } else {
      progressBar.style.opacity = 0;
    }
    previewMsg.innerHTML = status.type + ' ' + getPeriodChipHTML(status.period.period);
    if (status.type === 'since') {
      previewTime.textContent = formatDuration(status.value, true);
      favicon.setAttribute('href', DEFAULT_FAVICON_URL);
      document.title = APP_NAME;
    } else {
      setFavicon(formatDuration(status.value, true, true));
      if (startInterval && status.secondCounter) {
        function seconds() {
          const {secondsLeft, stop} = status.secondCounter();
          if (!stop) {
            const str = Math.round(secondsLeft * 100) / 100 + '';
            document.title = (previewTime.textContent = str + (str.includes('.') ? '0'.repeat(3 - str.length + str.indexOf('.')) : '.00') + 's')
              + ' ' + status.type + ' ' + getPdName(status.period.period) + ' - ' + APP_NAME;
          }
          window.requestAnimationFrame(startInterval && !stop ? seconds : updateStatus);
        }
        seconds();
      } else {
        document.title = (previewTime.textContent = formatDuration(status.value, true))
          + ' ' + status.type + ' ' + getPdName(status.period.period) + ' - ' + APP_NAME;
      }
    }
    if (startInterval) {
      UgwishaEvents.status.forEach(fn => fn(status, now));
    }
  }
  if (startInterval) setTimeout(() => updateStatus(true, status.nextMinute), Math.min(status.nextMinute - now, 1000));
}

ready.push(() => {
  scheduleWrapper = document.getElementById('periods');

  previewTime = document.getElementById('preview-time');
  previewMsg = document.getElementById('preview-msg');
  progressBar = document.getElementById('progress');

  favicon = document.getElementById('favicon');
  fc.textAlign = 'center';
  fc.textBaseline = 'middle';

  weekPreviewColumns = [];
  for (let i = 0; i < 7; i++) {
    const entry = {};
    entry.wrapper = Elem('div', {
      className: 'week-preview-col',
      tabindex: 0,
      ripple: true,
      onclick() {
        // BUG: current allows user to click outside of school year, oh well
        viewingDate = entry.date;
        updateView();
      },
      onkeydown(e) {
        if (e.keyCode === 13) this.click();
      }
    }, [
      Elem('span', {
        className: 'week-preview-cell week-preview-alternate',
        title: 'Alternate schedule',
        'aria-label': 'This is an alternate schedule'
      }, ['*']),
      Elem('span', {
        className: 'week-preview-cell week-preview-day-heading',
        innerHTML: dayInitials[i],
        title: days[i],
        'aria-label': days[i]
      }),
      entry.content = Elem('div')
    ]);
    weekPreviewColumns.push(entry);
  }
  document.getElementById('week-preview').appendChild(Fragment(weekPreviewColumns.map(({wrapper}) => wrapper)));

  let currentTouch = null;
  scheduleWrapper.addEventListener('touchstart', e => {
    if (!currentTouch && options.allowSliding) {
      const touch = e.changedTouches[0];
      currentTouch = {id: touch.identifier, startX: touch.clientX, slide: false};
    }
  });
  scheduleWrapper.addEventListener('touchmove', e => {
    if (currentTouch) {
      const touch = Array.from(e.touches).find(t => t.identifier === currentTouch.id);
      if (touch) {
        const changeX = touch.clientX - currentTouch.startX;
        if (!currentTouch.slide) {
          if (Math.abs(changeX) > 30) currentTouch.slide = true;
        }
        if (currentTouch.slide) {
          scheduleWrapper.style.transform = `translateX(${changeX / 5}px)`;
          scheduleWrapper.style.opacity = Math.abs(changeX) > 60 ? 0.5 : null;
        }
      }
    }
  });
  scheduleWrapper.addEventListener('touchend', e => {
    if (currentTouch) {
      const touch = Array.from(e.changedTouches).find(t => t.identifier === currentTouch.id);
      if (touch) {
        const changeX = touch.clientX - currentTouch.startX;
        if (changeX > 60) backDay.click();
        else if (changeX < -60) forthDay.click();
      }
      scheduleWrapper.style.transform = null;
      scheduleWrapper.style.opacity = null;
      currentTouch = null;
    }
  });
});
