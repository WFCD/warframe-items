/* eslint-disable no-console */
import Items from 'warframe-items';

const items = new Items();

console.error(items.find((i) => i.name.includes("Amar's Anguish")));
