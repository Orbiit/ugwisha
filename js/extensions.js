const INSTALLED_EXTENSIONS_KEY = '[ugwisha] extensions'
const LAST_EXTENSION_KEY = '[ugwisha] extensions.last'
const EXTENSIONS_CACHE_NAME = 'ugwisha-extensions'

const nativeExtensions = [
  ['Background manager', './js/extensions/backgrounds.js'],
  ['Notes', './js/extensions/notes.js'],
  ['Todo', './js/extensions/todo.js'],
  ['Barcode', './js/extensions/barcode.js'],
  ['Minimum Score Calculator', './js/extensions/min-score.js'],
  ['Discord Webhook', './js/extensions/discord-webhook.js'],
  ['Push Notifications', './js/extensions/notifications.js'],
  ['Current Second', './js/extensions/current-second.js'],
  ['Club list', './js/extensions/list.js?for=club'],
  ['Staff list', './js/extensions/list.js?for=staff'],
  ['Quick copy', './js/extensions/clipboard.js']
]
const loadExtensions = !params['no-apps']

let removing = false
function showExtension (data) {
  const box = Elem('div', {
    className: 'kind-of-button extension-icon',
    tabindex: loadExtensions ? 0 : -1,
    ripple: true,
    style: {
      backgroundImage: data.icon && `url("${encodeURI(data.icon)}")`
    },
    onclick (e) {
      if (!data.meta.loaded) return
      if (removing) {
        const index = extensions.indexOf(data)
        if (~index) {
          extensions.splice(index, 1)
          saveLoadedExtensions()
        }

        extensionIcons.removeChild(wrapper)

        const entry = nativeExtensions.find(entry => entry[1] === data.url)
        if (entry) entry[2].disabled = false

        caches.open(EXTENSIONS_CACHE_NAME)
          .then(cache => data.meta.files.forEach(url => cache.delete(url)))
      } else {
        launch(data.url)
      }
    },
    onkeydown (e) {
      if (e.keyCode === 13) this.click()
    }
  })
  data.meta.icon = box
  const name = Elem('div', { className: 'extension-name', title: data.name || '' }, [data.name || ''])
  data.meta.name = name
  const wrapper = Elem('div', { className: 'extension-item not-loaded' }, [box, name])
  data.meta.button = wrapper
  extensionIcons.appendChild(wrapper)
  if (data.styles && loadExtensions) {
    document.head.appendChild(data.meta.styles = Elem('link', {
      rel: 'stylesheet',
      href: data.styles
    }))
  }
  data.meta.shown = true
}

const extensionIcons = Elem('div', { className: 'extension-menu' })
const menu = {
  wrapper: Elem('div', {}, [
    extensionIcons
  ]),
  name: 'Apps',
  meta: { data: {} }
}
nativeExtensions.forEach(entry => {
  entry[2] = Elem('button', {
    className: 'button native-ext',
    ripple: true,
    onclick () {
      newExtension(entry[1])
      this.disabled = true
    }
  }, [entry[0]])
})

function saveLoadedExtensions () {
  storage.setItem(INSTALLED_EXTENSIONS_KEY, JSON.stringify({
    version: 1,
    extensions: extensions.map(({ name, icon, url, styles }) => ({ name, icon, url, styles }))
  }))
}
let saveData
try {
  saveData = JSON.parse(storage.getItem(INSTALLED_EXTENSIONS_KEY))
  if (!saveData.version) {
    saveData.version = 0
  }
  switch (saveData.version) {
    case 0:
      if (!saveData.includes('./js/extensions/backgrounds.js')) {
        saveData.push('./js/extensions/backgrounds.js')
      }
      saveData = { extensions: saveData.map(url => ({ url })) }
  }
} catch (e) {
  saveData = {
    extensions: [
      {
        name: 'Notes',
        icon: './images/extensions/notes.svg',
        url: './js/extensions/notes.js'
      },
      {
        name: 'Backgrounds',
        icon: './images/extensions/backgrounds.svg',
        url: './js/extensions/backgrounds.js',
        styles: './js/extensions/backgrounds.css'
      }
    ]
  }
}
const { extensions } = saveData
extensions.forEach(extension => {
  extension.meta = { loaded: false }
  showExtension(extension)
  loadExtension(extension)
  const nativeExt = nativeExtensions.find(e => e[1] === extension.url)
  if (nativeExt) nativeExt[2].disabled = true
})

const initialInstalls = Promise.all(extensions.map(e => e.meta.scriptLoad))
function loadExtension (extension) {
  extension.meta.scriptLoad = new Promise((res, rej) => {
    if (!loadExtensions) return
    // is this a good idea?
    document.head.appendChild(extension.meta.script = Elem('script', {
      onload: res,
      onerror: rej,
      src: extension.url
    }))
  })
}
function newExtension (url) {
  if (extensions.find(e => e.url === url)) return new Error('Extension already added')
  const newExtension = { url, meta: { loaded: false } }
  loadExtension(newExtension)
  extensions.push(newExtension)
}

function register (data, script = document.currentScript) {
  if (script && script.src) script = script.getAttribute('src')
  const extension = extensions.find(e => e.url === script) || { meta: {} }
  if (!extension.url) extension.url = script
  if (!script || script !== extension.url) {
    throw new Error('Suspicious registration!')
  } else { extension.meta.loaded = true }
  extension.meta.data = data
  extension.name = data.name
  extension.icon = data.icon
  extension.styles = data.styles
  extension.wrapper = data.wrapper
  if (extension.meta.shown) {
    extension.meta.name.textContent = data.name
    extension.meta.name.title = data.name
    extension.meta.icon.style.backgroundImage = `url("${encodeURI(data.icon)}")`
    if (data.styles) {
      if (extension.meta.styles) {
        extension.meta.styles.href = data.styles
      } else {
        document.head.appendChild(extension.meta.styles = Elem('link', {
          rel: 'stylesheet',
          href: data.styles
        }))
      }
    }
  } else {
    showExtension(extension)
  }
  extension.meta.button.classList.remove('not-loaded')
  saveLoadedExtensions()
  const entry = nativeExtensions.find(entry => entry[1] === extension.url)
  if (entry) entry[2].disabled = true
  extension.meta.files = clean([script, data.styles, data.icon, ...(data.sources || [])])
  caches.open(EXTENSIONS_CACHE_NAME).then(cache => cache.addAll(extension.meta.files))
}

let currentExt = null
function launch (ext) {
  if (!wrapper) {
    params.app = ext
    return
  }
  if (typeof ext === 'string') ext = extensions.find(e => e.url === ext)
  if (!ext) ext = menu
  if (currentExt === ext) return
  if (currentExt) {
    if (currentExt.meta.data.beforeRemove) currentExt.meta.data.beforeRemove()
    wrapper.removeChild(currentExt.wrapper)
    if (currentExt.meta.data.afterRemove) currentExt.meta.data.afterRemove()
  }
  currentExt = ext
  nameDisplay.textContent = ext.name
  if (ext.icon) {
    iconDisplay.style.backgroundImage = `url("${encodeURI(ext.icon)}")`
    iconDisplay.style.display = null
  } else {
    iconDisplay.style.display = 'none'
  }
  if (ext.meta.data.beforeAdd) ext.meta.data.beforeAdd()
  wrapper.appendChild(ext.wrapper)
  if (ext.meta.data.afterAdd) ext.meta.data.afterAdd()
  storage.setItem(LAST_EXTENSION_KEY, ext.url)
  if (ext === menu) {
    menuBtn.classList.add('add-ext')
    menuBtn.disabled = !window.isOnline
  } else {
    menuBtn.classList.remove('add-ext')
    menuBtn.disabled = false
  }
  menuBtn.setAttribute('aria-label', ext === menu ? 'add apps' : 'go to app menu')
  removeBtn.style.display = ext === menu ? null : 'none'
}

let nameDisplay, iconDisplay, menuBtn, removeBtn, wrapper
ready.push(() => {
  nameDisplay = document.getElementById('extension-name')
  iconDisplay = document.getElementById('extension-icon')
  menuBtn = document.getElementById('extension-menu')
  removeBtn = document.getElementById('remove-extensions')
  wrapper = document.getElementById('extension-wrapper')
  menuBtn.addEventListener('click', e => {
    if (currentExt === menu) {
      canHide = false
      extList.classList.remove('hidden')
      extList.classList.remove('disappear')
    } else {
      launch(menu)
    }
  })
  removeBtn.addEventListener('click', e => {
    removing = !removing
    if (removing) {
      extensionIcons.classList.add('extension-remove-mode')
      removeBtn.classList.add('extension-removing')
    } else {
      extensionIcons.classList.remove('extension-remove-mode')
      removeBtn.classList.remove('extension-removing')
    }
  })
  const previousApp = params.app || storage.getItem(LAST_EXTENSION_KEY)
  launch(menu)
  if (loadExtensions && previousApp) {
    initialInstalls.then(() => launch(previousApp))
  }

  const extList = document.getElementById('extension-list')
  let canHide = false
  extList.addEventListener('transitionend', e => {
    if (canHide) extList.classList.add('hidden')
  })
  document.getElementById('native-list').appendChild(Fragment(nativeExtensions.map(e => e[2])))
  const extFromURLInput = document.getElementById('extension-url')
  extFromURLInput.addEventListener('keydown', e => {
    if (e.keyCode === 13) extFromURLBtn.click()
  })
  const extFromURLBtn = document.getElementById('extension-url-add')
  extFromURLBtn.addEventListener('click', e => {
    if (extFromURLInput.value) {
      newExtension(extFromURLInput.value)
      extFromURLInput.value = ''
    }
  })
  document.addEventListener('click', e => {
    if (e.target === menuBtn || extList.contains(e.target) && e.target.tagName !== 'BUTTON') return
    canHide = true
    extList.classList.add('disappear')
  })

  window.UgwishaEvents.connection.then(online => {
    if (currentExt === menu) menuBtn.disabled = !online
  })
})

window.UgwishaExtensions = { register, launch }
