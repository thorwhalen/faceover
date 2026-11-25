/** The viewer's preferences, kept on this device behind a zodal `DataProvider` (swap the provider, keep the code). */
import type { DataProvider } from '@zodal/store';
import { createLocalStorageProvider } from '@zodal/store-localstorage';
import { DEFAULT_PREFS, Prefs } from '../core/schema';

export function prefsProvider(): DataProvider<Prefs> {
  return createLocalStorageProvider<Prefs>({ storageKey: 'faceover.prefs', idField: 'id'});
}

export async function readPrefs(provider: DataProvider<Prefs>): Promise<Prefs> {
  try {
    return Prefs.parse(await provider.getOne('prefs'));
  } catch {
    return DEFAULT_PREFS; // none saved yet, storage blocked, or an old shape
  }
}

export async function writePrefs(provider: DataProvider<Prefs>, prefs: Prefs): Promise<void> {
  try {
    if (provider.upsert) await provider.upsert(prefs);
    else await provider.update('prefs', prefs).catch(() => provider.create(prefs));
  } catch {
    /* private mode: preferences simply are not remembered */
  }
}
