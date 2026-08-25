import { describe, expect, it } from 'vitest';

import type { Appointment } from '../types';
import {
  appointmentsOnDate,
  filterAppointments,
  groupByDate,
  isFilterActive,
  matchesFilters,
  normalizeText,
  sortAppointments,
} from './appointments';

function make(overrides: Partial<Appointment> & { id: string }): Appointment {
  return {
    title: 'Compromisso',
    description: '',
    date: '2026-03-09',
    startTime: '09:00',
    endTime: '10:00',
    categoryId: 'trabalho',
    completed: false,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('normalizeText', () => {
  it('remove acentos e normaliza a caixa', () => {
    expect(normalizeText('  Reunião ÀS 9H  ')).toBe('reuniao as 9h');
    expect(normalizeText('Saúde')).toBe('saude');
  });
});

describe('sortAppointments', () => {
  it('ordena por data, horário inicial e título', () => {
    const list = [
      make({ id: 'c', date: '2026-03-10', startTime: '08:00' }),
      make({ id: 'b', date: '2026-03-09', startTime: '14:00' }),
      make({ id: 'a', date: '2026-03-09', startTime: '09:00' }),
      make({ id: 'a2', date: '2026-03-09', startTime: '09:00', title: 'Almoço' }),
    ];
    expect(sortAppointments(list).map((item) => item.id)).toEqual(['a2', 'a', 'b', 'c']);
  });

  it('não altera o array recebido', () => {
    const list = [make({ id: 'z', startTime: '18:00' }), make({ id: 'y', startTime: '07:00' })];
    sortAppointments(list);
    expect(list.map((item) => item.id)).toEqual(['z', 'y']);
  });
});

describe('matchesFilters', () => {
  const appointment = make({
    id: '1',
    title: 'Consulta odontológica',
    description: 'Levar a carteirinha do convênio',
    categoryId: 'saude',
  });

  it('casa texto sem acento e sem caixa, no título e na descrição', () => {
    expect(matchesFilters(appointment, { query: 'odontologica', categoryIds: [] })).toBe(true);
    expect(matchesFilters(appointment, { query: 'CARTEIRINHA', categoryIds: [] })).toBe(true);
    expect(matchesFilters(appointment, { query: 'dentista', categoryIds: [] })).toBe(false);
  });

  it('exige todos os termos da busca', () => {
    expect(matchesFilters(appointment, { query: 'consulta convenio', categoryIds: [] })).toBe(true);
    expect(matchesFilters(appointment, { query: 'consulta academia', categoryIds: [] })).toBe(false);
  });

  it('filtra por categoria e trata lista vazia como "todas"', () => {
    expect(matchesFilters(appointment, { query: '', categoryIds: ['saude'] })).toBe(true);
    expect(matchesFilters(appointment, { query: '', categoryIds: ['trabalho'] })).toBe(false);
    expect(matchesFilters(appointment, { query: '', categoryIds: [] })).toBe(true);
  });

  it('combina busca e categoria', () => {
    expect(matchesFilters(appointment, { query: 'consulta', categoryIds: ['trabalho'] })).toBe(false);
    expect(matchesFilters(appointment, { query: 'consulta', categoryIds: ['saude'] })).toBe(true);
  });
});

describe('filterAppointments / appointmentsOnDate / groupByDate', () => {
  const list = [
    make({ id: '1', title: 'Academia', categoryId: 'saude', date: '2026-03-09' }),
    make({ id: '2', title: 'Daily', categoryId: 'trabalho', date: '2026-03-09' }),
    make({ id: '3', title: 'Cinema', categoryId: 'social', date: '2026-03-11' }),
  ];

  it('filtra a coleção inteira', () => {
    expect(filterAppointments(list, { query: '', categoryIds: ['saude', 'social'] })).toHaveLength(2);
  });

  it('recorta os compromissos de um dia', () => {
    expect(appointmentsOnDate(list, '2026-03-09').map((item) => item.id)).toEqual(['1', '2']);
    expect(appointmentsOnDate(list, '2026-03-10')).toEqual([]);
  });

  it('agrupa por data', () => {
    const grouped = groupByDate(list);
    expect(grouped.get('2026-03-09')).toHaveLength(2);
    expect(grouped.get('2026-03-11')).toHaveLength(1);
    expect(grouped.get('2026-03-10')).toBeUndefined();
  });
});

describe('isFilterActive', () => {
  it('detecta filtros aplicados', () => {
    expect(isFilterActive({ query: '', categoryIds: [] })).toBe(false);
    expect(isFilterActive({ query: '   ', categoryIds: [] })).toBe(false);
    expect(isFilterActive({ query: 'a', categoryIds: [] })).toBe(true);
    expect(isFilterActive({ query: '', categoryIds: ['saude'] })).toBe(true);
  });
});
