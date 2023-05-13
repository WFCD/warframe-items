import Items from '../index.mjs';
const items = new Items();
console.error(items.find(i => i.name === 'Alloy Plate').type);