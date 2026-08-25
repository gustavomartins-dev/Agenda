import type { Appointment } from '../types';
import { isCategoryId } from './categories';
import { isValidISODate, isValidTime } from './dates';

export const STORAGE_KEY = 'agenda-pessoal:compromissos:v1';
export const SEED_FLAG_KEY = 'agenda-pessoal:exemplos-carregados:v1';

/**
 * Normaliza um registro vindo do localStorage. Descarta o que não puder ser
 * lido com segurança — dados corrompidos nunca devem derrubar a aplicação.
 */
function parseAppointment(value: unknown): Appointment | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  const id = typeof raw.id === 'string' ? raw.id : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const date = typeof raw.date === 'string' ? raw.date : '';
  const startTime = typeof raw.startTime === 'string' ? raw.startTime : '';
  const endTime = typeof raw.endTime === 'string' ? raw.endTime : '';

  if (!id || !title || !isValidISODate(date) || !isValidTime(startTime) || !isValidTime(endTime)) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id,
    title,
    description: typeof raw.description === 'string' ? raw.description : '',
    date,
    startTime,
    endTime,
    categoryId: isCategoryId(raw.categoryId) ? raw.categoryId : 'outros',
    // Qualquer coisa que não seja `true` conta como pendente — registros antigos
    // não têm o campo e devem voltar como não concluídos.
    completed: raw.completed === true,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  };
}

export function loadAppointments(): Appointment[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseAppointment).filter((item): item is Appointment => item !== null);
  } catch (error) {
    console.error('Não foi possível ler os compromissos salvos.', error);
    return [];
  }
}

export function saveAppointments(appointments: Appointment[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  } catch (error) {
    console.error('Não foi possível salvar os compromissos.', error);
  }
}

export function hasSeeded(): boolean {
  try {
    return window.localStorage.getItem(SEED_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markSeeded(): void {
  try {
    window.localStorage.setItem(SEED_FLAG_KEY, 'true');
  } catch (error) {
    console.error('Não foi possível registrar a carga de exemplos.', error);
  }
}

export function clearStorage(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SEED_FLAG_KEY);
  } catch (error) {
    console.error('Não foi possível limpar os dados salvos.', error);
  }
}

/** `crypto.randomUUID` com alternativa para navegadores sem contexto seguro. */
export function createId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
