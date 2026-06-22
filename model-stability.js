const appRoot = document.querySelector('#app')
const SETTINGS_KEY = 'socratic-kernel:ai:v1'

let restoreContext = null
let restoreFrame = 0
let diagnosticRequest = 0

function currentRoute() {
  return location.hash.slice(1) || 'home'
}

function onModelRoute() {
  return currentRoute() === 'models'
}

function modelPageExists() {
  return Boolean(appRoot.querySelector('#ai-settings-form'))
}

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
  } catch {
    return {}
  }
}

function normalizedGatewayUrl(value = '') {
  const trimmed = String(value || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString().replace(/\/+$/, '') : ''
  } catch {
    return ''
  }
}

function gatewayEndpoint(path) {
  return `${normalizedGatewayUrl(readSettings().gatewayUrl)}${path}`
}

function focusDescriptor(target) {
  const provider = target.closest('input[name="provider"]')
  if (provider) return `[name="provider"][value="${CSS.escape(provider.value)}"]`

  const action = target.closest('[data-ai-action]')
  if (action) return `[data-ai-action="${CSS.escape(action.dataset.aiAction)}"]`

  if (target.closest('input[name="enabled"]')) return 'input[name="enabled"]'
  if (target.closest('.advanced-settings summary')) return '.advanced-settings summary'
  if (target.closest('.model-step-actions .primary')) return '.model-step-actions .primary'
  return null
}

function rememberInteraction(target) {
  if (!onModelRoute() || !target.closest('#ai-settings-form')) return
  restoreContext = {
    scrollY,
    focusSelector: focusDescriptor(target),
    createdAt: Date.now(),
  }
}

function restoreModelContext() {
  restoreFrame = 0
  if (!restoreContext || !onModelRoute() || Date.now() - restoreContext.createdAt > 10000) return

  const target = restoreContext.focusSelector
    ? appRoot.querySelector(restoreContext.focusSelector)
    : null
  target?.focus?.({ preventScroll: true })
  scrollTo({ top: restoreContext.scrollY, left: 0, behavior: 'auto' })
  restoreContext = null
}

function scheduleRestore() {
  if (!restoreContext || !onModelRoute()) return
  cancelAnimationFrame(restoreFrame)
  restoreFrame = requestAnimationFrame(() => requestAnimationFrame(restoreModelContext))
}

function diagnosticMarkup(data) {
  const tokenState = data.requiresAccessToken
    ? '访问保护已经被当前部署读取。'
    : '当前部署没有启用访问保护。'

  return `<section class="provider-diagnostic" aria-labelledby="provider-diagnostic-title">
    <div class="provider-diagnostic-head">
      <span aria-hidden="true">!</span>
      <div>
        <p class="eyebrow">Configuration diagnosis</p>
        <h4 id="provider-diagnostic-title">Gateway 正常，但当前 Production 没有读到模型供应商配置。</h4>
        <p>${tokenState} 因此问题集中在供应商变量名称、环境范围或重新部署步骤。</p>
      </div>
    </div>
    <ol class="provider-diagnostic-steps">
      <li><strong>检查变量名称</strong><span>至少存在一个受支持供应商的变量，并且名称完全一致。</span></li>
      <li><strong>检查环境范围</strong><span>变量必须包含 <code>Production</code>，不能只存在于 Preview 或 Development。</span></li>
      <li><strong>重新部署</strong><span>保存变量后进入 Deployments，对 Production 执行 Redeploy。旧部署不会自动获得新变量。</span></li>
      <li><strong>重新检查</strong><span>新部署显示 Ready 后回到这里，再点击“检查 Gateway”。</span></li>
    </ol>
    <div class="provider-variable-list" aria-label="支持的供应商变量名称">
      <div><span>OpenAI</span><code>OPENAI_API_KEY</code></div>
      <div><span>Claude</span><code>ANTHROPIC_API_KEY</code></div>
      <div><span>Gemini</span><code>GEMINI_API_KEY</code></div>
      <div><span>DeepSeek</span><code>DEEPSEEK_API_KEY</code></div>
      <div><span>Qwen</span><code>DASHSCOPE_API_KEY</code></div>
      <div><span>Kimi</span><code>MOONSHOT_API_KEY</code></div>
      <div><span>Grok</span><code>XAI_API_KEY</code></div>
    </div>
    <div class="provider-diagnostic-actions">
      <button type="button" class="ghost" data-model-recheck>已重新部署，重新检查</button>
    </div>
  </section>`
}

async function enhanceProviderDiagnosis() {
  if (!onModelRoute() || !modelPageExists()) return
  const empty = appRoot.querySelector('.provider-empty')
  if (!empty || appRoot.querySelector('.provider-diagnostic')) return

  const requestId = ++diagnosticRequest
  try {
    const response = await fetch(gatewayEndpoint('/api/providers'), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return
    const data = await response.json()
    if (requestId !== diagnosticRequest || !onModelRoute()) return
    if (Array.isArray(data.providers) && data.providers.length === 0) {
      empty.insertAdjacentHTML('afterend', diagnosticMarkup(data))
    }
  } catch {
    // The main model center already handles connectivity failures.
  }
}

function enhanceModelPage() {
  if (!onModelRoute()) {
    restoreContext = null
    return
  }
  scheduleRestore()
  enhanceProviderDiagnosis()
}

appRoot.addEventListener('pointerdown', (event) => rememberInteraction(event.target), {
  capture: true,
})

appRoot.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') rememberInteraction(event.target)
}, { capture: true })

appRoot.addEventListener('click', (event) => {
  if (!event.target.closest('[data-model-recheck]')) return
  event.preventDefault()
  rememberInteraction(event.target)
  appRoot.querySelector('[data-ai-action="check"]')?.click()
})

addEventListener('hashchange', () => {
  if (!onModelRoute()) restoreContext = null
  queueMicrotask(enhanceModelPage)
})

new MutationObserver(() => queueMicrotask(enhanceModelPage)).observe(appRoot, {
  childList: true,
  subtree: true,
})

enhanceModelPage()
