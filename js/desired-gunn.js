/* PARSING */
const PASSING_PERIOD_LENGTH = 10;
const DOUBLE_FLEX_THRESHOLD = 80;
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
    if (!description) return null;
    description = '\n' + description.replace(HTMLnewlineRegex, '\n').replace(noHTMLRegex, '').replace(noNbspRegex, ' ');
    let periods = [];
    description.split(newLineRegex).map(str => {
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
      if (!~duplicatePeriod) {
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
      }
    });
    return periods;
  } else if (/holiday|no\sstudents|break|development/i.test(summary)) {
    if (description) return null;
    return [];
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

const gunnApp = new Ugwisha({
  app: {
    theme: '#ff5959',
    favicon: '#000000',
    faviconURL: './images/logo-192.png',
    name: 'Ugwisha'
  },
  optionPropertyPrefix: '',
  savedSchedulesKey: '[ugwisha] alternates',
  updateURL: '/ugwisha-updater.html',
  keywords: ['self', 'schedule', 'extended', 'holiday', 'no students', 'break', 'development'],
  calendarID: 'u5mgb2vlddfj70d7frf3r015h0@group.calendar.google.com',
  apiKey: 'AIzaSyDBYs4DdIaTjYx5WDz6nfdEAftXuctZV0o',
  firstDay: '2018-08-13',
  lastDay: '2019-05-31',
  defaultNames: {
    en: {
      A: 'Period A', B: 'Period B', C: 'Period C', D: 'Period D',
      E: 'Period E', F: 'Period F', G: 'Period G',
      b: 'Brunch', l: 'Lunch', f: 'Flex', s: 'SELF'
    }
  },
  defaultColours: {
    A: 'f44336', B: '3F51B5', C: 'FFEB3B', D: '795548',
    E: 'FF9800', F: '9C27B0', G: '4CAF50',
    b: null, l: null, f: '607D8B', s: '9E9E9E'
  },
  options: [
    {
      name: 'showSELF',
      label: {
        en: 'Show SELF?'
      },
      default: true
    }
  ],

  /**
   * @param {Array<Event>} events - array of already split events per keyword
   * @param {Date} dateObj - date of the schedule in UTC
   * @return {Array|null} - parsed schedules, or null if there is no alternate schedules
   */
  parseEvents([self, ...alts], dateObj) {
    let selfDay = 0;
    self.find(ev => {
      if (ev.summary.includes('SELF')) {
        let grades = 0;
        ev.summary.replace(selfGradeRegex, (_, grade) => grades += gradeToInt[grade]);
        if (grades > 0) {
          selfDay = grades || defaultSelf;
          return true;
        }
      }
    });
    let sched;
    alts.find(moreAlts => moreAlts.find(alt => {
      const schedule = parseAlternate(alt.summary, alt.description);
      if (schedule) {
        sched = schedule;
        if (schedule) {
          if (schedule.selfInSchedule) selfDay = 0;
          for (let i = 0; i < schedule.length; i++) {
            if (schedule[i].period === 'b' || schedule[i].period === 'l') {
              // remove passing period from breaks or remove those at the start/end of a day
              if (i === 0) schedule.splice(i--, 1);
              else if (i === schedule.length - 1) schedule.splice(i--, 1);
              else {
                schedule[i].end = schedule[i + 1].start - PASSING_PERIOD_LENGTH;
              }
            } else if (schedule[i].period === 'f') {
              // split double flex
              const length = schedule[i].end - schedule[i].start;
              if (selfDay) {
                schedule[i].period = 's';
                schedule[i].selfGrades = selfDay;
              }
              if (length >= DOUBLE_FLEX_THRESHOLD) {
                const flexLength = (length - PASSING_PERIOD_LENGTH) / 2;
                const newFlex = {period: 'f', start: schedule[i].end - flexLength, end: schedule[i].end};
                if (selfDay) {
                  newFlex.period = 's';
                  newFlex.selfGrades = selfDay;
                }
                schedule.splice(i + 1, 0, newFlex);
                schedule[i].end = schedule[i].start + flexLength;
                i++;
              }
            }
          }
        }
        return;
      }
    }));
    if ((selfDay !== defaultSelf || dateObj.getUTCDay() === 2) && !sched) {
      sched = JSON.parse(JSON.stringify(normalSchedules[dateObj.getUTCDay()]));
      sched.forEach(pd => {
        if (pd.period === 'f' && selfDay) {
          pd.period = 's';
          pd.selfGrades = selfDay;
        } else if (pd.period === 's' && !selfDay) {
          pd.period = 'f';
        }
      })
    }
    return sched || null;
  },

  /**
   * @param {Object|null} savedSchedule - alternate schedule
   * @param {Date} dateObj - date of a day within the school year (in UTC)
   * @param {Object} options - options that the user has
   * @returns {Schedule} - schedule that will be displayed
   */
  getSchedule(savedSchedule, dateObj, options) {
    let schedule;
    if (savedSchedule) {
      schedule = JSON.parse(JSON.stringify(savedSchedule));
      schedule.alternate = true;
    } else {
      schedule = JSON.parse(JSON.stringify(normalSchedules[dateObj.getUTCDay()]));
    }
    if (schedule.length === 0) {
      schedule.noSchool = true;
    } else if (!options.showSELF) {
      schedule.forEach(pd => {
        if (pd.period === 's') pd.period = 'f';
      });
    }
    return schedule;
  },

  /**
   * @param {Period} periodData - period
   * @param {String} lang - language the user is in
   * @returns {String|null} - the note to be displayed, or null for no note
   */
  getNote(periodData, lang) {
    return periodData.period === 's' ? 'For ' + (periodData.selfGrades || defaultSelf).toString(2).split('').reverse().map((n, i) => n === '1' ? gradeName[i] : '').filter(n => n).join(', ') : undefined;
  }
});

gunnApp.start();

document.addEventListener('DOMContentLoaded', e => {
  document.body.appendChild(gunnApp.render());
}, {once: true});
