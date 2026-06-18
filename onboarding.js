const DATA_KEY = 'socratic-kernel:data:v2'
const ONBOARDING_KEY = 'socratic-kernel:onboarding:v1'
const PENDING_EXAMPLE_KEY = 'socratic-kernel:pending-example'

const EXAMPLES = {
  aiuse: {
    label: 'AI 作业边界',
    description: '判断哪些部分可以交给 AI，哪些必须由自己完成。',
    mode: 'aiuse',
    question: '我应该在多大程度上使用 AI 完成这次重要作业？',
    position:
      '我认为可以让 AI 帮助整理资料和检查表达，但问题定义、核心论证和最终判断必须由我自己完成。',
    evidence:
      'AI 可以提高检索和修改效率，但我需要能够独立解释每个关键结论，并核验引用和事实。',
    confidence: 72,
  },
  focus: {
    label: '项目取舍',
    description: '在多个项目之间澄清标准、机会成本和最小实验。',
    mode: 'decision',
    question: '我应该同时推进多个项目，还是集中完成一个？',
    position:
      '我目前倾向先集中完成一个最重要的项目，因为并行推进让我不断切换，却没有形成真正可交付的结果。',
    evidence:
      '过去几周我同时开始了多个任务，但完成率很低；集中工作时，我通常能更快获得反馈。',
    confidence: 64,
  },
  purchase: {
    label: '重要消费',
    description: '区分真实需求、身份压力和可逆验证。',
    mode: 'decision',
    question: '我现在是否应该购买这件价格较高的产品？',
    position:
      '我倾向暂时不买，先确认它解决的是持续需求，而不是短期兴奋或外部评价。',
    evidence:
      '现有产品仍然可用；我最近才开始关注新产品，还没有验证使用频率和替代方案。',
    confidence: 58,
  },
}

function readSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DATA_KEY) || '{"sessions":[]}')
    return Array.isArray(parsed.sessions) ? parsed.sessions : []
  } catch {
    return []
  }
}

function exampleButtons(className = 'example-grid') {
  return `<div class="${className}">
    ${Object.entries(EXAMPLES)
      .map(
        ([key, example]) => `<button type="button" class="example-card" data-onboarding-example="${key}">
          <strong>${example.label}</strong>
          <span>${example.description}</span>
          <small>使用此示例 →</small>
        </button>`,
      )
      .join('')}
  </div>`
}

function injectFirstRunGuide() {
  const route = location.hash.slice(1) || 'home'
  if (route !== 'home') return
  if (readSessions().length > 0) return
  if (localStorage.getItem(ONBOARDING_KEY) === 'dismissed') return
  if (document.querySelector('.onboarding-panel')) return

  const hero = document.querySelector('.hero')
  if (!hero) return

  hero.insertAdjacentHTML(
    'afterend',
    `<section class="onboarding-panel" aria-labelledby="onboarding-title">
      <div class="onboarding-head">
        <div>
          <p class="eyebrow">First inquiry · 约 5 分钟</p>
          <h2 id="onboarding-title">先体验一次，再决定它是否适合你。</h2>
        </div>
        <button type="button" class="ghost compact onboarding-dismiss" data-onboarding-dismiss>跳过引导</button>
      </div>
      <div class="onboarding-steps" aria-label="审议流程">
        <article><span>01</span><strong>写下初步立场</strong><p>在看到系统追问前，先保留自己的问题定义和判断。</p></article>
        <article><span>02</span><strong>接受结构化追问</strong><p>检查概念、证据、反方、价值、后果与责任。</p></article>
        <article><span>03</span><strong>形成自己的结论</strong><p>系统不替你裁决；最后的判断、行动和代价由你确认。</p></article>
      </div>
      <div class="onboarding-examples">
        <div><strong>没有现成问题？从一个可编辑示例开始。</strong><p>示例只负责减少空白页压力，所有内容都可以修改。</p></div>
        ${exampleButtons()}
      </div>
    </section>`,
  )
}

function fillExample(key) {
  const form = document.querySelector('#new-form')
  const example = EXAMPLES[key]
  if (!form || !example) return

  const mode = form.querySelector(`input[name="mode"][value="${example.mode}"]`)
  if (mode) mode.checked = true

  form.elements.question.value = example.question
  form.elements.position.value = example.position
  form.elements.evidence.value = example.evidence
  form.elements.confidence.value = String(example.confidence)
  form.elements.challenge.value = '1'

  const output = document.querySelector('#confidence-output')
  if (output) output.textContent = `${example.confidence}%`

  form.elements.question.focus({ preventScroll: true })
  form.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function enhanceNewSession() {
  const form = document.querySelector('#new-form')
  if (!form || form.dataset.onboardingEnhanced === 'true') return
  form.dataset.onboardingEnhanced = 'true'

  form.insertAdjacentHTML(
    'beforebegin',
    `<section class="example-strip" aria-labelledby="example-strip-title">
      <div class="example-strip-copy">
        <p class="eyebrow">Start from a concrete case</p>
        <h2 id="example-strip-title">选择一个示例，或直接写自己的问题。</h2>
        <p class="muted">示例会填入可编辑草稿；首次体验默认使用 4 个问题。</p>
      </div>
      ${exampleButtons('example-grid compact-grid')}
    </section>`,
  )

  if (readSessions().length === 0) form.elements.challenge.value = '1'

  const pending = sessionStorage.getItem(PENDING_EXAMPLE_KEY)
  if (pending && EXAMPLES[pending]) {
    sessionStorage.removeItem(PENDING_EXAMPLE_KEY)
    fillExample(pending)
  }
}

function enhance() {
  injectFirstRunGuide()
  enhanceNewSession()
}

document.addEventListener(
  'click',
  (event) => {
    const exampleButton = event.target.closest('[data-onboarding-example]')
    if (exampleButton) {
      const key = exampleButton.dataset.onboardingExample
      if (document.querySelector('#new-form')) fillExample(key)
      else {
        sessionStorage.setItem(PENDING_EXAMPLE_KEY, key)
        location.hash = 'new'
      }
      return
    }

    if (event.target.closest('[data-onboarding-dismiss]')) {
      localStorage.setItem(ONBOARDING_KEY, 'dismissed')
      document.querySelector('.onboarding-panel')?.remove()
    }
  },
  true,
)

new MutationObserver(() => queueMicrotask(enhance)).observe(document.querySelector('#app'), {
  childList: true,
  subtree: true,
})

addEventListener('hashchange', enhance)
enhance()
