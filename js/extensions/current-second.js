UgwishaExtensions.register((() => {
  let animationFrameID = null;
  const currentSecond = Elem('p', {style: {fontSize: '36px', textAlign: 'center'}});
  function updateSecond() {
    currentSecond.textContent = (Date.now() / 1000 % 60).toFixed(3).padStart(6, '0');
    animationFrameID = window.requestAnimationFrame(updateSecond);
  }

  return {
    id: 'current-second',
    wrapper: Elem('div', {}, [currentSecond]),
    name: 'Current Second',
    icon: './images/current-second-icon.svg',
    url: './js/extensions/current-second.js',
    beforeAdd() {
      if (!animationFrameID) updateSecond();
    },
    afterRemove() {
      window.cancelAnimationFrame(animationFrameID);
      animationFrameID = null;
    }
  };
})());
