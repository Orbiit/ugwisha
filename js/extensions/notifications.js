window.UgwishaExtensions.register((() => {
  const minutesBefore = Elem('input', {
    className: 'select-input',
    type: 'number',
    value: storage.getItem('[ugwisha] notifications.timeBefore') || 5,
    style: {width: '50px'},
    onchange(e) {
      storage.setItem('[ugwisha] notifications.timeBefore', minutesBefore.value);
    }
  });

  let canNotify = false;
  let lastPeriodStart, lastStatus;
  UgwishaEvents.status.push(status => {
    if (canNotify && status.value <= +minutesBefore.value
        && (status.period.start !== lastPeriodStart || status.type !== lastStatus)) {
      lastPeriodStart = status.period.start;
      lastStatus = status.type;
      if (status.type !== 'since') {
        new Notification(`${Ugwisha.formatDuration(status.value, true)} ${status.type} ${Ugwisha.getPdName(status.period.period)}`)
          .addEventListener('click', e => {
            window.focus();
          });
      }
    }
  });

  if (Notification.permission === 'granted') canNotify = true;
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        canNotify = true;
      }
    });
  }

  return {
    wrapper: Elem('div', {}, [
      Elem('p', {}, [Elem('label', {}, ['Notify me ', minutesBefore, ' minutes before a period starts/ends.'])])
    ]),
    name: 'Notify',
    icon: './images/notifications-icon.svg'
  };
})());
