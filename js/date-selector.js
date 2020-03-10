/**
 * CSS class name for day elements in the date selector.
 * @type {string}
 */
const DAY_ELEM_CLASSNAME = 'date-selector-day'

const MIN_MONTH = (d => d.getUTCFullYear() * 12 + d.getUTCMonth())(new Date(FIRST_DAY))
const MAX_MONTH = (d => d.getUTCFullYear() * 12 + d.getUTCMonth())(new Date(LAST_DAY))

const dayElems = document.createDocumentFragment()
const dayData = []
for (let week = 0; week < 6; week++) {
  const weekWrapper = Elem('div', { className: 'date-selector-week' })
  for (let day = 0; day < 7; day++) {
    const dayElem = Elem('div')
    dayData.push(dayElem)
    weekWrapper.appendChild(dayElem)
  }
  dayElems.appendChild(weekWrapper)
}

let dateMap // maps day element to Date
let viewingMonth
function renderMonth (month = viewingDate.getUTCFullYear() * 12 + viewingDate.getUTCMonth()) {
  viewingMonth = month
  dateMap = new Map()
  const today = getToday().getTime()
  const selected = viewingDate.getTime()
  const tempDate = new Date(Date.UTC(
    Math.floor(month / 12),
    month % 12,
    1
  ))
  let day = tempDate.getUTCDay()

  monthName.textContent = months[month % 12] + ' ' + Math.floor(month / 12)
  prevMonth.disabled = month <= MIN_MONTH
  nextMonth.disabled = month >= MAX_MONTH

  // clear first few days
  for (let d = 0; d < day; d++) {
    dayData[d].className = DAY_ELEM_CLASSNAME + ' date-selector-out-of-bounds'
  }

  do {
    const dayElem = dayData[day]
    const schedule = getSchedule(tempDate)
    const time = tempDate.getTime()
    dateMap.set(dayElem, new Date(tempDate))
    dayElem.textContent = tempDate.getUTCDate()

    dayElem.className = DAY_ELEM_CLASSNAME
    if (schedule.noSchool) dayElem.classList.add('date-selector-no-school')
    if (schedule.alternate) dayElem.classList.add('date-selector-alternate')
    if (time === today) dayElem.classList.add('date-selector-today')
    if (time === selected) dayElem.classList.add('date-selector-selected')

    tempDate.setUTCDate(tempDate.getUTCDate() + 1)
    day++
  } while (tempDate.getUTCDate() !== 1)

  for (let d = day; d < dayData.length; d++) {
    dayData[d].className = DAY_ELEM_CLASSNAME + ' date-selector-out-of-bounds'
  }
}

let monthName, prevMonth, nextMonth
ready.push(() => {
  const dateSelector = document.getElementById('date-selector')
  const daysWrapper = document.getElementById('date-selector-days')
  const selectDateBtn = document.getElementById('select-date')
  monthName = document.getElementById('date-selector-month-year')
  prevMonth = document.getElementById('prev-month')
  nextMonth = document.getElementById('next-month')
  daysWrapper.appendChild(dayElems)

  document.getElementById('date-selector-day-headings')
    .appendChild(Fragment(dayInitials.map(d =>
      Elem('span', { className: 'date-selector-day-heading' }, [d]))))

  daysWrapper.addEventListener('click', e => {
    const date = dateMap.get(e.target)
    if (date) {
      viewingDate = date
      updateView()
    }
  })

  daysWrapper.addEventListener('keydown', e => {
    if (e.keyCode >= 37 && e.keyCode <= 40) {
      let offset
      switch (e.keyCode) { // arrow keys
        case 37: offset = -1; break
        case 38: offset = -7; break
        case 39: offset = 1; break
        case 40: offset = 7; break
      }
      const newDate = new Date(Date.UTC(
        viewingDate.getUTCFullYear(),
        viewingDate.getUTCMonth(),
        viewingDate.getUTCDate() + offset
      ))
      if (newDate.getTime() >= FIRST_DAY && newDate.getTime() <= LAST_DAY) {
        viewingDate = newDate
        updateView()
      }
      e.preventDefault()
    } else if (e.keyCode === 27) { // escape
      canHide = true
      dateSelector.classList.add('disappear')
      selectDateBtn.focus()
    }
  })

  prevMonth.addEventListener('click', e => {
    renderMonth(viewingMonth - 1)
  })

  nextMonth.addEventListener('click', e => {
    renderMonth(viewingMonth + 1)
  })

  selectDateBtn.addEventListener('click', e => {
    canHide = false
    dateSelector.classList.remove('hidden')
    dateSelector.classList.remove('disappear')
    daysWrapper.focus()
    e.stopPropagation()
  })

  document.getElementById('cancel-select-date').addEventListener('click', e => {
    canHide = true
    dateSelector.classList.add('disappear')
    selectDateBtn.focus()
  })

  document.addEventListener('click', e => {
    if (!dateSelector.classList.contains('hidden') && !dateSelector.contains(e.target)) {
      canHide = true
      dateSelector.classList.add('disappear')
    }
  })

  let canHide = false
  dateSelector.addEventListener('transitionend', e => {
    if (canHide) dateSelector.classList.add('hidden')
  })
})
