/* PARSING */
const EARLIEST_AM_HOUR = 6;
const PASSING_PERIOD_LENGTH = 10;
const DOUBLE_FLEX_LENGTH = 80; // longer flex might not be double - see 2018-10-10

const HTMLnewlineRegex = /<(p|div|br).*?>|\),? *(?=[A-Z0-9])/g;
const noHTMLRegex = /<.*?>/g;
const noNbspRegex = /&nbsp;/g;
const timeGetterRegex = /\(?(1?[0-9]):([0-9]{2}) *(?:-|–) *(1?[0-9]):([0-9]{2}) *(pm)?\)?/;
const newLineRegex = /\r?\n/g;
const getPeriodLetterRegex = /\b[A-G]\b/;
const selfGradeRegex = /(1?[9012])th|(freshmen|sophomore|junior|senior)/gi;
const periodSelfGradeRegex = /self for (.+?) grader|self for (freshmen|sophomore|junior|senior)/gi;
const gradeToInt = {'9': 1, '10': 2, '11': 4, '12': 8, freshmen: 1, sophomore: 2, junior: 4, senior: 8};
const defaultSelf = 0b11;

function parseAlternate(summary, description) {
  if (/schedule|extended|lunch/i.test(summary)) {
    if (!description) return;
    description = '\n' + description.replace(HTMLnewlineRegex, '\n').replace(noHTMLRegex, '').replace(noNbspRegex, ' ');
    const periods = [];
    description.split(newLineRegex).forEach(str => {
      let times;
      let name = str.replace(timeGetterRegex, (...matches) => {
        times = matches;
        return '';
      }).trim();

      if (!times) return;

      let [, sH, sM, eH, eM, pm] = times;

      sH = +sH; sM = +sM; eH = +eH; eM = +eM;
      if (sH < EARLIEST_AM_HOUR || pm) sH += 12;
      if (eH < EARLIEST_AM_HOUR || pm) eH += 12;
      let startTime = sH * 60 + sM,
      endTime = eH * 60 + eM;

      // handle duplicate periods
      const isRedundant = periods.find(pd => {
        if (pd.retire) return false;
        if (pd.start === startTime && pd.end === endTime) {
          // duplicate period
          pd.raw += '\n' + name;
          return true;
        } else if (pd.start <= startTime && pd.end >= endTime) {
          // longer period takes place during this period
          name += '\n' + pd.raw;
          // assumes there's passing period
          const beforeEnd = startTime - PASSING_PERIOD_LENGTH;
          const afterStart = endTime + PASSING_PERIOD_LENGTH;
          // TEMP: assumes that there can't be both a beforePart and an afterPart
          if (beforeEnd - pd.start > 0) {
            pd.end = beforeEnd;
          } else if (pd.end - afterStart > 0) {
            pd.start = afterStart;
          } else {
            pd.retire = true;
          }
        } else if (pd.start >= startTime && pd.end <= endTime) {
          // shorter period takes place during this period
          pd.raw += '\n' + name;
          // same problems here as above
          const beforePart = pd.start - PASSING_PERIOD_LENGTH;
          const afterPart = pd.end + PASSING_PERIOD_LENGTH;
          if (beforeEnd - startTime > 0) {
            endTime = beforeEnd;
          } else if (endTime - afterStart > 0) {
            startTime = afterStart;
          } else {
            return true;
          }
        }
        // assumes there won't be a case like (8:40-9:10) and (8:30 - 9:00)
      });
      if (!isRedundant) periods.push({
        raw: name,
        start: startTime,
        end: endTime
      });
    });
    return periods.filter(pd => {
      if (pd.retire) return false;
      const period = identifyPeriod(pd.raw);
      pd.period = period;
      if (period === 's') {
        periods.selfInSchedule = (periods.selfInSchedule || 0) + 1;
        periodSelfGradeRegex.lastIndex = 0;
        const selfSlice = periodSelfGradeRegex.exec(pd.raw);
        if (selfSlice) {
          let grades = 0;
          (selfSlice[1] || selfSlice[2]).replace(selfGradeRegex, (match, grade) => grades += gradeToInt[grade || match] || 0);
          pd.selfGrades = grades || defaultSelf;
        } else {
          pd.selfGrades = defaultSelf;
        }
      }
      delete pd.raw;
      return period;
    }).sort((a, b) => a.start - b.start);
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
      || ~name.indexOf('ATTEND') // HACK to detect PSAT day (2018-10-10)
      || ~name.indexOf('TUTORIAL'))
    return 'f';
  else if (~name.indexOf('BRUNCH') || ~name.indexOf('BREAK')) return 'b';
  // 'UNCH' intentional - misspelling on 2019-03-26
  else if (~name.indexOf('UNCH') || ~name.indexOf('TURKEY')) return 'l';
  else return;
}

function parseEvents(events, dateObj) {
  const dateName = dateObj.toISOString().slice(5, 10);
  const weekDay = dateObj.getUTCDay();
  const oldEntry = scheduleData[dateName];
  let self, alternate, overrideSELF = false;
  // duplicate events happen infrequently; they're not a concern
  events.forEach(({summary, description}) => {
    if (summary.includes('SELF') && summary.includes('graders')) {
      let grades = 0;
      summary.replace(selfGradeRegex, (_, grade) => grades += gradeToInt[grade]);
      if (grades > 0) {
        self = grades || defaultSelf;
        return;
      }
    }
    // HACK to prevent back-to-school schedule from overriding alternate schedule (2018-08-30)
    if (summary.includes('Back-to-School')) return;
    const schedule = parseAlternate(summary, description);
    if (schedule !== undefined) {
      if (schedule) {
        if (schedule.selfInSchedule) overrideSELF = true;
        for (let i = 0; i < schedule.length; i++) {
          const pd = schedule[i];
          if (pd.period === 'b' || pd.period === 'l') {
            // remove passing periods from breaks
            if (i === 0) schedule.splice(i--, 1);
            else if (i === schedule.length - 1) schedule.splice(i--, 1);
            else {
              pd.end = schedule[i + 1].start - PASSING_PERIOD_LENGTH;
            }
          }
        }
      }
      // latter part is so no school days on a weekend isn't considered alternate
      if (schedule || normalSchedules[weekDay].length)
        alternate = schedule || [];
    }
  });
  if (alternate) {
    if (self && !overrideSELF) {
      alternate.forEach(pd => {
        if (pd.period === 'f') {
          pd.period = 's';
          pd.selfGrades = self;
        }
      });
    }
    scheduleData[dateName] = alternate;
    return JSON.stringify(oldEntry) !== JSON.stringify(alternate);
  } else {
    // this is hardcoded, so if say SELF gets moved to Wednesday, this will need changing
    if (weekDay === 4 && self !== defaultSelf) {
      // if it's freshmen-only SELF or no SELF on Thursday :O
      const clone = JSON.parse(JSON.stringify(normalSchedules[weekDay]));
      if (self) {
        clone[2].selfGrades = self;
      } else {
        clone[2].period = 'f';
      }
      scheduleData[dateName] = clone;
      return !oldEntry;
    } else if (weekDay === 2 && self) {
      // when there's SELF on Tuesday
      const clone = JSON.parse(JSON.stringify(normalSchedules[weekDay]));
      clone[2].period = 's'; // hardcoded
      clone[2].selfGrades = self;
      scheduleData[dateName] = clone;
      return !oldEntry;
    } else {
      scheduleData[dateName] = null;
      return oldEntry;
    }
  }
}

/* FETCHING */
const SCHEDULES_CALENDAR_ID = 'u5mgb2vlddfj70d7frf3r015h0@group.calendar.google.com';
const EVENTS_CALENDAR_ID = 'u5mgb2vlddfj70d7frf3r015h0@group.calendar.google.com';
const CALENDAR_KEYWORDS = ['self', 'schedule', 'extended', 'holiday', 'no students', 'break', 'development'];

// please set this to your own if you fork Ugwisha, thanks
const GOOGLE_API_KEY = 'AIzaSyDBYs4DdIaTjYx5WDz6nfdEAftXuctZV0o';

/* ENCODING */
const selfCharOffset = 72;
const alternateRegex = /([A-GblfI-W])([\dab]{3})([\dab]{3})/g;
function decodeStoredAlternates(string = storage.getItem(SCHEDULE_DATA_KEY)) {
  const lines = string.split('|');
  const schedules = {};
  lines.forEach(m => {
    const month = String(parseInt(m[0], 36) + 1).padStart(2, '0');
    m.slice(1).split('!').forEach(d => {
      const schedule = [];
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
  return schedules;
}
function encodeStoredAlternates(schedules) {
  const schedMonths = {};
  Object.keys(schedules).forEach(day => {
    if (!schedules[day]) return;
    let [month, date] = day.split('-').map(Number);
    month = (month - 1).toString(36);
    date = date.toString(36);
    if (schedMonths[month]) schedMonths[month] += '!';
    else schedMonths[month] = month;
    schedMonths[month] += date;
    schedMonths[month] += schedules[day].map(({period, start, end, selfGrades}) => (period === 's' ? String.fromCharCode((selfGrades || defaultSelf) + selfCharOffset) : period)
        + start.toString(12).padStart(3, '0') + end.toString(12).padStart(3, '0')).join('');
  });
  return Object.values(schedMonths).join('|');
}

/* NORMAL SCHEDULE */
const normalSchedules = [
  [],
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
    {period: 's', start: 605, end: 655, selfGrades: defaultSelf},
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
  []
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
const SCHEDULE_DATA_KEY = '[ugwisha] alternates-2'; // change when new school year
let scheduleData = {};
function getSchedule(dateObj) {
  const dateName = dateObj.toISOString().slice(5, 10);
  let schedule = JSON.parse(JSON.stringify(scheduleData[dateName] || normalSchedules[dateObj.getUTCDay()]));
  if (schedule.length === 0) {
    schedule.noSchool = true;
  } else if (!options.showSELF) {
    schedule.forEach(pd => {
      if (pd.period === 's') pd.period = 'f';
    });
  }
  // split double flex
  for (let i = 0; i < schedule.length; i++) {
    const pd = schedule[i];
    if (pd.period === 'f' && pd.end - pd.start === DOUBLE_FLEX_LENGTH) {
      const flexLength = (DOUBLE_FLEX_LENGTH - PASSING_PERIOD_LENGTH) / 2;
      schedule.splice(i + 1, 0, {period: pd.period, start: pd.end - flexLength, end: pd.end});
      pd.end = pd.start + flexLength;
      i++;
    }
  }
  if (scheduleData[dateName]) {
    schedule.alternate = true;
  }
  schedule.date = dateObj;
  return schedule;
}
function saveScheduleData() {
  return encodeStoredAlternates(scheduleData);
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
const DEFAULT_FAVICON_URL = './images/logo-192.png';
const APP_NAME = 'Ugwisha';
const PERIOD_OPTION_PREFIX = '';

loadSW('/ugwisha-updater.html');
