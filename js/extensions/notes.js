UgwishaExtensions.register((() => {
  const wrapper = document.createElement('div');
  const notes = document.createElement('textarea');
  notes.setAttribute('aria-label', 'notes');
  notes.value = storage.getItem('[ugwisha] notes');
  notes.addEventListener('input', e => {
    notes.style.height = '0';
    notes.style.height = notes.scrollHeight + 2 + 'px';
    storage.setItem('[ugwisha] notes', notes.value);
  });
  let visible = false;
  window.addEventListener('resize', e => {
    if (visible) {
      notes.style.height = '0';
      notes.style.height = notes.scrollHeight + 2 + 'px';
    }
  });
  wrapper.appendChild(notes);

  return {
    id: 'notes',
    wrapper: wrapper,
    name: 'Notes',
    icon: './images/notes-icon.svg',
    url: './js/extensions/notes.js',
    afterAdd() {
      visible = true;
      notes.style.height = notes.scrollHeight + 2 + 'px';
    },
    beforeRemove() {
      visible = false;
    }
  };
})());
