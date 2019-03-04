window.UgwishaExtensions = (() => {
  const INSTALLED_EXTENSIONS_KEY = '[ugwisha] extensions';
  const LAST_EXTENSION_KEY = '[ugwisha] extensions.last';
  const EXTENSIONS_CACHE_NAME = 'ugwisha-extensions';
  const extensions = {};
  let ready = false;
  let currentExt = null;
  let nameDisplay, menuBtn, wrapper;
  function start() {
    ready = true;
    delete obj.start;
    nameDisplay = document.getElementById('extension-name');
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
  const installed = JSON.parse(storage.getItem(INSTALLED_EXTENSIONS_KEY) || '[]');
  const initialInstalls = Promise.all(installed.map(install));
  function install(url) {
    return new Promise((res, rej) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = res;
      script.onerror = rej;
      document.head.appendChild(script); // is this a good idea?
    });
  }
  function addExtension(url) {
    if (installed.includes(url)) return Promise.reject(new Error('Extension already added'));
    return install(url).then(() => {
      installed.push(url);
      storage.setItem(INSTALLED_EXTENSIONS_KEY, JSON.stringify(installed));
    });
  }
  const obj = {
    addExtension,
    start: start,
    register(data) {
      if (extensions[data.id]) throw new Error('Extension with same ID already exists');
      extensions[data.id] = data;
      if (data.id !== 'menu') {
        menuWrapper.appendChild(createElement('div', {
          classes: 'extension-item',
          children: [
            createElement('div', {
              classes: 'kind-of-button extension-icon',
              styles: {
                backgroundImage: `url("${data.icon}")`
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
      }
    }
  };
  const menuWrapper = document.createElement('div');
  menuWrapper.classList.add('extension-menu');
  obj.register({
    id: 'menu',
    wrapper: menuWrapper,
    name: 'Apps'
  });
  return obj;
})();
