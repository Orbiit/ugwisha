function createElement(tag, data = {}) {
  const elem = document.createElement(tag);
  if (data.classes) {
    if (typeof data.classes === 'string') elem.className = data.classes;
    else deundefine(data.classes).forEach(c => elem.classList.add(c));
  }
  if (data.children) deundefine(data.children).forEach(c => elem.appendChild(typeof c === 'object' ? (c instanceof Node ? c : c.render()) : document.createTextNode(c)));
  if (data.attributes) {
    Object.keys(deundefine(data.attributes)).forEach(attr => {
      if (elem[attr] !== undefined) elem[attr] = data.attributes[attr];
      else elem.setAttribute(attr, data.attributes[attr]);
    });
  }
  if (data.dataset) {
    Object.keys(deundefine(data.dataset)).forEach(attr => {
      elem.dataset[attr] = data.dataset[attr];
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
  return elem;
}

function createFragment(elems) {
  const frag = document.createDocumentFragment();
  deundefine(elems).forEach(e => frag.appendChild(e));
  return frag;
}

const textNodes = [];

function text(id) {
  const node = document.createTextNode(id);
  textNodes.push([id, node]);
  return node;
}

function setLanguage(mappings) {
  textNodes.forEach(([id, node]) => {
    node.nodeValue = mappings[id];
  });
}
