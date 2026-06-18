const AI_SETTINGS_KEY = 'socratic-kernel:ai:v1'
const ARCHIVE_KEY = 'socratic-kernel:data:v2'
const LEGACY_ARCHIVE_KEY = 'kernel:socratic:v1'
const appRoot = document.querySelector('#app')

const PROVIDER_MARKS = {
  openai: 'OA',
  anthropic: 'AN',
  gemini: 'GE',
  deepseek: 'DS',
  qwen: 'QW',
  kimi: 'KM',
  xai: 'XA',
}

let catalog = {
  status: 'idle',
  providers: [],
  requiresAccessToken: false,
  error: '',
  checkedAt: '',
}

let modelTest = {
  status: 'idle',
  message: '',
  providerLabel: '',
  model: '',
}

let settings = loadSettings()
let noticeTimer

function loadSettings() {
  try {
    return {
      enabled: false,
      provider: '',
      gatewayUrl: '',
      accessToken: '',
      ...JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || '{}'),
    }
  } catch {
    return { enabled: false, provider: '', gatewayUrl: '', accessToken: '' }
  }
}

function saveSettings(next) {
  settings = { ...settings, ...next }
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings))
}

function readArchive() {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY) || localStorage.getItem(LEGACY_ARCHIVE_KEY)
    const parsed = JSON.parse(raw || '{"version":2,"sessions":[]}')
    return Array.isArray(parsed.sessions) ? parsed : { version: 2, sessions: [] }
  } catch {
    return { version: 2, sessions: [] }
  }
}

function writeArchive(archive) {
  archive.version = 2
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive))
  localStorage.removeItem(LEGACY_ARCHIVE_KEY)
}

function normalizedGatewayUrl(value = settings.gatewayUrl) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function endpoint(path, gatewayUrl = settings.gatewayUrl) {
  return `${normalizedGatewayUrl(gatewayUrl)}${path}`
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function makeId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
}

function showNotice(message, type = 'info') {
  let element = document.querySelector('.ai-notice')
  if (!element) {
    element = document.createElement('div')
    element.className = 'ai-notice'
    document.body.append(element)
  }
  element.dataset.type = type
  element.textContent = message
  element.classList.add('show')
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => element.classList.remove('show'), 4200)
}

function friendlyError(code = '') {
  const messages = {
    INVALID_ACCESS_TOKEN: '访问令牌不正确，请在高级连接设置中重新填写。',
    PROVIDER_NOT_CONFIGURED: '所选供应商尚未在服务端配置 API Key。',
    UNKNOWN_PROVIDER: '服务端不认识这个供应商，请重新检查模型列表。',
    PROVIDER_TIMEOUT: '模型响应超时，请稍后重试或更换模型。',
    PROVIDER_REQUEST_FAILED: '供应商拒绝了请求，常见原因是密钥、余额或模型名称错误。',
    INVALID_MODEL_JSON: '模型返回格式异常，网关没有采用这次结果。',
    INSUFFICIENT_MODEL_QUESTIONS: '模型没有生成足够的有效问题。',
  }
  return messages[code] || '连接或模型调用失败。本地追问仍然可以正常使用。'
}

async function fetchProviders({ announce = false, gatewayUrl = settings.gatewayUrl } = {}) {
  catalog = { ...catalog, status: 'loading', error: '' }
  refreshSettingsRoute()
  try {
    const response = await fetch(endpoint('/api/providers', gatewayUrl), {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`HTTP_${response.status}`)
    const data = await response.json()
    catalog = {
      status: 'ready',
      providers: Array.isArray(data.providers) ? data.providers : [],
      requiresAccessToken: Boolean(data.requiresAccessToken),
      error: '',
      checkedAt: new Date().toISOString(),
    }

    if (!settings.provider && catalog.providers[0]) {
      saveSettings({ provider: catalog.providers[0].id })
    }
    if (settings.provider && !catalog.providers.some((item) => item.id === settings.provider)) {
      saveSettings({ provider: catalog.providers[0]?.id || '', enabled: false })
    }
    if (announce) {
      showNotice(
        catalog.providers.length
          ? `Gateway 已连接，发现 ${catalog.providers.length} 个可用模型。`
          : 'Gateway 已连接，但服务端尚未配置模型供应商。',
        catalog.providers.length ? 'success' : 'warning',
      )
    }
  } catch (error) {
    catalog = {
      status: 'error',
      providers: [],
      requiresAccessToken: false,
      error:
        String(error?.message || '').startsWith('HTTP_404')
          ? '这个地址没有部署 Socratic Kernel Gateway。'
          : '当前无法连接 Gateway；应用会继续使用本地追问。',
      checkedAt: new Date().toISOString(),
    }
    if (announce) showNotice(catalog.error, 'warning')
  }
  refreshSettingsRoute()
  enhanceNewForm()
}

function providerOptions(selected = settings.provider) {
  if (!catalog.providers.length) return '<option value="">没有已配置的模型</option>'
  return catalog.providers
    .map(
      (provider) => `<option value="${escapeHtml(provider.id)}" ${provider.id === selected ? 'selected' : ''}>
        ${escapeHtml(provider.label)} · ${escapeHtml(provider.model)}
      </option>`,
    )
    .join('')
}

function selectedProvider() {
  return catalog.providers.find((provider) => provider.id === settings.provider) || catalog.providers[0]
}

function gatewayStatus() {
  if (catalog.status === 'loading') {
    return { tone: 'loading', label: '检查中', detail: '正在读取 Gateway 状态' }
  }
  if (catalog.status === 'ready' && catalog.providers.length) {
    return { tone: 'success', label: '已连接', detail: `${catalog.providers.length} 个供应商可用` }
  }
  if (catalog.status === 'ready') {
    return { tone: 'warning', label: '已连接', detail: '尚未配置供应商' }
  }
  if (catalog.status === 'error') {
    return { tone: 'error', label: '未连接', detail: catalog.error }
  }
  return { tone: 'neutral', label: '未检查', detail: '检查后显示连接状态' }
}

function statusCard({ index, label, value, detail, tone = 'neutral' }) {
  return `<article class="model-status-card" data-tone="${tone}">
    <span class="model-status-index">${index}</span>
    <div><small>${label}</small><strong>${escapeHtml(value)}</strong><p>${escapeHtml(detail)}</p></div>
  </article>`
}

function providerDirectory() {
  if (catalog.status === 'loading') {
    return `<div class="provider-empty provider-loading"><i></i><strong>正在读取模型目录</strong><p>Gateway 会返回已经在服务端配置好的供应商和模型。</p></div>`
  }

  if (!catalog.providers.length) {
    return `<div class="provider-empty">
      <span class="provider-empty-mark">0</span>
      <div><strong>还没有可选择的模型</strong><p>${escapeHtml(catalog.error || 'Gateway 可访问，但服务端环境变量中尚未配置任何供应商 API Key。')}</p></div>
    </div>`
  }

  return `<div class="provider-list" role="radiogroup" aria-label="选择默认模型">
    ${catalog.providers
      .map(
        (provider, index) => `<label class="provider-row">
          <input type="radio" name="provider" value="${escapeHtml(provider.id)}" ${provider.id === settings.provider ? 'checked' : ''}>
          <span class="provider-mark">${escapeHtml(PROVIDER_MARKS[provider.id] || String(index + 1).padStart(2, '0'))}</span>
          <span class="provider-identity"><strong>${escapeHtml(provider.label)}</strong><code>${escapeHtml(provider.model)}</code></span>
          <span class="provider-ready"><i></i>服务端已配置</span>
          <span class="provider-select-indicator" aria-hidden="true">○</span>
        </label>`,
      )
      .join('')}
  </div>`
}

function modelTestPanel() {
  const provider = selectedProvider()
  const descriptions = {
    idle: provider
      ? `将向 ${provider.label} 发起一次最小追问请求，可能产生少量 API 费用。`
      : '连接 Gateway 并选择模型后，才能进行真实调用测试。',
    loading: '正在通过 Gateway 请求模型，请不要关闭当前页面。',
    success: modelTest.message,
    error: modelTest.message,
  }
  return `<div class="model-test-result" data-state="${modelTest.status}">
    <span class="model-test-icon" aria-hidden="true">${modelTest.status === 'success' ? '✓' : modelTest.status === 'error' ? '!' : modelTest.status === 'loading' ? '…' : '↗'}</span>
    <div><strong>${modelTest.status === 'success' ? '模型调用通过' : modelTest.status === 'error' ? '模型调用失败' : modelTest.status === 'loading' ? '正在测试' : '真实模型测试'}</strong><p>${escapeHtml(descriptions[modelTest.status] || descriptions.idle)}</p></div>
  </div>`
}

function renderSettings() {
  if ((location.hash.slice(1) || 'home') !== 'models') return
  if (appRoot.dataset.aiRoute === 'models') return
  appRoot.dataset.aiRoute = 'models'

  const gateway = gatewayStatus()
  const provider = selectedProvider()
  const aiReady = catalog.providers.length > 0
  const gatewayDisplay = settings.gatewayUrl ? '独立 Gateway' : '当前网站'
  const tokenDisplay = catalog.requiresAccessToken ? '需要访问令牌' : '无需额外令牌'

  appRoot.innerHTML = `<header class="page-head model-page-head">
    <p class="eyebrow">Model control center</p>
    <h1>连接模型，<br>但不交出判断。</h1>
    <p class="lead">这里不是填写供应商 API Key 的地方。浏览器只连接 Socratic Kernel Gateway；Gateway 在服务端安全调用你已经配置的模型。</p>
  </header>

  <section class="model-status-grid" aria-label="模型中心状态总览">
    ${statusCard({ index: '01', label: '当前引擎', value: settings.enabled && aiReady ? 'AI 增强' : '本地追问', detail: settings.enabled && aiReady ? '新审议默认使用所选模型' : '无需网络，始终可用', tone: settings.enabled && aiReady ? 'success' : 'neutral' })}
    ${statusCard({ index: '02', label: 'Gateway', value: gateway.label, detail: gateway.detail, tone: gateway.tone })}
    ${statusCard({ index: '03', label: '供应商', value: `${catalog.providers.length} 个`, detail: catalog.providers.length ? '服务端密钥已就绪' : '等待服务端配置', tone: catalog.providers.length ? 'success' : 'warning' })}
    ${statusCard({ index: '04', label: '默认模型', value: provider?.label || '未选择', detail: provider?.model || '连接后选择一个模型', tone: provider ? 'success' : 'neutral' })}
  </section>

  <section class="model-center-layout">
    <form class="model-setup" id="ai-settings-form">
      <div class="model-section-heading">
        <div><p class="eyebrow">Quick setup</p><h2>三步完成模型接入</h2></div>
        <span class="model-config-summary">${escapeHtml(gatewayDisplay)} · ${escapeHtml(tokenDisplay)}</span>
      </div>

      <article class="setup-step ${catalog.status === 'ready' ? 'is-complete' : ''}">
        <div class="setup-step-number">01</div>
        <div class="setup-step-content">
          <div class="setup-step-head">
            <div><h3>连接 Gateway</h3><p>Gateway 是浏览器与模型供应商之间的安全中转层，供应商 API Key 只存放在服务端。</p></div>
            <span class="connection-badge" data-tone="${gateway.tone}"><i></i>${escapeHtml(gateway.label)}</span>
          </div>
          <div class="gateway-address-line">
            <span><small>当前连接</small><strong>${escapeHtml(settings.gatewayUrl || '当前网站 / 同域 Gateway')}</strong></span>
            <button type="button" class="ghost compact" data-ai-action="check" ${catalog.status === 'loading' ? 'disabled' : ''}>${catalog.status === 'loading' ? '正在检查…' : '检查 Gateway'}</button>
          </div>
          ${catalog.error ? `<p class="inline-guidance" data-tone="warning">${escapeHtml(catalog.error)} GitHub Pages 仍可使用完整本地模式；AI 功能需要部署 Vercel Gateway。</p>` : ''}
        </div>
      </article>

      <article class="setup-step ${provider ? 'is-complete' : ''}">
        <div class="setup-step-number">02</div>
        <div class="setup-step-content">
          <div class="setup-step-head">
            <div><h3>选择默认模型</h3><p>下面只显示已经在 Gateway 服务端配置成功的供应商。选择结果保存在当前浏览器。</p></div>
            <span class="step-state">${provider ? '已选择' : '等待连接'}</span>
          </div>
          ${providerDirectory()}
        </div>
      </article>

      <article class="setup-step ${settings.enabled && aiReady ? 'is-complete' : ''}">
        <div class="setup-step-number">03</div>
        <div class="setup-step-content">
          <div class="setup-step-head">
            <div><h3>启用 AI 追问</h3><p>启用后，新审议默认选择 AI；你仍可在每次开始前切回本地追问。</p></div>
            <span class="step-state">${settings.enabled && aiReady ? '已启用' : '未启用'}</span>
          </div>
          <label class="model-enable-row ${aiReady ? '' : 'is-disabled'}">
            <input type="checkbox" name="enabled" ${settings.enabled && aiReady ? 'checked' : ''} ${aiReady ? '' : 'disabled'}>
            <span class="model-enable-control" aria-hidden="true"><i></i></span>
            <span><strong>将 AI 增强设为默认引擎</strong><small>${aiReady ? '模型失败时自动回退到本地追问，不会中断审议。' : '先连接 Gateway 并配置至少一个模型。'}</small></span>
          </label>
          ${modelTestPanel()}
          <div class="model-step-actions">
            <button type="button" class="ghost" data-ai-action="test" ${provider && modelTest.status !== 'loading' ? '' : 'disabled'}>${modelTest.status === 'loading' ? '正在测试模型…' : '测试所选模型'}</button>
            <button class="primary">保存并应用</button>
          </div>
        </div>
      </article>

      <details class="advanced-settings">
        <summary><span><small>Advanced connection</small><strong>高级连接设置</strong></span><b aria-hidden="true">＋</b></summary>
        <div class="advanced-settings-body">
          <div class="field">
            <label for="ai-gateway-url">Gateway 地址</label>
            <input id="ai-gateway-url" name="gatewayUrl" type="url" value="${escapeHtml(settings.gatewayUrl)}" placeholder="留空表示使用当前网站的 /api">
            <small class="help">只有当前网页与 Gateway 分开部署时才需要填写，例如独立的 Vercel HTTPS 地址。</small>
          </div>
          <div class="field">
            <label for="ai-access-token">Gateway 访问令牌</label>
            <input id="ai-access-token" name="accessToken" type="password" value="${escapeHtml(settings.accessToken)}" autocomplete="off" placeholder="仅在 Gateway 开启访问保护时填写">
            <small class="help">它不是 OpenAI、Claude 等供应商的 API Key，只用于访问你自己的 Gateway。</small>
          </div>
          <div class="advanced-note"><strong>供应商 API Key 在哪里配置？</strong><p>在 Vercel 项目的 Environment Variables 中配置。浏览器端永远不应填写或看到供应商密钥。</p></div>
        </div>
      </details>
    </form>

    <aside class="model-explainer">
      <div class="model-explainer-sticky">
        <p class="eyebrow">How it works</p>
        <h2>三层，而不是一个输入框。</h2>
        <div class="gateway-flow" aria-label="模型调用数据流">
          <div class="gateway-flow-node"><span>01</span><strong>浏览器</strong><p>保存选择与本地思考档案</p></div>
          <div class="gateway-flow-arrow">↓ <small>只发送本次初始材料</small></div>
          <div class="gateway-flow-node is-gateway"><span>02</span><strong>Gateway</strong><p>保存供应商密钥、验证请求、切换模型</p></div>
          <div class="gateway-flow-arrow">↓ <small>服务端安全调用</small></div>
          <div class="gateway-flow-node"><span>03</span><strong>模型供应商</strong><p>生成结构化苏格拉底式追问</p></div>
        </div>
        <div class="data-boundary-compact">
          <h3>本次会发送</h3><p>问题、初始立场、依据、确信度和挑战强度。</p>
          <h3>默认不会发送</h3><p>历史档案、其他回答、长期模式统计和供应商 API Key。</p>
        </div>
      </div>
    </aside>
  </section>`

  bindSettings()
}

function refreshSettingsRoute() {
  if ((location.hash.slice(1) || 'home') !== 'models') return
  delete appRoot.dataset.aiRoute
  renderSettings()
}

function readFormSettings(form) {
  const data = new FormData(form)
  const rawGatewayUrl = String(data.get('gatewayUrl') || '')
  const gatewayUrl = normalizedGatewayUrl(rawGatewayUrl)
  if (rawGatewayUrl && !gatewayUrl) throw new Error('INVALID_GATEWAY_URL')
  return {
    enabled: data.get('enabled') === 'on' && catalog.providers.length > 0,
    provider: String(data.get('provider') || settings.provider || ''),
    gatewayUrl,
    accessToken: String(data.get('accessToken') || '').trim(),
  }
}

async function testSelectedModel(form) {
  let next
  try {
    next = readFormSettings(form)
  } catch {
    showNotice('Gateway 地址必须是有效的 HTTP 或 HTTPS 地址。', 'warning')
    return
  }

  if (!next.provider) {
    showNotice('请先选择一个模型。', 'warning')
    return
  }

  saveSettings(next)
  modelTest = { status: 'loading', message: '', providerLabel: '', model: '' }
  refreshSettingsRoute()

  try {
    const response = await fetch(endpoint('/api/inquiry', next.gatewayUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(next.accessToken ? { 'X-Socratic-Access-Token': next.accessToken } : {}),
      },
      body: JSON.stringify({
        provider: next.provider,
        input: {
          mode: 'belief',
          question: '测试：一个表达流畅的回答是否足以证明它正确？',
          position: '不一定，语言流畅不能代替事实与证据。',
          evidence: '模型能够生成语法完整但事实错误的文本。',
          confidence: 82,
          challenge: 1,
        },
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || `HTTP_${response.status}`)
    const count = Array.isArray(data.questions) ? data.questions.length : 0
    modelTest = {
      status: 'success',
      message: `${data.providerLabel || next.provider} · ${data.model || '默认模型'} 成功返回 ${count} 个结构化问题。`,
      providerLabel: data.providerLabel || next.provider,
      model: data.model || '',
    }
    showNotice('模型真实调用测试通过。', 'success')
  } catch (error) {
    modelTest = {
      status: 'error',
      message: friendlyError(String(error?.message || '')),
      providerLabel: '',
      model: '',
    }
    showNotice(modelTest.message, 'warning')
  }
  refreshSettingsRoute()
}

function bindSettings() {
  const form = document.querySelector('#ai-settings-form')
  if (!form) return

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    let next
    try {
      next = readFormSettings(form)
    } catch {
      showNotice('Gateway 地址必须是有效的 HTTP 或 HTTPS 地址。', 'warning')
      return
    }
    saveSettings(next)
    showNotice(
      next.enabled ? '模型设置已保存，AI 增强已启用。' : '模型设置已保存，当前默认使用本地追问。',
      'success',
    )
    refreshSettingsRoute()
  })

  form.querySelectorAll('input[name="provider"]').forEach((input) => {
    input.addEventListener('change', () => {
      saveSettings({ provider: input.value })
      modelTest = { status: 'idle', message: '', providerLabel: '', model: '' }
      refreshSettingsRoute()
    })
  })

  form.querySelector('[data-ai-action="check"]')?.addEventListener('click', () => {
    let next
    try {
      next = readFormSettings(form)
    } catch {
      showNotice('请先填写有效的 Gateway 地址。', 'warning')
      return
    }
    saveSettings({
      gatewayUrl: next.gatewayUrl,
      accessToken: next.accessToken,
      provider: next.provider,
    })
    modelTest = { status: 'idle', message: '', providerLabel: '', model: '' }
    fetchProviders({ announce: true, gatewayUrl: next.gatewayUrl })
  })

  form.querySelector('[data-ai-action="test"]')?.addEventListener('click', () => testSelectedModel(form))
}

function enginePanel() {
  const ready = catalog.providers.length > 0
  const aiAvailable = ready && settings.enabled
  const provider = selectedProvider()
  return `<section class="ai-engine-panel" aria-labelledby="ai-engine-title">
    <div class="engine-panel-heading">
      <div><p class="eyebrow">Inquiry engine</p><h2 id="ai-engine-title">这次由谁提出问题？</h2></div>
      <span class="engine-state-badge">${aiAvailable ? `${escapeHtml(provider?.label || 'AI')} 已就绪` : '本地模式'}</span>
    </div>
    <p class="muted">两种引擎都会把最终判断留给你。区别只在于问题由本地规则生成，还是由所选模型根据语境生成。</p>
    <div class="engine-options">
      <label class="engine-option">
        <input type="radio" name="inquiry-engine" value="local" ${aiAvailable ? '' : 'checked'}>
        <span><b>01</b><strong>本地追问</strong><small>离线、透明、不发送内容。适合隐私优先和稳定使用。</small></span>
      </label>
      <label class="engine-option ${aiAvailable ? '' : 'disabled'}">
        <input type="radio" name="inquiry-engine" value="ai" ${aiAvailable ? 'checked' : ''} ${aiAvailable ? '' : 'disabled'}>
        <span><b>02</b><strong>AI 追问</strong><small>${aiAvailable ? `${escapeHtml(provider?.label || '已配置模型')} · 根据本次语境生成问题，失败时回退本地。` : '前往模型中心完成 Gateway 连接、模型选择和启用。'}</small></span>
      </label>
    </div>
    <div class="ai-engine-footer">
      <label>本次使用的模型
        <select name="ai-provider" ${aiAvailable ? '' : 'disabled'}>${providerOptions()}</select>
      </label>
      <button type="button" class="ghost compact" data-route="models">打开模型中心</button>
    </div>
  </section>`
}

function enhanceNewForm() {
  if (catalog.status === 'loading') return
  const form = document.querySelector('#new-form')
  if (!form || form.dataset.aiEnhanced === 'true') return
  form.dataset.aiEnhanced = 'true'
  form.insertAdjacentHTML('beforebegin', enginePanel())

  const providerSelect = document.querySelector('select[name="ai-provider"]')
  providerSelect?.addEventListener('change', () => saveSettings({ provider: providerSelect.value }))

  form.addEventListener('submit', () => {
    const engine = document.querySelector('input[name="inquiry-engine"]:checked')?.value || 'local'
    if (engine !== 'ai') return
    const formData = new FormData(form)
    const payload = {
      mode: formData.get('mode'),
      question: formData.get('question'),
      position: formData.get('position'),
      evidence: formData.get('evidence'),
      confidence: Number(formData.get('confidence')),
      challenge: Number(formData.get('challenge')),
    }
    const providerId = providerSelect?.value || settings.provider
    setTimeout(() => generateAiQuestions(payload, providerId), 0)
  })
}

async function generateAiQuestions(input, provider) {
  const archive = readArchive()
  const session = archive.sessions.find(
    (item) => item.status === 'active' && item.question === String(input.question || '').trim(),
  )
  if (!session || !provider) return

  session.aiStatus = 'pending'
  session.aiMetadata = {
    provider,
    requestedAt: new Date().toISOString(),
  }
  writeArchive(archive)
  showNotice('AI 正在生成针对性追问；本地问题已经作为回退准备好。')

  try {
    const response = await fetch(endpoint('/api/inquiry'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.accessToken ? { 'X-Socratic-Access-Token': settings.accessToken } : {}),
      },
      body: JSON.stringify({ provider, input }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || `HTTP_${response.status}`)

    const latest = readArchive()
    const target = latest.sessions.find((item) => item.id === session.id)
    if (!target) return

    const generatedQuestions = (data.questions || []).map((question) => ({
      id: makeId(),
      dimension: question.dimension,
      text: question.text,
      answer: '',
      reason: question.reason || '',
      source: 'ai',
    }))

    const canReplace =
      target.step === 0 && target.questions.every((question) => !String(question.answer || '').trim())

    if (canReplace && generatedQuestions.length >= 4) target.questions = generatedQuestions
    else target.aiSuggestedQuestions = generatedQuestions

    target.aiStatus = 'ready'
    target.aiMetadata = {
      provider: data.provider,
      providerLabel: data.providerLabel,
      model: data.model,
      generatedAt: data.generatedAt,
      summary: data.summary || '',
      warnings: data.warnings || [],
      applied: canReplace,
    }
    writeArchive(latest)

    showNotice(
      canReplace
        ? `已使用 ${data.providerLabel} · ${data.model} 生成追问。`
        : 'AI 追问已生成，但你已经开始回答，因此没有覆盖当前问题。',
      'success',
    )
    if (canReplace && location.hash === '#session') location.reload()
  } catch (error) {
    const latest = readArchive()
    const target = latest.sessions.find((item) => item.id === session.id)
    if (target) {
      target.aiStatus = 'failed'
      target.aiMetadata = {
        ...(target.aiMetadata || {}),
        failedAt: new Date().toISOString(),
        errorCode: String(error?.message || 'AI_GATEWAY_ERROR').slice(0, 80),
      }
      writeArchive(latest)
    }
    showNotice('AI 追问生成失败，已继续使用本地问题。', 'warning')
  }
}

function enhance() {
  const route = location.hash.slice(1) || 'home'
  if (route === 'models') {
    renderSettings()
    return
  }
  delete appRoot.dataset.aiRoute
  enhanceNewForm()
}

new MutationObserver(() => queueMicrotask(enhance)).observe(appRoot, {
  childList: true,
  subtree: true,
})

addEventListener('hashchange', enhance)
fetchProviders()
enhance()
