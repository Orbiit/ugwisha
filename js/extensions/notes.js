window.UgwishaExtensions.register((() => {
  const notes = Elem('textarea', {
    'aria-label': 'notes',
    value: storage.getItem('[ugwisha] notes'),
    oninput(e) {
      notes.style.height = '0';
      notes.style.height = notes.scrollHeight + 2 + 'px';
      storage.setItem('[ugwisha] notes', notes.value);
    }
  });
  let visible = false;
  window.addEventListener('resize', e => {
    if (visible) {
      notes.style.height = '0';
      notes.style.height = notes.scrollHeight + 2 + 'px';
    }
  });

  return {
    wrapper: Elem('div', {}, [notes]),
    name: 'Notes',
    icon: './images/extensions/notes.svg',
    afterAdd() {
      visible = true;
      notes.style.height = notes.scrollHeight + 2 + 'px';
    },
    beforeRemove() {
      visible = false;
    }
  };
})());
