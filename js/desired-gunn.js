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

  /**
   * @param {Array<Events>} events - array of already split events per keyword
   * @return {Array|null} - parsed schedules, or null if there is no alternate schedules
   */
  parseEvents([self, ...alts]) {
    //
  },

  /**
   * @param {Date} dateObj - date of a day within the school year (UTC)
   * @returns {Schedule} - schedule that will be displayed
   */
  getSchedule(dateObj) {
    //
  },

  /**
   * @param {String} encodedSchedules - schedule data from localStorage
   */
  loadSchedules(encodedSchedules) {
    //
  },

  /**
   * @param {Period} periodData - period
   * @returns {String|null} - the note to be displayed, or null for no note
   */
  getNote(periodData) {
    //
  }
});
document.addEventListener('DOMContentLoaded', e => {
  document.body.appendChild(gunnApp.render());
}, {once: true});
