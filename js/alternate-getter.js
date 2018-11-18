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
