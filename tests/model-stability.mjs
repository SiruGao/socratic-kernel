import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const html = await readFile('index.html', 'utf8')
const script = await readFile('model-stability.js', 'utf8')
const styles = await readFile('model-stability.css', 'utf8')
const worker = await readFile('sw.js', 'utf8')

assert.ok(html.includes('model-stability.css'))
assert.ok(html.includes('model-stability.js'))
assert.ok(!script.includes('event.stopPropagation()'))
assert.ok(!script.includes('history.replaceState'))
assert.ok(!script.includes('pinModelRoute'))
assert.ok(script.includes('restoreContext'))
assert.ok(script.includes('focusSelector'))
assert.ok(script.includes('scrollTo'))
assert.ok(script.includes('provider-diagnostic'))
assert.ok(script.includes('Production'))
assert.ok(script.includes('data-model-recheck'))
assert.ok(styles.includes('.provider-diagnostic'))
assert.ok(styles.includes('.provider-variable-list'))
assert.ok(styles.includes('@media (max-width: 760px)'))
assert.ok(worker.includes('socratic-kernel-v6-1'))
assert.ok(worker.includes('model-stability.js'))
assert.ok(worker.includes('model-stability.css'))

console.log('Model center stability checks passed.')
