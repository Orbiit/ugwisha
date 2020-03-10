window.UgwishaExtensions.register((() => {
  let animationFrameID = null
  const currentSecond = Elem('p', { style: { fontSize: '36px', textAlign: 'center' } })
  function updateSecond () {
    currentSecond.textContent = (Date.now() / 1000 % 60).toFixed(3).padStart(6, '0')
    animationFrameID = window.requestAnimationFrame(updateSecond)
  }

  return {
    wrapper: Elem('div', {}, [currentSecond]),
    name: 'Current Sec.',
    icon: './images/extensions/current-second.svg',
    beforeAdd () {
      if (!animationFrameID) updateSecond()
    },
    afterRemove () {
      window.cancelAnimationFrame(animationFrameID)
      animationFrameID = null
    }
  }
})())
