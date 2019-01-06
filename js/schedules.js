/*
 * GIVEN: getSchedule, prepareScheduleData
 * GIVES: splitEvents, firstDay, eventsMinDate, eventsMaxDate
 *
 * SCHEDULES.js
 * used to generate schedules
 *
 * Schedule data should be an array of {period, start, end} where
 * `period` is the period ID used by periods.js for colours and names
 * and `start` and `end` are integers representing the number of minutes
 * (these objects can hold extra data).
 * The array should have a `noSchool` property if there's no school and
 * an `alternate` property if it's an alternate schedule.
 */

const firstDay = new Date(Date.UTC(2018, 7, 13));
const lastDay = new Date(Date.UTC(2019, 4, 31));

const eventsMinDate = new Date(firstDay.getTime() + 25200000);
const eventsMaxDate = new Date(lastDay.getTime() + 111599999); // also adds a day - 1 to include last day

function splitEvents({items}) {
  const events = [];
  items.forEach(ev => {
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
}

const months = 'jan. feb. mar. apr. may jun. jul. aug. sept. oct. nov. dec.'.split(' ');
const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
let dateElem, dayElem, altFetchBtn;
function updateView() {
  setSchedule(getSchedule(viewingDate));
  dateElem.innerHTML = months[viewingDate.getUTCMonth()] + ' ' + viewingDate.getUTCDate();
  dayElem.innerHTML = days[viewingDate.getUTCDay()];
}
ready.push(async () => {
  const dateSelector = document.getElementById('date-selector');
  const monthSelect = document.getElementById('months');
  const dateSelect = document.getElementById('date-input');
  const actualDateSelect = document.getElementById('actually-select-date');
  const error = document.getElementById('error');
  const cancelBtn = document.getElementById('cancel-select-date');
  const schoolMonths = [];
  const firstYear = firstDay.getUTCFullYear();
  const firstMonth = firstDay.getUTCMonth();
  const tempDate = new Date(Date.UTC(firstYear, firstMonth, 1));
  for (const endTime = lastDay.getTime(); tempDate.getTime() <= endTime; tempDate.setUTCMonth(tempDate.getUTCMonth() + 1)) {
    schoolMonths.push(months[tempDate.getUTCMonth()] + ' ' + tempDate.getUTCFullYear());
  }
  monthSelect.appendChild(createFragment(schoolMonths.map((m, i) => createElement('option', { attributes: { value: i }, html: m }))));
  document.getElementById('select-date').addEventListener('click', e => {
    dateSelector.classList.remove('hidden');
    monthSelect.value = 'CHOOSE';
    monthSelect.disabled = false;
    dateSelect.disabled = true;
    actualDateSelect.disabled = true;
    error.innerHTML = '';
    dateSelect.value = '';
  });
  monthSelect.addEventListener('change', e => {
    monthSelect.disabled = true;
    dateSelect.disabled = false;
    actualDateSelect.disabled = false;
    dateSelect.focus();
  });
  cancelBtn.addEventListener('click', e => {
    dateSelector.classList.add('hidden');
    monthSelect.disabled = true;
    dateSelect.disabled = true;
    actualDateSelect.disabled = true;
  });
  actualDateSelect.addEventListener('click', e => {
    const errors = [];
    if (monthSelect.value === 'CHOOSE') errors.push('You did not choose a month.');
    const date = +dateSelect.value;
    if (isNaN(date)) errors.push('The date is not a number.');
    if (date % 1 !== 0) errors.push('The date is not an integer.');
    const dateObj = new Date(Date.UTC(firstYear, firstMonth + +monthSelect.value, date));
    if (dateObj.getTime() < firstDay.getTime() || dateObj.getTime() > lastDay.getTime())
      errors.push('The date is not during the school year.');
    if (errors.length) {
      error.innerHTML = errors.join('<br>') + '<br>You have issues.';
    } else {
      viewingDate = dateObj;
      updateView();
      cancelBtn.click();
    }
  });
  dateElem = document.getElementById('date');
  dayElem = document.getElementById('weekday');
  altFetchBtn = document.getElementById('fetch-alts');
  if (params['get-alts'] || !localStorage.getItem(SCHEDULE_DATA_KEY)) {
    await fetchAlternates();
    if (params.then) window.location.replace(params.then);
  }
  prepareScheduleData(localStorage.getItem(SCHEDULE_DATA_KEY));
  updateView();
  altFetchBtn.addEventListener('click', async e => {
    await fetchAlternates();
    updateView();
  });
});
