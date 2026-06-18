import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const html = await readFile('index.html', 'utf8')
const results = await readFile('results.js', 'utf8')
const styles = await readFile('results.css', 'utf8')
const worker = await readFile('sw.js', 'utf8')

assert.ok(html.includes('results.css'))
assert.ok(html.includes('results.js'))
assert.ok(results.includes('Socratic Kernel 判断档案'))
assert.ok(results.includes('markdownFor'))
assert.ok(results.includes('plainTextFor'))
assert.ok(results.includes('privateJsonFor'))
assert.ok(results.includes('privacyShareText'))
assert.ok(results.includes('data-share-field="question"'))
assert.ok(results.includes('data-share-field="judgment"'))
assert.ok(results.includes('data-share-field="action"'))
assert.ok(results.includes('七天后重新检验'))
assert.ok(results.includes('默认不包含问题正文、结论和行动'))
assert.ok(!results.includes('fetch('))
assert.ok(styles.includes('.judgment-artifact'))
assert.ok(styles.includes('.privacy-share'))
assert.ok(styles.includes('.privacy-preview'))
assert.ok(worker.includes('socratic-kernel-v6'))
assert.ok(worker.includes('results.js'))
assert.ok(worker.includes('results.css'))

console.log('Judgment result checks passed.')
