import type { Category, CategoryId } from '../types';

export const CATEGORIES: readonly Category[] = [
  { id: 'trabalho', label: 'Trabalho', color: '#f2c94c' },
  { id: 'pessoal', label: 'Pessoal', color: '#63b3ed' },
  { id: 'saude', label: 'Saúde', color: '#ef6b73' },
  { id: 'estudos', label: 'Estudos', color: '#d69e5f' },
  { id: 'social', label: 'Social', color: '#9f8fc7' },
  { id: 'outros', label: 'Outros', color: '#89919e' },
] as const;

export const DEFAULT_CATEGORY_ID: CategoryId = 'trabalho';

const CATEGORY_BY_ID = new Map<string, Category>(CATEGORIES.map((category) => [category.id, category]));

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && CATEGORY_BY_ID.has(value);
}

/** Sempre devolve uma categoria: cai em "Outros" quando o id é desconhecido. */
export function getCategory(id: string): Category {
  return CATEGORY_BY_ID.get(id) ?? { id: 'outros', label: 'Outros', color: '#89919e' };
}
