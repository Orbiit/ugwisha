UgwishaExtensions.register((() => {
  // https://en.wikipedia.org/wiki/Code_39
  const sequences = {
    '0': 349, '1': 581, '2': 419, '3': 661, '4': 347, '5': 589,
    '6': 427, '7': 341, '8': 583, '9': 421, 'A': 599, 'K': 605,
    'U': 527, 'B': 437, 'L': 443, 'V': 311, 'C': 679, 'M': 685,
    'W': 553, 'D': 383, 'N': 389, 'X': 293, 'E': 625, 'O': 631,
    'Y': 535, 'F': 463, 'P': 469, 'Z': 319, 'G': 359, 'Q': 371,
    '-': 287, 'H': 601, 'R': 613, '.': 529, 'I': 439, 'S': 451,
    ' ': 313, 'J': 385, 'T': 397, '*': 295, '+': 2521, '/': 2467,
    '$': 2461, '%': 3007
  };
  const unsupportedCharsRegex = /[^A-Z0-9\-\. \+/\$%]/g;
  function createRenderer(canvas) {
    canvas.style.imageRendering = 'optimizeSpeed';
    canvas.style.imageRendering = '-moz-crisp-edges';
    canvas.style.imageRendering = '-webkit-optimize-contrast';
    canvas.style.imageRendering = '-o-crisp-edges';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.msInterpolationMode = 'nearest-neighbor';
    canvas.height = 1;
    const c = canvas.getContext('2d');
    return text => {
      text = `*${text.toUpperCase().replace(unsupportedCharsRegex, '')}*`;
      canvas.width = text.length * 16 - 1;
      c.fillStyle = 'white';
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = 'black';
      let x = 0;
      for (let i = 0; i < text.length; i++) {
        const pattern = sequences[text[i]].toString(3);
        for (let j = 0; j < pattern.length; j++) {
          switch (pattern[j]) {
            case '2': c.fillRect(x, 0, 3, canvas.height); x += 4; break;
            case '1': c.fillRect(x, 0, 1, canvas.height); x += 2; break;
            case '0': x += 2; break;
          }
        }
      }
    };
  }

  const STORAGE_KEY = '[ugwisha] barcodes';
  const barcodeWrapper = document.createElement('div');
  if (!storage.getItem(STORAGE_KEY)) storage.setItem(STORAGE_KEY, '[["Me", "95012345"]]');
  const barcodes = JSON.parse(storage.getItem(STORAGE_KEY));
  function save() {
    storage.setItem(STORAGE_KEY, JSON.stringify(barcodes));
  }
  function createBarcodeEditor(entry) {
    const canvas = document.createElement('canvas');
    canvas.classList.add('barcode-canvas');
    const render = createRenderer(canvas);
    render(entry[1]);
    const parent = createElement('div', {
      classes: 'barcode-wrapper',
      children: [
        createElement('input', {
          classes: 'barcode-input',
          attributes: {
            value: entry[0],
            placeholder: 'Whose ID?'
          },
          listeners: {
            input(e) {
              entry[0] = this.value;
              save();
            }
          }
        }),
        createElement('div', {
          classes: 'barcode-id-wrapper',
          children: [
            createElement('input', {
              classes: 'barcode-input',
              attributes: {
                value: entry[1],
                placeholder: 'Student ID'
              },
              listeners: {
                input(e) {
                  render(this.value);
                  entry[1] = this.value;
                  save();
                }
              }
            }),
            createElement('button', {
              classes: 'barcode-display button',
              children: ['view'],
              attributes: {
                'aria-label': 'Display barcode for scanner'
              },
              listeners: {
                click(e) {
                  parent.classList.add('barcode-displaying');
                }
              },
              ripples: true
            })
          ]
        }),
        createElement('div', {
          classes: 'barcode-canvas-wrapper',
          children: [
            canvas,
            createElement('button', {
              classes: 'barcode-remove icon-btn',
              attributes: {
                'aria-label': 'Remove barcode'
              },
              listeners: {
                click(e) {
                  const index = barcodes.indexOf(entry);
                  if (~index) {
                    barcodes.splice(index, 1);
                    save();
                  }
                  barcodeWrapper.removeChild(parent);
                }
              },
              ripples: true
            })
          ],
          listeners: {
            click(e) {
              parent.classList.remove('barcode-displaying');
            }
          }
        })
      ]
    });
    return parent;
  }
  barcodeWrapper.appendChild(createFragment(barcodes.map(createBarcodeEditor)));

  return {
    id: 'barcode',
    wrapper: createElement('div', {
      children: [
        barcodeWrapper,
        createElement('button', {
          classes: 'barcode-add button',
          children: ['add barcode'],
          attributes: {
            'aria-label': 'Add barcode'
          },
          listeners: {
            click(e) {
              const entry = [
                'Student ' + barcodes.length,
                '950' + (Math.random() * 10000 >> 0).toString().padStart(5, '0')
              ];
              barcodes.push(entry);
              save();
              barcodeWrapper.appendChild(createBarcodeEditor(entry));
            }
          },
          ripples: true
        }),
        createElement('p', {
          children: ['When scanning, set the screen brightness to max.']
        })
      ]
    }),
    name: 'Barcode',
    icon: './images/barcode-icon.svg',
    url: './js/extensions/barcode.js',
    styles: './js/extensions/barcode.css',
    sources: ['./images/material-delete_outline.svg?for=barcode']
  };
})());
