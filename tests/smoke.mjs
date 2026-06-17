import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const html = await readFile('index.html', 'utf8')
const app = await readFile('app.js', 'utf8')
const manifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'))
const worker = await readFile('sw.js', 'utf8')

assert.ok(html.includes('Socratic Kernel'))
assert.ok(html.includes('app.js'))
assert.ok(html.includes('manifest.webmanifest'))
assert.ok(app.includes('AI 使用审计'))
assert.ok(app.includes('判断外包'))
assert.ok(app.includes('delete-current'))
assert.ok(app.includes('serviceWorker'))
assert.ok(!html.includes('src/main.tsx'))
assert.equal(manifest.short_name, '内核')
assert.equal(manifest.display, 'standalone')
assert.ok(worker.includes('socratic-kernel-v2'))

console.log('Socratic Kernel smoke checks passed.')
