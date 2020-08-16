window.UgwishaExtensions.register((() => {
  const TITLE_HEIGHT = 24;
  const PADDING = 10;
  const SUBTEXT_HEIGHT = 21;

  const listData = {
    club: {
      name: 'Clubs',
      source: 'https://docs.google.com/spreadsheets/d/1HUaNWegOIk972lGweoSuNcXtfX7XuGBTQU-gcTsvD9s/',
      sourceDate: new Date(2020, 7, 4),
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
      sourceDate: new Date(2020, 7, 4),
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

  const entryHeight = TITLE_HEIGHT + PADDING + list.subtext.length * SUBTEXT_HEIGHT;
  const elems = Elem('div', {
    className: 'list-wrapper',
    style: {
      '--item-height': entryHeight + 'px'
    }
  });
  const entries = [];

  fetch(list.json).then(r => r.json()).then(json => {
    elems.appendChild(Fragment(Object.keys(json).sort().map(name => {
      const item = json[name];
      let moreDetails, canHide = false;
      const elem = Elem('div', {
        className: 'list-item',
        ripple: true,
        onclick(e) {
          if (!moreDetails) {
            moreDetails = Elem('div', {
              className: 'list-details',
              ontransitionend() {
                if (canHide) {
                  elems.removeChild(moreDetails);
                  canHide = false;
                }
              }
            }, [
              Elem('div', {className: 'list-detail-title'}, [name]),
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
                onclick() {
                  canHide = true;
                  moreDetails.classList.add('disappear');
                }
              }, ['close'])
            ]);
          }
          if (moreDetails.contains(e.target)) return;

          moreDetails.style.setProperty('--pos', elem.style.getPropertyValue('--pos'));
          canHide = false;
          moreDetails.classList.remove('disappear');
          elems.appendChild(moreDetails);
        }
      }, [
        Elem('div', {className: 'list-title'}, [name]),
        ...list.subtext.map(key => item[key] && Elem('div', {className: 'list-subtext'}, [item[key]]))
      ]);
      entries.push({
        elem,
        text: name + '\n' + list.details.map(e => item[e[1]] || '').join('\n')
      });
      return elem;
    })));

    function search() {
      if (searchBar.value) {
        if (searchBar.value.slice(0, 2) === 'r/') {
          try {
            const regex = new RegExp(searchBar.value.slice(2), 'i');
            let i = 0;
            entries.forEach(({elem, text}) => {
              if (regex.test(text)) {
                elem.style.setProperty('--pos', i++);
                elem.classList.remove('list-hidden');
              } else {
                elem.classList.add('list-hidden');
              }
            });
            elems.style.height = i * entryHeight + 'px';
          } catch (e) {}
        } else {
          const substring = searchBar.value.toLowerCase();
          let i = 0;
          entries.forEach(({elem, text}) => {
            if (text.toLowerCase().includes(substring)) {
              elem.style.setProperty('--pos', i++);
              elem.classList.remove('list-hidden');
            } else {
              elem.classList.add('list-hidden');
            }
          });
          elems.style.height = i * entryHeight + 'px';
        }
      } else {
        entries.forEach(({elem}, i) => {
          elem.style.setProperty('--pos', i);
          elem.classList.remove('list-hidden');
        });
        elems.style.height = entries.length * entryHeight + 'px';
      }
      updateVisible();
    }
    searchBar.addEventListener('input', search);
    search();
  }).catch(e => {
    elems.appendChild(Elem('span', {className: 'list-error'}, ['Problem loading the list']));
    searchBar.disabled = true;
  });

  function updateVisible() {
    const wrapperY = elems.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;
    const min = -wrapperY / entryHeight - 1;
    const max = (windowHeight - wrapperY) / entryHeight;
    let i = 0;
    entries.forEach(({elem}) => {
      if (!elem.classList.contains('list-hidden')) {
        if (i < min || i > max) {
          elem.classList.remove('list-visible');
        } else {
          elem.classList.add('list-visible');
        }
        i++;
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
      document.addEventListener('scroll', updateVisible);
      updateVisible();
    },
    beforeRemove() {
      document.removeEventListener('scroll', updateVisible);
    }
  };
})());
