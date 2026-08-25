import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SEED_FLAG_KEY, STORAGE_KEY, loadAppointments, saveAppointments } from '../lib/storage';
import type { AppointmentDraft } from '../types';
import { useAppointments } from './useAppointments';

const draft: AppointmentDraft = {
  title: '  Reunião de time  ',
  description: '  Pauta semanal  ',
  date: '2026-03-09',
  startTime: '09:00',
  endTime: '10:00',
  categoryId: 'trabalho',
};

function markAsUsed() {
  window.localStorage.setItem(SEED_FLAG_KEY, 'true');
}

describe('useAppointments', () => {
  it('carrega exemplos apenas no primeiro uso', () => {
    const first = renderHook(() => useAppointments());
    expect(first.result.current.appointments.length).toBeGreaterThan(0);
    expect(window.localStorage.getItem(SEED_FLAG_KEY)).toBe('true');
    first.unmount();

    window.localStorage.setItem(STORAGE_KEY, '[]');
    const second = renderHook(() => useAppointments());
    expect(second.result.current.appointments).toEqual([]);
  });

  it('adiciona um compromisso, apara espaços e persiste', () => {
    markAsUsed();
    const { result } = renderHook(() => useAppointments());

    act(() => {
      result.current.addAppointment(draft);
    });

    const [created] = result.current.appointments;
    expect(result.current.appointments).toHaveLength(1);
    expect(created?.title).toBe('Reunião de time');
    expect(created?.description).toBe('Pauta semanal');
    expect(created?.id).toBeTruthy();
    expect(loadAppointments()).toHaveLength(1);
  });

  it('mantém a lista ordenada por data e horário', () => {
    markAsUsed();
    const { result } = renderHook(() => useAppointments());

    act(() => {
      result.current.addAppointment({ ...draft, title: 'Tarde', startTime: '15:00', endTime: '16:00' });
      result.current.addAppointment({ ...draft, title: 'Manhã', startTime: '07:00', endTime: '08:00' });
      result.current.addAppointment({ ...draft, title: 'Ontem', date: '2026-03-08' });
    });

    expect(result.current.appointments.map((item) => item.title)).toEqual(['Ontem', 'Manhã', 'Tarde']);
  });

  it('atualiza um compromisso existente e renova updatedAt', () => {
    markAsUsed();
    const { result } = renderHook(() => useAppointments());

    let id = '';
    act(() => {
      id = result.current.addAppointment(draft).id;
    });
    const before = result.current.appointments[0]?.updatedAt ?? '';

    act(() => {
      result.current.updateAppointment(id, { ...draft, title: 'Retrospectiva', categoryId: 'estudos' });
    });

    const updated = result.current.appointments[0];
    expect(updated?.id).toBe(id);
    expect(updated?.title).toBe('Retrospectiva');
    expect(updated?.categoryId).toBe('estudos');
    expect(Date.parse(updated?.updatedAt ?? '')).toBeGreaterThanOrEqual(Date.parse(before));
    expect(loadAppointments()[0]?.title).toBe('Retrospectiva');
  });

  it('remove apenas o compromisso indicado', () => {
    markAsUsed();
    const { result } = renderHook(() => useAppointments());

    let id = '';
    act(() => {
      id = result.current.addAppointment(draft).id;
      result.current.addAppointment({ ...draft, title: 'Outro', startTime: '11:00', endTime: '12:00' });
    });

    act(() => {
      result.current.removeAppointment(id);
    });

    expect(result.current.appointments.map((item) => item.title)).toEqual(['Outro']);
    expect(loadAppointments()).toHaveLength(1);
  });

  it('limpa tudo sem trazer os exemplos de volta', () => {
    const { result } = renderHook(() => useAppointments());
    expect(result.current.appointments.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.appointments).toEqual([]);
    expect(window.localStorage.getItem(SEED_FLAG_KEY)).toBe('true');
    expect(loadAppointments()).toEqual([]);
  });

  it('restaura os exemplos sob demanda', () => {
    markAsUsed();
    const { result } = renderHook(() => useAppointments());
    expect(result.current.appointments).toEqual([]);

    act(() => {
      result.current.restoreSamples();
    });

    expect(result.current.appointments.length).toBeGreaterThan(0);
    expect(loadAppointments().length).toBe(result.current.appointments.length);
  });

  it('cria compromissos não concluídos', () => {
    markAsUsed();
    const { result } = renderHook(() => useAppointments());

    act(() => {
      result.current.addAppointment(draft);
    });

    expect(result.current.appointments[0]?.completed).toBe(false);
    expect(loadAppointments()[0]?.completed).toBe(false);
  });

  it('alterna a conclusão e persiste os dois sentidos', () => {
    markAsUsed();
    const { result } = renderHook(() => useAppointments());

    let id = '';
    act(() => {
      id = result.current.addAppointment(draft).id;
    });

    act(() => {
      result.current.toggleCompletion(id);
    });
    expect(result.current.appointments[0]?.completed).toBe(true);
    expect(loadAppointments()[0]?.completed).toBe(true);

    act(() => {
      result.current.toggleCompletion(id);
    });
    expect(result.current.appointments[0]?.completed).toBe(false);
    expect(loadAppointments()[0]?.completed).toBe(false);
  });

  it('preserva a conclusão ao editar os outros campos', () => {
    markAsUsed();
    const { result } = renderHook(() => useAppointments());

    let id = '';
    act(() => {
      id = result.current.addAppointment(draft).id;
    });
    act(() => {
      result.current.toggleCompletion(id);
    });

    act(() => {
      result.current.updateAppointment(id, { ...draft, title: 'Outro título' });
    });

    expect(result.current.appointments[0]?.title).toBe('Outro título');
    expect(result.current.appointments[0]?.completed).toBe(true);
    expect(loadAppointments()[0]?.completed).toBe(true);
  });

  it('ignora registros corrompidos ao carregar', () => {
    markAsUsed();
    saveAppointments([]);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'x' }]));

    const { result } = renderHook(() => useAppointments());
    expect(result.current.appointments).toEqual([]);
  });
});
