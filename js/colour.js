/**
 * Converts HSV to RGB unrounded
 * Based on https://en.wikipedia.org/wiki/HSL_and_HSV#Alternative_HSV_conversion
 * @param {Object} hsvColour Object representing a colour in HSV with properties h [0, 360), s [0, 1], and v [0, 1]
 * @return {Object} Object representing a colour in RGB with properties r, g, and b (all [0, 255])
 */
function hsvToRgb ({ h, s, v }) {
  const f = n => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0)
  }
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 }
}

/**
 * Converts RGB to HSV unrounded
 * Based on https://en.wikipedia.org/wiki/HSL_and_HSV#Conversion_RGB_to_HSL/HSV_used_commonly_in_software_programming
 * @param {Object} rgbColour Object representing a colour in RGB with properties r, g, and b (all [0, 255])
 * @return {Object} Object representing a colour in HSV with properties h [0, 360), s [0, 1], and v [0, 1]
 */
function rgbToHsv ({ r, g, b }) {
  r /= 255, g /= 255, b /= 255
  const min = Math.min(r, g, b)
  const max = Math.max(r, g, b)
  const diff = max - min
  let h = max === min && r === g && g === b ? 0
    : max === r ? 60 * (g - b) / diff
      : max === g ? 60 * (2 + (b - r) / diff)
        : 60 * (4 + (r - g) / diff)
  if (h < 0) h += 360
  const s = max === 0 && min === 0 ? 0 : diff / max
  const v = max
  return { h, s, v }
}

/**
 * Converts a hex string to an RGB object for use by rgbToHsv
 * @param {string} hex Six-digit hex colour string, without the #
 * @return {Object} Object representing an RGB colour
 */
function hexToRgb (hex) {
  return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4), 16) }
}
/**
 * Converts an RGB object to a hex string
 * @param {Object} rgbColour Object representing an RGB colour
 * @return {string} Six-digit hex colour string, without the #
 */
function rgbToHex ({ r, g, b }) {
  return [r, g, b].map(c => Math.floor(c).toString(16).padStart(2, '0')).join('')
}

/**
 * Converts an RGB object to a CSS rgb colour
 * @param {Object} rgbColour Object representing an RGB colour
 * @return {string} CSS rgb colour
 */
function rgbToCSS ({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Regex for detecting a hex colour; the capture groups are done so three-digit
 * hex colours can be easily turned into six-digit ones.
 * @type {Regex}
 */
const hexColourRegex = /([0-9a-f]{6})|([0-9a-f])([0-9a-f])([0-9a-f])/i

/**
 * Isolates a hexadecimal colour code from a string; supports three-digit hex
 * colours.
 * @param {string} val The string containing the hex colour
 * @return {?string} A six digit hexadecimal value (without a hash character)
 */
function parseColour (val) {
  const regexified = hexColourRegex.exec(val.toLowerCase())
  if (regexified) {
    if (regexified[1]) return regexified[1]
    else {
      return regexified.slice(2, 5).map(c => c + c).join('')
    }
  } else {
    return null
  }
}

const hues = [0, 60, 120, 180, 240, 300, 360]

function drag (elem, onchange) {
  let rect
  function getXY (e) {
    const pointer = e.type.slice(0, 5) === 'touch' ? e.touches[0] : e
    onchange((pointer.clientX - rect.left) / rect.width, (pointer.clientY - rect.top) / rect.height)
  }
  function down (e) {
    rect = elem.getBoundingClientRect()
    getXY(e)
    document.addEventListener(e.type === 'touchstart' ? 'touchmove' : 'mousemove', move, { passive: false })
    document.addEventListener(e.type === 'touchstart' ? 'touchend' : 'mouseup', up, { passive: false })
    e.stopPropagation()
    e.preventDefault()
  }
  function move (e) {
    getXY(e)
    e.preventDefault()
  }
  function up (e) {
    document.removeEventListener(e.type === 'touchend' ? 'touchmove' : 'mousemove', move)
    document.removeEventListener(e.type, up)
    e.preventDefault()
  }
  elem.addEventListener('mousedown', down, { passive: false })
  elem.addEventListener('touchstart', down, { passive: false })
}

function cap (val, min = 0, max = 1) {
  if (val > max) return max
  else if (val < min) return min
  else return val
}

function colourPicker (onupdate, currentColour = '00BCD4', allowTransparent = true, fallbackColour = '009688') {
  let colour = rgbToHsv(hexToRgb(currentColour || fallbackColour))
  let hexInput, transparent, squareSlider, hueSlider
  function update (src = {}) {
    const hex = src.hex || rgbToHex(hsvToRgb(colour))
    hexInput.value = '#' + hex
    if (src.type !== 'initial') {
      onupdate(allowTransparent && transparent.checked ? null : hex)
    }
    squareSlider.style.backgroundColor = `hsl(${colour.h}, 100%, 50%)`
    squareSlider.style.setProperty('--x', colour.s * 100 + '%')
    squareSlider.style.setProperty('--y', (1 - colour.v) * 100 + '%')
    hueSlider.style.backgroundImage = `linear-gradient(to bottom, ${hues.map(h => rgbToCSS(hsvToRgb({ h, s: colour.s, v: colour.v }))).join(',')})`
    hueSlider.style.setProperty('--val', colour.h / 360 * 100 + '%')
  }
  const wrapper = Elem('div', { className: 'colour-picker picker' }, [
    hexInput = Elem('input', {
      className: 'colour-input select-input',
      type: 'text',
      placeholder: '#123ABC',
      onchange () {
        const parsedHexColour = parseColour(hexInput.value)
        if (parsedHexColour) {
          colour = rgbToHsv(hexToRgb(parsedHexColour))
          if (allowTransparent && transparent.checked) {
            transparent.checked = false
          }
          update({ type: 'hex-input', hex: parsedHexColour })
        } else {
          hexInput.value = '#' + rgbToHex(hsvToRgb(colour))
        }
      }
    }),
    Elem('div', { className: 'colour-boxes-wrapper' }, [
      squareSlider = Elem('div', { className: 'colour-box' }),
      hueSlider = Elem('div', { className: 'colour-slider' })
    ]),
    allowTransparent ? Elem('label', { className: 'colour-transparent-label' }, [
      transparent = Elem('input', {
        className: 'colour-transparent-checkbox',
        type: 'checkbox',
        checked: currentColour === null,
        onchange: update
      }),
      'Transparent?'
    ]) : null
  ])
  drag(squareSlider, (x, y) => {
    colour.s = cap(x)
    colour.v = 1 - cap(y)
    if (allowTransparent && transparent.checked) {
      transparent.checked = false
    }
    update({ type: 'square' })
  })
  drag(hueSlider, (x, y) => {
    colour.h = cap(y) * 360
    if (allowTransparent && transparent.checked) {
      transparent.checked = false
    }
    update({ type: 'hue' })
  })
  update({ type: 'initial', hex: currentColour || fallbackColour })
  return wrapper
}
