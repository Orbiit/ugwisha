/* PARSING */
const EARLIEST_AM_HOUR = 6;

const HTMLnewlineRegex = /<(p|div|br).*?>|\),? *(?=[A-Z0-9])/g;
const noHTMLRegex = /<.*?>/g;
const noNbspRegex = /&nbsp;/g;
const timeGetterRegex = /\(?(1?[0-9]):([0-9]{2}) *(?:-|–) *(1?[0-9]):([0-9]{2}) *(pm)?\)?/;
const newLineRegex = /\r?\n/g;
const getPeriodLetterRegex = /\b[A-G]\b/;
const selfGradeRegex = /(1?[9012])th/gi;
const periodSelfGradeRegex = /self for (.+?) grader/gi;
const gradeToInt = {'9': 1, '10': 2, '11': 4, '12': 8};
const defaultSelf = 0b11;

function parseAlternate(summary, description) {
  if (/schedule|extended|lunch/i.test(summary)) {
    if (!description) return;
    description = '\n' + description.replace(HTMLnewlineRegex, '\n').replace(noHTMLRegex, '').replace(noNbspRegex, ' ');
    let periods = [];
    description.split(newLineRegex).forEach(str => {
      let times;
      const name = str.replace(timeGetterRegex, (...matches) => {
        times = matches;
        return '';
      }).trim();

      if (!times) return;

      let [, sH, sM, eH, eM, pm] = times;

      sH = +sH; sM = +sM; eH = +eH; eM = +eM;
      if (sH < EARLIEST_AM_HOUR || pm) sH += 12;
      if (eH < EARLIEST_AM_HOUR || pm) eH += 12;
      const startTime = sH * 60 + sM,
      endTime = eH * 60 + eM;

      const duplicatePeriod = periods.findIndex(p => p.start === startTime);
      if (~duplicatePeriod) {
        // keep longer duplicate period (see 2019-01-07 schedule)
        if (periods[duplicatePeriod].end - periods[duplicatePeriod].start > endTime - startTime) return;
        else {
          periods.splice(duplicatePeriod, 1);
        }
      }
      const period = identifyPeriod(name);
      const periodData = {
        period: period,
        start: startTime,
        end: endTime
      };
      if (period === 's') {
        periods.selfInSchedule = true;
        periodSelfGradeRegex.lastIndex = 0;
        const selfSlice = periodSelfGradeRegex.exec(name);
        if (selfSlice) {
          let grades = 0;
          selfSlice[1].replace(selfGradeRegex, (_, grade) => grades += gradeToInt[grade]);
          periodData.selfGrades = grades || defaultSelf;
        } else {
          periodData.selfGrades = defaultSelf;
        }
      }
      if (period) periods.push(periodData);
    });
    return periods;
  } else if (/holiday|no\sstudents|break|development/i.test(summary)) {
    if (description) return;
    return null;
  }
}

function identifyPeriod(name) {
  name = name.toUpperCase();
  if (~name.indexOf('PERIOD')) {
    let letter = getPeriodLetterRegex.exec(name);
    if (letter) return letter[0];
  }
  if (~name.indexOf('SELF')) return 's';
  else if (~name.indexOf('FLEX')
      || ~name.indexOf('ASSEMBL') // assembly, assemblies
      || ~name.indexOf('TUTORIAL'))
    return 'f';
  else if (~name.indexOf('BRUNCH') || ~name.indexOf('BREAK')) return 'b';
  else if (~name.indexOf('LUNCH') || ~name.indexOf('TURKEY')) return 'l';
  else return;
}

/* FETCHING */
const keywords = ['self', 'schedule', 'extended', 'holiday', 'no students', 'break', 'development'];
const calendarURL = 'https://www.googleapis.com/calendar/v3/calendars/'
  + encodeURIComponent('u5mgb2vlddfj70d7frf3r015h0@group.calendar.google.com')
  + '/events?singleEvents=true&fields='
  + encodeURIComponent('items(description,end(date,dateTime),start(date,dateTime),summary)')
  + '&key=AIzaSyDBYs4DdIaTjYx5WDz6nfdEAftXuctZV0o'
  + `&timeMin=${encodeURIComponent(eventsMinDate.toISOString())}&timeMax=${encodeURIComponent(eventsMaxDate.toISOString())}`;

const PASSING_PERIOD_LENGTH = 10;
const DOUBLE_FLEX_THRESHOLD = 80;
function parseEvents(events) {
  const alts = events.map(splitEvents);
  const selfDays = {};
  alts[0].forEach(ev => {
    if (ev.summary.includes('SELF')) {
      let grades = 0;
      ev.summary.replace(selfGradeRegex, (_, grade) => grades += gradeToInt[grade]);
      if (grades > 0) selfDays[ev.date] = grades || defaultSelf;
    }
  });
  const alternates = {};
  alts.slice(1).forEach(moreAlts => moreAlts.forEach(alt => {
    const schedule = parseAlternate(alt.summary, alt.description);
    if (schedule !== undefined) {
      alternates[alt.date] = schedule;
      if (schedule) {
        if (schedule.selfInSchedule) delete selfDays[alt.date];
        for (let i = 0; i < schedule.length; i++) {
          if (schedule[i].period === 'b' || schedule[i].period === 'l') {
            if (i === 0) schedule.splice(i--, 1);
            else if (i === schedule.length - 1) schedule.splice(i--, 1);
            else {
              schedule[i].end = schedule[i + 1].start - PASSING_PERIOD_LENGTH;
            }
          } else if (schedule[i].period === 'f') {
            const length = schedule[i].end - schedule[i].start;
            if (length >= DOUBLE_FLEX_THRESHOLD) {
              const flexLength = (length - PASSING_PERIOD_LENGTH) / 2;
              schedule.splice(i + 1, 0, {period: 'f', start: schedule[i].end - flexLength, end: schedule[i].end});
              schedule[i].end = schedule[i].start + flexLength;
              i++;
            }
          }
        }
      }
    }
  }));
  return {
    lastGenerated: new Date(),
    selfDays: selfDays,
    schedules: alternates
  };
}
function fetchAlternates() {
  altFetchBtn.disabled = true;
  return Promise.all(keywords.map(k => fetch(calendarURL + '&q=' + k).then(r => r.json()))).then(alts => {
    // localStorage.setItem('[ugwisha] test.rawAlts', JSON.stringify(alts));
    scheduleData = parseEvents(alts);
    storage.setItem(SCHEDULE_DATA_KEY, encodeStoredAlternates(scheduleData));
    altFetchBtn.disabled = false;
  });
}

/* ENCODING */
const selfCharOffset = 72;
const alternateRegex = /([A-GblfI-W])([\dab]{3})([\dab]{3})/g;
function decodeStoredAlternates(string = storage.getItem(SCHEDULE_DATA_KEY)) {
  const lines = string.split('|');
  const firstLine = lines.shift();
  const lastGeneratedDate = new Date(Date.UTC(+firstLine.slice(0, 4), parseInt(firstLine[4], 36), parseInt(firstLine[5], 36)));
  const selfDays = {};
  firstLine.slice(6).split('!').forEach(m => {
    const month = String(parseInt(m[0], 36) + 1).padStart(2, '0');
    for (let i = 1; i < m.length; i += 2) {
      selfDays[month + '-' + String(parseInt(m[i], 36)).padStart(2, '0')] = m[i + 1].charCodeAt() - selfCharOffset;
    }
  });
  const schedules = {};
  lines.forEach(m => {
    const month = String(parseInt(m[0], 36) + 1).padStart(2, '0');
    m.slice(1).split('!').forEach(d => {
      const schedule = d.length > 1 ? [] : null;
      if (d.length > 1) {
        d.slice(1).replace(alternateRegex, (_, period, start, end) => {
          const periodData = {
            period: period,
            start: parseInt(start, 12),
            end: parseInt(end, 12)
          };
          if (period >= 'I' && period <= 'W') {
            periodData.period = 's';
            periodData.selfGrades = period.charCodeAt() - selfCharOffset;
          }
          schedule.push(periodData);
        });
      }
      schedules[month + '-' + String(parseInt(d[0], 36)).padStart(2, '0')] = schedule;
    });
  });
  return {
    lastGenerated: lastGeneratedDate,
    selfDays: selfDays,
    schedules: schedules
  };
}
function encodeStoredAlternates({lastGenerated, selfDays, schedules}) {
  let result = lastGenerated.getUTCFullYear() + lastGenerated.getUTCMonth().toString(36) + lastGenerated.getUTCDate().toString(36);
  const selfMonths = {};
  Object.keys(selfDays).forEach(day => {
    let [month, date] = day.split('-').map(Number);
    month = (month - 1).toString(36);
    date = date.toString(36);
    selfMonths[month] = (selfMonths[month] || month) + date + String.fromCharCode((selfDays[day] || defaultSelf) + selfCharOffset);
  });
  result += Object.values(selfMonths).join('!') + '|';
  const schedMonths = {};
  Object.keys(schedules).forEach(day => {
    let [month, date] = day.split('-').map(Number);
    month = (month - 1).toString(36);
    date = date.toString(36);
    if (schedMonths[month]) schedMonths[month] += '!';
    else schedMonths[month] = month;
    schedMonths[month] += date;
    if (schedules[day])
      schedMonths[month] += schedules[day].map(({period, start, end, selfGrades}) => (period === 's' ? String.fromCharCode((selfGrades || defaultSelf) + selfCharOffset) : period)
        + start.toString(12).padStart(3, '0') + end.toString(12).padStart(3, '0')).join('');
  });
  result += Object.values(schedMonths).join('|');
  return result;
}

/* NORMAL SCHEDULE */
const normalSchedules = [
  null,
  [
    {period: 'A', start: 505, end: 585},
    {period: 'b', start: 585, end: 590},
    {period: 'B', start: 600, end: 675},
    {period: 'C', start: 685, end: 760},
    {period: 'l', start: 760, end: 790},
    {period: 'F', start: 800, end: 875}
  ], [
    {period: 'D', start: 505, end: 585},
    {period: 'b', start: 585, end: 590},
    {period: 'f', start: 600, end: 650},
    {period: 'E', start: 660, end: 735},
    {period: 'l', start: 735, end: 765},
    {period: 'A', start: 775, end: 855},
    {period: 'G', start: 865, end: 940}
  ], [
    {period: 'B', start: 505, end: 590},
    {period: 'b', start: 590, end: 595},
    {period: 'C', start: 605, end: 685},
    {period: 'D', start: 695, end: 775},
    {period: 'l', start: 775, end: 805},
    {period: 'F', start: 815, end: 895}
  ], [
    {period: 'E', start: 505, end: 590},
    {period: 'b', start: 590, end: 595},
    {period: 'f', start: 605, end: 655},
    {period: 'B', start: 665, end: 735},
    {period: 'l', start: 735, end: 765},
    {period: 'A', start: 775, end: 845},
    {period: 'G', start: 855, end: 935}
  ], [
    {period: 'C', start: 505, end: 580},
    {period: 'b', start: 580, end: 585},
    {period: 'D', start: 595, end: 665},
    {period: 'E', start: 675, end: 745},
    {period: 'l', start: 745, end: 775},
    {period: 'F', start: 785, end: 855},
    {period: 'G', start: 865, end: 935}
  ],
  null
];

/* DEFAULTS */
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

/* GET SCHEDULE */
const SCHEDULE_DATA_KEY = '[ugwisha] alternates';
let scheduleData = {};
function getSchedule(dateObj) {
  const string = dateObj.toISOString().slice(5, 10);
  let schedule;
  if (scheduleData.schedules[string] !== undefined) {
    schedule = JSON.parse(JSON.stringify(scheduleData.schedules[string]));
  } else {
    schedule = JSON.parse(JSON.stringify(normalSchedules[dateObj.getUTCDay()]));
  }
  if (schedule && scheduleData.selfDays[string]) {
    schedule.forEach(pd => {
      if (pd.period === 'f') {
        pd.period = 's';
        pd.selfGrades = scheduleData.selfDays[string];
      }
    });
  }
  if (schedule === null) {
    schedule = { noSchool: true };
  } else if (!options.showSELF) {
    schedule.forEach(pd => {
      if (pd.period === 's') pd.period = 'f';
    });
  }
  if (scheduleData.schedules[string] !== undefined) {
    schedule.alternate = true;
  }
  return schedule;
}
function prepareScheduleData(storedSchedules) {
  scheduleData = decodeStoredAlternates(storedSchedules);
}

/* PERIOD CARD NOTES */
function getNote(periodData) {
  return periodData.period === 's' ? 'For ' + (periodData.selfGrades || defaultSelf).toString(2).split('').reverse().map((n, i) => n === '1' ? gradeName[i] : '').filter(n => n).join(', ') : undefined;
}

/* THEME */
const THEME_COLOUR = '#ff5959';
const FAVICON_BACK_COLOUR = '#000000';
const DEFAULT_FAVICON_URL = './images/logo-192.png';
const APP_NAME = 'Ugwisha';
const PERIOD_OPTION_PREFIX = '';

loadSW('/ugwisha-updater.html');
