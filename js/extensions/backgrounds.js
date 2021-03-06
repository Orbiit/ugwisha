window.UgwishaExtensions.register((() => {
  /**
   * Cache name for custom background images
   * @type {string}
   * @const
   */
  const BACKGROUND_CACHE_NAME = 'ugwisha-backgrounds';

  /**
   * Fetches a new image background from the given URL (hopefully
   * without caching) and caches it
   * @param {string} url URL of the image to fetch from
   * @async
   */
  function cacheBackground(url) {
    // doesn't do cache.delete because it's assumed that the image hasn't been
    // already cached (otherwise the service worker might interfere)
    // uses .put because .add doesn't accept opaque responses
    const request = new Request(url, {mode: 'no-cors', cache: 'no-cache'});
    return caches.open(BACKGROUND_CACHE_NAME)
      .then(async cache => cache.put(request, await fetch(request)));
  }

  function createBackgroundEntry(url) {
    const wrapper = Elem('div', {className: 'background-entry', title: url}, [
      Elem('button', {
        className: 'icon-btn background-remove',
        ripple: true,
        onclick() {
          backgroundEntries.removeChild(wrapper);
          caches.open(BACKGROUND_CACHE_NAME).then(cache => cache.delete(url));
          const index = backgrounds.indexOf(url);
          if (~index) {
            backgrounds.splice(index, 1);
            if (backgrounds.length === 0) {
              haltBackgroundCycle();
            } else if (index <= currentBackground) {
              currentBackground--;
              if (index === currentBackground + 1) {
                startBackgroundCycle();
              }
            }
          }
        }
      }),
      Elem('a', {
        rel: 'noopener noreferrer',
        target: '_blank',
        href: url
      }, [url])
    ]);
    return wrapper;
  }

  const backgroundEntries = Elem('div', {className: 'background-entries'});
  const newBackgroundInput = Elem('input', {
    className: 'select-input',
    type: 'text',
    placeholder: 'Image URL',
    onkeydown(e) {
      if (e.keyCode === 13) newBackgroundBtn.click();
    }
  });
  const newBackgroundBtn = Elem('button', {
    className: 'button',
    ripple: true,
    async onclick() {
      const url = newBackgroundInput.value;
      error.textContent = '';
      if (url) {
        newBackgroundBtn.disabled = true;
        const cache = await caches.open(BACKGROUND_CACHE_NAME);
        if (await cache.match(url)) {
          error.textContent = 'Duplicate background.';
          newBackgroundBtn.disabled = false;
        } else {
          cacheBackground(url).then(() => {
            backgroundEntries.appendChild(createBackgroundEntry(url));
            backgrounds.push(url);
            currentBackground = backgrounds.length - 2;
            startBackgroundCycle();
            newBackgroundBtn.disabled = false;
            newBackgroundInput.value = '';
          }).catch(() => {
            error.textContent = "The image couldn't be loaded. This might be because:"
              + '\n- You are offline'
              + "\n- The website hosting the image won't let Ugwisha load their images"
              + "\n- There's something wrong with the URL";
          });
        }
      }
    }
  }, ['add']);
  const addNatureBtn = Elem('button', {
    className: 'button background-add-nature',
    ripple: true,
    async onclick() {
      newBackgroundInput.value = (await fetch('https://source.unsplash.com/random/1600x900/?nature')).url;
      newBackgroundBtn.click();
    }
  }, ['add random nature image']);
  const error = Elem('p', {className: 'background-error'});

  let backgrounds = [];
  caches.open(BACKGROUND_CACHE_NAME)
    .then(cache => cache.keys())
    .then(urls => {
      backgrounds = urls.map(({url}) => url);
      if (backgrounds.length) startBackgroundCycle();
      urls.forEach(({url}) => {
        backgroundEntries.appendChild(createBackgroundEntry(url));
      });
    });

  let timeoutID = null, currentBackground = null, setBackground = null;
  function startBackgroundCycle() {
    // stop other scheduled cycle
    clearTimeout(timeoutID);

    // gain control over background (if possible)
    if (!setBackground) {
      setBackground = window.Ugwisha.requestBackgroundControl();
      if (!setBackground) return;
    }

    // why check if the background cycle is necessary AFTER gaining control?
    // this is to update the gradient cycle when the loop setting is changed
    if (backgrounds.length === 0) {
      haltBackgroundCycle();
      return;
    }

    // cycle to next background (if there is one)
    let lastBackground = currentBackground;
    if (currentBackground === null) {
      currentBackground = 0;
    } else {
      currentBackground = (currentBackground + 1) % backgrounds.length;
    }
    if (lastBackground !== currentBackground) {
      setBackground(`url("${encodeURI(backgrounds[currentBackground])}")`);
    }

    // schedule the cycle
    timeoutID = setTimeout(startBackgroundCycle, options.backgroundLoop * 1000);
  }
  function haltBackgroundCycle() {
    if (!setBackground) return;
    clearTimeout(timeoutID);
    window.Ugwisha.relinquishBackgroundControl(setBackground);
    timeoutID = currentBackground = setBackground = null;
  }

  window.UgwishaEvents.connection.then(online => {
    if (!online) newBackgroundBtn.disabled = addNatureBtn.disabled = true;
  });

  return {
    wrapper: Elem('div', {className: 'background-extension'}, [
      Elem('label', {className: 'background-select-input-wrapper'}, [
        Elem('span', {}, ['Loop speed']),
        Elem('input', {
          className: 'select-input',
          type: 'number',
          placeholder: '10',
          value: options.backgroundLoop,
          min: 0,
          onchange() {
            this.value = options.backgroundLoop = Math.max(+this.value || 0.2, 0.2);
            options.save();
            startBackgroundCycle();
          }
        })
      ]),
      Elem('label', {className: 'background-select-input-wrapper'}, [
        Elem('span', {}, ['Fade speed']),
        Elem('input', {
          className: 'select-input',
          type: 'number',
          placeholder: '5',
          value: options.backgroundFade,
          min: 0,
          onchange() {
            this.value = options.backgroundFade = Math.max(+this.value || 0, 0);
            document.body.style.setProperty('--background-transition-speed', options.backgroundFade + 's');
            options.save();
          }
        })
      ]),
      backgroundEntries,
      Elem('div', {className: 'add-background-wrapper'}, [
        newBackgroundInput,
        newBackgroundBtn
      ]),
      addNatureBtn,
      error
    ]),
    name: 'Backgrounds',
    icon: './images/extensions/backgrounds.svg',
    styles: './js/extensions/backgrounds.css',
    sources: ['./images/material/remove.svg?for=backgrounds']
  };
})());
