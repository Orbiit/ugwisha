window.UgwishaExtensions.register((() => {
  function randomId() {
    return Math.random().toString(36).slice(2);
  }
  function wait(time) {
    return new Promise(res => setTimeout(res, time));
  }

  const TODO_KEY = '[ugwisha] extensions.todo';
  const JSONSTORE_TOKEN = '[ugwisha] extensions.todo.token';
  const CHANGE_QUEUE = '[ugwisha] extensions.todo.changeQueue';
  const THROTTLE_DELAY = 1000;
  let token = storage.getItem(JSONSTORE_TOKEN);
  const wrapper = Elem('div');
  let list;
  try {
    const save = JSON.parse(storage.getItem(TODO_KEY));
    switch (save.v || null) {
      case null:
        save.list = save.map(content => [randomId(), content, Date.now()]);
    }
    list = save.list.map(([id, content, lastEdited]) => ({id, content, lastEdited}));
  } catch (e) {
    list = [];
  }
  let changeQueue = null;
  let syncReady = null;
  if (token) {
    try {
      changeQueue = JSON.parse(storage.getItem(CHANGE_QUEUE));
      if (!Array.isArray(changeQueue)) throw new Error('')
    } catch (e) {
      changeQueue = [];
    }
    syncReady = Promise.resolve();
  }
  function save() {
    storage.setItem(TODO_KEY, JSON.stringify({
      v: 1,
      list: list.map(({id, content, lastEdited}) => [id, content, lastEdited])
    }));
    if (changeQueue && visible) {
      storage.setItem(CHANGE_QUEUE, JSON.stringify(changeQueue));
      if (syncReady && changeQueue.length) {
        syncReady.then(() => reportError(sync()));
        // All changes that are added later to `changeQueue` will still be synched!
        syncReady = null;
      }
    }
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
          if (changeQueue) {
            changeQueue.push({id: entry.id, change: null, time: Date.now()});
          }
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
        entry.lastEdited = Date.now();
        if (changeQueue) {
          changeQueue.push({
            id: entry.id,
            change: entry.content,
            time: entry.lastEdited
          });
        }
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
              content: input.value.slice(0, input.selectionStart),
              lastEdited: Date.now()
            };
            list.splice(index, 0, newEntry);
            wrapper.insertBefore(createTodoItem(newEntry), parent);
            if (changeQueue) {
              changeQueue.push({
                id: newEntry.id,
                change: newEntry.content,
                before: entry.id,
                time: newEntry.lastEdited
              });
            }
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
        const newEntry = {
          id: randomId(),
          content: addInput.value,
          lastEdited: Date.now()
        };
        list.push(newEntry);
        wrapper.insertBefore(createTodoItem(newEntry), addWrapper);
        if (changeQueue) {
          changeQueue.push({
            id: newEntry.id,
            change: newEntry.content,
            before: null,
            time: newEntry.lastEdited
          });
        }
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
        .finally(() => {
          useSyncID.disabled = false;
          createSyncID.disabled = false;
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
        .finally(() => {
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
  const status = Elem('p', {className: 'todo-status'});
  function reportError(prom) {
    prom
      .catch(err => {
        console.error('UNSIGHTLY TODO WUCKY!', err);
        status.classList.add('todo-error');
        status.textContent = err;
      });
  }
  function refresh() {
    status.classList.remove('todo-error');
    status.textContent = 'Fetching...';
    refreshBtn.disabled = true;
    return fetch(`https://www.jsonstore.io/${token}/`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(({result, ok, error}) => {
        if (!ok) return Promise.reject(error);
        clearTodoItems();
        for (const [id, content, lastEdited] of result) {
          const entry = {id, content, lastEdited};
          wrapper.insertBefore(createTodoItem(entry), addWrapper);
          list.push(entry);
        }
        save();
        status.textContent = 'Fetched.';
      })
      .finally(() => {
        refreshBtn.disabled = false;
      });
  }
  function sync() {
    status.classList.remove('todo-error');
    status.textContent = 'Synching...';
    const prom = fetch(`https://www.jsonstore.io/${token}/`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .catch(err => {
        syncReady = wait(THROTTLE_DELAY);
        // The changes weren't able to sync and need to resync!
        save();
        return Promise.reject(err);
      })
      .then(({result, ok, error}) => {
        // Changes that need to be synched after this point should call `sync`
        // once `syncReady` is resolved
        syncReady = prom.catch(() => {}).then(() => wait(THROTTLE_DELAY));

        if (!ok) {
          // The changes weren't able to sync and need to resync!
          save();
          return Promise.reject(error);
        }

        if (!result) result = []; // It'll be null when it first starts

        const changes = changeQueue;
        changeQueue = [];
        storage.setItem(CHANGE_QUEUE, JSON.stringify(changeQueue));
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
                result[index][2] = time;
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
          status.textContent = 'Saving...';
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
              status.textContent = 'Saved.';
            })
            .catch(err => {
              changeQueue.push(...changes);
              // These changes couldn't save and need to resync!
              save();
              return Promise.reject(err);
            });
        } else {
          status.textContent = 'Synched.';
        }
      });
    return prom;
  }
  function startUsingToken(newToken) {
    token = newToken;
    tokenSpan.textContent = token;
    storage.setItem(JSONSTORE_TOKEN, token);
    wrapper.classList.add('todo-synching');
    changeQueue = [];
    for (let i = 0; i < list.length; i++) {
      changeQueue.push({
        id: list[i].id,
        change: list[i].content,
        before: list[i + 1] ? list[i + 1].id : null,
        time: list[i].lastEdited
      });
    }
    return sync().then(() => refresh());
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
            storage.removeItem(CHANGE_QUEUE);
            changeQueue = null;
            syncReady = null;
            status.textContent = '';
          }
        }, ['Stop synching'])
      ])
    ]),
    status
  ]));

  let visible = false;
  return {
    wrapper: wrapper,
    name: 'Todo',
    icon: './images/extensions/todo.svg',
    styles: './js/extensions/todo.css',
    sources: ['./images/material/add.svg?for=todo', './images/material/remove.svg?for=todo'],
    beforeAdd() {
      visible = true;
      if (token) {
        if (syncReady && changeQueue.length) {
          reportError(sync().then(() => refresh()));
          syncReady = null;
        } else {
          reportError(refresh());
        }
      }
    },
    afterRemove() {
      visible = false;
    }
  };
})());
