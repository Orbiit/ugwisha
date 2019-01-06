/* localStorage workaround */
try {
  window.storage = localStorage;
} catch (e) {
  window.storage = {
    getItem: a => storage[a],
    setItem: (a, b) => storage[a] = b,
    removeItem: a => delete storage[a]
  }
}

/* URL search params */
const params = {};
if (window.location.search) {
  window.location.search.slice(1).split('&').forEach(entry => {
    const equalSignLoc = entry.indexOf('=');
    if (~equalSignLoc) {
      params[entry.slice(0, equalSignLoc)] = entry.slice(equalSignLoc + 1);
    } else {
      params[entry] = true;
    }
  });
}

function deundefine(obj) {
  if (Array.isArray(obj)) return obj.filter(i => i !== undefined);
  else {
    Object.keys(obj).forEach(prop => obj[prop] === undefined && delete obj[prop]);
    return obj;
  }
}

function formatTime(minutes, metricTime, noAMPM = false) {
  const hour = Math.floor(minutes / 60);
  const min = ('0' + minutes % 60).slice(-2);
  let time = metricTime ? `${hour}:${min}` : `${(hour + 11) % 12 + 1}:${min}`;
  if (metricTime || noAMPM) {
    return time;
  } else {
    return `${time} ${hour < 12 ? 'a' : 'p'}m`;
  }
}

function formatDuration(minutes, short) {
  if (!short) return minutes + ' minute' + (minutes === 1 ? '' : 's');
  return Math.floor(minutes / 60) + ':' + ('0' + minutes % 60).slice(-2);
}

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

function randomInt(int) {
  return Math.floor(Math.random() * int);
}

function randomGradient() {
  const colour1 = [randomInt(256), randomInt(256), randomInt(256)];
  // const colour2 = colour1.map(c => Math.max(Math.min(c + randomInt(101) - 5, 255), 0));
  const colour2 = [randomInt(256), randomInt(256), randomInt(256)];
  return `linear-gradient(${Math.random() * 360}deg, rgb(${colour1.join(',')}), rgb(${colour2.join(',')}))`;
}

class Component { // inspired by React oof

  constructor(props) {
    this.props = props;
    this.state = {};
  }

  render() {
    return createElement('div', {
      dataset: {
        class: this.constructor.name
      }
    });
  }

}
