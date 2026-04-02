import { load } from 'cheerio';

import { get } from '../../network';
import type { VaultData } from '../../types/shared';

export default class VaultScraper {
  /**
   * Get (estimated) vault dates from wiki.
   * @returns vault data array
   */
  async scrape(): Promise<VaultData[]> {
    const vaultInfoWikia = await get('https://wiki.warframe.com/w/Prime_Vault', true, true);
    const $ = load(vaultInfoWikia as string);
    // Since data attributes are generated aferwards, we cannot rely on them to find the tables containing vaulted items
    const tables = $('#mw-customcollapsible-vaulted > div > div > table').toArray();
    const [vaultedItems, formerlyVaulted, notYetVaulted, neverVaulted] = tables;
    if (!vaultedItems || !formerlyVaulted || !notYetVaulted || !neverVaulted) {
      throw new Error('Could not find the tables containing vaulted items on wiki page.');
    }
    const vaultData: VaultData[] = [];

    function extractVaultedItems(row: unknown): void {
      const $row = $(row as string);
      // For some reason, the first row of each table contains the column headers
      if ($row.find('th').length) {
        return;
      }
      const name =
        $row.find('td:nth-child(1) > span').attr('data-param-name') ?? $row.find('td:nth-child(1) > a').text().trim();
      const vaultDate = $row.find('td:nth-child(2)').text().trim();
      if (name && vaultDate) {
        vaultData.push({ name, vaulted: true, vaultDate, estimatedVaultDate: vaultDate });
      }
    }

    function extractNotVaultedItems(row: unknown): void {
      const $row = $(row as string);
      // For some reason, the first row of each table contains the column headers
      if ($row.find('th').length) {
        return;
      }
      const name =
        $row.find('td:nth-child(1) > span').attr('data-param-name') ?? $row.find('td:nth-child(1) > a').text().trim();
      if (name) {
        vaultData.push({ name, vaulted: false });
      }
    }

    // We want this items to be listed as vaulted, but they are not listed on the wiki page
    vaultData.push({ name: 'Excalibur Prime', vaulted: true });
    vaultData.push({ name: 'Lato Prime', vaulted: true });
    vaultData.push({ name: 'Skana Prime', vaulted: true });

    $(vaultedItems)
      .find('tbody > tr')
      .each((_, row) => {
        extractVaultedItems(row);
      });
    $(formerlyVaulted)
      .find('tbody > tr')
      .each((_, row) => {
        extractVaultedItems(row);
      });
    $(notYetVaulted)
      .find('tbody > tr')
      .each((_, row) => {
        extractNotVaultedItems(row);
      });
    $(neverVaulted)
      .find('tbody > tr')
      .each((_, row) => {
        extractNotVaultedItems(row);
      });

    return vaultData;
  }
}
