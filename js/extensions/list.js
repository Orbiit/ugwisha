window.UgwishaExtensions.register((() => {
  const listData = {
    club: {
      name: 'Clubs',
      source: 'https://docs.google.com/spreadsheets/d/1HUaNWegOIk972lGweoSuNcXtfX7XuGBTQU-gcTsvD9s/',
      sourceDate: new Date(2019, 1, 2),
      json: 'https://orbiit.github.io/gunn-web-app/json/clubs.json',
      subtext: ['room', 'day'],
      details: [
        ['Meeting day', 'day'],
        ['Meeting time', 'time'],
        ['Location', 'room'],
        ['Description', 'desc'],
        ['President(s)', 'president'],
        ['Teacher advisor(s)', 'teacher'],
        ['Teacher email', 'email', 'email'],
        ['Suggested donation', 'donation']
      ],
      defaultSearch: [null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'][new Date().getDay()]
    },
    staff: {
      name: 'Staff',
      source: 'https://gunn.pausd.org/connect/staff-directory',
      sourceDate: new Date(2019, 4, 20),
      json: 'https://orbiit.github.io/gunn-web-app/json/staff.json',
      subtext: ['jobTitle', 'department'],
      details: [
        ['Title', 'jobTitle'],
        ['Department', 'department'],
        ['Email', 'email', 'email'],
        ['Phone', 'phone'],
        ['Website', 'webpage', 'link']
      ]
    }
  };
  const listType = new URL(document.currentScript.src).searchParams.get('for');
  if (!listData[listType]) throw new Error('Nonexistent list');
  const list = listData[listType];
  const searchBar = Elem('input', {
    className: 'select-input list-search',
    type: 'text',
    placeholder: 'Search',
    value: list.defaultSearch || '',
    style: {
      backgroundImage: `url('./images/material/search.svg?for=list-${listType}')`
    }
  });
  const elems = Elem('div', {className: 'list-wrapper'});
  const entries = [];
  let showing = false;
  fetch(list.json).then(r => r.json()).then(json => {
    elems.appendChild(Fragment(Object.keys(json).sort().map(name => {
      const item = json[name];
      const elem = Elem('div', {
        className: 'list-item',
        ripple: true,
        onclick() {
          elem.classList.add('list-expanded');
          elem.classList.add('no-ripple');
        }
      }, [
        Elem('div', {className: 'list-title'}, [name]),
        ...list.subtext.map(key => item[key] && Elem('div', {className: 'list-subtext'}, [item[key]])),
        ...list.details.map(([label, key, type]) => item[key] && Elem('div', {className: 'list-detail'}, [
          Elem('span', {className: 'list-label'}, [label]),
          type === 'email' ? Elem('a', {
            className: 'list-detail-value',
            href: 'mailto:' + item[key],
            target: '_blank',
            rel: 'noopener noreferrer'
          }, [item[key]])
          : type === 'link' ? Elem('a', {
            className: 'list-detail-value',
            href: item[key],
            target: '_blank',
            rel: 'noopener noreferrer'
          }, [item[key]])
          : Elem('span', {className: 'list-detail-value'}, [item[key]])
        ])),
        Elem('button', {
          className: 'button list-close',
          ripple: true,
          onclick(e) {
            elem.classList.remove('list-expanded');
            elem.classList.remove('no-ripple');
            e.stopPropagation();
          }
        }, ['close'])
      ]);
      entries.push({elem, text: name + '\n' + list.details.map(e => item[e[1]] || '').join('\n')});
      return elem;
    })));

    function search() {
      if (searchBar.value) {
        if (searchBar.value.slice(0, 2) === 'r/') {
          try {
            const regex = new RegExp(searchBar.value.slice(2), 'i');
            entries.forEach(({elem, text}) => {
              if (regex.test(text)) elem.classList.remove('list-hidden');
              else elem.classList.add('list-hidden');
            });
            return;
          } catch (e) {}
        } else {
          const substring = searchBar.value.toLowerCase();
          entries.forEach(({elem, text}) => {
            if (text.toLowerCase().includes(substring)) elem.classList.remove('list-hidden');
            else elem.classList.add('list-hidden');
          });
          return;
        }
      }
      entries.forEach(({elem}) => {
        elem.classList.remove('list-hidden');
      });
    }
    searchBar.addEventListener('input', search);
    search();

    window.UgwishaEvents.resize.push(updateScrollHeights);
    window.addEventListener('resize', updateScrollHeights);
    updateScrollHeights();
  }).catch(e => {
    elems.appendChild(Elem('span', {className: 'list-error'}, ['Problem loading the list']));
    searchBar.disabled = true;
  });
  function updateScrollHeights() {
    if (!showing) return;
    entries.forEach(({elem}) => {
      for (const item of elem.children) {
        item.tempScrollHeight = item.scrollHeight;
      }
    });
    entries.forEach(({elem}) => {
      for (const item of elem.children) {
        item.style.setProperty('--max-height', item.tempScrollHeight + 'px');
      }
    });
  }

  return {
    wrapper: Elem('div', {}, [
      searchBar,
      Elem('p', {className: 'list-src'}, [
        'Data sourced from ',
        Elem('a', {
          className: 'list-detail-value',
          href: list.source,
          target: '_blank',
          rel: 'noopener noreferrer'
        }, ['here']),
        ' on ' + list.sourceDate.toLocaleDateString() + '.'
      ]),
      elems
    ]),
    name: list.name,
    icon: `./images/extensions/list-${listType}.svg`,
    styles: './js/extensions/list.css?for=' + listType,
    sources: ['./images/material/search.svg?for=list-' + listType, list.json],
    afterAdd() {
      showing = true;
      updateScrollHeights();
    },
    beforeRemove() {
      showing = false;
    }
  };
})());
