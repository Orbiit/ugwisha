/*
 * GIVEN: getSchedule, prepareScheduleData
 * GIVES: *nothing*
 *
 * Schedule data should be an array of {period, start, end} where
 * `period` is the period ID used by periods.js for colours and names
 * and `start` and `end` are integers representing the number of minutes
 * (these objects can hold extra data).
 * The array should have a `noSchool` property if there's no school and
 * an `alternate` property if it's an alternate schedule.
 */

const firstDay = new Date(2018, 7, 13);
const lastDay = new Date(2019, 4, 31, 23, 59, 59, 999);

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
  const firstYear = firstDay.getFullYear();
  const firstMonth = firstDay.getMonth();
  const tempDate = new Date(firstYear, firstMonth, 1);
  for (const endTime = lastDay.getTime(); tempDate.getTime() < endTime; tempDate.setMonth(tempDate.getMonth() + 1)) {
    schoolMonths.push(months[tempDate.getMonth()] + ' ' + tempDate.getFullYear());
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
    else if (date % 1 !== 0) errors.push('The date is not an integer.');
    if (errors.length) {
      error.innerHTML = errors.join('<br>') + '<br>You have issues.';
    } else {
      viewingDate = new Date(Date.UTC(firstYear, firstMonth + +monthSelect.value, date));
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
