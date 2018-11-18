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
  deundefine(elems).forEach(e => frag.appendChild(e));
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

function randomInt(int) {
  return Math.floor(Math.random() * int);
}
function randomGradient() {
  const colour1 = [randomInt(256), randomInt(256), randomInt(256)];
  // const colour2 = colour1.map(c => Math.max(Math.min(c + randomInt(101) - 5, 255), 0));
  const colour2 = [randomInt(256), randomInt(256), randomInt(256)];
  return `linear-gradient(${Math.random() * 360}deg, rgb(${colour1.join(',')}), rgb(${colour2.join(',')}))`;
}
let backgroundTransitioner, transitioning = false;
function setBackground(css) {
  if (transitioning) {
    document.body.style.backgroundImage = css;
    return;
  }
  transitioning = true;
  backgroundTransitioner.style.backgroundImage = document.body.style.backgroundImage;
  backgroundTransitioner.classList.add('animating');
  document.body.style.backgroundImage = css;
  setTimeout(() => {
    backgroundTransitioner.classList.remove('animating');
    transitioning = false;
  }, 500);
}

let viewingDate = getToday();
function getToday() {
  return new Date(Date.UTC(...(d => [d.getFullYear(), d.getMonth(), d.getDate()])(new Date())));
}
document.addEventListener('DOMContentLoaded', async e => {
  if (navigator.platform.includes('Win')) document.body.classList.add('windows');
  const notes = document.getElementById('notes');
  notes.value = storage.getItem('[ugwisha] notes');
  setTimeout(() => notes.style.height = notes.scrollHeight + 2 + 'px', 0);
  notes.addEventListener('input', e => {
    notes.style.height = '0';
    notes.style.height = notes.scrollHeight + 2 + 'px';
    storage.setItem('[ugwisha] notes', notes.value);
  });
  let windowWidth = window.innerWidth, windowHeight = window.innerHeight;
  window.addEventListener('resize', e => {
    notes.style.height = '0';
    notes.style.height = notes.scrollHeight + 2 + 'px';
    windowWidth = window.innerWidth, windowHeight = window.innerHeight;
  });
  const resetBackground = document.getElementById('reset-back');
  backgroundTransitioner = document.getElementById('transition-background');
  let randomGradientTimer = null;
  function startRandomGradients() {
    if (randomGradientTimer) clearInterval(randomGradientTimer);
    randomGradientTimer = setInterval(() => {
      setBackground(randomGradient());
    }, 5000);
    setBackground(randomGradient());
  }
  if (options.backgroundURL) {
    setBackground(`url(${options.backgroundURL})`);
    resetBackground.disabled = false;
  } else if (options.natureBackground) {
    //
  } else {
    startRandomGradients();
  }
  document.getElementById('set-back').addEventListener('click', e => {
    const url = prompt('URL of image: (sorry for lack of proper UI)');
    if (url) {
      setBackground(`url(${options.backgroundURL = url})`);
      save();
    }
    resetBackground.disabled = false;
    if (randomGradientTimer) clearInterval(randomGradientTimer);
  });
  resetBackground.addEventListener('click', e => {
    options.backgroundURL = null;
    save();
    resetBackground.disabled = true;
    startRandomGradients();
  });
  await Promise.all(window.ready.map(r => r()));
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
      updateView();
    },
    natureBackground(yes) {
      if (yes) {
        if (randomGradientTimer) clearInterval(randomGradientTimer);
        // setBackground(`url("https://source.unsplash.com/featured/${windowWidth}x${windowHeight}/?nature")`);
      }
      else startRandomGradients();
    }
  };
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
  const backDay = document.getElementById('back-day');
  const forthDay = document.getElementById('forth-day');
  backDay.addEventListener('click', e => {
    viewingDate.setUTCDate(viewingDate.getUTCDate() - 1);
    updateView();
  });
  forthDay.addEventListener('click', e => {
    viewingDate.setUTCDate(viewingDate.getUTCDate() + 1);
    updateView();
  });
  document.getElementById('today').addEventListener('click', e => {
    viewingDate = getToday();
    updateView();
  });
  updateStatus(true);
}, {once: true});
