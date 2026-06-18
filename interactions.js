const appRoot = document.querySelector('#app')
const documentRoot = document.documentElement
const progressBar = document.querySelector('.scroll-progress i')
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
const finePointerQuery = matchMedia('(pointer: fine)')

const revealSelector = [
  '.hero',
  '.onboarding-panel',
  '.art-manifesto',
  '.method-strip',
  '.section-head',
  '.metric',
  '.card',
  '.page-head',
  '.example-strip',
  '.panel',
  '.ai-engine-panel',
  '.ai-settings-grid',
  '.inquiry',
  '.empty',
].join(',')

const tiltSelector = '.card, .metric, .example-card, .method-strip article'
const magneticSelector = '.primary:not(:disabled), .header-cta:not(:disabled), .text-link:not(:disabled)'

let revealObserver
let lastRouteRoot = null
let pointerFrame = 0
let scrollFrame = 0
let pointerX = -300
let pointerY = -300

function motionEnabled() {
  return !motionQuery.matches
}

function fineMotionEnabled() {
  return motionEnabled() && finePointerQuery.matches
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function setScrollState() {
  scrollFrame = 0
  const scrollable = Math.max(1, document.documentElement.scrollHeight - innerHeight)
  const progress = clamp(scrollY / scrollable, 0, 1)
  documentRoot.style.setProperty('--scroll-progress', progress.toFixed(4))
  document.body.classList.toggle('is-scrolled', scrollY > 28)
}

function requestScrollState() {
  if (scrollFrame) return
  scrollFrame = requestAnimationFrame(setScrollState)
}

function applyPointerState() {
  pointerFrame = 0
  documentRoot.style.setProperty('--cursor-x', `${pointerX}px`)
  documentRoot.style.setProperty('--cursor-y', `${pointerY}px`)

  const nx = pointerX / Math.max(1, innerWidth) - 0.5
  const ny = pointerY / Math.max(1, innerHeight) - 0.5
  documentRoot.style.setProperty('--ambient-x', `${nx * 32}px`)
  documentRoot.style.setProperty('--ambient-y', `${ny * 24}px`)

  const hero = appRoot.querySelector('.hero')
  if (hero) {
    hero.style.setProperty('--hero-glow-x', `${nx * 34}px`)
    hero.style.setProperty('--hero-glow-y', `${ny * 24}px`)
  }
}

function handlePointerMove(event) {
  if (!fineMotionEnabled()) return
  pointerX = event.clientX
  pointerY = event.clientY
  if (!pointerFrame) pointerFrame = requestAnimationFrame(applyPointerState)
}

function handlePointerLeave() {
  pointerX = -300
  pointerY = -300
  if (!pointerFrame) pointerFrame = requestAnimationFrame(applyPointerState)
}

function animateMetric(element) {
  if (element.dataset.numberAnimated === 'true' || !motionEnabled()) return
  const valueElement = element.querySelector('strong')
  if (!valueElement) return
  const raw = valueElement.textContent.trim()
  if (!/^\d+$/.test(raw)) return

  const target = Number(raw)
  element.dataset.numberAnimated = 'true'
  const start = performance.now()
  const duration = 850

  function step(now) {
    const elapsed = clamp((now - start) / duration, 0, 1)
    const eased = 1 - Math.pow(1 - elapsed, 3)
    valueElement.textContent = String(Math.round(target * eased))
    if (elapsed < 1) requestAnimationFrame(step)
    else valueElement.textContent = raw
  }

  requestAnimationFrame(step)
}

function createRevealObserver() {
  revealObserver?.disconnect()
  if (!motionEnabled() || !('IntersectionObserver' in window)) return

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        if (entry.target.matches('.metric')) animateMetric(entry.target)
        revealObserver.unobserve(entry.target)
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  )
}

function enhanceReveals(root = appRoot) {
  const elements = [...root.querySelectorAll(revealSelector)]
  elements.forEach((element, index) => {
    if (element.dataset.revealEnhanced === 'true') return
    element.dataset.revealEnhanced = 'true'

    if (!motionEnabled() || !revealObserver) {
      element.classList.add('is-visible')
      return
    }

    element.classList.add('reveal-ready')
    element.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 55}ms`)
    revealObserver.observe(element)
  })
}

function enhanceMagnetic(element) {
  if (element.dataset.magneticEnhanced === 'true') return
  element.dataset.magneticEnhanced = 'true'
  element.classList.add('is-magnetic')

  element.addEventListener('pointermove', (event) => {
    if (!fineMotionEnabled()) return
    const rect = element.getBoundingClientRect()
    const x = (event.clientX - rect.left - rect.width / 2) * 0.14
    const y = (event.clientY - rect.top - rect.height / 2) * 0.18
    element.style.setProperty('--mag-x', `${clamp(x, -8, 8)}px`)
    element.style.setProperty('--mag-y', `${clamp(y, -6, 6)}px`)
  })

  element.addEventListener('pointerleave', () => {
    element.style.setProperty('--mag-x', '0px')
    element.style.setProperty('--mag-y', '0px')
  })
}

function enhanceTilt(element) {
  if (element.dataset.tiltEnhanced === 'true') return
  element.dataset.tiltEnhanced = 'true'
  element.classList.add('tilt-surface')

  element.addEventListener('pointermove', (event) => {
    if (!fineMotionEnabled()) return
    const rect = element.getBoundingClientRect()
    const px = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    const py = clamp((event.clientY - rect.top) / rect.height, 0, 1)
    const tiltY = (px - 0.5) * 5.2
    const tiltX = (0.5 - py) * 4.2

    element.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`)
    element.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`)
    element.style.setProperty('--sheen-x', `${(px * 100).toFixed(1)}%`)
    element.style.setProperty('--sheen-y', `${(py * 100).toFixed(1)}%`)
  })

  element.addEventListener('pointerleave', () => {
    element.style.setProperty('--tilt-x', '0deg')
    element.style.setProperty('--tilt-y', '0deg')
    element.style.setProperty('--sheen-x', '50%')
    element.style.setProperty('--sheen-y', '50%')
  })
}

function enhanceInteractiveElements(root = document) {
  root.querySelectorAll(magneticSelector).forEach(enhanceMagnetic)
  root.querySelectorAll(tiltSelector).forEach(enhanceTilt)
}

function playRouteEntrance() {
  const currentRoot = appRoot.firstElementChild
  if (!currentRoot || currentRoot === lastRouteRoot) return
  lastRouteRoot = currentRoot

  appRoot.classList.remove('route-enter')
  if (!motionEnabled()) return
  requestAnimationFrame(() => {
    appRoot.classList.add('route-enter')
    setTimeout(() => appRoot.classList.remove('route-enter'), 800)
  })
}

function enhance() {
  playRouteEntrance()
  enhanceReveals()
  enhanceInteractiveElements()
}

function configurePointerMode() {
  document.body.classList.toggle('has-fine-pointer', fineMotionEnabled())
  if (!fineMotionEnabled()) {
    documentRoot.style.setProperty('--cursor-x', '-300px')
    documentRoot.style.setProperty('--cursor-y', '-300px')
  }
}

createRevealObserver()
configurePointerMode()
setScrollState()
enhance()

addEventListener('scroll', requestScrollState, { passive: true })
addEventListener('resize', requestScrollState, { passive: true })
addEventListener('pointermove', handlePointerMove, { passive: true })
document.documentElement.addEventListener('pointerleave', handlePointerLeave)

motionQuery.addEventListener('change', () => {
  createRevealObserver()
  configurePointerMode()
  enhance()
})

finePointerQuery.addEventListener('change', configurePointerMode)

new MutationObserver(() => queueMicrotask(enhance)).observe(appRoot, {
  childList: true,
  subtree: true,
})
