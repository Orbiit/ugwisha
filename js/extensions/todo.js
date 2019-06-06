window.UgwishaExtensions.register((() => {
  const TODO_KEY = '[ugwisha] extensions.todo';
  const wrapper = Elem('div');
  let list;
  try {
    list = JSON.parse(storage.getItem(TODO_KEY)).map(content => ({content: content}));
  } catch (e) {
    list = [];
  }
  function save() {
    // text is stored in arrays so I can use object references instead of indices
    storage.setItem(TODO_KEY, JSON.stringify(list.map(({content}) => content)));
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
            const newEntry = {content: input.value.slice(0, input.selectionStart)};
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
  const addBtn = Elem('button', {
    className: 'todo-icon todo-add icon-btn',
    'aria-label': 'Add to-do item',
    ripple: true,
    onclick(e) {
      if (addInput.value) {
        const newEntry = {content: addInput.value};
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
  wrapper.appendChild(Fragment([
    ...list.map(createTodoItem),
    addWrapper
  ]));

  return {
    wrapper: wrapper,
    name: 'Todo',
    icon: './images/todo-icon.svg',
    styles: './js/extensions/todo.css',
    sources: ['./images/material-add.svg?for=todo', './images/material-remove.svg?for=todo']
  };
})());
