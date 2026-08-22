import type { Appointment } from '../types';
import { addDaysISO, todayISO } from './dates';
import { createId } from './storage';

type SeedItem = Omit<Appointment, 'id' | 'date' | 'createdAt' | 'updatedAt'> & {
  /** Deslocamento em dias a partir de hoje. */
  offset: number;
};

const SEED_ITEMS: readonly SeedItem[] = [
  {
    offset: 0,
    title: 'Reunião de alinhamento semanal',
    description: 'Revisar prioridades da semana e destravar pendências do time.',
    startTime: '09:30',
    endTime: '10:30',
    categoryId: 'trabalho',
  },
  {
    offset: 0,
    title: 'Academia',
    description: 'Treino de força — foco em membros inferiores.',
    startTime: '19:00',
    endTime: '20:00',
    categoryId: 'saude',
  },
  {
    offset: 1,
    title: 'Consulta odontológica',
    description: 'Levar o encaminhamento e a carteirinha do convênio.',
    startTime: '14:00',
    endTime: '15:00',
    categoryId: 'saude',
  },
  {
    offset: 2,
    title: 'Estudar TypeScript avançado',
    description: 'Capítulos sobre tipos condicionais e generics.',
    startTime: '20:00',
    endTime: '21:30',
    categoryId: 'estudos',
  },
  {
    offset: 4,
    title: 'Jantar com a família',
    description: 'Restaurante no centro — reserva às 20h para 6 pessoas.',
    startTime: '20:00',
    endTime: '22:00',
    categoryId: 'social',
  },
  {
    offset: -2,
    title: 'Pagar contas do mês',
    description: 'Energia, internet e condomínio.',
    startTime: '08:00',
    endTime: '08:30',
    categoryId: 'pessoal',
  },
];

/** Compromissos de demonstração ancorados na data atual. */
export function createSeedAppointments(referenceISO: string = todayISO()): Appointment[] {
  const now = new Date().toISOString();
  return SEED_ITEMS.map(({ offset, ...item }) => ({
    ...item,
    id: createId(),
    date: addDaysISO(referenceISO, offset),
    createdAt: now,
    updatedAt: now,
  }));
}
