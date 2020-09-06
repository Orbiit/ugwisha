(() => {

/* PARSING */
const EARLIEST_AM_HOUR = 6;
const PASSING_PERIOD_LENGTH = 10;
const DOUBLE_FLEX_LENGTH = 80; // longer flex might not be double - see 2018-10-10

const HTMLnewlineRegex = /<\/?(p|div|br).*?>|\),? *(?=[A-Z0-9])/g;
const noHTMLRegex = /<.*?>/g;
const noNbspRegex = /&nbsp;/g;
const timeGetterRegex = /\(?(1?[0-9])(?::([0-9]{2}))? *(?:am)? *(?:-|–) *(1?[0-9])(?::([0-9]{2}))? *(noon|pm)?\)?/;
const newLineRegex = /\r?\n/g;
// Detect PeriodE etc (2020-03-31)
const getPeriodLetterRegex = /(?:\b|PERIOD)([A-G1-7])\b/;
const selfGradeRegex = /(1?[9012](?:\s*-\s*1?[9012])?)(?:th)?|(freshmen|sophomore|junior|senior|all)/gi;
const periodSelfGradeRegex = /self for (.+?) grade|self for (freshmen|sophomore|junior|senior|all)/gi;
const gradeToInt = {'9': 1, '10': 2, '11': 4, '12': 8, freshmen: 1, sophomore: 2, junior: 4, senior: 8, all: 15};
const defaultSelf = 0b1111;

function getSELFGrades(text) {
  let grades = 0;
  text.replace(selfGradeRegex, (match, grade) => {
    if (grade && grade.includes('-')) {
      const [start, finish] = grade.split('-').map(Number);
      for (let i = start; i <= finish; i++) {
        grades += gradeToInt[i];
      }
    } else {
      grades += gradeToInt[grade || match] || 0;
    }
  });
  return grades;
}

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

      let [, sH, sM = 0, eH, eM = 0, pm] = times;

      sH = +sH; sM = +sM; eH = +eH; eM = +eM;
      if (sH < EARLIEST_AM_HOUR || pm === 'pm') sH += 12;
      if (eH < EARLIEST_AM_HOUR || pm === 'pm') eH += 12;
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
          if (beforePart - startTime > 0) {
            endTime = beforePart;
          } else if (endTime - beforePart > 0) {
            startTime = beforePart;
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
          pd.selfGrades = getSELFGrades(selfSlice[1] || selfSlice[2]) || defaultSelf;
        } else {
          pd.selfGrades = defaultSelf;
        }
      }
      delete pd.raw;
      return period;
    }).sort((a, b) => a.start - b.start);
  } else if (/holiday|no\s(students|school)|break|development/i.test(summary)) {
    if (description) return;
    return null;
  }
}

function identifyPeriod(name) {
  name = name.toUpperCase();
  if (~name.indexOf('PERIOD')) {
    let letter = getPeriodLetterRegex.exec(name);
    if (letter) {
      return isNaN(+letter[1])
        ? // Letter period
          letter[1]
        : // Number period
          ' ABCDEFG'[letter[1]];
    }
  }
  if (~name.indexOf('SELF')) return 's';
  // Ignore staff classes (for now); should be before flex so that
  // "Staff Meeting, CAASPP training for all" (2020-03-11) isn't interpreted
  // as flex
  else if (~name.indexOf('STAFF') || ~name.indexOf('MEETING')) return;
  else if (~name.indexOf('FLEX')
      || ~name.indexOf('ASSEMBL') // assembly, assemblies
      || ~name.indexOf('ATTEND') // HACK to detect PSAT day (2018-10-10)
      || ~name.indexOf('TUTORIAL')
      || ~name.indexOf('CAASPP')) // CAASPP week (2020-03-17 ish)
    return 'f';
  else if (~name.indexOf('BRUNCH') || ~name.indexOf('BREAK')) return 'b';
  // 'UNCH' intentional - misspelling on 2019-03-26
  else if (~name.indexOf('UNCH') || ~name.indexOf('TURKEY')) return 'l';
  else if (~name.indexOf('TOGETHER')) return 'g';
  else return name;
}

function parseEvents(events, dateObj) {
  const dateName = dateObj.toISOString().slice(5, 10);
  const weekDay = dateObj.getUTCDay();
  const oldEntry = scheduleData[dateName];
  let self, alternate, overrideSELF = false;
  // duplicate events happen infrequently; they're not a concern
  events.forEach(({summary = '', description}) => {
    if (summary.includes('SELF') && summary.includes('grade')) {
      const grades = getSELFGrades(summary);
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
    /*
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
    } else { */
      scheduleData[dateName] = null;
      return oldEntry;
    // }
  }
}

/* ENCODING */
const selfCharOffset = 72;
const alternateRegex = /([A-GblfgI-W])([\dab]{3})([\dab]{3})/g;
function decodeStoredAlternates(string) {
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
    schedMonths[month] += schedules[day].map(({period, start, end, selfGrades}) => {
      if (period.length !== 1) return '';
      else return (period === 's' ? String.fromCharCode((selfGrades || defaultSelf) + selfCharOffset) : period)
        + start.toString(12).padStart(3, '0') + end.toString(12).padStart(3, '0')
    }).join('');
  });
  return Object.values(schedMonths).join('|');
}

/* NORMAL SCHEDULE */
const normalSchedules = [
  [],
  [
    {period: 'A', start: 10 * 60 + 0, end: 10 * 60 + 30},
    {period: 'B', start: 10 * 60 + 40, end: 11 * 60 + 10},
    {period: 'C', start: 11 * 60 + 20, end: 11 * 60 + 50},
    {period: 'D', start: 12 * 60 + 0, end: 12 * 60 + 35},
    {period: 'l', start: 12 * 60 + 35, end: 13 * 60 + 5},
    {period: 'E', start: 13 * 60 + 15, end: 13 * 60 + 45},
    {period: 'F', start: 13 * 60 + 55, end: 14 * 60 + 25},
    {period: 'G', start: 14 * 60 + 35, end: 15 * 60 + 5}
  ],
  [
    {period: 'A', start: 9 * 60 + 0, end: 10 * 60 + 15},
    {period: 'B', start: 10 * 60 + 25, end: 11 * 60 + 40},
    {period: 'l', start: 11 * 60 + 40, end: 12 * 60 + 10},
    {period: 'C', start: 12 * 60 + 20, end: 13 * 60 + 40},
    {period: 'D', start: 13 * 60 + 50, end: 15 * 60 + 5},
    {period: 'f', start: 15 * 60 + 10, end: 15 * 60 + 40}
  ],
  [
    {period: 'E', start: 9 * 60 + 40, end: 10 * 60 + 55},
    {period: 'g', start: 11 * 60 + 5, end: 11 * 60 + 40},
    {period: 'l', start: 11 * 60 + 40, end: 12 * 60 + 10},
    {period: 'F', start: 12 * 60 + 20, end: 13 * 60 + 40},
    {period: 'G', start: 13 * 60 + 50, end: 15 * 60 + 5},
    {period: 'f', start: 15 * 60 + 10, end: 15 * 60 + 40}
  ],
  [
    {period: 'A', start: 9 * 60 + 0, end: 10 * 60 + 15},
    {period: 'B', start: 10 * 60 + 25, end: 11 * 60 + 40},
    {period: 'l', start: 11 * 60 + 40, end: 12 * 60 + 10},
    {period: 'C', start: 12 * 60 + 20, end: 13 * 60 + 40},
    {period: 'D', start: 13 * 60 + 50, end: 15 * 60 + 5},
    {period: 'f', start: 15 * 60 + 10, end: 15 * 60 + 40}
  ],
  [
    {period: 'E', start: 9 * 60 + 40, end: 10 * 60 + 55},
    {period: 's', start: 11 * 60 + 5, end: 11 * 60 + 40, selfGrades: defaultSelf},
    {period: 'l', start: 11 * 60 + 40, end: 12 * 60 + 10},
    {period: 'F', start: 12 * 60 + 20, end: 13 * 60 + 40},
    {period: 'G', start: 13 * 60 + 50, end: 15 * 60 + 5}
  ],
  []
];

/* GET SCHEDULE */
const FIRST_DAY = Date.UTC(2020, 7, 17);
const LAST_DAY = Date.UTC(2021, 5, 3);
let scheduleData = {};
function getSchedule(dateObj) {
  if (dateObj.getTime() < FIRST_DAY || dateObj.getTime() > LAST_DAY) {
    const schedule = [];
    schedule.noSchool = true;
    schedule.summer = true;
    schedule.date = dateObj;
    return schedule;
  }
  const dateName = dateObj.toISOString().slice(5, 10);
  let schedule = JSON.parse(JSON.stringify(
    scheduleData[dateName] || normalSchedules[dateObj.getUTCDay()],
    (_, value) => typeof value === 'function' ? value(dateObj) : value
  ));
  if (schedule.length === 0) {
    schedule.noSchool = true;
  } else if (!options.showSELF) {
    schedule.forEach(pd => {
      if (pd.period === 's') pd.period = 'f';
    });
  }
  if (scheduleData[dateName]) {
    schedule.alternate = true;
  }
  schedule.date = dateObj;
  return schedule;
}

/* PERIOD CARD NOTES */
const gradeName = ['freshmen', 'sophomores', 'juniors', 'seniors'];
function getNote(periodData) {
  return periodData.period === 's' ? 'For ' + (periodData.selfGrades || defaultSelf).toString(2).split('').reverse().map((n, i) => n === '1' ? gradeName[i] : '').filter(n => n).join(', ') : null;
}

window.ugwishaOptions = {
  parseEvents,
  getSchedule,
  getNote,
  saveScheduleData() {
    return encodeStoredAlternates(scheduleData);
  },
  prepareScheduleData(storedSchedules) {
    scheduleData = decodeStoredAlternates(storedSchedules);
  },

  SCHEDULE_DATA_KEY: '[ugwisha] alternates-2020-21-v2', // change when new school year

  /* FETCHING */
  SCHEDULES_CALENDAR_ID: 'fg978mo762lqm6get2ubiab0mk0f6m2c@import.calendar.google.com',
  EVENTS_CALENDAR_ID: 'fg978mo762lqm6get2ubiab0mk0f6m2c@import.calendar.google.com',
  CALENDAR_KEYWORDS: ['self', 'schedule', 'extended', 'holiday', 'no students', 'no school', 'break', 'development'],

  // please set this to your own if you fork Ugwisha, thanks
  GOOGLE_API_KEY: 'AIzaSyDBYs4DdIaTjYx5WDz6nfdEAftXuctZV0o',

  FIRST_DAY, LAST_DAY,

  /* DEFAULTS */
  DEFAULT_NAMES: {
    A: 'Period 1', B: 'Period 2', C: 'Period 3', D: 'Period 4',
    E: 'Period 5', F: 'Period 6', G: 'Period 7',
    b: 'Brunch', l: 'Lunch', f: 'Tutorial', s: 'SELF', g: 'Gunn Together'
  },
  DEFAULT_COLOURS: {
    A: 'de935f', B: '81a2be', C: 'cc6666', D: 'f0c674',
    E: 'b294bb', F: 'b5bd68', G: '8abeb7',
    b: null, l: null, f: 'e0e0e0', s: '282a2e', g: '282a2e'
  },

  /* THEME */
  THEME_COLOUR: '#ff5959',
  DEFAULT_FAVICON_URL: './images/logo/192.png',
  APP_NAME: 'Ugwisha',
  PERIOD_OPTION_PREFIX: '',
  UPDATER_URL: '/ugwisha-updater.html'
};

})();
