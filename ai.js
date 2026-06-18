const AI_SETTINGS_KEY = 'socratic-kernel:ai:v1'
const ARCHIVE_KEY = 'socratic-kernel:data:v2'
const LEGACY_ARCHIVE_KEY = 'kernel:socratic:v1'
const appRoot = document.querySelector('#app')

let catalog = {
  status: 'idle',
  providers: [],
  requiresAccessToken: false,
  error: '',
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

function endpoint(path) {
  return `${normalizedGatewayUrl()}${path}`
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

async function fetchProviders({ announce = false } = {}) {
  catalog = { ...catalog, status: 'loading', error: '' }
  refreshSettingsRoute()
  try {
    const response = await fetch(endpoint('/api/providers'), {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`HTTP_${response.status}`)
    const data = await response.json()
    catalog = {
      status: 'ready',
      providers: Array.isArray(data.providers) ? data.providers : [],
      requiresAccessToken: Boolean(data.requiresAccessToken),
      error: '',
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
          ? `网关已连接，发现 ${catalog.providers.length} 个可用模型。`
          : '网关已连接，但服务端尚未配置模型密钥。',
        catalog.providers.length ? 'success' : 'warning',
      )
    }
  } catch {
    catalog = {
      status: 'error',
      providers: [],
      requiresAccessToken: false,
      error: '当前地址没有可用的 AI 网关；本地审议不受影响。',
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

function renderSettings() {
  if ((location.hash.slice(1) || 'home') !== 'models') return
  if (appRoot.dataset.aiRoute === 'models') return
  appRoot.dataset.aiRoute = 'models'

  const statusText =
    catalog.status === 'loading'
      ? '正在检查网关…'
      : catalog.status === 'ready'
        ? `${catalog.providers.length} 个模型可用`
        : catalog.error || '尚未检查网关'

  appRoot.innerHTML = `<header class="page-head">
    <p class="eyebrow">Model gateway</p>
    <h1>AI 可以参与追问，<br>不能接管判断。</h1>
    <p class="lead">供应商密钥只保存在服务端。开启 AI 增强后，只发送当前问题、初始立场、依据、确信度和挑战强度。</p>
  </header>
  <section class="ai-settings-grid">
    <form class="panel ai-settings-form" id="ai-settings-form">
      <div class="ai-status-row">
        <div><small>网关状态</small><strong>${escapeHtml(statusText)}</strong></div>
        <span class="pill ${catalog.providers.length ? 'accent' : 'warn'}">${catalog.providers.length ? '已连接' : '本地模式'}</span>
      </div>
      <div class="field">
        <label class="toggle-row">
          <input type="checkbox" name="enabled" ${settings.enabled ? 'checked' : ''} ${catalog.providers.length ? '' : 'disabled'}>
          <span><strong>启用 AI 增强追问</strong><small>关闭时始终使用可检查的本地规则引擎。</small></span>
        </label>
      </div>
      <div class="field">
        <label for="ai-provider">默认模型</label>
        <select id="ai-provider" name="provider" ${catalog.providers.length ? '' : 'disabled'}>${providerOptions()}</select>
      </div>
      <div class="field">
        <label for="ai-gateway-url">模型网关地址</label>
        <input id="ai-gateway-url" name="gatewayUrl" type="url" value="${escapeHtml(settings.gatewayUrl)}" placeholder="留空表示当前网站；也可填写 Vercel 部署地址">
        <small class="help">GitHub Pages 只提供本地模式。使用独立 Vercel 网关时，在这里填写完整 HTTPS 地址。</small>
      </div>
      <div class="field">
        <label for="ai-access-token">Beta 访问令牌</label>
        <input id="ai-access-token" name="accessToken" type="password" value="${escapeHtml(settings.accessToken)}" autocomplete="off" placeholder="仅当网关启用了 AI_GATEWAY_TOKEN">
        <small class="help">这不是模型供应商 API Key；它只用于限制 Beta 网关访问，并保存在当前浏览器。</small>
      </div>
      <div class="form-actions ai-form-actions">
        <button type="button" class="ghost" data-ai-action="check">检查网关配置</button>
        <button class="primary">保存模型设置</button>
      </div>
    </form>
    <aside class="ai-privacy-card">
      <p class="eyebrow">Data boundary</p>
      <h2>每次发送什么</h2>
      <ul>
        <li>当前问题与问题类型</li>
        <li>你主动写下的初始立场和依据</li>
        <li>确信度与挑战强度</li>
      </ul>
      <h3>默认不发送什么</h3>
      <ul>
        <li>历史审议档案</li>
        <li>其他问题的回答</li>
        <li>重复模式统计与导出文件</li>
        <li>供应商 API Key</li>
      </ul>
      <p class="muted">模型生成失败、超时或格式异常时，系统保留本地问题并继续工作。</p>
    </aside>
  </section>`

  bindSettings()
}

function refreshSettingsRoute() {
  if ((location.hash.slice(1) || 'home') !== 'models') return
  delete appRoot.dataset.aiRoute
  renderSettings()
}

function bindSettings() {
  const form = document.querySelector('#ai-settings-form')
  if (!form) return

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const gatewayUrl = normalizedGatewayUrl(data.get('gatewayUrl'))
    if (data.get('gatewayUrl') && !gatewayUrl) {
      showNotice('网关地址必须是有效的 HTTP 或 HTTPS 地址。', 'warning')
      return
    }
    saveSettings({
      enabled: data.get('enabled') === 'on' && catalog.providers.length > 0,
      provider: String(data.get('provider') || ''),
      gatewayUrl,
      accessToken: String(data.get('accessToken') || '').trim(),
    })
    showNotice('模型设置已保存在当前浏览器。', 'success')
    fetchProviders()
  })

  document.querySelector('[data-ai-action="check"]')?.addEventListener('click', () => {
    const data = new FormData(form)
    const gatewayUrl = normalizedGatewayUrl(data.get('gatewayUrl'))
    if (data.get('gatewayUrl') && !gatewayUrl) {
      showNotice('请先填写有效的网关地址。', 'warning')
      return
    }
    saveSettings({ gatewayUrl })
    fetchProviders({ announce: true })
  })
}

function enginePanel() {
  const ready = catalog.providers.length > 0
  const aiAvailable = ready && settings.enabled
  return `<section class="ai-engine-panel" aria-labelledby="ai-engine-title">
    <div>
      <p class="eyebrow">Inquiry engine</p>
      <h2 id="ai-engine-title">选择追问引擎</h2>
      <p class="muted">本地引擎透明、离线；AI 引擎会把本次初始材料发送到所选供应商。</p>
    </div>
    <div class="engine-options">
      <label class="engine-option">
        <input type="radio" name="inquiry-engine" value="local" ${aiAvailable ? '' : 'checked'}>
        <span><strong>本地规则</strong><small>无需网络，失败风险最低。</small></span>
      </label>
      <label class="engine-option ${aiAvailable ? '' : 'disabled'}">
        <input type="radio" name="inquiry-engine" value="ai" ${aiAvailable ? 'checked' : ''} ${aiAvailable ? '' : 'disabled'}>
        <span><strong>AI 增强</strong><small>${aiAvailable ? `${escapeHtml(catalog.providers.find((item) => item.id === settings.provider)?.label || '已配置模型')} · 失败时回退本地` : '请先在模型设置中连接网关'}</small></span>
      </label>
    </div>
    <div class="ai-engine-footer">
      <label>本次模型
        <select name="ai-provider" ${aiAvailable ? '' : 'disabled'}>${providerOptions()}</select>
      </label>
      <button type="button" class="ghost compact" data-route="models">模型设置</button>
    </div>
  </section>`
}

function enhanceNewForm() {
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
    const provider = providerSelect?.value || settings.provider
    setTimeout(() => generateAiQuestions(payload, provider), 0)
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
