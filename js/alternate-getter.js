const EARLIEST_AM_HOUR = 6;

const HTMLnewlineRegex = /<(p|div|br).*?>|\),? *(?=[A-Z0-9])/g;
const noHTMLRegex = /<.*?>/g;
const noNbspRegex = /&nbsp;/g;
const timeGetterRegex = /\(?(1?[0-9]):([0-9]{2}) *(?:-|–) *(1?[0-9]):([0-9]{2}) *(pm)?\)?/;
const newLineRegex = /\r?\n/g;
const getPeriodLetterRegex = /\b[A-G]\b/;

function parseAlternate(summary, description) {
  if (/schedule|extended/i.test(summary)) {
    if (!description) return "/srig";
    description = "\n" + description.replace(HTMLnewlineRegex, "\n").replace(noHTMLRegex, "").replace(noNbspRegex, " ");
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
        if (period) periods.push({
          period: period,
          start: startTime,
          end: endTime
        });
      }
    });
    return periods;
  } else if (/holiday|no\sstudents|break|development/i.test(summary)) {
    return null;
  }
}

function identifyPeriod(name) {
  name = name.toUpperCase();
  if (~name.indexOf("PERIOD")) {
    let letter = getPeriodLetterRegex.exec(name);
    if (letter) return letter[0];
  }
  if (~name.indexOf("FLEX")
      || ~name.indexOf("SELF")
      || ~name.indexOf("ASSEMBL") // assembly, assemblies
      || ~name.indexOf("TUTORIAL"))
    return "f";
  else if (~name.indexOf("BRUNCH") || ~name.indexOf("BREAK")) return "b";
  else if (~name.indexOf("LUNCH") || ~name.indexOf("TURKEY")) return "l";
  else return;
}

const firstDay = '2018-08-13T00:00:00.000-07:00';
const lastDay = '2019-05-31T23:59:59.999-07:00';
const keywords = ['self', 'schedule', 'extended', 'holiday', 'no students', 'break', 'development'];
const calendarURL = 'https://www.googleapis.com/calendar/v3/calendars/'
  + encodeURIComponent('u5mgb2vlddfj70d7frf3r015h0@group.calendar.google.com')
  + '/events?singleEvents=true&fields='
  + encodeURIComponent('items(description,end(date,dateTime),start(date,dateTime),summary)')
  + '&key=AIzaSyDBYs4DdIaTjYx5WDz6nfdEAftXuctZV0o'
  + `&timeMin=${encodeURIComponent(firstDay)}&timeMax=${encodeURIComponent(lastDay)}`;

function fetchAlternates() {
  Promise.all(keywords.map(k => fetch(calendarURL + '&q=' + k).then(r => r.json()))).then(alts => {
    localStorage.setItem('[ugwisha] test.rawAlts', JSON.stringify(alts));
    alts = alts.map(({items}) => {
      const events = [];
      item.forEach(ev => {
        if (ev.start.dateTime) events.push({
          summary: ev.summary,
          description: ev.description,
          date: ev.start.dateTime.slice(5, 10)
        });
        else {
          const dateObj = new Date(ev.start.date);
          const endDate = new Date(ev.end.date).getTime();
          while (dateObj.getTime() < endDate) {
            events.push({
              summary: ev.summary,
              description: ev.description,
              date: dateObj.toISOString().slice(5, 10)
            });
            dateObj.setUTCDate(dateObj.getUTCDate() + 1);
          }
        }
      });
      return events;
    });
    const alternates = {};
    alts.slice(1).forEach(moreAlts => moreAlts.forEach(alt => alternates[alt.date] = parseAlternate(alt.summary, alt.description)));
    // TODO: deal with SELF
  });
}
