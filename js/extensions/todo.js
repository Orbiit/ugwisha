window.UgwishaExtensions.register((() => {
  function randomId() {
    return Math.random().toString(36).slice(2);
  }

  const TODO_KEY = '[ugwisha] extensions.todo';
  const JSONSTORE_TOKEN = '[ugwisha] extensions.todo.token';
  let token = storage.getItem(JSONSTORE_TOKEN);
  const wrapper = Elem('div');
  let list;
  try {
    const save = JSON.parse(storage.getItem(TODO_KEY));
    switch (save.v || null) {
      case null:
        save.list = save.map(content => [randomId(), content]);
    }
    list = save.list.map(([id, content]) => ({id, content}));
  } catch (e) {
    list = [];
  }
  function save() {
    storage.setItem(TODO_KEY, JSON.stringify({
      v: 1,
      list: list.map(({id, content}) => [id, content])
    }));
  }
  function createTodoItem(entry) {
    const removeBtn = Elem('button', {
      className: 'todo-icon todo-remove icon-btn',
      'aria-label': 'Remove to-do item',
      ripple: true,
      onclick(e) {
        const index = list.indexOf(entry);
        if (~index) {
          list.splice(index, 1);
          save();
        }
        wrapper.removeChild(parent);
      }
    });
    const input = Elem('input', {
      className: 'todo-content basic-input',
      value: entry.content,
      type: 'text',
      onchange(e) {
        entry.content = input.value;
        save();
      },
      onkeydown(e) {
        const index = list.indexOf(entry);
        if (~index) {
          const cursorPos = input.selectionStart === input.selectionEnd ? input.selectionStart : null;
          if (cursorPos === null) return;
          if (e.keyCode === 8 && (!input.value || cursorPos === 0 && index > 0)) {
            if (index > 0) {
              const lastEntry = list[index - 1];
              lastEntry.input.focus();
              const oldEntryLength = lastEntry.input.value.length;
              if (input.value) {
                lastEntry.input.value += input.value;
                lastEntry.content = list[index - 1].input.value;
                save();
              }
              lastEntry.input.selectionStart = lastEntry.input.selectionEnd = oldEntryLength;
            } else {
              const nextInput = index === list.length - 1 ? addInput : list[index + 1].input;
              nextInput.focus();
              nextInput.selectionStart = nextInput.selectionEnd = 0;
              e.preventDefault();
            }
            removeBtn.click();
            e.preventDefault();
          } else if (e.keyCode === 13 && input.value) {
            const newEntry = {
              id: randomId(),
              content: input.value.slice(0, input.selectionStart)
            };
            list.splice(index, 0, newEntry);
            wrapper.insertBefore(createTodoItem(newEntry), parent);
            entry.content = input.value = input.value.slice(input.selectionStart);
            input.selectionStart = input.selectionEnd = 0;
            save();
            e.preventDefault();
          } else if (e.keyCode === 37 && cursorPos === 0 && index > 0) {
            const lastInput = list[index - 1].input;
            lastInput.focus();
            lastInput.selectionStart = lastInput.selectionEnd = lastInput.value.length;
            e.preventDefault();
          } else if (e.keyCode === 39 && cursorPos === input.value.length && index < list.length) {
            const nextInput = index === list.length - 1 ? addInput : list[index + 1].input;
            nextInput.focus();
            nextInput.selectionStart = nextInput.selectionEnd = 0;
            e.preventDefault();
          }
        }
      }
    });
    const parent = Elem('div', {className: 'todo-item'}, [removeBtn, input]);
    entry.input = input;
    return parent;
  }
  function clearTodoItems() {
    for (const {input} of list) {
      wrapper.removeChild(input.parentNode);
    }
    list.splice(0, list.length)
  }
  const addBtn = Elem('button', {
    className: 'todo-icon todo-add icon-btn',
    'aria-label': 'Add to-do item',
    ripple: true,
    onclick(e) {
      if (addInput.value) {
        const newEntry = {id: randomId(), content: addInput.value};
        list.push(newEntry);
        wrapper.insertBefore(createTodoItem(newEntry), addWrapper);
        addInput.value = '';
        save();
      }
    }
  });
  const addInput = Elem('input', {
    className: 'todo-content basic-input',
    placeholder: 'Add to-do item',
    type: 'text',
    onkeydown(e) {
      const cursorPos = addInput.selectionStart === addInput.selectionEnd ? addInput.selectionStart : null;
      if (e.keyCode === 13) {
        addBtn.click();
        e.preventDefault();
      } else if (e.keyCode === 37 && cursorPos === 0 && list.length > 0) {
        const lastInput = list[list.length - 1].input;
        lastInput.focus();
        lastInput.selectionStart = lastInput.selectionEnd = lastInput.value.length;
        e.preventDefault();
      }
    }
  });
  const addWrapper = Elem('div', {className: 'todo-item'}, [addBtn, addInput]);

  const createSyncID = Elem('button', {
    className: 'button',
    ripple: true,
    onclick() {
      useSyncID.disabled = true;
      createSyncID.disabled = true;
      reportError(fetch('https://www.jsonstore.io/get-token')
        .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
        .then(({token}) => token ? startUsingToken(token) : Promise.reject('Problem getting sync ID'))
        .then(() => {
          useSyncID.disabled = false;
          createSyncID.disabled = false;
        })
        .catch(err => {
          useSyncID.disabled = false;
          createSyncID.disabled = false;
          return Promise.reject(err);
        }));
    }
  }, ['Create new']);
  const syncID = Elem('input', {
    className: 'select-input todo-use-sync-id',
    placeholder: 'Existing sync ID',
    onkeydown(e) {
      if (e.key === 'Enter') useSyncID.click();
    }
  });
  const useSyncID = Elem('button', {
    className: 'button todo-use-sync-btn',
    ripple: true,
    onclick() {
      useSyncID.disabled = true;
      createSyncID.disabled = true;
      reportError(startUsingToken(syncID.value)
        .then(() => {
          useSyncID.disabled = false;
          createSyncID.disabled = false;
        }));
    }
  }, ['Use'])
  const tokenSpan = Elem('span', {className: 'todo-sync-id'}, [token]);
  const refreshBtn = Elem('button', {
    className: 'button todo-reload-btn',
    ripple: true,
    onclick() {
      reportError(refresh());
    }
  }, ['Refresh']);
  const errorMessage = Elem('p', {className: 'error'});
  function reportError(prom) {
    prom
      .then(() => {
        errorMessage.textContent = '';
      })
      .catch(err => {
        console.error(err);
        errorMessage.textContent = err;
      });
  }
  function refresh() {
    refreshBtn.disabled = true;
    return fetch(`https://www.jsonstore.io/${token}/`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(({result, ok, error}) => {
        if (!ok) return Promise.reject(error);
        clearTodoItems();
        for (const [id, content] of entries) {
          const entry = {id, content};
          wrapper.insertBefore(createTodoItem(entry), addWrapper);
          list.push(entry);
        }
        // save();
        refreshBtn.disabled = false;
      })
      .catch(err => {
        refreshBtn.disabled = false;
        return Promise.reject(err);
      });
  }
  function sync(changes) {
    return fetch(`https://www.jsonstore.io/${token}/`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(({result, ok, error}) => {
        if (!ok) return Promise.reject(error);
        let changed = false;
        for (const {id, change, before, time} of changes) {
          const index = result.findIndex(entry => entry[0] === id);
          if (~index) {
            if (time > result[index][2]) {
              changed = true;
              if (change === null) {
                // Delete item
                result.splice(index, 1);
              } else {
                // Update item
                result[index][1] = change;
              }
            }
          } else if (change !== null) {
            // Add a new item
            changed = true;
            const beforeIndex = result.findIndex(entry => entry[0] === before);
            if (~beforeIndex) {
              result.splice(beforeIndex, 0, [id, change, time]);
            } else {
              // Default to end of list
              result.push([id, change, time]);
            }
          }
        }
        if (changed) {
          return fetch(`https://www.jsonstore.io/${token}/`, {
            headers: {
              'Content-type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify(result)
          })
            .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
            .then(({ok, error}) => {
              if (!ok) return Promise.reject(error);
            });
        }
      });
  }
  function startUsingToken(newToken) {
    token = newToken;
    tokenSpan.textContent = token;
    storage.setItem(JSONSTORE_TOKEN, token);
    wrapper.classList.add('todo-synching');
    const changes = [];
    for (let i = 0; i < list.length; i++) {
      changes.push({
        id: list[i].id,
        change: list[i].content,
        before: list[i + 1] ? list[i + 1].id : null,
        time: list[i].time // TODO: Save time property in entries (in localStorage)
      });
    }
    return sync(changes).then(() => refresh());
  }
  if (token) {
    wrapper.classList.add('todo-synching');
  }

  wrapper.appendChild(Fragment([
    ...list.map(createTodoItem),
    addWrapper,
    Elem('hr'),
    Elem('div', {className: 'todo-add-sync'}, [
      Elem('div', {className: 'center'}, [createSyncID]),
      Elem('div', {className: 'todo-use-sync'}, [syncID, useSyncID])
    ]),
    Elem('div', {className: 'todo-stop-sync'}, [
      Elem('p', {}, [
        'Your sync ID is ',
        tokenSpan,
        '.'
      ]),
      Elem('div', {className: 'center'}, [
        refreshBtn,
        Elem('button', {
          className: 'button',
          ripple: true,
          onclick(e) {
            wrapper.classList.remove('todo-synching');
            token = null;
            storage.removeItem(JSONSTORE_TOKEN);
          }
        }, ['Stop synching'])
      ])
    ]),
    errorMessage
  ]));

  return {
    wrapper: wrapper,
    name: 'Todo',
    icon: './images/extensions/todo.svg',
    styles: './js/extensions/todo.css',
    sources: ['./images/material/add.svg?for=todo', './images/material/remove.svg?for=todo'],
    beforeAdd() {
      if (token) {
        refresh();
      }
    }
  };
})());
