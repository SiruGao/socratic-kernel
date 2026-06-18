import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const html = await readFile('index.html', 'utf8')
const interactions = await readFile('interactions.js', 'utf8')
const motion = await readFile('motion.css', 'utf8')
const brand = await readFile('brand-symbol.svg', 'utf8')

assert.ok(html.includes('logo-orbit-a'))
assert.ok(html.includes('logo-core'))
assert.ok(html.includes('logo-node'))
assert.ok(!html.includes('>核<'))
assert.ok(html.includes('scroll-progress'))
assert.ok(html.includes('cursor-aura'))
assert.ok(interactions.includes('IntersectionObserver'))
assert.ok(interactions.includes("matchMedia('(pointer: fine)')"))
assert.ok(interactions.includes('magneticSelector'))
assert.ok(interactions.includes('tiltSelector'))
assert.ok(interactions.includes('--scroll-progress'))
assert.ok(motion.includes('.is-magnetic'))
assert.ok(motion.includes('.tilt-surface'))
assert.ok(motion.includes('@media (pointer: coarse)'))
assert.ok(motion.includes('@media (prefers-reduced-motion: reduce)'))
assert.ok(brand.includes('judgment core'))
assert.ok(brand.includes('#5b1820'))
assert.ok(brand.includes('#b18a55'))

console.log('Brand and motion checks passed.')
