// Ugwisha's background is FAT

/**
 * Returns a random integer between 0 and n - 1
 * @param {number} int The upper bound (excluded)
 * @return {number} The random integer
 */
function randomInt(int) {
  return Math.floor(Math.random() * int);
}

/**
 * Generates a random gradient between two random colours at a
 * random angle
 * @return {string} CSS linear-gradient of the gradient
 */
function randomGradient() {
  const colour1 = [randomInt(256), randomInt(256), randomInt(256)];
  const colour2 = [randomInt(256), randomInt(256), randomInt(256)];
  return `linear-gradient(${Math.random() * 360}deg, rgb(${colour1.join(',')}), rgb(${colour2.join(',')}))`;
}

/**
 * Transitions between two backgrounds with a fade animation
 * @param {string} css The CSS background-image value of the background to
 * transition to
 */
function setBackground(css) {
  const transitioner = Elem('div', {className: 'transition-background'});
  transitioner.style.backgroundImage = document.body.style.backgroundImage;
  const stopper = setTimeout(() => { // just in case
    document.body.removeChild(transitioner);
  }, 10000);
  transitioner.addEventListener('animationend', e => {
    document.body.removeChild(transitioner);
    clearTimeout(stopper);
  });
  document.body.insertBefore(transitioner, document.body.firstChild);
  document.body.style.backgroundImage = css;
}

/**
 * Cache name for the nature and custom images
 * @type {string}
 * @const
 */
const BACKGROUND_CACHE_NAME = 'ugwisha-backgrounds';

/**
 * Fetches a new image background from the given URL (hopefully
 * without caching) and caches it
 * @param {string} url URL of the image to fetch from
 * @param {string} id ID to refer to the image as when cached
 * @async
 */
async function newBackground(url, id) {
  const headers = new Headers();
  headers.append('pragma', 'no-cache');
  headers.append('Cache-Control', 'no-cache');
  const res = await fetch(url, {mode: 'no-cors', headers: headers, cache: 'no-cache'});
  const cache = await caches.open(BACKGROUND_CACHE_NAME);
  await cache.delete(new Request(id));
  await cache.put(new Request(id), res);
}

ready.push(() => {
  const setBackgroundBtn = document.getElementById('set-back');
  const resetBackground = document.getElementById('reset-back');
  const nextBackground = document.getElementById('next-back');
  let randomGradientTimer = null;
  function startRandomGradients() {
    if (randomGradientTimer) clearInterval(randomGradientTimer);
    if (options.randomGradients) {
      randomGradientTimer = setTimeout(startRandomGradients, options.quickTransitions ? 5000 : 10000);
    } else {
      randomGradientTimer = null;
    }
    setBackground(randomGradient());
  }
  const queries = [];
  const terms = ['nature', 'water', 'wallpaper'];
  terms.forEach((term, i) => {
    const otherTerms = [...terms.slice(0, i), ...terms.slice(i + 1)];
    queries.push(term);
    queries.push(term + ',' + otherTerms[0]);
    queries.push(term + ',' + otherTerms[0] + ',' + otherTerms[1]);
    queries.push(term + ',' + otherTerms[1]);
    queries.push(term + ',' + otherTerms[1] + ',' + otherTerms[0]);
  });
  queries.push(...queries.map(q => q + ',' + Date.now()));
  let index = -1;
  function newNatureBackground() {
    nextBackground.disabled = true;
    index = (index + 1) % queries.length;
    newBackground('https://source.unsplash.com/random/1600x900/?' + queries[index], 'nature').then(() => {
      setBackground(`url("nature?n=${Date.now()}")`);
      options.natureLoaded = true;
      save();
      nextBackground.disabled = false;
    }).catch(err => {
      console.dir(err);
      setBackground(`url("./images/temp-sheep.png")`); // too lazy to make an error image right now
      nextBackground.disabled = false;
    });
  }
  function activateNatureBackground() {
    if (options.natureLoaded) {
      setBackground(`url("nature?n=${Date.now()}")`);
      nextBackground.disabled = false;
    }
    else newNatureBackground();
  }
  if (options.backgroundURL) {
    setBackground(`url("custom?n=${Date.now()}")`);
    resetBackground.disabled = false;
  } else if (options.natureBackground) {
    setBackground(`url("nature?n=${Date.now()}")`);
    nextBackground.disabled = false;
    caches.open(BACKGROUND_CACHE_NAME).then(cache => cache.match('nature')).then(r => {
      if (!r) {
        newNatureBackground();
      }
    });
  } else {
    startRandomGradients();
  }
  setBackgroundBtn.addEventListener('click', e => {
    const url = prompt('URL of image: (sorry for lack of proper UI)');
    if (url) {
      setBackgroundBtn.disabled = true;
      nextBackground.disabled = true;
      newBackground(url, 'custom').then(() => {
        setBackgroundBtn.disabled = false;
        resetBackground.disabled = false;
        setBackground(`url("custom?n=${Date.now()}")`);
        options.backgroundURL = url;
        save();
        if (randomGradientTimer) clearInterval(randomGradientTimer);
      }).catch(() => {
        setBackgroundBtn.disabled = false;
        if (!options.backgroundURL && options.natureBackground) nextBackground.disabled = false;
        alert(`The image couldn't be loaded. This might be because:
- You are offline
- The website hosting the image won't let Ugwisha load their images
- There's something wrong with the URL
(sorry again for lack of proper UI)`);
      });
    }
  });
  resetBackground.addEventListener('click', e => {
    options.backgroundURL = null;
    save();
    resetBackground.disabled = true;
    nextBackground.disabled = !options.natureBackground;
    if (options.natureBackground) {
      activateNatureBackground();
    }
    else startRandomGradients();
  });
  nextBackground.addEventListener('click', newNatureBackground);

  onoptionchange.natureBackground = yes => {
    if (options.backgroundURL) return;
    if (yes) {
      if (randomGradientTimer) clearInterval(randomGradientTimer);
      activateNatureBackground();
    } else {
      startRandomGradients();
      nextBackground.disabled = true;
    }
  };
  onoptionchange.randomGradients = yes => {
    if (yes) {
      if (!options.natureBackground && !options.backgroundURL) startRandomGradients();
    }
    else if (randomGradientTimer) clearInterval(randomGradientTimer);
  };

  onconnection.push(online => {
    if (!online) nextBackground.disabled = setBackgroundBtn.disabled = true;
  });
});
