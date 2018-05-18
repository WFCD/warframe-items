## Warframe-items

Fetches all items available on Warframe's mobile API endpoints while also
adding images, drop rates and related rivens.

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
```
const Items = require('warframe-items')
const items = new Items(options, ...items)
```
In this example, `items` is an Array with all items. You can force it to fetch
new data based on your options with `await items.update()`. The `...items` param
allows you to add your own items before our gathered ones.

<br>

### Options
| Option        | Default       | Description   |
|:------------- |:------------- |:------------- |
| type | `'All'` | Item type to retrieve. Parallel to file names in /data
| tradable | `null` | Wether only tradable or untradable items should be returned. Default returns all.

<br>

### Pre-compiled data
You can find all automatically compiled data in `/data/json`. File names ending in
`-lock` include the item's `contentHash`, `dropRateHash` and `imageHash`. These
values are used to figure out which items need updating but don't matter much
otherwise.

<br>

## License
[MIT](/LICENSE.md)
