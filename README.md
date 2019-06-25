## Warframe-items

[![Supported by Warframe Community Developers](https://warframestat.us/wfcd.png)](https://github.com/WFCD "Supported by Warframe Community Developers")

[![npm](https://img.shields.io/npm/v/warframe-items.svg)](https://npmjs.org/warframe-items)
[![warframe update](https://img.shields.io/badge/warframe_update-25.2.0-blue.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOTgiIGhlaWdodD0iMTczIiB2aWV3Qm94PSIwIDAgMjk4IDE3MyI%2BPHBhdGggZD0iTTE4NSA2N2MxNSA4IDI4IDE2IDMxIDE5czIzIDE4LTcgNjBjMCAwIDM1LTMxIDI2LTc5LTE0LTctNjItMzYtNzAtNDUtNC01LTEwLTEyLTE1LTIyLTUgMTAtOSAxNC0xNSAyMi0xMyAxMy01OCAzOC03MiA0NS05IDQ4IDI2IDc5IDI2IDc5LTMwLTQyLTEwLTU3LTctNjBsMzEtMTkgMzYtMjIgMzYgMjJ6TTU1IDE3M2wtMTctM2MtOC0xOS0yMC00NC0yNC01MC01LTctNy0xMS0xNC0xNWwxOC0yYzE2LTMgMjItNyAzMi0xMyAxIDYgMCA5IDIgMTQtNiA0LTIxIDEwLTI0IDE2IDMgMTQgNSAyNyAyNyA1M3ptMTYtMTFsLTktMi0xNC0yOWEzMCAzMCAwIDAgMC04LThoN2wxMy00IDQgN2MtMyAyLTcgMy04IDZhODYgODYgMCAwIDAgMTUgMzB6bTE3MiAxMWwxNy0zYzgtMTkgMjAtNDQgMjQtNTAgNS03IDctMTEgMTQtMTVsLTE4LTJjLTE2LTMtMjItNy0zMi0xMy0xIDYgMCA5LTIgMTQgNiA0IDIxIDEwIDI0IDE2LTMgMTQtNSAyNy0yNyA1M3ptLTE2LTExbDktMiAxNC0yOWEzMCAzMCAwIDAgMSA4LThoLTdsLTEzLTQtNCA3YzMgMiA3IDMgOCA2YTg2IDg2IDAgMCAxLTE1IDMwem0tNzktNDBsLTYtNmMtMSAzLTMgNi02IDdsNSA1YTUgNSAwIDAgMSAyIDB6bS0xMy0yYTQgNCAwIDAgMSAxLTJsMi0yYTQgNCAwIDAgMSAyLTFsNC0xNy0xNy0xMC04IDcgMTMgOC0yIDctNyAyLTgtMTItOCA4IDEwIDE3em0xMiAxMWE1IDUgMCAwIDAtNC0yIDQgNCAwIDAgMC0zIDFsLTMwIDI3YTUgNSAwIDAgMCAwIDdsNCA0YTYgNiAwIDAgMCA0IDIgNSA1IDAgMCAwIDMtMWwyNy0zMWMyLTIgMS01LTEtN3ptMzkgMjZsLTMwLTI4LTYgNmE1IDUgMCAwIDEgMCAzbDI2IDI5YTEgMSAwIDAgMCAxIDBsNS0yIDItMmMxLTIgMy01IDItNnptNS00NWEyIDIgMCAwIDAtNCAwbC0xIDEtMi00YzEtMy01LTktNS05LTEzLTE0LTIzLTE0LTI3LTEzLTIgMS0yIDEgMCAyIDE0IDIgMTUgMTAgMTMgMTNhNCA0IDAgMCAwLTEgMyAzIDMgMCAwIDAgMSAxbC0yMSAyMmE3IDcgMCAwIDEgNCAyIDggOCAwIDAgMSAyIDNsMjAtMjFhNyA3IDAgMCAwIDEgMSA0IDQgMCAwIDAgNCAwYzEtMSA2IDMgNyA0aC0xYTMgMyAwIDAgMCAwIDQgMiAyIDAgMCAwIDQgMGw2LTZhMyAzIDAgMCAwIDAtM3oiIGZpbGw9IiMyZTk2ZWYiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D)](https://forums.warframe.com/topic/1104200-the-jovian-concord-update-2520/)
[![build](https://ci.nexus-stats.com/api/badges/WFCD/warframe-items/status.svg)](https://ci.nexus-stats.com/WFCD/warframe-items)
[![dependencies](https://david-dm.org/WFCD/warframe-items.svg)](https://david-dm.org/WFCD/warframe-items)
[![Discord](https://img.shields.io/discord/256087517353213954.svg?logo=discord)](https://discord.gg/jGZxH9f)

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
