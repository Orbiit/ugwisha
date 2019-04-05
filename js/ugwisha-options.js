const {
  /**
   * Extracts an alternate schedule (if any) from the day's events.
   * @param {ParserEvent[]} events The events of the day
   * @param {Date} dateObj The date of the day
   * @return {boolean} True if a different schedule was derived from the events
   *                   compared to previous parsings (will trigger saveScheduleData)
   */
  parseEvents,

  /**
   * Gets a schedule given a date
   * @param {Date} dateObj The date of the desired schedule
   * @return {Schedule} The schedule of that day
   */
  getSchedule,

  /**
   * Can add a small note to a period card.
   * @param {Period} periodData The period, which may contain extra data that
   *                            getNote can use to generate the note.
   * @return {?string} The note content
   */
  getNote,

  /**
   * It is expected that the schedule data is kept track of somewhere, and
   * this is an opportunity for it to save it to localStorage. The data can
   * be encoded to a more compact format.
   * @return {string} The schedule data to be stored into localStorage
   */
  saveScheduleData,

  /**
   * Allows the stored schedule data from localStorage to be put in a more
   * readable format for getSchedule to use.
   * @param {string} storedSchedules The schedule data from localStorage
   */
  prepareScheduleData,

  /**
   * The localStorage key for the schedules; it should (but doesn't have to)
   * start with '[ugwisha]' so it doesn't collide with keys from other apps
   * in the domain.
   * @type {string}
   */
  SCHEDULE_DATA_KEY,

  /**
   * The Google Calendar ID of the calendar whose events contain schedule data.
   * @type {string}
   */
  SCHEDULES_CALENDAR_ID,

  /**
   * The Google Calendar ID of the calendar whose events will be displayed in
   * Ugwisha under the "Events" section. Note that Ugwisha also tries to
   * parse events from this calendar as well.
   * @type {string}
   */
  EVENTS_CALENDAR_ID,

  /**
   * Keywords to search for when fetching events throughout the entire year;
   * this results in less events per request (but results in more requests made)
   * because there is a limit to how many events are returned from the Google
   * Calendar API.
   * @type {string[]}
   */
  CALENDAR_KEYWORDS,

  /**
   * The Google API key to use for the Google Calendar API. Please change this
   * to your own key when you fork Ugwisha.
   * @type {string}
   */
  GOOGLE_API_KEY,

  /**
   * The first day of the year in UTC in milliseconds since the UNIX epoch
   * @type {number}
   */
  FIRST_DAY,

  /**
   * The last day of the year in UTC in milliseconds since the UNIX epoch
   * @type {number}
   */
  LAST_DAY,

  /**
   * Mapping the period IDs that getSchedule returns to their default display name
   * @type {Object.<string, string>}
   */
  DEFAULT_NAMES: defaultNames,

  /**
   * Mapping the period IDs that getSchedule returns to their default colours in
   * six-digit hexadecimal format (without the hash character)
   * @type {Object.<string, string>}
   */
  DEFAULT_COLOURS: defaultColours,

  /**
   * The CSS colour of the background of a custom favicon set by setFavicon;
   * white text should at least be somewhat legible on it.
   * @type {string}
   */
  THEME_COLOUR,

  /**
   * The URL of the favicon used after school or on no school days. If you
   * change this, don't forget to also change the HTML.
   * @type {string}
   */
  DEFAULT_FAVICON_URL,

  /**
   * The tab title text content used after school or on no school days. If you
   * change this, don't forget to also change the HTML.
   * @type {string}
   */
  APP_NAME,

  /**
   * The prefix used for storing period names and colours in localStorage;
   * the options object is the same for all instances of Ugwisha on the same
   * domain, so this can be used to avoid collisions.
   * @type {string}
   */
  PERIOD_OPTION_PREFIX,

  /**
   * The URL of a page to redirect to that will redirect back to Ugwisha when
   * there's an update; this is done to kill the old service worker.
   * @type {string}
   */
  UPDATER_URL
} = window.ugwishaOptions;
