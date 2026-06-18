import assert from 'node:assert/strict'
import {
  generateInquiry,
  listEnabledProviders,
  normalizeInput,
} from '../lib/ai-gateway.js'

const env = {
  OPENAI_API_KEY: 'server-secret-for-test',
  OPENAI_MODEL: 'test-openai-model',
  DEEPSEEK_API_KEY: 'server-secret-for-test',
  DEEPSEEK_MODEL: 'test-deepseek-model',
}

const providers = listEnabledProviders(env)
assert.deepEqual(
  providers.map((provider) => provider.id),
  ['openai', 'deepseek'],
)
assert.ok(!JSON.stringify(providers).includes('server-secret-for-test'))

const normalized = normalizeInput({
  mode: 'decision',
  question: '我是否应该集中完成一个项目？',
  position: '我倾向先完成一个，因为并行工作让我不断切换。',
  evidence: '过去几周多个项目都没有完成。',
  confidence: 64,
  challenge: 1,
})
assert.equal(normalized.challenge, 1)
assert.equal(normalized.confidence, 64)

const modelOutput = JSON.stringify({
  questions: [
    { dimension: 'definition', text: '你所说的“完成”具体以什么可观察结果为标准？', reason: '澄清成功标准。' },
    { dimension: 'evidence', text: '哪些事实说明切换本身是主要阻碍，而不是任务范围过大？', reason: '区分解释与证据。' },
    { dimension: 'opposition', text: '支持并行推进的人能提出什么最强理由？', reason: '构造最强反方。' },
    { dimension: 'experiment', text: '你能用一周做什么可逆实验来比较两种方式？', reason: '获得现实反馈。' },
  ],
  summary: '当前冲突在于专注带来的完成率与并行带来的机会覆盖。',
  warnings: [],
})

const originalFetch = global.fetch
global.fetch = async () =>
  new Response(JSON.stringify({ output_text: modelOutput }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

try {
  const result = await generateInquiry({
    providerId: 'openai',
    input: normalized,
    env,
  })
  assert.equal(result.provider, 'openai')
  assert.equal(result.model, 'test-openai-model')
  assert.equal(result.questions.length, 4)
  assert.equal(result.questions[0].dimension, 'definition')
  assert.ok(result.summary.includes('专注'))
} finally {
  global.fetch = originalFetch
}

await assert.rejects(
  () =>
    generateInquiry({
      providerId: 'anthropic',
      input: normalized,
      env,
    }),
  /PROVIDER_NOT_CONFIGURED/,
)

console.log('AI gateway checks passed.')
