import { useCallback, useEffect, useMemo, useState } from 'react';

import { appointmentsApi } from '../lib/api';
import { sortAppointments } from '../lib/appointments';
import { createSeedAppointments } from '../lib/seed';
import { clearStorage, createId, hasSeeded, loadAppointments, markSeeded, saveAppointments } from '../lib/storage';
import type { Appointment, AppointmentDraft } from '../types';

const testMode = import.meta.env.MODE === 'test';

function normalizeDraft(draft: AppointmentDraft): AppointmentDraft {
  return { ...draft, title: draft.title.trim(), description: draft.description.trim() };
}

function initialTestAppointments(): Appointment[] {
  const stored = loadAppointments();
  if (stored.length > 0 || hasSeeded()) return sortAppointments(stored);
  const seeded = sortAppointments(createSeedAppointments());
  saveAppointments(seeded);
  markSeeded();
  return seeded;
}

/** Estado da interface sincronizado com o banco SQLite por meio da API. */
export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => testMode ? initialTestAppointments() : []);
  const [loading, setLoading] = useState(!testMode);
  const [error, setError] = useState('');

  useEffect(() => {
    if (testMode) return;
    clearStorage();
    let active = true;
    appointmentsApi.list()
      .then((items) => { if (active) setAppointments(sortAppointments(items)); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Erro ao carregar a agenda.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const addAppointment = useCallback((rawDraft: AppointmentDraft): Appointment => {
    const draft = normalizeDraft(rawDraft);
    const now = new Date().toISOString();
    const optimistic: Appointment = { ...draft, id: createId(), completed: false, createdAt: now, updatedAt: now };
    setAppointments((current) => sortAppointments([...current, optimistic]));
    if (testMode) saveAppointments(sortAppointments([...loadAppointments(), optimistic]));
    else appointmentsApi.create(draft).then((saved) => {
      setAppointments((current) => sortAppointments(current.map((item) => item.id === optimistic.id ? saved : item)));
    }).catch((reason: unknown) => {
      setAppointments((current) => current.filter((item) => item.id !== optimistic.id));
      setError(reason instanceof Error ? reason.message : 'Erro ao salvar o compromisso.');
    });
    return optimistic;
  }, []);

  const updateAppointment = useCallback((id: string, rawDraft: AppointmentDraft): void => {
    const draft = normalizeDraft(rawDraft);
    const before = appointments.find((item) => item.id === id);
    const apply = (current: Appointment[], updatedAt = new Date().toISOString()) => sortAppointments(current.map((item) => item.id === id ? { ...item, ...draft, updatedAt } : item));
    setAppointments((current) => apply(current));
    if (testMode) saveAppointments(apply(loadAppointments()));
    else appointmentsApi.update(id, draft).then((saved) => setAppointments((current) => sortAppointments(current.map((item) => item.id === id ? saved : item)))).catch((reason: unknown) => {
      if (before) setAppointments((current) => sortAppointments(current.map((item) => item.id === id ? before : item)));
      setError(reason instanceof Error ? reason.message : 'Erro ao atualizar o compromisso.');
    });
  }, [appointments]);

  /**
   * Alterna a conclusão. O estado desejado é calculado aqui e enviado pronto
   * para a API, que é idempotente — dois cliques rápidos não se anulam.
   */
  const toggleCompletion = useCallback((id: string): void => {
    const before = appointments.find((item) => item.id === id);
    if (!before) return;
    const completed = !before.completed;
    const apply = (current: Appointment[], updatedAt = new Date().toISOString()) =>
      current.map((item) => (item.id === id ? { ...item, completed, updatedAt } : item));
    setAppointments((current) => apply(current));
    if (testMode) saveAppointments(apply(loadAppointments()));
    else appointmentsApi.setCompletion(id, completed).then((saved) => setAppointments((current) => current.map((item) => item.id === id ? saved : item))).catch((reason: unknown) => {
      setAppointments((current) => current.map((item) => item.id === id ? before : item));
      setError(reason instanceof Error ? reason.message : 'Erro ao mudar a conclusão do compromisso.');
    });
  }, [appointments]);

  const removeAppointment = useCallback((id: string): void => {
    const before = appointments;
    setAppointments((current) => current.filter((item) => item.id !== id));
    if (testMode) saveAppointments(loadAppointments().filter((item) => item.id !== id));
    else appointmentsApi.remove(id).catch((reason: unknown) => {
      setAppointments(before);
      setError(reason instanceof Error ? reason.message : 'Erro ao excluir o compromisso.');
    });
  }, [appointments]);

  const clearAll = useCallback((): void => {
    const before = appointments;
    setAppointments([]);
    if (testMode) { saveAppointments([]); markSeeded(); }
    else appointmentsApi.clear().catch((reason: unknown) => {
      setAppointments(before);
      setError(reason instanceof Error ? reason.message : 'Erro ao limpar a agenda.');
    });
  }, [appointments]);

  const restoreSamples = useCallback((): void => {
    const samples = sortAppointments(createSeedAppointments());
    if (testMode) { setAppointments(samples); saveAppointments(samples); markSeeded(); return; }
    Promise.all(samples.map(({ id: _id, completed: _completed, createdAt: _createdAt, updatedAt: _updatedAt, ...draft }) => appointmentsApi.create(draft)))
      .then((saved) => setAppointments(sortAppointments(saved)))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Erro ao criar exemplos.'));
  }, []);

  return useMemo(() => ({ appointments, loading, error, addAppointment, updateAppointment, toggleCompletion, removeAppointment, clearAll, restoreSamples }),
    [appointments, loading, error, addAppointment, updateAppointment, toggleCompletion, removeAppointment, clearAll, restoreSamples]);
}

export type UseAppointments = ReturnType<typeof useAppointments>;
