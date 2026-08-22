import type { Category, CategoryId } from '../types';

export const CATEGORIES: readonly Category[] = [
  { id: 'trabalho', label: 'Trabalho', color: '#4f46e5' },
  { id: 'pessoal', label: 'Pessoal', color: '#0d9488' },
  { id: 'saude', label: 'Saúde', color: '#e11d48' },
  { id: 'estudos', label: 'Estudos', color: '#c2410c' },
  { id: 'social', label: 'Social', color: '#7c3aed' },
  { id: 'outros', label: 'Outros', color: '#475569' },
] as const;

export const DEFAULT_CATEGORY_ID: CategoryId = 'trabalho';

const CATEGORY_BY_ID = new Map<string, Category>(CATEGORIES.map((category) => [category.id, category]));

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && CATEGORY_BY_ID.has(value);
}

/** Sempre devolve uma categoria: cai em "Outros" quando o id é desconhecido. */
export function getCategory(id: string): Category {
  return CATEGORY_BY_ID.get(id) ?? { id: 'outros', label: 'Outros', color: '#475569' };
}
