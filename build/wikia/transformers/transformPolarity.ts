import POLARITIES from './polarities';

const transform = (field: string | string[] | undefined): string | string[] | undefined => {
  let output: string | undefined;
  try {
    if (field) {
      if (typeof field !== 'string' && Array.isArray(field)) {
        return field.map((f) => transform(f) as string).filter(Boolean);
      }
      output = (POLARITIES[field] ?? field).toLowerCase();
      if (output && !output.length) output = undefined;
      if (output === 'none') output = undefined;
    }
  } catch (error) {
    const err = error as Error;
    console.error(`Error transforming polarity @${String(field)} : ${err.message}`);
    throw error;
  }

  return output;
};

interface PolaritySource {
  AuraPolarity?: string;
  ExilusPolarity?: string;
  StancePolarity?: string;
  Polarity?: string;
  Polarities?: string[];
}

interface PolarityTarget {
  auraPolarity?: string;
  exilusPolarity?: string;
  stancePolarity?: string;
  polarity?: string;
  polarities?: string[];
  [key: string]: unknown;
}

/**
 * Transform polarity
 * @param source - source object with polarity fields
 * @param target - item for which to standardize polarities
 * @returns transformed object with standardized polarities
 */
export default <T extends PolarityTarget>(source: PolaritySource, target: T): T => {
  const output = { ...target };
  output.auraPolarity = transform(source.AuraPolarity) as string | undefined;
  output.exilusPolarity = transform(source.ExilusPolarity) as string | undefined;
  output.stancePolarity = transform(source.StancePolarity) as string | undefined;
  output.polarity = transform(source.Polarity) as string | undefined;
  output.polarities = source.Polarities?.length ? (transform(source.Polarities) as string[]) : undefined;
  return output;
};
