const assert = require('assert')

describe('index.js', function () {
  // Smoke test
  it('should contain items when initializing.', function () {
    const Items = require('../index.js')
    const items = new Items()
    assert(items.length)
  })

  it('should ignore enemies when configured.', function () {
    const Items = require('../index.js')
    const items = new Items({ ignoreEnemies: true }).filter(i => i.category === 'Enemy')
    assert(!items.length)
  })

  // Custom filter override in index.js
  it('should not return more or equal the number of objects after .filter(), when custom categories are specified.', function () {
    const Items = require('../index.js')
    const items = new Items({ category: ['Primary'] })
    const primes = items.filter(i => i.name.includes('Prime'))
    assert(primes.length < items.length)
  })
})
