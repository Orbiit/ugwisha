let ripples = []
function animate () {
  ripples = ripples.filter(r => r.animate())
  if (ripples.length) window.requestAnimationFrame(animate)
}
document.addEventListener('mouseup', e => {
  ripples.filter(r => r.identifier === 'mouse').forEach(r => r.dying = true)
})
document.addEventListener('touchend', e => {
  Array.from(e.changedTouches).forEach(touch => {
    ripples.filter(r => r.identifier === touch.identifier).forEach(r => r.dying = true)
  })
}, { passive: true })
class Ripple {
  constructor (parent, x, y, identifier) {
    const ripple = Elem('div', { className: 'ripple' })
    const rect = parent.getBoundingClientRect()
    ripple.style.left = x - rect.left + 'px'
    ripple.style.top = y - rect.top + 'px'
    parent.appendChild(ripple)

    this.parent = parent
    this.ripple = ripple
    this.identifier = identifier
    this.scale = 0
    this.dying = false
    this.dyingProgress = 1
    this.finalScale = Math.hypot(
      Math.max(x - rect.left, rect.left + rect.width - x),
      Math.max(y - rect.top, rect.top + rect.height - y)
    ) / 5
  }

  animate () {
    this.scale += (this.finalScale - this.scale) / 6
    if (this.dying) this.dyingProgress -= 0.07
    this.ripple.style.transform = `scale(${this.scale})`
    this.ripple.style.opacity = this.dyingProgress
    if (this.dyingProgress <= 0) this.parent.removeChild(this.ripple)
    return this.dyingProgress > 0
  }

  static start (...args) {
    ripples.push(new Ripple(...args))
    if (ripples.length === 1) animate()
  }
}
function rippleify (elem) {
  let tapped = false
  elem.addEventListener('touchstart', e => {
    if (elem.classList.contains('no-ripple')) return
    tapped = true
    Array.from(e.changedTouches).forEach(touch => {
      Ripple.start(elem, touch.clientX, touch.clientY, touch.identifier)
    })
  }, { passive: true })
  elem.addEventListener('mousedown', e => {
    if (elem.classList.contains('no-ripple')) return
    if (tapped) tapped = false
    else Ripple.start(elem, e.clientX, e.clientY, 'mouse')
  })
}

ready.push(() => {
  Array.from(document.getElementsByClassName('ripples')).forEach(btn => rippleify(btn))
})
