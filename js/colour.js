// DO NOT USE DIRECTLY
// this was for testing purposes lol

/**
 * see https://en.wikipedia.org/wiki/HSL_and_HSV#From_HSV
 * @param {number} hue - hue [0, 360)
 * @param {number} saturation - saturation [0, 1]
 * @param {number} value - value [0, 1]
 * @returns {number[]} - RGB
 */
function hsvToRgb(hue, saturation, value) {
  const chroma = value * saturation;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs(huePrime % 2 - 1));
  const [redPrime, greenPrime, bluePrime] = (0 <= huePrime <= 1 ? [chroma, x, 0]
                            : 1 < huePrime <= 2 ? [x, chroma, 0]
                            : 2 < huePrime <= 3 ? [0, chroma, x]
                            : 3 < huePrime <= 4 ? [0, x, chroma]
                            : 4 < huePrime <= 5 ? [x, 0, chroma]
                            : 5 < huePrime <= 6 ? [chroma, 0, x]
                            : [0, 0, 0]);
  const m = value - chroma;
  return [redPrime + m, greenPrime + m, bluePrime + m];
}

/**
 * see https://en.wikipedia.org/wiki/HSL_and_HSV#Alternative_HSV_conversion
 * @param {number} hue - hue [0, 360)
 * @param {number} saturation - saturation [0, 1]
 * @param {number} value - value [0, 1]
 * @returns {number[]} - RGB
 */
function hsvToRgbAlternate(hue, saturation, value) {
  function f(n) {
    const k = (n + hue / 60) % 6;
    return value - value * saturation * Math.max(Math.min(k, 4 - k, 1), 0);
  }
  return [f(5), f(3), f(1)];
}

/**
 * see https://en.wikipedia.org/wiki/HSL_and_HSV#Conversion_RGB_to_HSL/HSV_used_commonly_in_software_programming
 * @param {number} red - [0, 1]
 * @param {number} green - [0, 1]
 * @param {number} blue - [0, 1]
 * @returns {number[]} - HSV
 */
function rgbToHsv(red, green, blue) {
  const min = Math.min(red, green, blue);
  const max = Math.max(red, green, blue);
  let hue = max === min && red === green && green === blue ? 0
          : max === red ? 60 * (green - blue) / (max - min)
          : max === green ? 60 * (2 + (blue - red) / (max - min))
          : 60 * (4 + (red - green) / (max - min)); // if max is blue
  if (hue < 0) hue += 360;
  const saturation = max === 0 && red === green && green === blue && blue === 0 ? 0 : (max - min) / max;
  const value = max;
  return [hue, saturation, value];
}

/**
 * Converts HSV [0, 360), [0, 1], [0, 1] to RGB [0, 255] unrounded
 */
function hsvToRgbOptimized({h, s, v}) {
  const f = n => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  return {r: f(5) * 255, g: f(3) * 255, b: f(1) * 255};
}

/**
 * Converts RGB [0, 255] to HSV [0, 360), [0, 1], [0, 1] unrounded
 */
function rgbToHsvOptimized({r, g, b}) {
  r /= 255, g /= 255, b /= 255;
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const diff = max - min;
  let h = max === min && r === g && g === b ? 0
        : max === r ? 60 * (g - b) / diff
        : max === g ? 60 * (2 + (b - r) / diff)
        : 60 * (4 + (r - g) / diff);
  if (h < 0) h += 360;
  const s = max === 0 && min === 0 ? 0 : diff / max;
  const v = max;
  return {h, s, v};
}
