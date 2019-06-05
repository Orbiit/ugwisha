window.UgwishaExtensions = (() => {
  const INSTALLED_EXTENSIONS_KEY = '[ugwisha] extensions';
  const LAST_EXTENSION_KEY = '[ugwisha] extensions.last';
  const EXTENSIONS_CACHE_NAME = 'ugwisha-extensions';
  const extensions = {};
  let ready = false;
  let currentExt = null;
  let nameDisplay, iconDisplay, menuBtn, wrapper;
  function start() {
    ready = true;
    delete obj.start;
    nameDisplay = document.getElementById('extension-name');
    iconDisplay = document.getElementById('extension-icon');
    menuBtn = document.getElementById('extension-menu');
    wrapper = document.getElementById('extension-wrapper');
    obj.switch = extID => {
      if (extID === currentExt) return;
      if (!extensions[extID]) {
        if (!extensions.menu) return;
        else extID = 'menu';
      }
      if (currentExt) {
        const current = extensions[currentExt];
        if (current.beforeRemove) current.beforeRemove();
        wrapper.removeChild(current.wrapper);
        if (current.afterRemove) current.afterRemove();
      }
      currentExt = extID;
      const ext = extensions[extID];
      nameDisplay.textContent = ext.name;
      if (ext.icon) {
        iconDisplay.style.backgroundImage = `url("${ext.icon}")`;
        iconDisplay.style.display = null;
      } else {
        iconDisplay.style.display = 'none';
      }
      if (ext.beforeAdd) ext.beforeAdd();
      wrapper.appendChild(ext.wrapper);
      if (ext.afterAdd) ext.afterAdd();
      localStorage.setItem(LAST_EXTENSION_KEY, extID);
      menuBtn.disabled = extID === 'menu';
    };
    menuBtn.addEventListener('click', e => {
      obj.switch('menu');
    });
    initialInstalls.then(() => obj.switch(params['app'] || localStorage.getItem(LAST_EXTENSION_KEY) || 'menu'));

    window.UgwishaEvents.connection.then(online => {
      if (!online) addExtensionOption.disabled = true;
    });
  }
  const installed = JSON.parse(storage.getItem(INSTALLED_EXTENSIONS_KEY) || '["./js/extensions/notes.js","./js/extensions/backgrounds.js"]');
  const initialInstalls = Promise.all(installed.map(install));
  function install(url) {
    return new Promise((res, rej) => {
      document.head.appendChild(Elem('script', { // is this a good idea?
        onload: res,
        onerror: rej,
        src: url
      }));
    }).then(() => {
      caches.open(EXTENSIONS_CACHE_NAME).then(cache => cache.add(url));
    });
  }
  function addExtension(url) {
    if (installed.includes(url)) return Promise.reject(new Error('Extension already added'));
    installed.push(url);
    return install(url).then(() => {
      storage.setItem(INSTALLED_EXTENSIONS_KEY, JSON.stringify(installed));
      const entry = nativeExtensions.find(entry => entry[1] === url);
      if (entry) entry[2].disabled = true;
    });
  }
  let removing = false;
  const obj = {
    start,
    addExtension,
    register(data) {
      if (extensions[data.id])
        throw new Error('Extension with same ID already exists: ' + data.id);
      if (data.id !== 'menu' && !installed.includes(data.url))
        throw new Error('No extensions are loaded with this URL: ' + data.url);
      extensions[data.id] = data;
      if (data.id !== 'menu') {
        const item = Elem('div', {className: 'extension-item'}, [
          Elem('div', {
            className: 'kind-of-button extension-icon',
            tabindex: 0,
            ripple: true,
            style: {
              backgroundImage: data.icon && `url("${data.icon}")`
            },
            onclick(e) {
              if (removing) {
                delete extensions[data.id];
                const index = installed.indexOf(data.url);
                if (~index) {
                  installed.splice(index, 1);
                  storage.setItem(INSTALLED_EXTENSIONS_KEY, JSON.stringify(installed));
                }
                extensionIcons.removeChild(item);
                const entry = nativeExtensions.find(entry => entry[1] === data.url);
                if (entry) entry[2].disabled = false;
                caches.open(EXTENSIONS_CACHE_NAME)
                  .then(cache => Promise.all([data.url, ...sources].map(url => cache.delete(url))))
                  .then(() => console.log('Extension cache deleted'));
              }
              else obj.switch(data.id);
            },
            onkeydown(e) {
              if (e.keyCode === 13) this.click();
            }
          }),
          Elem('div', {className: 'extension-name'}, [data.name])
        ]);
        extensionIcons.appendChild(item);
        if (data.styles) {
          document.head.appendChild(Elem('link', {rel: 'stylesheet', href: data.styles}));
        }
        const sources = data.sources || [];
        if (data.icon) sources.push(data.icon);
        if (data.styles) sources.push(data.styles);
        if (sources.length)
          caches.open(EXTENSIONS_CACHE_NAME).then(cache => cache.addAll(sources));
      }
    }
  };
  const nativeExtensions = [
    ['Background manager', './js/extensions/backgrounds.js'],
    ['Notes', './js/extensions/notes.js'],
    ['Todo', './js/extensions/todo.js'],
    ['Barcode', './js/extensions/barcode.js'],
    ['Min. Score Calc.', './js/extensions/min-score.js'],
    ['Discord Webhook', './js/extensions/discord-webhook.js'],
    ['Push Notifications', './js/extensions/notifications.js'],
    ['Current Second', './js/extensions/current-second.js']
  ];
  const extensionIcons = Elem('div', {className: 'extension-menu'});
  const addExtensionOption = Elem('select', {
    className: 'select-input extension-list',
    value: 'CHOOSE',
    onchange(e) {
      addExtensionBtn.disabled = addExtensionOption.value === 'CHOOSE';
    }
  }, [
    Elem('option', {value: 'CHOOSE', disabled: true}, ['Add app']),
    Elem('option', {value: 'FROM_URL'}, ['From URL']),
    ...nativeExtensions.map(entry => entry[2] = Elem('option', {value: entry[1], disabled: installed.includes(entry[1])}, [entry[0]]))
  ]);
  const addExtensionBtn = Elem('button', {
    className: 'button extension-add',
    disabled: true,
    ripple: true,
    onclick(e) {
      let url = addExtensionOption.value;
      if (url === 'CHOOSE') return;
      if (url === 'FROM_URL') url = prompt('Enter app URL:');
      if (url) addExtension(url);
      addExtensionOption.value = 'CHOOSE';
      addExtensionBtn.disabled = true;
    }
  }, ['Add']);
  obj.register({
    id: 'menu',
    wrapper: Elem('div', {}, [
      extensionIcons,
      Elem('div', {className: 'extension-list-wrapper'}, [
        addExtensionOption,
        addExtensionBtn
      ]),
      Elem('button', {
        className: 'button extension-remove',
        ripple: true,
        onclick(e) {
          removing = !removing;
          if (removing) {
            extensionIcons.classList.add('extension-remove-mode');
            this.classList.add('extension-removing');
            this.childNodes[0].nodeValue = 'Done';
          } else {
            extensionIcons.classList.remove('extension-remove-mode');
            this.classList.remove('extension-removing');
            this.childNodes[0].nodeValue = 'Remove apps';
          }
        }
      }, ['Remove apps'])
    ]),
    name: 'Apps'
  });
  return obj;
})();
