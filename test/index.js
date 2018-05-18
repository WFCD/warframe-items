const assert = require('assert')

describe('index.js', function () {
  it('should contain items when initializing.', function () {
    const Items = require('../index.js')
    const items = new Items()
    assert(items.length)
  })
})
