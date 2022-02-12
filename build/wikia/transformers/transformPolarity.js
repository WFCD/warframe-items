const POLARITIES = require('./polarities')

const transform = (field) => {
  let output
  if (field) {
    output = (POLARITIES[field] || field || '').toLowerCase()
    if (output && !output.length) output = undefined
    if (output === 'none') output = undefined
  }
  return output
}

/**
 * Transform polarity
 * @param {string} [AuraPolarity]
 * @param {string} [StancePolarity]
 * @param {string} [Polarity]
 * @param {string} [Polarities]
 * @param {module:warframe-items.Item} target
 * @returns {*}
 */
module.exports = ({ AuraPolarity, StancePolarity, Polarity, Polarities }, target) => {
  const output = { ...target }
  output.auraPolarity = transform(AuraPolarity)
  output.stancePolarity = transform(StancePolarity)
  output.polarity = transform(Polarity)
  output.polarities = Polarities && Polarities.length ? Polarities.map(transform) : undefined
  return output
}
