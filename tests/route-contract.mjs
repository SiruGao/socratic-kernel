import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const app = await readFile('app.js', 'utf8')
const visual = await readFile('visual.js', 'utf8')

assert.ok(app.includes("closest('[data-route]')"))
assert.ok(visual.includes('dataset.currentRoute'))
assert.ok(!visual.includes('document.body.dataset.route'))
assert.ok(!visual.includes('body.dataset.route'))

console.log('Route attribute contract checks passed.')
