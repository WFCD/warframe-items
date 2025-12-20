import POLARITIES from './polarities.mjs';

const transform = (field) => {
  let output;
  try {
    if (field) {
      if (typeof field !== 'string' && Array.isArray(field)) {
        return field.map((f) => transform(f));
      }
      output = (POLARITIES[field] || field || '').toLowerCase();
      if (output && !output.length) output = undefined;
      if (output === 'none') output = undefined;
    }
  } catch (error) {
    console.error(`Error transforming polarity @${field} : ${error.message}`);
  }

  return output;
};

/**
 * Transform polarity
 * @param {string} [AuraPolarity] string designating the polarity for the aura compatibility of a Warframe
 * @param {module:warframe-items.Item} target item for which to standardize polarities
 * @param {string} [StancePolarity] string designating the polarity for the stance compatibility of a melee weapon
 * @param {string} [Polarity] string designating the polarity for the aura compatibility of a mod slot or Mod
 * @param {Array<string>} [Polarities] list of strings designating polarities on a weapon or warframe
 * @returns {*}
 */
export default ({ AuraPolarity, StancePolarity, Polarity, Polarities }, target) => {
  const output = { ...target };
  output.auraPolarity = transform(AuraPolarity);
  output.stancePolarity = transform(StancePolarity);
  output.polarity = transform(Polarity);
  output.polarities = Polarities && Polarities.length ? Polarities.map(transform) : undefined;
  return output;
};
