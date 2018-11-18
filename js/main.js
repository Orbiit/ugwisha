window.ready = [];

try {
  window.storage = localStorage;
} catch (e) {
  window.storage = {
    getItem: a => storage[a],
    setItem: (a, b) => storage[a] = b,
    removeItem: a => delete storage[a]
  }
}
try {
  window.options = JSON.parse(storage.getItem('[ugwisha] options'));
  if (typeof window.options !== 'object' || window.options === null) window.options = {};
} catch (e) {
  window.options = {};
  console.log(e);
}
function save() {
  storage.setItem('[ugwisha] options', JSON.stringify(window.options));
}

function deundefine(obj) {
  if (Array.isArray(obj)) return obj.filter(i => i !== undefined);
  else {
    Object.keys(obj).forEach(prop => obj[prop] === undefined && delete obj[prop]);
    return obj;
  }
}
function createElement(tag, data = {}) {
  const elem = document.createElement(tag);
  if (data.classes) {
    if (typeof data.classes === 'string') elem.className = data.classes;
    else deundefine(data.classes).forEach(c => elem.classList.add(c));
  }
  if (data.children) deundefine(data.children).forEach(c => elem.appendChild(c));
  if (data.attributes) {
    Object.keys(deundefine(data.attributes)).forEach(attr => {
      if (elem[attr] !== undefined) elem[attr] = data.attributes[attr];
      else elem.setAttribute(attr, data.attributes[attr]);
    });
  }
  if (data.listeners) {
    Object.keys(deundefine(data.listeners)).forEach(ev => {
      elem.addEventListener(ev, data.listeners[ev]);
    });
  }
  if (data.styles) {
    Object.keys(deundefine(data.styles)).forEach(prop => {
      if (prop.slice(0, 2) === '--') {
        elem.style.setProperty(prop, data.styles[prop]);
      } else {
        elem.style[prop] = data.styles[prop];
      }
    });
  }
  if (data.html) elem.innerHTML = data.html;
  return elem;
}
function createFragment(elems) {
  const frag = document.createDocumentFragment();
  elems.forEach(e => frag.appendChild(e));
  return frag;
}

function formatTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const min = ('0' + minutes % 60).slice(-2);
  return options.metricTime ? `${hour}:${min}` : `${(hour + 11) % 12 + 1}:${min} ${hour < 12 ? 'a' : 'p'}m`;
}
function formatDuration(minutes, short) {
  if (!short) return minutes + ' minute' + (minutes === 1 ? '' : 's');
  // const hours = Math.floor(minutes / 60);
  // const mins = minutes % 60;
  // return (hours > 0 ? hours + ' hour' + (hours === 1 ? '' : 's') : '')
  //   + (hours > 0 && mins !== 0 ? ' and ' : '')
  //   + (mins !== 0 ? mins + ' minute' + (mins === 1 ? '' : 's') : '');
  return Math.floor(minutes / 60) + ':' + ('0' + minutes % 60).slice(-2);
}

window.tempSchedule = [ // TEMP
  {period: "A", start: 505, end: 585},
  {period: "b", start: 585, end: 590},
  {period: "B", start: 600, end: 675},
  {period: "C", start: 685, end: 760},
  {period: "l", start: 760, end: 790},
  {period: "F", start: 800, end: 875}
];

document.addEventListener('DOMContentLoaded', e => {
  if (navigator.platform.includes('Win')) document.body.classList.add('windows');
  const notes = document.getElementById('notes');
  notes.value = storage.getItem('[ugwisha] notes');
  setTimeout(() => notes.style.height = notes.scrollHeight + 2 + 'px', 0);
  notes.addEventListener('input', e => {
    notes.style.height = '0';
    notes.style.height = notes.scrollHeight + 2 + 'px';
    storage.setItem('[ugwisha] notes', notes.value);
  });
  window.addEventListener('resize', e => {
    notes.style.height = '0';
    notes.style.height = notes.scrollHeight + 2 + 'px';
  });
  const optionChange = {
    showDuration(yes) {
      if (yes) document.body.classList.add('show-duration');
      else document.body.classList.remove('show-duration');
    },
    showTime(yes) {
      if (yes) document.body.classList.add('show-time');
      else document.body.classList.remove('show-time');
    },
    metricTime() {
      // also update schedule
      updateStatus();
    }
  };
  window.ready.forEach(r => r());
  Array.from(document.getElementsByClassName('toggle-setting')).forEach(toggle => {
    const prop = toggle.dataset.option;
    if (options[prop] === undefined) options[prop] = toggle.dataset.default === 'true';
    toggle.checked = options[prop];
    if (optionChange[prop]) optionChange[prop](toggle.checked);
    toggle.addEventListener('change', e => {
      options[prop] = toggle.checked;
      if (optionChange[prop]) optionChange[prop](toggle.checked);
      save();
    });
  });
  setSchedule(tempSchedule);
}, {once: true});
