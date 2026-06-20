import { injectSpeedInsights } from '@vercel/speed-insights'

const KEY = 'socratic-kernel:data:v2'
const LEGACY_KEY = 'kernel:socratic:v1'
const app = document.querySelector('#app')

// Initialize Vercel Speed Insights
injectSpeedInsights()

const MODES = {
  decision: ['决策审议', '厘清标准、代价与责任'],
  belief: ['观点审查', '检查证据、反例与隐藏前提'],
  reading: ['阅读质疑', '拆解网页、文章或他人的论证'],
  reflection: ['自我反思', '辨认欲望来源与重复模式'],
  aiuse: ['AI 使用审计', '决定什么可外包，什么必须保留'],
}

const DIMS = {
  definition: ['概念澄清', '先确认关键词究竟指什么。'],
  evidence: ['证据检验', '把事实、解释、感受和推测分开。'],
  falsification: ['可证伪性', '不会被任何事实改变的观点，往往不是判断。'],
  opposition: ['最强反方', '理解最聪明的反对者，而不是寻找弱反例。'],
  values: ['价值来源', '辨认目标属于你，还是来自评价与恐惧。'],
  consequence: ['长期后果', '选择也会反复塑造行动者。'],
  agency: ['责任归属', '把判断和代价重新交还给你。'],
  experiment: ['可逆实验', '用最小行动获取真实反馈。'],
}

let state = load()
let active = null
let route = location.hash.slice(1) || 'home'
let toastTimer
let deferredInstallPrompt = null

function emptyState() {
  return { version: 2, sessions: [] }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.sessions)) return emptyState()
    return { version: 2, sessions: parsed.sessions.map(migrateSession) }
  } catch {
    return emptyState()
  }
}

function migrateSession(session) {
  const mode = MODES[session.mode] ? session.mode : 'reflection'
  return {
    confidenceAfter: session.confidence ?? 60,
    challenge: 2,
    patterns: [],
    questions: [],
    final: '',
    action: '',
    responsibility: '',
    ...session,
    mode,
  }
}

function save() {
  state.version = 2
  localStorage.setItem(KEY, JSON.stringify(state))
  localStorage.removeItem(LEGACY_KEY)
}

function makeId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function truncate(value = '', length = 100) {
  const text = String(value).trim()
  return text.length > length ? `${text.slice(0, length)}…` : text
}

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function navigate(nextRoute) {
  location.hash = nextRoute
  if (route === nextRoute) render()
}

function notify(message) {
  let element = document.querySelector('.toast')
  if (!element) {
    element = document.createElement('div')
    element.className = 'toast'
    document.body.append(element)
  }
  element.textContent = message
  element.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => element.classList.remove('show'), 1800)
}

function detectPatterns(input) {
  const text = `${input.question}${input.position}${input.evidence}`
  const found = []

  if (/一定|绝对|永远|根本|唯一|肯定|必须/.test(text)) {
    found.push(['absolute', '绝对化表达', '可能把倾向或偏好写成了事实。'])
  }
  if (/认可|证明自己|面子|丢脸|落后|评价|别人怎么看/.test(text)) {
    found.push(['external', '外部评价牵引', '需要区分真正欲望与身份压力。'])
  }
  if (/以后再说|不想面对|逃避|算了|没办法/.test(text)) {
    found.push(['avoidance', '回避倾向', '可能需要把问题缩小成可行动部分。'])
  }
  if (/立刻|马上|来不及|赶紧/.test(text)) {
    found.push(['urgency', '紧迫性放大', '焦虑可能缩窄了可见选项。'])
  }
  if (/直接告诉我|替我决定|选哪个|应不应该|给我答案/.test(text)) {
    found.push(['outsourcing', '判断外包', '结论需要重新回到你的语言中。'])
  }
  if (/AI说|模型说|看起来专业|写得很完整|听起来有道理/.test(text)) {
    found.push(['fluency', '流畅性信任', '表达完整并不自动意味着证据充分。'])
  }
  if (input.confidence >= 85 && input.evidence.length < 35) {
    found.push(['gap', '高确信—低证据', '确信较高，但已写下的依据较少。'])
  }

  return found.length
    ? found
    : [['open', '尚无明显模式', '这不表示判断正确，只表示需要继续追问。']]
}

function generateQuestions(input, patternList) {
  const keyword =
    input.question
      .replace(/[，。！？、,.!?]/g, ' ')
      .split(/\s+/)
      .find((word) => word.length > 1) || '这个问题'

  const base = [
    ['definition', `你所说的“${keyword}”具体指什么？什么情况看似相同，但其实不属于它？`],
    ['evidence', '支持你当前立场的最强事实是什么？其中哪些只是解释、情绪或推测？'],
    ['falsification', '出现什么新事实时，你会愿意改变目前的判断？'],
    ['opposition', '一个聪明、善意但不同意你的人，会提出什么最强反驳？'],
  ]

  const extras = {
    decision: [
      ['values', '你正在用什么标准比较选项？标准冲突时优先保留哪一个？'],
      ['consequence', '这个选择在一周后和一年后分别会产生什么代价？'],
      ['experiment', '在作出不可逆承诺前，最小的现实实验是什么？'],
    ],
    belief: [
      ['values', '坚持这个观点，是因为证据更强，还是因为放弃它会威胁某种身份？'],
      ['consequence', '如果所有人按此观点行动，最容易被忽略的受影响者是谁？'],
      ['agency', '不借助权威和 AI，你能否用自己的语言给出完整理由？'],
    ],
    reading: [
      ['values', '作者把什么价值当作默认前提，却没有说明？'],
      ['consequence', '接受这套框架后，我们会看见什么，又会忽略什么？'],
      ['agency', '分享或引用之前，你愿意亲自为哪条主张负责？'],
    ],
    reflection: [
      ['values', '这是你真正想要的，还是你想成为“应该想要它的人”？'],
      ['consequence', '这个模式重复一年，会保护你什么，又会让你失去什么？'],
      ['experiment', '什么小行动能验证你对自己的解释？'],
    ],
    aiuse: [
      ['agency', '这次你准备外包给 AI 的是信息、执行、分析，还是价值判断？'],
      ['values', '在看到 AI 输出之前，哪些判断标准必须由你自己保留？'],
      ['falsification', 'AI 的建议满足什么条件你才接受？出现什么信号时你会拒绝？'],
      ['experiment', '你准备怎样独立核验 AI 输出，而不是只判断它是否流畅？'],
    ],
  }[input.mode]

  const targeted = []
  if (patternList.some((pattern) => pattern[0] === 'external')) {
    targeted.push(['values', '假设没有人知道你的选择，你仍会作出相同决定吗？'])
  }
  if (patternList.some((pattern) => pattern[0] === 'urgency')) {
    targeted.push(['evidence', '哪些截止时间客观存在，哪些是焦虑制造的？'])
  }
  if (patternList.some((pattern) => pattern[0] === 'outsourcing')) {
    targeted.push(['agency', '你希望外部系统替你决定，是信息不足，还是不愿承担选错的责任？'])
  }
  if (patternList.some((pattern) => pattern[0] === 'fluency')) {
    targeted.push(['evidence', '除了语言流畅之外，你能指出哪些可独立验证的依据？'])
  }

  const count = input.challenge === 1 ? 4 : input.challenge === 3 ? 7 : 6
  return [...base, ...targeted, ...extras].slice(0, count).map(([dimension, text]) => ({
    id: makeId(),
    dimension,
    text,
    answer: '',
  }))
}

function createSession(formData) {
  const input = {
    mode: formData.get('mode'),
    question: formData.get('question').trim(),
    position: formData.get('position').trim(),
    evidence: formData.get('evidence').trim(),
    confidence: Number(formData.get('confidence')),
    challenge: Number(formData.get('challenge')),
  }
  const patternList = detectPatterns(input)

  return {
    id: makeId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    step: 0,
    ...input,
    patterns: patternList,
    questions: generateQuestions(input, patternList),
    final: '',
    action: '',
    responsibility: '',
    confidenceAfter: input.confidence,
  }
}

function currentSession() {
  return state.sessions.find((session) => session.id === active) || state.sessions[0]
}

function updateSession(session) {
  session.updatedAt = new Date().toISOString()
  state.sessions = state.sessions.map((item) => (item.id === session.id ? session : item))
  save()
}

function deleteSession(sessionId) {
  state.sessions = state.sessions.filter((session) => session.id !== sessionId)
  if (active === sessionId) active = null
  save()
}

function completenessScore(session) {
  let value = 0
  if (session.position.length >= 35) value += 18
  if (session.evidence.length >= 30) value += 14
  value += Math.round(
    (session.questions.filter((question) => question.answer.length >= 20).length /
      Math.max(1, session.questions.length)) *
      40,
  )
  if (session.final.length >= 40) value += 15
  if (session.action.length >= 15) value += 8
  if (session.responsibility.length >= 15) value += 5
  return Math.min(100, value)
}

function aggregatePatterns() {
  const counts = {}
  state.sessions.forEach((session) =>
    session.patterns.forEach((pattern) => {
      if (pattern[0] !== 'open') counts[pattern[1]] = (counts[pattern[1]] || 0) + 1
    }),
  )
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

function sessionCard(session) {
  const mode = MODES[session.mode] || MODES.reflection
  return `<article class="card" data-open="${session.id}">
    <div class="meta">
      <span class="pill accent">${mode[0]}</span>
      <span class="pill ${session.status === 'completed' ? '' : 'warn'}">
        ${session.status === 'completed' ? '已完成' : `${Math.min(session.step + 1, session.questions.length)}/${session.questions.length}`}
      </span>
      <span class="pill">${formatDate(session.updatedAt)}</span>
    </div>
    <h3 style="margin-top:14px">${escapeHtml(truncate(session.question, 58))}</h3>
    <p>${escapeHtml(truncate(session.status === 'completed' ? session.final : session.position, 120))}</p>
    <button class="ghost compact" data-open="${session.id}">${session.status === 'completed' ? '查看复盘' : '继续审议'}</button>
  </article>`
}

function emptyView() {
  return `<section class="empty">
    <h2>还没有审议记录</h2>
    <p class="muted">从一个真实但不必宏大的问题开始。</p>
    <button class="primary" data-action="start">开始第一次审议</button>
  </section>`
}

function renderHome() {
  const completed = state.sessions.filter((session) => session.status === 'completed')
  const latest = [...state.sessions]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 4)
  const average = completed.length
    ? Math.round(completed.reduce((sum, session) => sum + completenessScore(session), 0) / completed.length)
    : 0
  const revised = completed.filter(
    (session) => Math.abs(session.confidenceAfter - session.confidence) >= 10,
  ).length
  const topPattern = aggregatePatterns()[0]?.[0] || '等待积累'
  const aiAudits = state.sessions.filter((session) => session.mode === 'aiuse').length

  app.innerHTML = `<section class="hero">
    <article class="hero-main">
      <div>
        <p class="eyebrow">Socratic autonomy practice</p>
        <h1>答案可以外包，<br>判断不能。</h1>
        <p class="lead">先写下你的立场，再让问题进入。内核帮助你看见前提、证据、欲望与责任。</p>
      </div>
      <div class="actions">
        <button class="primary" data-action="start">开始一次审议</button>
        <button class="ghost" data-action="start-ai-audit">审计一次 AI 使用</button>
      </div>
    </article>
    <aside class="hero-side">
      <p class="eyebrow">今天的提醒</p>
      <p class="quote">“你需要的是更多信息，还是有人替你承担选择？”</p>
      <p class="muted">内核只在价值判断与认知偏误处制造必要摩擦。</p>
      <span class="pill accent">本地优先 · 无需登录</span>
    </aside>
  </section>
  <section class="section">
    <div class="section-head">
      <div><p class="eyebrow">Practice signals</p><h2>练习信号</h2></div>
      <p class="muted">不是人格评价或心理测评。</p>
    </div>
    <div class="metrics">
      <article class="metric"><small>已完成审议</small><strong>${completed.length}</strong><p>结束于你自己的立场与行动。</p></article>
      <article class="metric"><small>平均练习完整度</small><strong>${average}</strong><p>衡量是否经历证据、反方与承诺。</p></article>
      <article class="metric"><small>AI 使用审计</small><strong>${aiAudits}</strong><p>检查认知分工，而非拒绝工具。</p></article>
      <article class="metric"><small>重复线索</small><strong style="font-size:20px">${escapeHtml(topPattern)}</strong><p>它只是待核验的线索。</p></article>
    </div>
  </section>
  <section class="section">
    <div class="section-head"><h2>最近的审议</h2><span class="pill">明显修正 ${revised} 次</span></div>
    ${latest.length ? `<div class="grid">${latest.map(sessionCard).join('')}</div>` : emptyView()}
  </section>`
}

function renderNewSession(preselectedMode = null) {
  app.innerHTML = `<header class="page-head">
    <p class="eyebrow">Begin with your own words</p>
    <h1>先不要问 AI。<br>先写下你怎么看。</h1>
    <p class="lead">人的初步判断在前，系统追问在后。</p>
  </header>
  <form class="panel" id="new-form">
    <div class="form-grid">
      <fieldset class="field full" style="border:0;padding:0">
        <legend>问题类型</legend>
        <div class="modes">
          ${Object.entries(MODES)
            .map(
              ([key, value], index) => `<label class="mode">
                <input type="radio" name="mode" value="${key}" ${preselectedMode === key || (!preselectedMode && index === 0) ? 'checked' : ''}>
                <span><strong>${value[0]}</strong><small>${value[1]}</small></span>
              </label>`,
            )
            .join('')}
        </div>
      </fieldset>
      <div class="field full">
        <label>你真正想审议的问题</label>
        <textarea name="question" required minlength="8" placeholder="例如：我应该同时推进多个项目，还是集中完成一个？"></textarea>
      </div>
      <div class="field full">
        <label>你目前的初步立场</label>
        <textarea name="position" required minlength="15" placeholder="在看到系统分析之前，用自己的语言写下当前判断。"></textarea>
        <small class="help">没有初步立场，就无法判断 AI 是在帮助你，还是替代你。</small>
      </div>
      <div class="field full">
        <label>你现在依赖的依据</label>
        <textarea name="evidence" placeholder="事实、经历、数据、直觉或担忧都可以，但请尽量区分。"></textarea>
      </div>
      <div class="field">
        <label>当前确信程度</label>
        <div class="range"><input id="confidence" name="confidence" type="range" min="0" max="100" value="60"><output id="confidence-output">60%</output></div>
      </div>
      <div class="field">
        <label>挑战强度</label>
        <select name="challenge">
          <option value="1">温和：4 问</option>
          <option value="2" selected>标准：6 问</option>
          <option value="3">直接：7 问</option>
        </select>
      </div>
    </div>
    <div class="form-actions">
      <p class="help">当前版本不会发送数据到服务器；问题由本地审议引擎生成。</p>
      <button class="primary">保存立场并进入追问 →</button>
    </div>
  </form>`

  const range = document.querySelector('#confidence')
  const output = document.querySelector('#confidence-output')
  range.oninput = () => (output.textContent = `${range.value}%`)
  document.querySelector('#new-form').onsubmit = (event) => {
    event.preventDefault()
    const session = createSession(new FormData(event.currentTarget))
    state.sessions.unshift(session)
    save()
    active = session.id
    navigate('session')
  }
}

function renderInquiry() {
  const session = currentSession()
  if (!session) {
    navigate('new')
    return
  }
  active = session.id
  if (session.status === 'completed') {
    renderRecap(session)
    return
  }

  const isFinal = session.step >= session.questions.length
  const progress = isFinal ? 100 : Math.round((session.step / session.questions.length) * 100)
  const mode = MODES[session.mode] || MODES.reflection

  app.innerHTML = `<header class="page-head">
    <div class="meta"><span class="pill accent">${mode[0]}</span><span class="pill">${formatDate(session.createdAt)}</span></div>
    <h1 style="margin-top:18px">${escapeHtml(session.question)}</h1>
  </header>
  <section class="inquiry">
    <aside class="aside">
      <div class="aside-card">
        <small>审议进度</small>
        <div class="track" style="margin:12px 0"><div class="bar" style="width:${progress}%"></div></div>
        <strong>${isFinal ? '形成你的结论' : `第 ${session.step + 1}/${session.questions.length} 问`}</strong>
      </div>
      <div class="aside-card">
        <small>初始立场</small><p>${escapeHtml(session.position)}</p><span class="pill">初始确信 ${session.confidence}%</span>
      </div>
      <div class="aside-card">
        <small>系统观察 · 不是诊断</small>
        ${session.patterns
          .map(
            (pattern) => `<div class="pattern"><strong>${escapeHtml(pattern[1])}</strong><span>${escapeHtml(pattern[2])}</span></div>`,
          )
          .join('')}
      </div>
    </aside>
    ${isFinal ? finalForm(session) : questionForm(session)}
  </section>`

  bindInquiry(session, isFinal)
}

function questionForm(session) {
  const question = session.questions[session.step]
  const dimension = DIMS[question.dimension]
  return `<article class="question">
    <span class="eyebrow">${dimension[0]} · ${String(session.step + 1).padStart(2, '0')}</span>
    <h2>${escapeHtml(question.text)}</h2>
    <p class="muted">${dimension[1]}</p>
    <div class="field" style="margin-top:28px">
      <label>用你自己的语言回答</label>
      <textarea id="answer" placeholder="不追求漂亮，写下真实推理过程。">${escapeHtml(question.answer)}</textarea>
    </div>
    <div class="question-footer">
      <button class="ghost" data-action="previous" ${session.step === 0 ? 'disabled' : ''}>← 上一问</button>
      <button class="primary" data-action="next">保存并继续 →</button>
    </div>
  </article>`
}

function finalForm(session) {
  return `<article class="question">
    <span class="eyebrow">RETURN THE JUDGMENT</span>
    <h2>不引用系统，用自己的语言形成一个暂时结论。</h2>
    <p class="muted">说明你愿意相信什么、承担什么，以及下一步如何接受现实检验。</p>
    <div class="field"><label>我目前的判断是</label><textarea id="final">${escapeHtml(session.final)}</textarea></div>
    <div class="field"><label>最小的下一步行动</label><textarea id="action">${escapeHtml(session.action)}</textarea></div>
    <div class="field"><label>我愿意承担的代价或责任</label><textarea id="responsibility">${escapeHtml(session.responsibility)}</textarea></div>
    <div class="field">
      <label>审议后的确信程度</label>
      <div class="range"><input id="confidence-after" type="range" min="0" max="100" value="${session.confidenceAfter}"><output id="confidence-after-output">${session.confidenceAfter}%</output></div>
    </div>
    <div class="question-footer">
      <button class="ghost" data-action="previous">← 返回问题</button>
      <button class="primary" data-action="complete">由我确认这个判断</button>
    </div>
  </article>`
}

function bindInquiry(session, isFinal) {
  document.querySelector('[data-action="previous"]')?.addEventListener('click', () => {
    if (!isFinal) {
      const answer = document.querySelector('#answer').value.trim()
      if (answer) session.questions[session.step].answer = answer
    } else {
      session.final = document.querySelector('#final').value.trim()
      session.action = document.querySelector('#action').value.trim()
      session.responsibility = document.querySelector('#responsibility').value.trim()
    }
    session.step = Math.max(0, session.step - 1)
    updateSession(session)
    renderInquiry()
  })

  document.querySelector('[data-action="next"]')?.addEventListener('click', () => {
    const answer = document.querySelector('#answer').value.trim()
    if (answer.length < 8) {
      notify('先写下一段真实回答。')
      return
    }
    session.questions[session.step].answer = answer
    session.step += 1
    updateSession(session)
    renderInquiry()
    scrollTo(0, 0)
  })

  if (isFinal) {
    const range = document.querySelector('#confidence-after')
    const output = document.querySelector('#confidence-after-output')
    range.oninput = () => (output.textContent = `${range.value}%`)
    document.querySelector('[data-action="complete"]').onclick = () => {
      session.final = document.querySelector('#final').value.trim()
      session.action = document.querySelector('#action').value.trim()
      session.responsibility = document.querySelector('#responsibility').value.trim()
      session.confidenceAfter = Number(range.value)
      if (session.final.length < 20 || session.action.length < 8) {
        notify('请至少写下结论和下一步。')
        return
      }
      session.status = 'completed'
      session.completedAt = new Date().toISOString()
      updateSession(session)
      renderRecap(session)
    }
  }
}

function renderRecap(session) {
  const delta = session.confidenceAfter - session.confidence
  app.innerHTML = `<header class="page-head">
    <p class="eyebrow">Inquiry completed</p>
    <h1>判断已经回到你手中。</h1>
    <p class="lead">这不是最终真理，而是当前证据下你愿意承担的暂时立场。</p>
  </header>
  <section class="inquiry">
    <aside class="aside">
      <div class="aside-card"><small>练习完整度</small><h2>${completenessScore(session)}</h2><p>只衡量是否经历定义、证据、反方、承诺和行动。</p></div>
      <div class="aside-card"><small>确信变化</small><h3>${session.confidence}% → ${session.confidenceAfter}%</h3><p>${delta === 0 ? '确信未变化，请留意理由是否改变。' : delta > 0 ? `提高 ${delta} 个百分点。` : `降低 ${Math.abs(delta)} 个百分点。`}</p></div>
    </aside>
    <article class="question">
      <span class="eyebrow">YOUR CURRENT COMMITMENT</span>
      <h2>${escapeHtml(session.question)}</h2>
      <div class="recap">
        <div><small>最初立场</small><p>${escapeHtml(session.position)}</p></div>
        <div><small>目前判断</small><p>${escapeHtml(session.final)}</p></div>
        <div><small>下一步行动</small><p>${escapeHtml(session.action)}</p></div>
        <div><small>愿意承担</small><p>${escapeHtml(session.responsibility || '尚未写下')}</p></div>
      </div>
      <div class="question-footer">
        <button class="danger" data-action="delete-current">删除此记录</button>
        <div class="right-actions">
          <button class="ghost" data-route="history">返回档案</button>
          <button class="primary" data-action="start">开始新审议</button>
        </div>
      </div>
    </article>
  </section>`
}

function renderHistory() {
  const list = [...state.sessions].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  const patterns = aggregatePatterns()
  app.innerHTML = `<header class="page-head">
    <p class="eyebrow">Longitudinal blind spots</p>
    <h1>不是记录你说过什么，<br>而是看见你怎样判断。</h1>
    <p class="lead">模式只是待核验的假设，你有权否定系统对你的概括。</p>
  </header>
  ${
    patterns.length
      ? `<section class="panel"><h2>重复出现的线索</h2><div class="metrics">${patterns
          .slice(0, 4)
          .map(
            ([name, count]) => `<article class="metric"><small>${escapeHtml(name)}</small><strong>${count}</strong><p>出现次数不等于事实。</p></article>`,
          )
          .join('')}</div></section>`
      : ''
  }
  <section class="section">
    <div class="section-head"><h2>全部审议</h2><p class="muted">${list.length} 条本地记录</p></div>
    ${list.length ? `<div class="grid">${list.map(sessionCard).join('')}</div>` : emptyView()}
  </section>`
}

function renderData() {
  const kilobytes = (new Blob([JSON.stringify(state)]).size / 1024).toFixed(1)
  app.innerHTML = `<header class="page-head">
    <p class="eyebrow">Data sovereignty</p>
    <h1>理解你，不能成为占有你。</h1>
    <p class="lead">数据只保存在当前浏览器，你可以导出、迁移或删除。</p>
  </header>
  <section class="data-grid">
    <article class="card"><h2>导出档案</h2><p>导出全部审议与回答。</p><button class="primary" data-action="export">导出 JSON</button></article>
    <article class="card"><h2>导入档案</h2><p>导入将覆盖当前本地数据。</p><input id="file" type="file" accept="application/json" hidden><button class="ghost" data-action="import">选择文件</button></article>
    <article class="card"><h2>当前存储</h2><p>${state.sessions.length} 条记录，约 ${kilobytes} KB；没有云同步和广告画像。</p><span class="pill accent">LocalStorage</span></article>
    <article class="card"><h2>删除全部数据</h2><p>此操作不可撤销。</p><button class="danger" data-action="clear">永久删除</button></article>
  </section>`
}

function exportData() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `socratic-kernel-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function importData(file) {
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result)
      if (!Array.isArray(parsed.sessions)) throw new Error('Invalid archive')
      state = { version: 2, sessions: parsed.sessions.map(migrateSession) }
      save()
      notify('档案已导入')
      renderData()
    } catch {
      notify('无法识别这个文件')
    }
  }
  reader.readAsText(file)
}

function render() {
  route = location.hash.slice(1) || 'home'
  document
    .querySelectorAll('[data-route]')
    .forEach((button) => button.classList.toggle('active', button.dataset.route === route))

  if (route === 'new') renderNewSession()
  else if (route === 'ai-audit') renderNewSession('aiuse')
  else if (route === 'session') renderInquiry()
  else if (route === 'history') renderHistory()
  else if (route === 'data') renderData()
  else renderHome()

  app.focus({ preventScroll: true })
}

document.addEventListener('click', (event) => {
  const routeButton = event.target.closest('[data-route]')
  if (routeButton) {
    navigate(routeButton.dataset.route)
    return
  }

  const action = event.target.closest('[data-action]')?.dataset.action
  if (action === 'start') navigate('new')
  if (action === 'start-ai-audit') navigate('ai-audit')
  if (action === 'export') exportData()
  if (action === 'import') document.querySelector('#file')?.click()
  if (action === 'clear' && confirm('确认永久删除全部本地记录？')) {
    state = emptyState()
    save()
    renderData()
  }
  if (action === 'delete-current') {
    const session = currentSession()
    if (session && confirm('确认删除这条审议记录？')) {
      deleteSession(session.id)
      notify('记录已删除')
      navigate('history')
    }
  }

  const openButton = event.target.closest('[data-open]')
  if (openButton) {
    active = openButton.dataset.open
    navigate('session')
  }
})

document.addEventListener('change', (event) => {
  if (event.target.id === 'file' && event.target.files[0]) importData(event.target.files[0])
})

document.querySelector('#new-session-button').onclick = () => navigate('new')
addEventListener('hashchange', render)

addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredInstallPrompt = event
  document.querySelector('#install-button').hidden = false
})

document.querySelector('#install-button').onclick = async () => {
  if (!deferredInstallPrompt) return
  deferredInstallPrompt.prompt()
  await deferredInstallPrompt.userChoice
  deferredInstallPrompt = null
  document.querySelector('#install-button').hidden = true
}

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}

render()
