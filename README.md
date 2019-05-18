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

Since there are so many images, and we can't publish them on npm due to the size, we've set up a CDN to get you images at `https://cdn.warframestat.us/img/${item.imageName}` that provides a linkable resource for you.

<br>
<br>

## For Developers
We're always happy to see contributions to this project, so here's some basic setup information
to get you started.

<br>

### Dependencies
- [Node.js > 10](https://nodejs.org/en/)
- [Lua > 5](https://www.lua.org/download.html)
- Build Tools (`build-essentials` on linux should be enough, on windows run `npm i -g windows-build-tools`)
- libpng-dev12 (linux only)

<br>

### File structure
All relevant scripts are found in `/build/` with

[build.js](/build/build.js)<br>
The entrypoint for the build script. Here we also save JSON, image and cache data.

[scraper.js](/build/scraper.js)<br>
Fetches all external data and returns it to the parser.

[parser.js](/build/parser.js)<br>
Parses the external data to match our schema and returns it to the build script.

<br>

### Usage and Testing
You can run the build script with `npm run build`.
Once built, you can verify the data with `npm test`.

<br>

## License
[MIT](/LICENSE)
