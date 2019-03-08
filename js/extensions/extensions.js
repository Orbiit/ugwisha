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
  }
  const installed = JSON.parse(storage.getItem(INSTALLED_EXTENSIONS_KEY) || '["./js/extensions/notes.js"]');
  const initialInstalls = Promise.all(installed.map(install));
  function install(url) {
    return new Promise((res, rej) => {
      const script = document.createElement('script');
      script.onload = res;
      script.onerror = rej;
      script.src = url;
      document.head.appendChild(script); // is this a good idea?
    }).then(() => {
      caches.open(EXTENSIONS_CACHE_NAME).then(cache => cache.add(url));
    });
  }
  function addExtension(url) {
    if (installed.includes(url)) return Promise.reject(new Error('Extension already added'));
    return install(url).then(() => {
      installed.push(url);
      storage.setItem(INSTALLED_EXTENSIONS_KEY, JSON.stringify(installed));
      const entry = nativeExtensions.find(entry => entry[1] === url);
      if (entry) entry[2].disabled = true;
      removeExtensionOption.appendChild(removeOptions[url] = createElement('option', {
        attributes: {value: url},
        html: url
      }));
    });
  }
  const obj = {
    start: start,
    register(data) {
      if (extensions[data.id]) throw new Error('Extension with same ID already exists');
      extensions[data.id] = data;
      if (data.id !== 'menu') {
        extensionIcons.appendChild(createElement('div', {
          classes: 'extension-item',
          children: [
            createElement('div', {
              classes: 'kind-of-button extension-icon',
              styles: {
                backgroundImage: data.icon && `url("${data.icon}")`
              },
              attributes: {
                tabindex: 0
              },
              listeners: {
                click(e) {
                  obj.switch(data.id);
                },
                keydown(e) {
                  if (e.keyCode === 13) this.click();
                }
              },
              ripples: true
            }),
            createElement('div', {
              classes: 'extension-name',
              children: [data.name]
            })
          ]
        }));
        if (data.styles) {
          document.head.appendChild(createElement('link', {
            attributes: {rel: 'stylesheet', href: data.styles}
          }));
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
    ['Notes', './js/extensions/notes.js'],
    ['Todo', './js/extensions/todo.js']
  ];
  const extensionIcons = createElement('div', {classes: 'extension-menu'});
  const addExtensionOption = createElement('select', {
    classes: 'select-input extension-list',
    children: [
      createElement('option', {
        attributes: {value: 'CHOOSE', disabled: true},
        html: 'Add app'
      }),
      createElement('option', {
        attributes: {value: 'FROM_URL'},
        html: 'From URL'
      }),
      ...nativeExtensions.map(entry => entry[2] = createElement('option', {
        attributes: {value: entry[1], disabled: installed.includes(entry[1])},
        html: entry[0]
      }))
    ],
    attributes: {value: 'CHOOSE'},
    listeners: {
      change(e) {
        addExtensionBtn.disabled = addExtensionOption.value === 'CHOOSE';
      }
    }
  });
  const addExtensionBtn = createElement('button', {
    classes: 'button extension-add',
    children: ['Add'],
    attributes: {disabled: true},
    listeners: {
      click(e) {
        let url = addExtensionOption.value;
        if (url === 'CHOOSE') return;
        if (url === 'FROM_URL') url = prompt('Enter app URL:');
        if (url) addExtension(url);
        addExtensionOption.value = 'CHOOSE';
        addExtensionBtn.disabled = true;
      }
    },
    ripples: true
  });
  const removeOptions = {};
  const removeExtensionOption = createElement('select', {
    classes: 'select-input extension-list',
    children: [
      createElement('option', {
        attributes: {value: 'CHOOSE', disabled: true},
        html: 'Remove app by URL'
      }),
      ...installed.map(url => removeOptions[url] = createElement('option', {
        attributes: {value: url},
        html: url
      }))
    ],
    attributes: {value: 'CHOOSE'},
    listeners: {
      change(e) {
        removeExtensionBtn.disabled = removeExtensionOption.value === 'CHOOSE';
      }
    }
  });
  const removeExtensionBtn = createElement('button', {
    classes: 'button extension-remove',
    children: ['Remove'],
    attributes: {disabled: true},
    listeners: {
      click(e) {
        let url = removeExtensionOption.value;
        if (url !== 'CHOOSE') {
          removeExtensionOption.removeChild(removeOptions[url]);
          removeOptions[url] = null;
          const index = installed.indexOf(url);
          if (~index) {
            installed.splice(index, 1);
            storage.setItem(INSTALLED_EXTENSIONS_KEY, JSON.stringify(installed));
          }
          const entry = nativeExtensions.find(entry => entry[1] === url);
          if (entry) entry[2].disabled = false;
          removeMessage.style.display = null;
        }
        removeExtensionOption.value = 'CHOOSE';
        removeExtensionBtn.disabled = true;
      }
    },
    ripples: true
  });
  const removeMessage = createElement('p', {
    styles: {
      display: 'none'
    },
    html: 'Removed extensions will take effect upon reload.'
  });
  obj.register({
    id: 'menu',
    wrapper: createElement('div', {
      children: [
        extensionIcons,
        createElement('div', {
          classes: 'extension-list-wrapper',
          children: [
            addExtensionOption,
            addExtensionBtn
          ]
        }),
        createElement('div', {
          classes: 'extension-list-wrapper',
          children: [
            removeExtensionOption,
            removeExtensionBtn
          ]
        }),
        removeMessage
      ]
    }),
    name: 'Apps'
  });
  return obj;
})();
