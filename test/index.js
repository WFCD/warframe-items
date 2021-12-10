const assert = require('assert')

const dedupe = require('../build/dedupe')
let Items
const decache = require('decache')

const inits = []

const wrapConstr = (opts) => {
  const before = Date.now()
  const items = new Items(opts)
  const after = Date.now()
  inits.push(after - before)
  return items
}

beforeEach(() => {
  Items = require('../index')
})
afterEach(() => {
  decache('../index.js')
})
// after(() => {
//   console.error(`Average init time: ${(inits.reduce((a, b) => a + b, 0) / inits.length).toFixed(0)}`)
// })

describe('index.js', () => {
  it('should contain items when initializing.', () => {
    const items = new Items()
    assert(items.length)
  })
  it('should ignore enemies when configured.', () => {
    let items = wrapConstr({ ignoreEnemies: true }).filter(i => i.category === 'Enemy')
    assert(!items.length)

    items = wrapConstr({ category: ['Enemy', 'Primary'], ignoreEnemies: true }).filter(i => i.category === 'Enemy')
    assert(!items.length)
  })
  it('should construct successfully with all & primary', () => {
    const items = wrapConstr({ category: ['Primary', 'All'] })
    assert(items.length > 0)
  })

  // Custom filter override in index.js
  it('should not return more or equal the number of objects after .filter(), when custom categories are specified.', () => {
    const items = wrapConstr({ category: ['Primary'] })
    const primes = items.filter(i => i.name.includes('Prime'))
    assert(primes.length < items.length)
  })
  describe('drops', () => {
    it('should not have drops for hikou', () => {
      const items = wrapConstr({ category: ['Secondary'] })
      const hikouMatches = items.filter(i => i.name === 'Hikou')
      assert(hikouMatches.length === 1)
      const { drops } = hikouMatches[0]
      assert(typeof drops === 'undefined')
    })

    it('should only have non-prime drops for Gorgon', () => {
      const items = wrapConstr({ category: ['Primary'] })
      const matches = items.filter(i => i.name === 'Gorgon')
      assert(matches.length === 1)
      const { drops } = matches[0]
      assert(typeof drops === 'undefined')

      const bp = matches[0].components.filter(component => component.name === 'Blueprint')[0]
      assert(typeof bp !== 'undefined')
      assert(bp.drops.length !== 0)

      const primeBpDrops = bp.drops.filter(n => n.type.includes('Prime'))
      assert(primeBpDrops.length === 0)
    })

    it('should have variant drops when requested', () => {
      const items = wrapConstr({ category: ['Primary'] })
      const matches = items.filter(i => i.name === 'Gorgon Wraith')
      assert(matches.length === 1)
      const { drops } = matches[0]
      assert(typeof drops === 'undefined')

      const bp = matches[0].components.filter(component => component.name === 'Blueprint')[0]
      assert(typeof bp !== 'undefined')
      assert(bp.drops.length !== 0)

      const variantDrops = bp.drops.filter(n => n.type.includes('Wraith'))
      assert(variantDrops.length === 1)
    })

    it('should only have 1 result for Mausolon', () => {
      const items = wrapConstr({ category: ['Arch-Gun'] })
      const matches = items.filter(i => i.name === 'Mausolon').map(i => {
        delete i.patchlogs
        return i
      })
      const dd = dedupe(matches)
      assert.strictEqual(dd.length, matches.length, 'Before and after dedupe should match')
      assert.strictEqual(matches.length, 1, 'There can be only One')
    })
  })
  describe('i18n', () => {
    it('should not exist by default', () => {
      const items = wrapConstr()
      assert(!items.i18n)
    })
    it('should only contain requested locales', () => {
      const items = wrapConstr({ category: ['Mods'], i18n: ['es'] })
      assert(!items.i18n[items[0].uniqueName].tr)
      assert(!!items.i18n[items[0].uniqueName].es)
    })
    it('should populate with a truthy boolean', () => {
      const items = wrapConstr({ category: ['Mods'], i18n: true })
      assert(!!items.i18n[items[0].uniqueName].tr)
      assert(!!items.i18n[items[0].uniqueName].es)
    })
    it('should respect itemOnObject', () => {
      const items = wrapConstr({ category: ['Mods'], i18n: ['es'], i18nOnObject: true })
      assert(!items[0].i18n.tr)
      assert(!!items[0].i18n.es)
      assert(!items.i18n)
    })
  })
})
