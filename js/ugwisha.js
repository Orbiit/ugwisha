class BackgroundAnimator extends Component {

  constructor(props) {
    super(props);
    this.state.transitioning = false;
  }

  setBackground(css) {
    if (this.state.transitioning) {
      document.body.style.backgroundImage = css;
      return;
    }
    this.state.transitioning = true;
    this.transitioner.style.backgroundImage = document.body.style.backgroundImage;
    this.transitioner.classList.add('animating');
    document.body.style.backgroundImage = css;
    setTimeout(() => {
      this.transitioner.classList.remove('animating');
      this.state.transitioning = false;
    }, 500);
  }

  render() {
    return this.transitioner = createElement('div', {
      classes: 'transition-background'
    });
  }

}

class PSA extends Component {

  open() {
    this.dialog.classList.remove('hidden');
    this.closeButton.focus();
    this.props.readPSA();
  }

  close() {
    this.dialog.classList.add('hidden');
  }

  render() {
    return this.dialog = createElement('div', {
      classes: 'psa hidden',
      createElement('div', {
        classes: 'psa-wrapper',
        content: [
          createElement('h2', {
            content: [
              text('announcement')
            ]
          }),
          createElement('div', {
            classes: 'psa-content',
            html: this.props.content
          }),
          createElement('p', {
            content: [
              this.closeButton = new Button({
                parent: this,
                onClick: this.close.bind(this),
                label: text('close_psa'),
                className: 'psa-close'
              })
            ]
          })
        ]
      })
    });
  }

}

class Button extends Component {

  render() {
    return createElement('button', {
      classes: [this.props.icon ? 'icon-btn' : 'button', 'ripples', this.props.className],
      content: [
        this.props.label
      ],
      attributes: {
        disabled: this.props.disabled
      },
      listeners: {
        click: this.props.onClick
      }
    });
  }

}

class Preview extends Component {

  render() {
    return createElement('div', {
      classes: 'preview',
      content: [
        this.previewTime = createElement('span', {
          classes: 'preview-time'
        }),
        this.previewMsg = createElement('span', {
          classes: 'preview-msg'
        }),
        this.progressBar = createElement('div', {
          classes: 'progress'
        })
      ]
    });
  }

}

class DateControls extends Component {

  render() {
    return createElement('div', {
      classes: 'date-nav-button-wrapper centre',
      content: [
        createElement('div', {
          content: [
            new Button({
              parent: this,
              onClick: this.handleToday.bind(this),
              label: text('today'),
              className: 'today'
            })
          ]
        }),
        createElement('div', {
          content: [
            new Button({
              parent: this,
              onClick: this.handlePreviousDay.bind(this),
              className: 'back-day',
              icon: true
            }),
            new Button({
              parent: this,
              onClick: this.handleOpenDateSelector.bind(this),
              label: text('select_date'),
              className: 'select-date'
            }),
            new DateSelector({parent: this}),
            new Button({
              parent: this,
              onClick: this.handleNextDay.bind(this),
              className: 'forth-day',
              icon: true
            })
          ]
        })
      ]
    });
  }

}

class DateSelector extends Component {

  render() {
    return createElement('div', {
      classes: 'date-selector hidden',
      content: [
        this.selectMonth = createElement('select', {
          classes: 'months',
          attributes: {
            disabled: true
          },
          content: [
            createElement('option', {
              attributes: {
                value: 'CHOOSE'
              },
              content: [
                text('choose')
              ]
            })
          ]
        }),
        this.dateInput = createElement('input', {
          classes: 'date-input',
          attributes: {
            type: 'text',
            placeholder: 'dd',
            disabled: true
          }
        }),
        this.error = createElement('p', {classes: 'error'}),
        createElement('div', {
          content: [
            new Button({
              parent: this,
              onClick: this.handleCancel.bind(this),
              label: text('cancel'),
              className: 'cancel-select-date'
            }),
            this.selectBtn = new Button({
              parent: this,
              onClick: this.handleSelect.bind(this),
              label: text('select'),
              className: 'actually-select-date',
              disabled: true
            })
          ]
        })
      ]
    });
  }

}

class Ugwisha extends Component {

  constructor(props) {
    super(props);
    // TODO
  }

  render() {
    return createElement('div', {
      classes: 'app-wrapper',
      children: [
        this.backgroundAnimator = new BackgroundAnimator({parent: this}),
        this.preview = new Preview({parent: this}),
        createElement('div', {
          classes: 'content',
          children: [
            createElement('div', {
              classes: 'jump-btn-wrapper centre',
              content: [
                new Button({ // todo: aria-labels?
                  parent: this,
                  onClick: this.handleJumpScroll.bind(this),
                  className: 'jump',
                  icon: true
                })
              ]
            }),
            new DateControls({
              parent: this,
              onSelect: this.handleSelectDay.bind(this)
            })
          ]
        }),
        this.psa = new PSA({
          parent: this,
          content: this.state.psaContent,
          readPSA: this.handleReadPSA.bind(this)
        })
      ]
    });
  }

}
