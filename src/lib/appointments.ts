import type { Appointment, CategoryId } from '../types';
import { timeToMinutes } from './dates';

export interface AppointmentFilters {
  /** Texto livre casado contra título e descrição, sem acento e sem caixa. */
  query: string;
  /** Conjunto vazio significa "todas as categorias". */
  categoryIds: readonly CategoryId[];
}

export const EMPTY_FILTERS: AppointmentFilters = { query: '', categoryIds: [] };

/** Remove acentos e normaliza a caixa para comparações tolerantes na busca. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Ordena por data, depois horário inicial e, por fim, título. */
export function sortAppointments(appointments: readonly Appointment[]): Appointment[] {
  return [...appointments].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const startDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (startDiff !== 0) return startDiff;
    return a.title.localeCompare(b.title, 'pt-BR');
  });
}

export function matchesFilters(appointment: Appointment, filters: AppointmentFilters): boolean {
  if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(appointment.categoryId)) {
    return false;
  }

  const query = normalizeText(filters.query);
  if (query.length === 0) return true;

  const haystack = `${normalizeText(appointment.title)} ${normalizeText(appointment.description)}`;
  return query.split(/\s+/).every((term) => haystack.includes(term));
}

export function filterAppointments(
  appointments: readonly Appointment[],
  filters: AppointmentFilters,
): Appointment[] {
  return appointments.filter((appointment) => matchesFilters(appointment, filters));
}

export function appointmentsOnDate(
  appointments: readonly Appointment[],
  isoDate: string,
): Appointment[] {
  return appointments.filter((appointment) => appointment.date === isoDate);
}

/** Índice `data → compromissos`, usado para pintar os marcadores do calendário. */
export function groupByDate(appointments: readonly Appointment[]): Map<string, Appointment[]> {
  const grouped = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    const bucket = grouped.get(appointment.date);
    if (bucket) {
      bucket.push(appointment);
    } else {
      grouped.set(appointment.date, [appointment]);
    }
  }
  return grouped;
}

export function isFilterActive(filters: AppointmentFilters): boolean {
  return filters.query.trim().length > 0 || filters.categoryIds.length > 0;
}
