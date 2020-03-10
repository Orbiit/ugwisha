window.UgwishaExtensions.register((() => {
  const webhookURL = Elem('input', {
    className: 'select-input',
    type: 'text',
    value: storage.getItem('[ugwisha] discord-webhook.url'),
    placeholder: 'https://discordapp.com/api/webhooks/',
    disabled: true,
    onchange (e) {
      storage.setItem('[ugwisha] discord-webhook.url', webhookURL.value)
    }
  })
  const minutesBefore = Elem('input', {
    className: 'select-input',
    type: 'number',
    value: storage.getItem('[ugwisha] discord-webhook.timeBefore') || 5,
    disabled: true,
    style: { width: '50px' },
    onchange (e) {
      storage.setItem('[ugwisha] discord-webhook.timeBefore', minutesBefore.value)
    }
  })
  const startBtn = Elem('button', { className: 'button', ripple: true, disabled: true }, 'Begin')
  function post (title, description) {
    return fetch(webhookURL.value, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Ugwisha',
        avatar_url: 'https://orbiit.github.io/ugwisha/images/logo/512.png',
        embeds: [{ color: 0xff5959, title, description }]
      }),
      headers: { 'Content-Type': 'application/json' }
    })
  }
  startBtn.addEventListener('click', e => {
    status.textContent = 'Testing...'
    webhookURL.disabled = startBtn.disabled = minutesBefore.disabled = true
    post('Ugwisha: ACTIVATED', 'Ugwisha Discord Webhook extension').then(res => {
      if (!res.ok) throw new Error(res)
      status.textContent = 'Running for as long as the tab stays open; reload Ugwisha to stop.'
      const max = +minutesBefore.value
      let lastPeriodStart, lastStatus
      UgwishaEvents.status.push(status => {
        if (status.value <= max && (status.period.start !== lastPeriodStart || status.type !== lastStatus)) {
          lastPeriodStart = status.period.start
          lastStatus = status.type
          if (status.type !== 'since') {
            post(
              `${Ugwisha.formatDuration(status.value, true)} ${status.type} ${Ugwisha.getPdName(status.period.period)}`,
              `${Ugwisha.formatTime(status.period.start)} – ${Ugwisha.formatTime(status.period.end)}\n` +
                `${Ugwisha.formatDuration(status.period.end - status.period.start, false)} long`
            )
          }
        }
      })
    }).catch(() => {
      status.textContent = "Something went wrong. Maybe the webhook URL doesn't work?"
      webhookURL.disabled = startBtn.disabled = minutesBefore.disabled = false
    })
  })
  UgwishaEvents.connection.then(online => {
    if (online) webhookURL.disabled = startBtn.disabled = minutesBefore.disabled = false
  })

  const status = Elem('p')
  const wrapper = Elem('div', {}, [
    Elem('p', {}, [
      'Sends a message through a ',
      Elem('a', { href: 'https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks' }, 'Discord Webhook'),
      '.'
    ]),
    Elem('p', {}, [Elem('label', {}, ['Webhook URL: ', webhookURL])]),
    Elem('p', {}, [Elem('label', {}, ['Notify ', minutesBefore, ' minutes before'])]),
    Elem('p', {}, [startBtn]),
    status
  ])

  return {
    wrapper,
    name: 'Webhook',
    icon: './images/discord-logo-white.svg'
  }
})())
