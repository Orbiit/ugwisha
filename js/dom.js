// Helper functions for dancing with the DOM

function deundefine(obj) {
  if (Array.isArray(obj)) return obj.filter(i => i !== undefined && i !== null);
  else {
    Object.keys(obj).forEach(prop => (obj[prop] === undefined || obj[prop] === null) && delete obj[prop]);
    return obj;
  }
}
function createElement(tag, data = {}) {
  const elem = document.createElement(tag);
  if (data.classes) {
    if (typeof data.classes === 'string') elem.className = data.classes;
    else deundefine(data.classes).forEach(c => elem.classList.add(c));
  }
  if (data.children) deundefine(data.children).forEach(c => elem.appendChild(typeof c !== 'object' ? document.createTextNode(c) : c));
  if (data.attributes) {
    Object.keys(deundefine(data.attributes)).forEach(attr => {
      if (elem[attr] !== undefined) elem[attr] = data.attributes[attr];
      else elem.setAttribute(attr, data.attributes[attr]);
    });
  }
  if (data.data) {
    Object.keys(deundefine(data.data)).forEach(attr => {
      elem.dataset[attr] = data.data[attr];
    });
  }
  if (data.listeners) {
    Object.keys(deundefine(data.listeners)).forEach(ev => {
      elem.addEventListener(ev, data.listeners[ev]);
    });
  }
  if (data.styles) {
    Object.keys(deundefine(data.styles)).forEach(prop => {
      if (prop.slice(0, 2) === '--') {
        elem.style.setProperty(prop, data.styles[prop]);
      } else {
        elem.style[prop] = data.styles[prop];
      }
    });
  }
  if (data.html) elem.innerHTML = data.html;
  if (data.ripples) rippleify(elem);
  return elem;
}
function createFragment(elems) {
  const frag = document.createDocumentFragment();
  deundefine(elems).forEach(e => frag.appendChild(e));
  return frag;
}
function empty(elem) {
  while (elem.firstChild) elem.removeChild(elem.firstChild);
}

window.createElement = createElement;
window.createFragment = createFragment;
window.empty = empty;
