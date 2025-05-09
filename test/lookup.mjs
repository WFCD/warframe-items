#! /usr/bin/env node

/* eslint-disable no-console, import/no-extraneous-dependencies */
import Items from '@wfcd/items';
import diff from 'json-diff';

const lookup = process.argv[2];

const items = new Items();
const old = await fetch(`https://api.warframestat.us/weapons/${lookup}`).then((res) => res.json());
const updated = items.find((i) => i.name === lookup);

if (process.argv[3] === '--diff') {
  console.error(JSON.stringify(diff.diff(old, updated), undefined, 2));
} else {
  if (process.argv.includes('--no-hist')) delete updated.patchlogs;
  console.log('Updated:', JSON.stringify(updated, undefined, 2));
}
