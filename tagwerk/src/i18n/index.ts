import { de } from './de';
import { en } from './en';

export type Lang = 'de' | 'en';

let current: Lang = 'de';
export const setLang = (l: Lang) => {
  current = l;
};
export const getLang = (): Lang => current;

type Tree = { [k: string]: string | Tree };

function lookup(tree: Tree, path: string[]): string | undefined {
  let node: string | Tree | undefined = tree;
  for (const p of path) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[p];
  }
  return typeof node === 'string' ? node : undefined;
}

/** t('today.debtTitle', { n: 3 }). Falls back to German and finally to the key. */
export function t(key: string, params?: Record<string, string | number>): string {
  const path = key.split('.');
  const raw =
    (current === 'en' ? lookup(en as Tree, path) : undefined) ?? lookup(de as unknown as Tree, path) ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
}
