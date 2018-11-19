const FAVICON_SIZE = 32;

const defaultNames = {
  A: 'Period A', B: 'Period B', C: 'Period C', D: 'Period D',
  E: 'Period E', F: 'Period F', G: 'Period G',
  b: 'Brunch', l: 'Lunch', f: 'Flex', s: 'SELF'
};
const defaultColours = {
  A: 'f44336', B: '3F51B5', C: 'FFEB3B', D: '795548',
  E: 'FF9800', F: '9C27B0', G: '4CAF50',
  b: null, l: null, f: '607D8B', s: '9E9E9E'
};
let scheduleWrapper;
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
  attributes: {
    tabindex: 0
  },
  children: [
    colourPickerInput = createElement('input', {
      classes: 'colour-input',
      attributes: {
        type: 'text',
        placeholder: '#123ABC'
      },
      listeners: {
        change() {
          const colour = parseColour(colourPickerInput.value);
          if (colour) {
            options['periodColour_' + periodBeingColoured] = colour;
            periodCards[periodBeingColoured].forEach(p => p.style.setProperty('--colour', '#' + colour));
            save();
            updateStatus();
          } else {
            colourPickerInput.value = '#' + options['periodColour_' + periodBeingColoured];
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
            options['periodColour_' + periodBeingColoured] = null;
            periodCards[periodBeingColoured].forEach(p => {
              p.classList.add('transparent');
              p.style.setProperty('--colour', null);
            });
          } else {
            options['periodColour_' + periodBeingColoured] = parseColour(colourPickerInput.value) || defaultColours[periodBeingColoured] || '000';
            periodCards[periodBeingColoured].forEach(p => {
              p.classList.remove('transparent');
              p.style.setProperty('--colour', '#' + options['periodColour_' + periodBeingColoured]);
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
  ],
  listeners: {
    blur: checkThenDestroy
  }
});
let periodBeingColoured = null;
function setSchedule(schedule) {
  scheduleWrapper.innerHTML = '';
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
        value: options['periodName_' + pd.period]
      },
      listeners: {
        change() {
          options['periodName_' + pd.period] = periodName.value;
          save();
          updateStatus();
          inputs[pd.period].forEach(input => input !== periodName && (input.value = periodName.value));
        },
        focus() {
          if (colourPicker.parentNode) colourPicker.parentNode.removeChild(colourPicker);
          periodName.parentNode.insertBefore(colourPicker, periodName.nextElementSibling);
          colourPickerInput.value = '#' + (options['periodColour_' + pd.period] || defaultColours[pd.period] || '000');
          colourPickerInput.disabled = colourPickerCheckbox.checked = options['periodColour_' + pd.period] === null;
          periodBeingColoured = pd.period;
        },
        blur: checkThenDestroy
      }
    });
    if (!inputs[pd.period]) inputs[pd.period] = [];
    inputs[pd.period].push(periodName);
    const wrapper = createElement('div', {
      classes: [
        'period',
        options['periodColour_' + pd.period] === null ? 'transparent' : undefined
      ],
      styles: {
        '--colour': options['periodColour_' + pd.period] === null ? undefined : '#' + options['periodColour_' + pd.period]
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
        pd.period === 's' ? createElement('span', {
          classes: 'note',
          html: 'For ' + (pd.selfGrades || defaultSelf).toString(2).split('').reverse().map((n, i) => n === '1' ? gradeName[i] : '').filter(n => n).join(', ')
        }) : undefined
      ]
    });
    if (!periodCards[pd.period]) periodCards[pd.period] = [];
    periodCards[pd.period].push(wrapper);
    return wrapper;
  })));
}

const timezone = new Date().getTimezoneOffset(); // could try to sync it to PT for everyone, but DST :(
function timeLeft(schedule, offset = 0) {
  const now = Date.now() + offset;
  const toNextMinute = 60000 - now % 60000;
  const minutes = Math.floor((now / 60000 - timezone) % 1440);
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
  const colour = options['periodColour_' + period];
  let str = '<span class="period-chip';
  if (colour === null) str += ' transparent';
  str += '"';
  if (colour !== null) str += ` style="--colour: #${colour};"`;
  str += `>${options['periodName_' + period]}</span>`;
  return str;
}
function setFavicon(text) {
  fc.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
  fc.font = `100px 'Roboto Condensed', sans-serif`;
  const {width} = fc.measureText(text);
  fc.font = `${FAVICON_SIZE / (width / 100)}px 'Roboto Condensed', sans-serif`;
  fc.fillText(text, FAVICON_SIZE / 2, FAVICON_SIZE / 2);
  favicon.setAttribute('href', faviconCanvas.toDataURL());
}

let previewTime, previewMsg, progressBar, favicon, faviconCanvas, fc;
let todaySchedule, todayDate;
function updateStatus(startInterval = false) {
  const today = new Date().toISOString().slice(0, 10);
  if (todayDate !== today) {
    todayDate = today;
    todaySchedule = getSchedule(getToday());
  }
  if (todaySchedule.noSchool) {
    if (startInterval) setTimeout(() => updateStatus(true), 5000);
    progressBar.style.opacity = 0;
    return;
  }
  const status = timeLeft(todaySchedule);
  if (status.type === 'left in') {
    progressBar.style.opacity = 1;
    progressBar.style.setProperty('--progress', status.progress * 100 + '%');
  } else {
    progressBar.style.opacity = 0;
  }
  previewMsg.innerHTML = status.type + ' ' + getPeriodChipHTML(status.period);
  setFavicon(formatDuration(status.value, true));
  if (status.secondCounter) {
    function seconds() {
      const {secondsLeft, stop} = status.secondCounter();
      if (!stop) {
        const str = Math.round(secondsLeft * 10) / 10 + '';
        document.title = (previewTime.textContent = str + (str.includes('.') ? '0'.repeat(2 - str.length + str.indexOf('.')) : '.0') + 's')
          + ' ' + status.type + ' ' + options['periodName_' + status.period] + ' - Ugwisha';
      }
      window.requestAnimationFrame(startInterval && !stop ? seconds : updateStatus);
    }
    seconds();
  } else {
    document.title = (previewTime.textContent = formatDuration(status.value, true))
      + ' ' + status.type + ' ' + options['periodName_' + status.period] + ' - Ugwisha';
  }
  if (startInterval) setTimeout(() => updateStatus(true), status.nextMinute);
}

ready.push(() => {
  scheduleWrapper = document.getElementById('periods');
  Object.keys(defaultNames).forEach(pd => {
    if (options['periodName_' + pd] === undefined)
      options['periodName_' + pd] = defaultNames[pd];
  });
  Object.keys(defaultColours).forEach(pd => {
    if (options['periodColour_' + pd] === undefined)
      options['periodColour_' + pd] = defaultColours[pd];
  });
  previewTime = document.getElementById('preview-time');
  previewMsg = document.getElementById('preview-msg');
  progressBar = document.getElementById('progress');
  favicon = createElement('link', {
    attributes: {
      rel: 'icon'
    }
  });
  faviconCanvas = createElement('canvas', {
    attributes: {
      width: FAVICON_SIZE,
      height: FAVICON_SIZE
    }
  });
  fc = faviconCanvas.getContext('2d');
  fc.textAlign = 'center';
  fc.textBaseline = 'middle';
  fc.fillStyle = '#ff5959';
  document.head.appendChild(favicon);
});
