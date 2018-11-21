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

// URL PARAMETERS
// destroy-sw - destroys service workers
// get-alts   - fetches alternate schedules
// then       - URL to redirect to after fetching alternate schedules
// day        - date to view (yyyy-mm-dd)
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

if ("serviceWorker" in navigator) {
  if (params['destroy-sw']) {
    navigator.serviceWorker.getRegistrations()
      .then(regis => regis.map(regis => regis.unregister()))
      .catch(err => console.log(err));
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register('./sw.js').then(regis => {
        regis.onupdatefound = () => {
          const installingWorker = regis.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New update! Redirecting you away and back');
              options.natureLoaded = false;
              window.location.replace('/ugwisha-updater.html');
            }
          };
        };
      }, err => {
        console.log(':( Couldn\'t register service worker', err);
      });
      navigator.serviceWorker.addEventListener('message', ({data}) => {
        switch (data.type) {
          case 'version':
            console.log('Service worker version ' + data.version);
            break;
          case 'background-ok':
            setBackground(`url("${data.path}?n=${Date.now()}")`);
            if (data.path === 'happy') options.natureLoaded = true;
            break;
          default:
            console.log(data);
        }
      });
    }, {once: true});
  }
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

function formatTime(minutes, noAMPM = false) {
  const hour = Math.floor(minutes / 60);
  const min = ('0' + minutes % 60).slice(-2);
  let time = options.metricTime ? `${hour}:${min}` : `${(hour + 11) % 12 + 1}:${min}`;
  if (options.metricTime || noAMPM) {
    return time;
  } else {
    return `${time} ${hour < 12 ? 'a' : 'p'}m`;
  }
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
function newNatureBackground() {
  navigator.serviceWorker.controller.postMessage({type: 'nature-image'});
}

let viewingDate = getToday();
function getToday() {
  // return new Date('2018-11-16');
  return new Date(Date.UTC(...(d => [d.getFullYear(), d.getMonth(), d.getDate()])(new Date())));
}
if (params.day) {
  viewingDate = new Date(params.day);
}
document.addEventListener('DOMContentLoaded', async e => {
  // notes
  const notes = document.getElementById('notes');
  notes.value = storage.getItem('[ugwisha] notes');
  setTimeout(() => notes.style.height = notes.scrollHeight + 2 + 'px', 0);
  notes.addEventListener('input', e => {
    notes.style.height = '0';
    notes.style.height = notes.scrollHeight + 2 + 'px';
    storage.setItem('[ugwisha] notes', notes.value);
  });

  // window size
  let windowWidth = window.innerWidth, windowHeight = window.innerHeight;
  window.addEventListener('resize', e => {
    notes.style.height = '0';
    notes.style.height = notes.scrollHeight + 2 + 'px';
    windowWidth = window.innerWidth, windowHeight = window.innerHeight;
  });

  // background
  const setBackgroundBtn = document.getElementById('set-back');
  const resetBackground = document.getElementById('reset-back');
  const nextBackground = document.getElementById('next-back');
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
    setBackground(`url("happy?n=${Date.now()}")`);
    nextBackground.disabled = false;
  } else {
    startRandomGradients();
  }
  setBackgroundBtn.addEventListener('click', e => {
    const url = prompt('URL of image: (sorry for lack of proper UI)');
    if (url) {
      navigator.serviceWorker.controller.postMessage({type: 'custom-image', url: options.backgroundURL = url});
      save();
      resetBackground.disabled = false;
      nextBackground.disabled = true;
      if (randomGradientTimer) clearInterval(randomGradientTimer);
    }
  });
  resetBackground.addEventListener('click', e => {
    options.backgroundURL = null;
    save();
    resetBackground.disabled = true;
    nextBackground.disabled = !options.natureBackground;
    if (options.natureBackground) {
      if (options.natureLoaded) setBackground(`url("happy?n=${Date.now()}")`);
      else newNatureBackground();
    }
    else startRandomGradients();
  });
  nextBackground.addEventListener('click', newNatureBackground);

  // psa & offline detection
  const psaDialog = document.getElementById('psa');
  const psaContent = document.getElementById('psa-content');
  const psaClose = document.getElementById('psa-close');
  const psaOpen = document.getElementById('last-psa');
  fetch('./psa.html?=' + Date.now()).then(r => r.text()).then(html => {
    psaContent.innerHTML = html;
    const version = html.slice(6, 9);
    if (options.lastPSA && options.lastPSA !== version) {
      psaDialog.classList.remove('hidden');
    }
    if (!options.lastPSA) {
      options.lastPSA = version;
      save();
    }
    psaClose.addEventListener('click', e => {
      psaDialog.classList.add('hidden');
      if (options.lastPSA !== version) {
        options.lastPSA = version;
        save();
      }
    });
    psaOpen.addEventListener('click', e => {
      psaDialog.classList.remove('hidden');
    });
  }).catch(() => {
    document.getElementById('offline-msg').classList.remove('hidden');
    const reloadBtn = document.getElementById('reload');
    reloadBtn.tabindex = 0;
    reloadBtn.addEventListener('click', e => {
      window.location.reload();
      e.preventDefault();
    });
    altFetchBtn.disabled = nextBackground.disabled = setBackgroundBtn.disabled = psaOpen.disabled = true;
    if (!options.natureLoaded) {
      document.getElementById('nature-back').disabled = true;
    }
  });

  // jump button
  const jumpBtn = document.getElementById('jump');
  let smoothScrolling = false;
  function smoothScroll(stopY) {
    let y = window.scrollY;
    function scroll() {
      if (Math.abs(y - stopY) > 1) {
        y += (stopY - y) / 5;
        window.scrollTo(0, y);
        smoothScrolling = window.requestAnimationFrame(scroll);
      } else {
        window.scrollTo(0, stopY);
        smoothScrolling = false;
      }
    }
    scroll();
  }
  document.addEventListener('wheel', e => {
    window.cancelAnimationFrame(smoothScrolling);
    smoothScrolling = false;
  }, {passive: true});
  document.addEventListener('touchstart', e => {
    window.cancelAnimationFrame(smoothScrolling);
    smoothScrolling = false;
  }, {passive: true});
  document.addEventListener('scroll', e => {
    if (window.scrollY > windowHeight / 3) jumpBtn.classList.add('up');
    else jumpBtn.classList.remove('up');
  });
  jumpBtn.addEventListener('click', e => {
    if (smoothScrolling) window.cancelAnimationFrame(smoothScrolling);
    smoothScroll(jumpBtn.classList.contains('up') ? 0 : windowHeight - 50);
  });

  // settings wrapper
  const settingsWrapper = document.getElementById('settings');
  const toggleSettings = document.getElementById('toggle-settings');
  const btnText = document.createTextNode('show settings');
  toggleSettings.appendChild(btnText);
  toggleSettings.addEventListener('click', e => {
    settingsWrapper.classList.toggle('hidden');
    btnText.nodeValue = settingsWrapper.classList.contains('hidden') ? 'show settings' : 'hide settings';
  });

  // ready functions
  await Promise.all(window.ready.map(r => r()));

  // checkboxes
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
      updateStatus();
    },
    natureBackground(yes) {
      if (options.backgroundURL) return;
      nextBackground.disabled = !yes;
      if (yes) {
        if (randomGradientTimer) clearInterval(randomGradientTimer);
        if (options.natureLoaded) setBackground(`url("happy?n=${Date.now()}")`);
        else newNatureBackground();
      }
      else startRandomGradients();
    },
    showSELF() {
      updateView();
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

  // simple date navegation buttons
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
