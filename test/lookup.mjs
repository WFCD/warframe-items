#! /usr/bin/env node

/* eslint-disable no-console, import/no-extraneous-dependencies */
import Items from 'warframe-items';
import diff from 'json-diff';

const lookup = 'Acceltra';

const items = new Items();
const old = await fetch(`https://api.warframestat.us/weapons/${lookup}`).then((res) => res.json());
const updated = items.find((i) => i.name.includes(lookup));

console.error(JSON.stringify(diff.diff(old, updated), undefined, 2));
