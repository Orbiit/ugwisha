window.ready = [];

document.addEventListener('DOMContentLoaded', e => {
  window.ready.forEach(r => r());
}, {once: true});
