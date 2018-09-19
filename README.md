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

### Why use this instead of any other scraper?
Because this gives you literally every item in Warframe, many of which can't even
be found on the wikia. We also make sure to include every other data aspect
that you could possibly need. To give you some idea:

- Unique ingame name - (/Lotus/Weapons/Tenno/...) - Especially useful when working with worldState
- Drop rates
- Patchlogs for each item
- Minified source images
- Rivens
- Whether items are tradable

And tons more item specific data. Check out [/data/json](/data/json) to get an
idea.

You can also rest assured that this repository will be maintained for as long
as Warframe stays alive, as it is has been built to provide all item data for [NexusHub](https://github.com/nexus-devs/NexusHub).

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
| category | `['All']` | Array of item categories to retrieve. Parallel to file names in /data/json. Useful if you don't wanna load lots and lots of MB of data into memory.

<br>

### Pre-compiled data
You can find all automatically compiled data in `/data/json`. Images are stored
in `/data/img`. You can find every item's image name stored in `item.imageName`.

<br>

### Image links

Since there are so many images, and we can't publish them due to the size, we've set up a ~~301 redirect~~ CDN to get you images at `https://cdn.warframestat.us/img/${item.imageName}` that provides a linkable resource for you. 

## License
[MIT](/LICENSE)
