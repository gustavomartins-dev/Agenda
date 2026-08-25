import { describe, expect, it, vi } from 'vitest';

import type { Appointment } from '../types';
import {
  SEED_FLAG_KEY,
  STORAGE_KEY,
  clearStorage,
  createId,
  hasSeeded,
  loadAppointments,
  markSeeded,
  saveAppointments,
} from './storage';

const valid: Appointment = {
  id: '1',
  title: 'Reunião',
  description: 'Pauta',
  date: '2026-03-09',
  startTime: '09:00',
  endTime: '10:00',
  categoryId: 'trabalho',
  completed: false,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

describe('saveAppointments / loadAppointments', () => {
  it('faz o ciclo completo de ida e volta', () => {
    saveAppointments([valid]);
    expect(loadAppointments()).toEqual([valid]);
  });

  it('devolve lista vazia quando não há nada salvo', () => {
    expect(loadAppointments()).toEqual([]);
  });

  it('sobrevive a JSON corrompido', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.setItem(STORAGE_KEY, '{isso não é json');
    expect(loadAppointments()).toEqual([]);
    expect(spy).toHaveBeenCalled();
  });

  it('ignora conteúdo que não é uma lista', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"foo":"bar"}');
    expect(loadAppointments()).toEqual([]);
  });

  it('descarta registros sem campos obrigatórios', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([valid, { id: '2' }, { ...valid, id: '3', date: '2026-02-30' }, null, 'texto']),
    );
    expect(loadAppointments().map((item) => item.id)).toEqual(['1']);
  });

  it('normaliza categoria desconhecida para "outros"', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...valid, categoryId: 'marte' }]));
    expect(loadAppointments()[0]?.categoryId).toBe('outros');
  });
});

describe('marca de exemplos', () => {
  it('começa desmarcada e é registrada em seguida', () => {
    expect(hasSeeded()).toBe(false);
    markSeeded();
    expect(hasSeeded()).toBe(true);
    expect(window.localStorage.getItem(SEED_FLAG_KEY)).toBe('true');
  });
});

describe('clearStorage', () => {
  it('remove compromissos e a marca de exemplos', () => {
    saveAppointments([valid]);
    markSeeded();
    clearStorage();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(hasSeeded()).toBe(false);
  });
});

describe('createId', () => {
  it('gera identificadores distintos', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createId()));
    expect(ids.size).toBe(50);
  });

  it('usa alternativa quando randomUUID não existe', () => {
    vi.spyOn(globalThis, 'crypto', 'get').mockReturnValue(undefined as unknown as Crypto);
    expect(createId()).toMatch(/^id-/);
  });
});
