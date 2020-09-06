// Dances with Google Calendar API

// DAY EVENTS

/**
 * Cache of events
 * @type {Object}
 */
const events = {};

/**
 * Google Calendar API URL for fetching daily events
 * @return {string}
 */
function getGCalEventsURL ({
  calendarID = EVENTS_CALENDAR_ID,
  apiKey = GOOGLE_API_KEY,
  timeMin,
  timeMax
}) {
  return 'https://www.googleapis.com/calendar/v3/calendars/'
    + encodeURIComponent(calendarID)
    + '/events?singleEvents=true&fields='
    + encodeURIComponent('items(description,end(date,dateTime),location,start(date,dateTime),summary)')
    + '&key=' + apiKey
    + '&timeMin=' + encodeURIComponent(timeMin)
    + '&timeMax=' + encodeURIComponent(timeMax)
    + '&timeZone=America/Los_Angeles';
}

/**
 * Converts a Date object to minutes in local time
 * @param {Date} dateObj Date object to convert
 * @return {number} Minutes since the beginning of the day
 */
function dateObjToMinutes(dateObj) {
  return dateObj.getHours() * 60 + dateObj.getMinutes();
}

/**
 * Adds days to a new Date object
 * @param {Date} dateObj Date to add to
 * @param {number} [offset=0] Days to add
 * @return {Date} A new Date object with the added days
 */
function toLocalTime(dateObj, offset = 0) {
  return new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate() + offset);
}

/**
 * removes the style attribute from HTML
 * @param {string} html HTML string to filter
 * @return {string} Filtered HTML
 */
function removeDumbHTML(html) {
  return html.replace(/(<.*?) style=(?:"[^"]*"|\S*)(.*?>)/g, '$1$2');
}

/**
 * If not yet cached, fetches the events, then displays them and resolves.
 * @async
 */
async function renderEvents() {
  if (options.showEvents) {
    const dateName = viewingDate.toISOString().slice(0, 10);
    eventsList.innerHTML = `<span class="events-message">Loading...</span>`;
    if (!events[dateName]) {
      const {items} = await fetch(getGCalEventsURL({
        timeMin: toLocalTime(viewingDate).toISOString(),
        timeMax: toLocalTime(viewingDate, 1).toISOString()
      }))
        .then(r => r.json())
        .catch(() => ({items: null}));
      if (!items) {
        eventsList.innerHTML = `<span class="events-message">Unable to fetch events.</span>`;
        return;
      }
      events[dateName] = items;
      if (parseEvents(splitEvents({items}), viewingDate)) {
        storage.setItem(SCHEDULE_DATA_KEY, saveScheduleData());
        renderSchedule();
        todayDate = null;
        updateStatus();
      }
    }
    empty(eventsList);
    eventsList.appendChild(events[dateName].length ? Fragment(events[dateName].map(event => Elem('div', {className: 'event'}, [
      Elem('span', {className: 'event-name'}, [event.summary]),
      Elem('span', {className: 'event-info'}, [
        event.start && event.start.dateTime ? Elem('span', {
          className: 'event-time',
          innerHTML: formatTime(dateObjToMinutes(new Date(event.start.dateTime))) + ' &ndash; ' + formatTime(dateObjToMinutes(new Date(event.end.dateTime)))
        }) : null,
        event.location ? Elem('span', {className: 'event-location'}, [event.location]) : null
      ]),
      event.description ? Elem('span', {
        className: 'event-description',
        innerHTML: removeDumbHTML(event.description)
      }) : null
    ]))) : Elem('span', {className: 'events-message'}, ['Nothing happening today']));
  }
}

// ALTERNATE SCHEDULE EVENTS

const eventsMinDate = new Date(FIRST_DAY + 25200000); // TODO: what do these numbers mean??
const eventsMaxDate = new Date(LAST_DAY + 111599999); // also adds a day - 1 to include last day (uh what?)

/**
 * Google Calendar API URL for fetching alternate schedule events throughout
 * the school year
 * @type {string}
 */
const gCalYearURL = 'https://www.googleapis.com/calendar/v3/calendars/'
  + encodeURIComponent(SCHEDULES_CALENDAR_ID)
  + '/events?singleEvents=true&fields='
  + encodeURIComponent('items(description,end(date,dateTime),start(date,dateTime),summary)')
  + '&key=' + GOOGLE_API_KEY
  + '&timeMin=' + encodeURIComponent(eventsMinDate.toISOString())
  + '&timeMax=' + encodeURIComponent(eventsMaxDate.toISOString())
  + '&timeZone=America/Los_Angeles';

/**
 * Fetches, parses, and stores the alternate schedule
 * @async
 */
function fetchEvents() {
  altFetchBtn.disabled = true;
  return Promise.all(CALENDAR_KEYWORDS.map(k => fetch(gCalYearURL + '&q=' + k).then(r => r.json()))).then(eventData => {
    // assign each event to its day
    const events = {};
    eventData.map(splitEvents).forEach(data => data.forEach(event => {
      if (!events[event.date]) events[event.date] = [];
      events[event.date].push(event);
    }));

    // parse events per day
    const dateObj = new Date(FIRST_DAY);
    const endDate = LAST_DAY;
    while (dateObj.getTime() <= endDate) {
      parseEvents(events[dateObj.toISOString().slice(0, 10)] || [], dateObj);
      dateObj.setUTCDate(dateObj.getUTCDate() + 1);
    }

    storage.setItem(SCHEDULE_DATA_KEY, saveScheduleData());
    altFetchBtn.disabled = false;
  });
}

/**
 * An event object from the Google Calendar API
 * @typedef {object} GoogleEvent
 * @property {?string} summary The title of the event
 * @property {?string} description The description of the event
 * @property {?string} location A description of the location of the event
 * @property {object} start The start time and date
 * @property {?string} start.date The start date in YYYY-MM-DD format
 * @property {?string} start.dateTime The start time in ISO 8601 format
 * @property {object} end The end time and date; same properties as start
 */

/**
 * A GoogleEvent can span multiple days and the date and dateTime properties
 * are messy; the parser would like to deal with something more friendly.
 * splitEvents splits a GoogleEvent into multiple ParserEvents so they can each
 * be individually parsed.
 * @typedef {object} ParserEvent
 * @property {string} summary The title of the event
 * @property {?string} description The description of the event
 * @property {string} date The date of the event
 */

/**
 * Splits events spanning multiple days into multiple single-day events
 * @param {Object} events JSON returned from the Google Calendar API
 * @param {GoogleEvent[]} events.items the actual event objects
 * @return {ParserEvent[]} the simplified event objects
 */
function splitEvents({items}) {
  const events = [];
  items.forEach(ev => {
    if (ev.start.dateTime) events.push({
      summary: ev.summary,
      description: ev.description,
      date: ev.start.dateTime.slice(0, 10)
    });
    else {
      const dateObj = new Date(ev.start.date);
      const endDate = new Date(ev.end.date).getTime();
      while (dateObj.getTime() < endDate) {
        events.push({
          summary: ev.summary,
          description: ev.description,
          date: dateObj.toISOString().slice(0, 10)
        });
        dateObj.setUTCDate(dateObj.getUTCDate() + 1);
      }
    }
  });
  return events;
}

let eventsList, altFetchBtn;
let fetchedAlts = false; // used by PSA [REFETCH] feature
ready.push(async () => {
  eventsList = document.getElementById('events');
  altFetchBtn = document.getElementById('fetch-alts');
  altFetchBtn.addEventListener('click', e => {
    fetchedAlts = true;
    fetchEvents().then(renderSchedule);
  });

  onconnection.push(online => {
    if (!online) altFetchBtn.disabled = true;
  });

  if (params['get-alts'] || !storage.getItem(SCHEDULE_DATA_KEY)) {
    fetchedAlts = true;
    await fetchEvents();
    if (params.then) return window.location.replace(params.then);
    todayDate = null;
  }
  prepareScheduleData(storage.getItem(SCHEDULE_DATA_KEY));
  await Promise.resolve();
  updateView();
  updateStatus(true, 0);
});
