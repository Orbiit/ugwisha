window.UgwishaExtensions.register((() => {
  const CLIPBOARD_URL = 'https://sheeptester.github.io/javascripts/clipboard.min.js?for=clipboard';
  const STORAGE_NAME = '[ugwisha] clipboards';

  const clipboards = [];
  try {
    JSON.parse(storage.getItem(STORAGE_NAME)).forEach(c => clipboards.push(c));
  } catch (e) {
    [
      '¯\\_(ツ)_/¯',
      '🤔'
    ].forEach(c => clipboards.push(c));
  }
  function save() {
    storage.setItem(STORAGE_NAME, JSON.stringify(clipboards));
  }

  function createClipboardEntry(text) {
    const copyButton = Elem('button', {
      className: 'button clipboard-copier',
      title: text,
      ripple: true,
      data: {
        clipboardText: text
      }
    }, [text]);
    new ClipboardJS(copyButton, {container: copyButton});
    const wrapper = Elem('div', {className: 'clipboard-entry', title: text}, [
      Elem('button', {
        className: 'icon-btn clipboard-remove',
        ripple: true,
        onclick() {
          const index = Array.from(clipboardEntries.children).indexOf(wrapper);
          if (~index) {
            clipboards.splice(index, 1);
            save();
          }
          clipboardEntries.removeChild(wrapper);
        }
      }),
      copyButton
    ]);
    return wrapper;
  }

  const clipboardEntries = Elem('div', {className: 'clipboard-entries'});
  const newClipboardInput = Elem('input', {
    className: 'select-input clipboard-add',
    type: 'text',
    placeholder: 'Content to copy',
    onkeydown(e) {
      if (e.keyCode === 13) newClipboardBtn.click();
    }
  });
  const newClipboardBtn = Elem('button', {
    className: 'button',
    ripple: true,
    onclick() {
      clipboardEntries.appendChild(createClipboardEntry(newClipboardInput.value));
      clipboards.push(newClipboardInput.value);
      newClipboardInput.value = '';
      save();
    }
  }, ['add']);

  document.head.appendChild(Elem('script', {
    src: CLIPBOARD_URL,
    onload() {
      clipboards.forEach(c => clipboardEntries.appendChild(createClipboardEntry(c)));
    }
  }));

  return {
    wrapper: Elem('div', {}, [
      clipboardEntries,
      Elem('div', {className: 'add-clipboard-wrapper'}, [
        newClipboardInput,
        newClipboardBtn
      ])
    ]),
    name: 'Quick copy',
    icon: './images/extensions/clipboard.svg',
    styles: './js/extensions/clipboard.css',
    sources: [
      './images/material/remove.svg?for=clipboard',
      CLIPBOARD_URL
    ]
  };
})());
