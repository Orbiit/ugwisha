/* PARSING */
const EARLIEST_AM_HOUR = 6;

const newlineRegex = /\r?\n/g;
const timeGetterRegex = /(1?\d):(\d\d) *(?:-|–) *(1?\d):(\d\d)/;
const getPeriodRegex = /[1-7]/;
const inFocusRegex = /in ?focus/i;
const scheduleRegex = /schedule|final|7-period/i;
const noSchoolRegex = /spring\sbreak|no\sschool/i;
const advisoryRegex = /Advisory - (.+\S)/i;

function parseAlternate(summary, description) {
  if (scheduleRegex.test(summary)) {
    if (!description) return;
    let periods = [];
    description.split(newlineRegex).map(str => {
      let times;
      const name = str.replace(timeGetterRegex, (...matches) => {
        times = matches;
        return '';
      }).trim();

      if (!times) return;
      if (name.toLowerCase().includes('passing')) return;

      let [, sH, sM, eH, eM] = times;

      sH = +sH; sM = +sM; eH = +eH; eM = +eM;
      if (sH < EARLIEST_AM_HOUR) sH += 12;
      if (eH < EARLIEST_AM_HOUR) eH += 12;
      const startTime = sH * 60 + sM,
      endTime = eH * 60 + eM;

      const duplicatePeriod = periods.findIndex(p => p.start === startTime);
      if (!~duplicatePeriod) {
        const isAdvisory = advisoryRegex.exec(name);
        const period = isAdvisory ? 'a' : identifyPeriod(name);
        const periodData = {
          period: period,
          start: startTime,
          end: endTime
        };
        if (isAdvisory) periodData.advisoryAudience = isAdvisory[1];
        if (period) periods.push(periodData);
      }
    });
    return periods;
  }
}

function identifyPeriod(name) {
  name = name.toUpperCase();
  if (name.includes('PERIOD')) {
    let letter = getPeriodRegex.exec(name);
    if (letter) return letter[0];
  }
  if (name.includes('TUTORIAL')) return 't';
  else if (name.includes('BRUNCH')) return 'b';
  else if (name.includes('LUNCH')) return 'l';
  else if (inFocusRegex.test(name)) return 'i';
  else return;
}

/* FETCHING */
const keywords = ['schedule', 'finals', '7-period day'];
const calendarURL = 'https://www.googleapis.com/calendar/v3/calendars/'
  + encodeURIComponent('palycalendar@gmail.com')
  + '/events?singleEvents=true&fields='
  + encodeURIComponent('items(description,end(date,dateTime),start(date,dateTime),summary)')
  + '&key=AIzaSyDBYs4DdIaTjYx5WDz6nfdEAftXuctZV0o'
  + `&timeMin=${encodeURIComponent(eventsMinDate.toISOString())}&timeMax=${encodeURIComponent(eventsMaxDate.toISOString())}`;

function parseEvents(events) {
  const alts = events.map(splitEvents);
  const schedules = {};
  alts.forEach(moreAlts => moreAlts.forEach(alt => {
    const schedule = parseAlternate(alt.summary, alt.description);
    if (schedule !== undefined) {
      schedules[alt.date] = schedule;
    }
  }));
  return {
    lastGenerated: new Date(),
    schedules: schedules
  };
}
function fetchAlternates() {
  altFetchBtn.disabled = true;
  return Promise.all(keywords.map(k => fetch(calendarURL + '&q=' + k).then(r => r.json()))).then(alts => {
    scheduleData = parseEvents(alts);
    return fetch(calendarURL + '&q=advisory');
  }).then(r => r.json()).then(({items}) => {
    items.forEach(adv => {
      if (!adv.start.dateTime) return;
      const exec = advisoryRegex.exec(adv.summary);
      const schedule = scheduleData.schedules[adv.start.dateTime.slice(5, 10)];
      if (exec && schedule) {
        schedule.forEach(pd => {
          if (pd.period === 't') {
            pd.period = 'a';
            pd.advisoryAudience = exec[1];
          } else if (pd.period === 'a') {
            pd.advisoryAudience += ', ' + exec[1];
          }
        });
      }
    });
    storage.setItem(SCHEDULE_DATA_KEY, encodeStoredAlternates(scheduleData));
    altFetchBtn.disabled = false;
  });
}

/* ENCODING */
const periodRegex = /([1-7blit]|a[a-z])(\w\w)(\w\w)/g;
const oddDayEncoded = '1dwgebgogt3gtjbljbk55kfmximxn77nhpz';
const evenDayEncoded = '2dwgebgogt4gtjbljbk56kfmximxn7tnhoq';
const advisoryDayRegex = /^2dwgebgogt4gtjbljbk56kfmximxn7a([a-z])nhoq$/;
function decodeStoredAlternates(string) {
  const dates = string.split('>');
  const lastGeneratedDate = new Date(Date.UTC(+dates[0].slice(0, 4), parseInt(dates[0][4], 36), parseInt(dates[0][5], 36)));
  const advisoryAudiences = {};
  dates[0].slice(6).split('^').forEach((note, i) => {
    advisoryAudiences[String.fromCharCode(97 + i)] = note;
  });
  const schedules = {};
  for (let i = 0; i < dates[1].length; i += 2)
    dates.push(dates[1].slice(i, i + 2) + oddDayEncoded);
  for (let i = 0; i < dates[2].length; i += 2)
    dates.push(dates[2].slice(i, i + 2) + evenDayEncoded);
  for (let i = 0; i < dates[3].length; i += 3)
    dates.push(dates[3].slice(i, i + 2) + `2dwgebgogt4gtjbljbk56kfmximxn7a${dates[3][i + 2]}nhoq`);
  dates.slice(4).forEach(date => {
    const dateStr = parseInt(date[0], 36).toString().padStart(2, '0') + '-' + parseInt(date[1], 36).toString().padStart(2, '0');
    const periods = [];
    if (date[2] === '-') date = oddDayEncoded;
    else if (date[2] === '_') date = evenDayEncoded;
    else date = date.slice(2);
    date.replace(periodRegex, (m, period, start, end) => {
      const pd = {
        period: period[0],
        start: parseInt(start, 36),
        end: parseInt(end, 36)
      };
      if (period[0] === 'a')
        pd.advisoryAudience = advisoryAudiences[period[1]];
      periods.push(pd);
    });
    schedules[dateStr] = periods;
  });
  return {
    lastGenerated: lastGeneratedDate,
    schedules: schedules
  };
}
function encodeStoredAlternates({lastGenerated, schedules}) {
  lastGenerated = lastGenerated.getUTCFullYear() + lastGenerated.getUTCMonth().toString(36) + lastGenerated.getUTCDate().toString(36);
  const advisoryAudiences = [];
  let oddDays = '', evenDays = '', advisoryDays = '';
  schedules = Object.keys(schedules).map(date => {
    const dateStr = parseInt(date.slice(0, 2)).toString(36) + parseInt(date.slice(3, 5)).toString(36);
    const periods = schedules[date].map(({period, start, end, advisoryAudience}) => {
      if (period === 'a') {
        const index = advisoryAudiences.indexOf(advisoryAudience);
        if (~index) period += String.fromCharCode(index + 97);
        else {
          period += String.fromCharCode(advisoryAudiences.push(advisoryAudience) + 97);
        }
      }
      return period + start.toString(36).padStart(2, '0') + end.toString(36).padStart(2, '0');
    }).join('');
    const advisory = advisoryDayRegex.exec(periods);
    if (advisory) advisoryDays += dateStr + advisory[1];
    else if (periods === oddDayEncoded) oddDays += dateStr;
    else if (periods === evenDayEncoded) evenDays += dateStr;
    else return dateStr + periods;
    return '';
  }).filter(a => a).join('>');
  return lastGenerated + advisoryAudiences.join('^') + `>${oddDays}>${evenDays}>${advisoryDays}>` + schedules;
}

/* DEFAULTS */
const defaultNames = {
  1: 'Period 1', 2: 'Period 2', 3: 'Period 3', 4: 'Period 4',
  5: 'Period 5', 6: 'Period 6', 7: 'Period 7',
  b: 'Brunch', l: 'Lunch', i: 'InFocus', a: 'Advisory', t: 'Tutorial'
};
const defaultColours = {
  1: '3F51B5', 2: '8BC34A', 3: 'FFEB3B', 4: '9C27B0',
  5: '673AB7', 6: 'FFC107', 7: 'E91E63',
  b: null, l: null, i: '009688', a: 'f44336', t: '2196F3'
};

/* GET SCHEDULE */
const SCHEDULE_DATA_KEY = '[ugwisha] paly.alternates';
let scheduleData;
function getSchedule(dateObj) {
  const string = dateObj.toISOString().slice(5, 10);
  const schedule = scheduleData.schedules[string];
  if (schedule !== undefined && schedule !== null) {
    const clone = JSON.parse(JSON.stringify(schedule));
    clone.date = dateObj;
    return clone;
  } else {
    return { noSchool: true, date: dateObj };
  }
}
function prepareScheduleData(storedSchedules) {
  scheduleData = decodeStoredAlternates(storedSchedules);
}

/* PERIOD CARD NOTES */
function getNote(periodData) {
  return periodData.advisoryAudience;
}

/* THEME */
const THEME_COLOUR = '#2D5727';
const FAVICON_BACK_COLOUR = '#ffffff';
const DEFAULT_FAVICON_URL = './images/logo-paly-192.png';
const APP_NAME = 'Upwisha';
const PERIOD_OPTION_PREFIX = 'paly_';

loadSW('/ugwisha-paly-updater.html');
