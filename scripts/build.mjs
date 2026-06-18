import { cp, mkdir, rm } from 'node:fs/promises'

const files = [
  'index.html',
  'app.js',
  'onboarding.js',
  'ai.js',
  'visual.js',
  'interactions.js',
  'styles.css',
  'ai.css',
  'motion.css',
  'brand-symbol.svg',
  'icon.svg',
  'manifest.webmanifest',
  'sw.js',
]

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })
await Promise.all(files.map((file) => cp(file, `dist/${file}`)))

console.log(`Built Socratic Kernel with ${files.length} static assets.`)
