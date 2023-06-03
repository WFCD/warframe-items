/* eslint-disable no-console */

import Items from '../index.mjs';

const items = new Items();

const toFind = [
  // 'Nano Spores',
  // 'Alloy Plate',
  // 'Salvage',
  // 'Rubedo',
  // 'Plastids',
  // 'Circuits',
  // 'Orokin Cell',
  // 'Argon Crystal',
  // 'Control Module',
  // 'Mutalist Alad V Nav Coordinate',
  // 'Cryptographic ALU'.toLowerCase(),
  // 'Omega Isotope',
  // 'Riven Sliver',
  // 'Kuva'.toLowerCase(),
  // 'Steel Essence',
  // 'Morphics',
  // 'Cryotic',
  // 'Hexenon',
  // 'Neural Sensors',
  // 'Oxium',
  // 'Polymer Bundle',
  // 'Tellurium',
  // 'Spectral Debris',
  // 'Aya',
  // 'Somatic Fibers',
  'Endo',
  // 'Nav Coordinate',
  // 'Judgement Points',
  // 'Synthula',
  // 'Javlok Capacitor',
  // 'Vitus Essence',
  // 'Void Traces',
  // 'Gallium',
  // 'Antiserum Injector Fragment',
];

console.error(
  items.filter((i) => toFind.includes(i.name.toLowerCase())).map((i) => `${i.uniqueName}:${i.type}::${i.name}`)
);

console.error(
  items.filter((i) => i.name.toLowerCase().includes('endo')).map((i) => `${i.uniqueName}::${i.type}::${i.name}`)
);
