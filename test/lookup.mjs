/* eslint-disable no-console */

import Items from '../index.mjs';

const items = new Items();

console.error(items.find((i) => i.name.includes("Amar's Anguish")));
