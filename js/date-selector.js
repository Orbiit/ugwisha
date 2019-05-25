const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];
const monthData = [];
const dayData = {};

/**
 * The visual height of a week in pixels
 * @type {number}
 */
const WEEK_HEIGHT = 24;

/**
 * The visual height of the calendar window in pixels
 * @type {number}
 */
const CALENDAR_HEIGHT = 6 * WEEK_HEIGHT;

let monthName, dateSelector;
let selectedMonth, selectedDay;

/**
 * Creates the day elements for each day in the school year.
 * @return {DocumentFragment} A fragment containing all the elements to be
 *                            appended to the date selector.
 */
function createDays() {
  const fragment = document.createDocumentFragment();
  const firstDay = new Date(FIRST_DAY);
  const tempDate = new Date(Date.UTC(
    firstDay.getUTCFullYear(),
    firstDay.getUTCMonth(),
    firstDay.getUTCDate() - firstDay.getUTCDay()
  ));
  let currentMonth;
  let weekNum = -1;
  while (tempDate.getTime() <= LAST_DAY) {
    const month = tempDate.getUTCMonth();
    if (tempDate.getUTCDay() === 0) weekNum++;
    if (currentMonth !== month) {
      currentMonth = month;
      const wrapper = Elem('span', {className: 'date-selector-month'});
      fragment.appendChild(wrapper);
      monthData.push({
        month,
        year: tempDate.getUTCFullYear(),
        wrapper,
        start: weekNum
      });
    }
    const entry = monthData[monthData.length - 1];
    const time = tempDate.getTime();
    const date = tempDate.getUTCDate();
    // so that if there's only a single day in the first week, it doesn't claim the entire week
    if (date <= 5) entry.start = weekNum;
    const outOfBounds = time < FIRST_DAY || time > LAST_DAY;
    const dayID = tempDate.toISOString().slice(0, 10);
    const day = Elem('span', {
      className: ['date-selector-day', outOfBounds && 'date-selector-out-of-bounds'],
      data: {
        date: dayID,
        week: weekNum
      }
    }, [date]);
    if (!outOfBounds) dayData[dayID] = day;
    entry.wrapper.appendChild(day);
    tempDate.setUTCDate(tempDate.getUTCDate() + 1);
  }
  return fragment;
}

/**
 * Gets the schedules again and updates the classes of each day element
 * accordingly.
 */
function updateDays() {
  const todayID = getToday().toISOString().slice(0, 10);
  Object.keys(dayData).forEach(dayID => {
    const day = dayData[dayID];
    const dateObj = new Date(dayID);
    const schedule = getSchedule(dateObj);
    day.classList[schedule.noSchool ? 'add' : 'remove']('date-selector-no-school');
    day.classList[schedule.alternate ? 'add' : 'remove']('date-selector-alternate');
    day.classList[dayID === todayID ? 'add' : 'remove']('date-selector-today');
  });
}

ready.push(() => {
  dateSelector = document.getElementById('date-selector');
  const daysWrapper = document.getElementById('date-selector-days');
  monthName = document.getElementById('date-selector-month-year');

  let daysCreated = false;
  let animatingScroll = false;

  function scrollTo(day, immediate = false) {
    if (animatingScroll) window.cancelAnimationFrame(animatingScroll);
    const scrollDest = Math.max(
      Math.min(
        (+day.dataset.week + 0.5) * WEEK_HEIGHT - CALENDAR_HEIGHT / 2,
        daysWrapper.scrollHeight - CALENDAR_HEIGHT
      ),
      0
    );
    if (immediate) daysWrapper.scrollTop = scrollDest;
    (function animate() {
      daysWrapper.scrollTop += (scrollDest - daysWrapper.scrollTop) / 5;
      animatingScroll = window.requestAnimationFrame(animate);
    })();
  }

  document.getElementById('date-selector-day-headings')
    .appendChild(Fragment(dayInitials.map(d =>
      Elem('span', {className: 'date-selector-day-heading', innerHTML: d}))));

  daysWrapper.addEventListener('wheel', e => {
    if (animatingScroll) window.cancelAnimationFrame(animatingScroll);
  });

  daysWrapper.addEventListener('touchstart', e => {
    if (animatingScroll) window.cancelAnimationFrame(animatingScroll);
  });

  daysWrapper.addEventListener('scroll', e => {
    const scrollPos = (daysWrapper.scrollTop + CALENDAR_HEIGHT / 2) / WEEK_HEIGHT;
    const index = monthData.findIndex(month => month.start >= scrollPos);
    const month = monthData[(~index ? index : monthData.length) - 1];
    if (month && month !== selectedMonth) {
      if (selectedMonth) {
        selectedMonth.wrapper.classList.remove('date-selector-month-selected');
      }
      selectedMonth = month;
      month.wrapper.classList.add('date-selector-month-selected');
      monthName.textContent = monthNames[month.month] + ' ' + month.year;
    }
  });

  daysWrapper.addEventListener('click', e => {
    if (
      e.target.classList.contains('date-selector-day')
      && !e.target.classList.contains('date-selector-out-of-bounds')
    ) {
      viewingDate = new Date(e.target.dataset.date);
      updateView();
      if (selectedDay) selectedDay.classList.remove('date-selector-selected');
      e.target.classList.add('date-selector-selected');
      selectedDay = e.target;
      scrollTo(e.target);
    }
  });

  daysWrapper.addEventListener('keydown', e => {
    if (e.keyCode >= 37 && e.keyCode <= 40) {
      let offset;
      switch (e.keyCode) { // arrow keys
        case 37: offset = -1; break;
        case 38: offset = -7; break;
        case 39: offset = 1; break;
        case 40: offset = 7; break;
      }
      const newDate = new Date(Date.UTC(
        viewingDate.getUTCFullYear(),
        viewingDate.getUTCMonth(),
        viewingDate.getUTCDate() + offset
      ));
      if (newDate.getTime() >= FIRST_DAY && newDate.getTime() <= LAST_DAY) {
        viewingDate = newDate;
        updateView();
        const day = dayData[newDate.toISOString().slice(0, 10)];
        if (day) {
          if (selectedDay) selectedDay.classList.remove('date-selector-selected');
          day.classList.add('date-selector-selected');
          selectedDay = day;
          scrollTo(day);
        }
      }
      e.preventDefault();
    } else if (e.keyCode === 27) { // escape
      dateSelector.classList.add('hidden');
      selectDateBtn.focus();
    }
  });

  const selectDateBtn = document.getElementById('select-date');
  selectDateBtn.addEventListener('click', e => {
    if (!daysCreated) {
      daysWrapper.appendChild(createDays());
      daysCreated = true;
    }
    updateDays();
    dateSelector.classList.remove('hidden');
    if (selectedDay) selectedDay.classList.remove('date-selector-selected');
    const day = dayData[viewingDate.toISOString().slice(0, 10)];
    if (day) {
      day.classList.add('date-selector-selected');
      selectedDay = day;
      scrollTo(day, true);
    }
    daysWrapper.focus();
    e.stopPropagation();
  });

  document.getElementById('cancel-select-date').addEventListener('click', e => {
    dateSelector.classList.add('hidden');
    selectDateBtn.focus();
  });

  document.addEventListener('click', e => {
    if (!dateSelector.classList.contains('hidden') && !dateSelector.contains(e.target)) {
      dateSelector.classList.add('hidden');
    }
  });
});
