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
 *                     transition to
 */
function setBackground(css) {
  if (!document.body) return;
  const transitioner = Elem('div', {className: 'transition-background'});
  transitioner.style.backgroundImage = document.body.style.backgroundImage;
  const stopper = setTimeout(() => { // just in case
    document.body.removeChild(transitioner);
  }, options.backgroundFade * 1000);
  transitioner.addEventListener('animationend', e => {
    document.body.removeChild(transitioner);
    clearTimeout(stopper);
  });
  document.body.insertBefore(transitioner, document.body.firstChild);
  document.body.style.backgroundImage = css;
}

let randomGradientTimer = null;
if (!options.backgroundLoop) options.backgroundLoop = options.quickTransitions ? 5 : 10;
if (!options.backgroundFade) options.backgroundFade = options.quickTransitions ? 0.5 : 5;
function startRandomGradients() {
  if (randomGradientTimer) clearInterval(randomGradientTimer);
  if (options.randomGradients) {
    randomGradientTimer = setTimeout(startRandomGradients, options.backgroundLoop * 1000);
  } else {
    randomGradientTimer = null;
  }
  setBackground(randomGradient());
}

let backgroundExternallyControlled = false;
window.Ugwisha.requestBackgroundControl = () => {
  if (backgroundExternallyControlled) {
    return null;
  } else {
    backgroundExternallyControlled = true;
    clearTimeout(randomGradientTimer);
    randomGradientTimer = true;
    return setBackground;
  }
};
window.Ugwisha.relinquishBackgroundControl = fn => {
  if (fn !== setBackground) throw new Error('Fake');
  backgroundExternallyControlled = false;
  startRandomGradients();
};

ready.push(() => {
  document.body.style.setProperty('--background-transition-speed', options.backgroundFade + 's');
  if (!backgroundExternallyControlled) startRandomGradients();
});
