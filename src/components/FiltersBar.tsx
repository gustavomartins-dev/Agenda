import { useId } from 'react';
import type { CSSProperties } from 'react';

import { CATEGORIES } from '../lib/categories';
import type { AppointmentFilters } from '../lib/appointments';
import type { CategoryId } from '../types';
import { SearchIcon } from './Icons';

interface FiltersBarProps {
  filters: AppointmentFilters;
  onChange: (filters: AppointmentFilters) => void;
  resultCount: number;
  filtersActive: boolean;
}

export function FiltersBar({ filters, onChange, resultCount, filtersActive }: FiltersBarProps) {
  const searchId = useId();

  function toggleCategory(id: CategoryId) {
    const selected = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((current) => current !== id)
      : [...filters.categoryIds, id];
    onChange({ ...filters, categoryIds: selected });
  }

  return (
    <section className="filters card" aria-label="Busca e filtros">
      <div className="filters__search">
        <label className="sr-only" htmlFor={searchId}>
          Buscar compromissos por título ou descrição
        </label>
        <span className="filters__search-icon" aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          id={searchId}
          className="input input--search"
          type="search"
          value={filters.query}
          placeholder="Buscar por título ou descrição…"
          autoComplete="off"
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
        />
      </div>

      <div className="filters__categories" role="group" aria-label="Filtrar por categoria">
        {CATEGORIES.map((category) => {
          const active = filters.categoryIds.includes(category.id);
          return (
            <button
              key={category.id}
              type="button"
              className="category-chip category-chip--button"
              style={{ '--chip-color': category.color } as CSSProperties}
              data-selected={active}
              aria-pressed={active}
              onClick={() => toggleCategory(category.id)}
            >
              <span className="category-chip__dot" aria-hidden="true" />
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="filters__footer">
        <p className="filters__status" role="status">
          {filtersActive
            ? `${resultCount} resultado(s) para os filtros atuais`
            : 'Nenhum filtro aplicado'}
        </p>
        {filtersActive ? (
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={() => onChange({ query: '', categoryIds: [] })}
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
    </section>
  );
}
