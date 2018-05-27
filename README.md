## Warframe-items
[![npm](https://img.shields.io/npm/v/warframe-items.svg)](https://npmjs.org/warframe-items)
[![build](https://ci.nexus-stats.com/api/badges/WFCD/warframe-items/status.svg)](https://ci.nexus-stats.com/WFCD/warframe-items)
[![dependencies](https://david-dm.org/nexus-devs/warframe-items.svg)](https://david-dm.org/nexus-devs/warframe-items)

[![Supported by Warframe Community Developers](https://warframestat.us/wfcd.png)](https://github.com/WFCD "Supported by Warframe Community Developers")

<br>

Fetches all items available on Warframe's mobile API endpoints while also
adding images, drop rates, patch logs and related rivens.

The aim of this library is to create a complete collection of data for every
item in Warframe based on the game's own data. This repo will be automatically
updated on every new release, drop rate change or image change.

<br>

### Installation
```
npm install warframe-items
```

<br>

### Usage
```js
const Items = require('warframe-items')
const items = new Items(options, ...items)
```
In this example, `items` is an Array with all items. The `...items` param
allows you to add your own items before our gathered ones.

<br>

### Options
| Option        | Default       | Description   |
|:------------- |:------------- |:------------- |
| category | `'All'` | Item category to retrieve. Parallel to file names in /data/json. Useful if you don't wanna load lots and lots of MB of data into memory.

<br>

### Pre-compiled data
You can find all automatically compiled data in `/data/json`. Images are stored
in `/data/img`.

<br>

## License
[MIT](/LICENSE)
