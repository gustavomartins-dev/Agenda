import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { sortAppointments } from '../lib/appointments';
import { createSeedAppointments } from '../lib/seed';
import {
  clearStorage,
  createId,
  hasSeeded,
  loadAppointments,
  markSeeded,
  saveAppointments,
} from '../lib/storage';
import type { Appointment, AppointmentDraft } from '../types';

function normalizeDraft(draft: AppointmentDraft): AppointmentDraft {
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
  };
}

/**
 * Estado dos compromissos com persistência em localStorage.
 * Na primeira execução (sem marca de carga anterior) popula dados de exemplo.
 */
export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const stored = loadAppointments();
    if (stored.length > 0 || hasSeeded()) {
      return sortAppointments(stored);
    }
    const seeded = sortAppointments(createSeedAppointments());
    saveAppointments(seeded);
    markSeeded();
    return seeded;
  });

  // Evita reescrever o storage na montagem com exatamente o que acabou de ser lido.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveAppointments(appointments);
  }, [appointments]);

  const addAppointment = useCallback((draft: AppointmentDraft): Appointment => {
    const now = new Date().toISOString();
    const appointment: Appointment = {
      ...normalizeDraft(draft),
      id: createId(),
      createdAt: now,
      updatedAt: now,
    };
    setAppointments((current) => sortAppointments([...current, appointment]));
    return appointment;
  }, []);

  const updateAppointment = useCallback((id: string, draft: AppointmentDraft): void => {
    setAppointments((current) =>
      sortAppointments(
        current.map((appointment) =>
          appointment.id === id
            ? { ...appointment, ...normalizeDraft(draft), updatedAt: new Date().toISOString() }
            : appointment,
        ),
      ),
    );
  }, []);

  const removeAppointment = useCallback((id: string): void => {
    setAppointments((current) => current.filter((appointment) => appointment.id !== id));
  }, []);

  /** Apaga tudo e mantém a marca de carga para os exemplos não voltarem sozinhos. */
  const clearAll = useCallback((): void => {
    clearStorage();
    markSeeded();
    setAppointments([]);
  }, []);

  const restoreSamples = useCallback((): void => {
    setAppointments(sortAppointments(createSeedAppointments()));
    markSeeded();
  }, []);

  return useMemo(
    () => ({
      appointments,
      addAppointment,
      updateAppointment,
      removeAppointment,
      clearAll,
      restoreSamples,
    }),
    [appointments, addAppointment, updateAppointment, removeAppointment, clearAll, restoreSamples],
  );
}

export type UseAppointments = ReturnType<typeof useAppointments>;
