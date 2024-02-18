import { translatePolarity } from 'warframe-worldstate-data/utilities';
import Items from 'warframe-items';

/**
 * Find an item by unique name
 * @param {string} uname unique name of desired item
 * @returns {Item | undefined}
 */
export const findItem = (uname) =>
  new Items()
    .filter((item) => item && typeof item !== 'undefined' && item.uniqueName)
    .find((item) => item.uniqueName === uname);

/**
 * load mods list
 * @param {ModResolveable[]} upgrades list of mods to load
 * @returns {{mods: ModUnion[], arcanes: Arcane[]}}
 */
export const loadMods = (upgrades = []) => {
  const arcanes = [];
  const mods = [];
  upgrades.forEach((upgrade) => {
    let upgradeData = findItem(upgrade.uniqueName) || upgrade;

    upgradeData.rank = upgrade.rank;
    upgradeData.uniqueName = upgrade.uniqueName;
    if (upgradeData.levelStats) {
      upgradeData.levelStats = upgradeData.levelStats[upgrade.rank] || upgradeData.levelStats;
    }
    delete upgradeData.drops;
    delete upgradeData.patchlogs;

    if (upgradeData.category === 'Arcanes') {
      delete upgradeData.tradable;
      arcanes.push(upgradeData);
    } else if (upgradeData.category === 'Mods') {
      if (upgradeData.name.includes('Riven Mod')) {
        upgradeData = {
          uniqueName: upgradeData.uniqueName,
          polarity: translatePolarity(upgrade.pol),
          rarity: upgradeData.rarity,
          baseDrain: Number(upgradeData.baseDrain),
          fusionLimit: upgradeData.fusionLimit,
          imageName: upgradeData.imageName,
          category: upgradeData.category,
          tradable: upgradeData.tradable,
          wikiaThumbnail: upgradeData.wikiaThumbnail || undefined,
          wikiaUrl: upgradeData.wikiaUrl || undefined,
          buffs: upgrade.buffs,
          curses: upgrade.curses,
          masteryReq: upgrade.lvlReq,
        };
      }
      delete upgradeData.transmutable;
      delete upgradeData.tradable;
      mods.push(upgradeData);
    }
  });
  return {
    arcanes,
    mods,
  };
};

export default {
  findItem,
  loadMods,
};
