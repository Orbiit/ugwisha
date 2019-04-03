/*
 * GIVEN: defaultNames, defaultColours, getNote, THEME_COLOUR,
 *   DEFAULT_FAVICON_URL, APP_NAME, PERIOD_OPTION_PREFIX
 * GIVES: *nothing*
 *
 * PERIODS.js
 * displays schedules and calculates time left
 */

const FAVICON_SIZE = 32;

function getPdName(pd) {
  return options['periodName_' + PERIOD_OPTION_PREFIX + pd];
}
function setPdName(pd, newName) {
  return options['periodName_' + PERIOD_OPTION_PREFIX + pd] = newName;
}
function getPdColour(pd) {
  return options['periodColour_' + PERIOD_OPTION_PREFIX + pd];
}
function setPdColour(pd, newColour) {
  return options['periodColour_' + PERIOD_OPTION_PREFIX + pd] = newColour;
}

let scheduleWrapper, weekPreviewWrapper;
let inputs, periodCards;
const gradeName = ['freshmen', 'sophomores', 'juniors', 'seniors'];
const hexColourRegex = /([0-9a-f]{6})|([0-9a-f])([0-9a-f])([0-9a-f])/;
let colourPickerInput, colourPickerCheckbox;
function checkThenDestroy() {
  setTimeout(() => {
    if (!scheduleWrapper.contains(document.activeElement)) {
      colourPicker.parentNode.removeChild(colourPicker);
      periodBeingColoured = null;
    }
  }, 0);
}
function parseColour(val) {
  const regexified = hexColourRegex.exec(val.toLowerCase());
  if (regexified) {
    let colour;
    if (regexified[1]) return regexified[1];
    else {
      return regexified.slice(2, 5).map(c => c + c).join('');
    }
  }
}
const colourPicker = createElement('div', {
  classes: 'colour-picker',
  children: [
    colourPickerInput = createElement('input', {
      classes: 'colour-input select-input',
      attributes: {
        type: 'text',
        placeholder: '#123ABC'
      },
      listeners: {
        change() {
          const colour = parseColour(colourPickerInput.value);
          if (colour) {
            setPdColour(periodBeingColoured, colour);
            periodCards[periodBeingColoured].forEach(p => p.style.setProperty('--colour', '#' + colour));
            save();
            updateStatus();
          } else {
            colourPickerInput.value = '#' + getPdColour(periodBeingColoured);
          }
        },
        blur: checkThenDestroy
      }
    }),
    colourPickerCheckbox = createElement('input', {
      attributes: {
        type: 'checkbox',
        name: 'colour-picker-checkbox'
      },
      listeners: {
        change() {
          colourPickerInput.disabled = colourPickerCheckbox.checked;
          if (colourPickerCheckbox.checked) {
            setPdColour(periodBeingColoured, null);
            periodCards[periodBeingColoured].forEach(p => {
              p.classList.add('transparent');
              p.style.setProperty('--colour', null);
            });
          } else {
            setPdColour(periodBeingColoured, parseColour(colourPickerInput.value) || defaultColours[periodBeingColoured] || '000');
            periodCards[periodBeingColoured].forEach(p => {
              p.classList.remove('transparent');
              p.style.setProperty('--colour', '#' + getPdColour(periodBeingColoured));
            });
          }
          save();
          updateStatus();
        },
        blur: checkThenDestroy
      }
    }),
    createElement('label', {
      attributes: {
        for: 'colour-picker-checkbox'
      },
      html: 'Transparent?'
    })
  ]
});
let periodBeingColoured = null;
function setSchedule(schedule) {
  empty(scheduleWrapper);
  if (schedule.alternate) {
    scheduleWrapper.appendChild(createElement('p', {
      classes: 'alternate-note',
      html: 'This is an alternate schedule'
    }));
  }
  if (schedule.noSchool) {
    scheduleWrapper.appendChild(createElement('div', {
      classes: 'no-school',
      children: [
        createElement('span', {
          html: 'No school!'
        })
      ]
    }));
    return;
  }
  inputs = {};
  periodCards = {};
  scheduleWrapper.appendChild(createFragment(schedule.map(pd => {
    const periodName = createElement('input', {
      classes: 'period-name',
      attributes: {
        type: 'text',
        placeholder: defaultNames[pd.period],
        value: getPdName(pd.period)
      },
      listeners: {
        change() {
          setPdName(pd.period, periodName.value);
          save();
          updateStatus();
          inputs[pd.period].forEach(input => input !== periodName && (input.value = periodName.value));
        },
        focus() {
          if (colourPicker.parentNode) colourPicker.parentNode.removeChild(colourPicker);
          periodName.parentNode.insertBefore(colourPicker, periodName.nextElementSibling);
          colourPickerInput.value = '#' + (getPdColour(pd.period) || defaultColours[pd.period] || '000');
          colourPickerInput.disabled = colourPickerCheckbox.checked = getPdColour(pd.period) === null;
          periodBeingColoured = pd.period;
        },
        blur: checkThenDestroy
      }
    });
    if (!inputs[pd.period]) inputs[pd.period] = [];
    inputs[pd.period].push(periodName);
    const note = getNote(pd);
    const wrapper = createElement('div', {
      classes: [
        'period',
        getPdColour(pd.period) === null ? 'transparent' : undefined
      ],
      styles: {
        '--colour': getPdColour(pd.period) === null ? undefined : '#' + getPdColour(pd.period)
      },
      children: [
        periodName,
        createElement('span', {
          classes: 'time',
          html: formatTime(pd.start) + ' &ndash; ' + formatTime(pd.end)
        }),
        createElement('span', {
          classes: 'duration',
          html: formatDuration(pd.end - pd.start, false) + ' long'
        }),
        note ? createElement('span', {
          classes: 'note',
          html: note
        }) : undefined
      ]
    });
    if (!periodCards[pd.period]) periodCards[pd.period] = [];
    periodCards[pd.period].push(wrapper);
    return wrapper;
  })));
}
const dayInitials = ['S', 'M', 'T', 'W', '&Theta;', 'F', 'S'];
function showWeekPreview(schedules, selectedDay) {
  empty(weekPreviewWrapper);
  weekPreviewWrapper.appendChild(createFragment(schedules.map((schedule, i) => createElement('div', {
    classes: ['week-preview-col', selectedDay === i ? 'week-preview-today' : undefined],
    attributes: {
      tabindex: 0
    },
    children: [
      createElement('span', {
        classes: 'week-preview-cell week-preview-day-heading',
        html: dayInitials[i],
        attributes: {
          title: days[i],
          'aria-label': days[i]
        }
      }),
      ...(schedule.noSchool ? [] : schedule.map((pd, i) => createElement('span', {
        classes: [
          'week-preview-cell',
          'week-preview-period',
          getPdColour(pd.period) === null ? 'week-preview-transparent' : undefined
        ],
        styles: {
          backgroundColor: getPdColour(pd.period) === null ? undefined : '#' + getPdColour(pd.period)
        },
        attributes: {
          title: getPdName(pd.period),
          'aria-label': getPdName(pd.period)
        }
      }))),
      schedule.alternate ? createElement('span', {
        classes: 'week-preview-cell week-preview-alternate',
        html: '*',
        attributes: {
          title: 'Alternate schedule',
          'aria-label': 'This is an alternate schedule'
        }
      }) : undefined
    ],
    listeners: {
      click: e => {
        // BUG: current allows user to click outside of school year, oh well
        viewingDate = schedule.date;
        updateView();
        updateDateWrapperLink();
      },
      keydown(e) {
        // BUG: focus is lost
        if (e.keyCode === 13) this.click();
      }
    }
  }))));
}

const timezone = new Date().getTimezoneOffset(); // could try to sync it to PT for everyone, but DST :(
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
    status.period = period.period;
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
    status.period = lastPeriod.period;
    status.type = 'since';
    status.value = minutes - lastPeriod.end;
  }
  return status;
}
function getPeriodChipHTML(period) {
  const colour = getPdColour(period);
  let str = '<span class="period-chip';
  if (colour === null) str += ' transparent';
  str += '"';
  if (colour !== null) str += ` style="--colour: #${colour};"`;
  str += `>${getPdName(period)}</span>`;
  return str;
}
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

let previewTime, previewMsg, progressBar, favicon, faviconCanvas, fc;
let todaySchedule, todayDate;
function updateStatus(startInterval = false, nextMinute = 0) {
  const now = Date.now();
  if (startInterval && now < nextMinute) {
    return setTimeout(() => updateStatus(true, nextMinute), Math.min(nextMinute - now, 1000));
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
  } else {
    if (status.type === 'left in') {
      progressBar.style.opacity = 1;
      progressBar.style.setProperty('--progress', status.progress * 100 + '%');
    } else {
      progressBar.style.opacity = 0;
    }
    previewMsg.innerHTML = status.type + ' ' + getPeriodChipHTML(status.period);
    if (status.type === 'since') {
      previewTime.textContent = formatDuration(status.value, true);
      favicon.setAttribute('href', DEFAULT_FAVICON_URL);
      document.title = APP_NAME;
    } else {
      setFavicon(formatDuration(status.value, true, true));
      if (status.secondCounter) {
        function seconds() {
          const {secondsLeft, stop} = status.secondCounter();
          if (!stop) {
            const str = Math.round(secondsLeft * 10) / 10 + '';
            document.title = (previewTime.textContent = str + (str.includes('.') ? '0'.repeat(2 - str.length + str.indexOf('.')) : '.0') + 's')
              + ' ' + status.type + ' ' + getPdName(status.period) + ' - ' + APP_NAME;
          }
          window.requestAnimationFrame(startInterval && !stop ? seconds : updateStatus);
        }
        seconds();
      } else {
        document.title = (previewTime.textContent = formatDuration(status.value, true))
          + ' ' + status.type + ' ' + getPdName(status.period) + ' - ' + APP_NAME;
      }
    }
  }
  if (startInterval) setTimeout(() => updateStatus(true, status.nextMinute), Math.min(status.nextMinute - now, 1000));
}

ready.push(() => {
  scheduleWrapper = document.getElementById('periods');
  Object.keys(defaultNames).forEach(pd => {
    if (getPdName(pd) === undefined)
      setPdName(pd, defaultNames[pd]);
  });
  Object.keys(defaultColours).forEach(pd => {
    if (getPdColour(pd) === undefined)
      setPdColour(pd, defaultColours[pd]);
  });
  previewTime = document.getElementById('preview-time');
  previewMsg = document.getElementById('preview-msg');
  progressBar = document.getElementById('progress');
  favicon = document.getElementById('favicon');
  faviconCanvas = createElement('canvas', {
    attributes: {
      width: FAVICON_SIZE,
      height: FAVICON_SIZE
    }
  });
  fc = faviconCanvas.getContext('2d');
  fc.textAlign = 'center';
  fc.textBaseline = 'middle';
  weekPreviewWrapper = document.getElementById('week-preview')
});
