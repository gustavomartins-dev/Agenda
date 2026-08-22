/**
 * Utilidades de data trabalhando sempre em horário local e com datas no
 * formato ISO curto (`AAAA-MM-DD`). Evitamos `new Date('AAAA-MM-DD')` porque
 * o construtor interpreta a string como UTC e desloca o dia em fusos negativos.
 */

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const WEEKDAY_FULL_LABELS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Converte um `Date` para `AAAA-MM-DD` usando os componentes locais. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Converte `AAAA-MM-DD` para um `Date` local à meia-noite. */
export function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Valida formato **e** existência da data (rejeita `2026-02-30`). */
export function isValidISODate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = fromISODate(value);
  return !Number.isNaN(parsed.getTime()) && toISODate(parsed) === value;
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** Minutos desde 00:00. Retorna `NaN` para horários inválidos. */
export function timeToMinutes(value: string): number {
  if (!isValidTime(value)) return Number.NaN;
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function addDaysISO(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Soma meses preservando o mês de destino (31/01 + 1 mês → 28/02). */
export function addMonthsISO(iso: string, months: number): string {
  const date = fromISODate(iso);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toISODate(date);
}

export interface MonthDay {
  iso: string;
  dayOfMonth: number;
  /** `false` para os dias de preenchimento vindos do mês anterior/seguinte. */
  inCurrentMonth: boolean;
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
}

/**
 * Grade do mês em semanas completas (domingo a sábado), incluindo os dias
 * vizinhos necessários para fechar a primeira e a última semana.
 */
export function buildMonthGrid(year: number, month: number): MonthDay[][] {
  const firstOfMonth = new Date(year, month, 1);
  const cursor = new Date(year, month, 1 - firstOfMonth.getDay());
  const weeks: MonthDay[][] = [];

  while (true) {
    const week: MonthDay[] = [];
    for (let index = 0; index < 7; index += 1) {
      week.push({
        iso: toISODate(cursor),
        dayOfMonth: cursor.getDate(),
        inCurrentMonth: cursor.getMonth() === month && cursor.getFullYear() === year,
        weekday: cursor.getDay(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    const finishedMonth = cursor.getMonth() !== month || cursor.getFullYear() !== year;
    if (finishedMonth) break;
  }

  return weeks;
}

const monthYearFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Ex.: "Março de 2026". */
export function formatMonthYear(iso: string): string {
  return capitalize(monthYearFormatter.format(fromISODate(iso)));
}

/** Ex.: "Segunda-feira, 09 de março de 2026". */
export function formatLongDate(iso: string): string {
  return capitalize(longDateFormatter.format(fromISODate(iso)));
}

/** Ex.: "09 de mar.". */
export function formatShortDate(iso: string): string {
  return shortDateFormatter.format(fromISODate(iso));
}

/** Ex.: "1 h 30 min". Retorna string vazia quando os horários são inválidos. */
export function formatDuration(startTime: string, endTime: string): string {
  const total = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (!Number.isFinite(total) || total <= 0) return '';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

/** Rótulo relativo curto para o dia: "Hoje", "Amanhã", "Ontem" ou `null`. */
export function relativeDayLabel(iso: string, referenceISO: string = todayISO()): string | null {
  if (iso === referenceISO) return 'Hoje';
  if (iso === addDaysISO(referenceISO, 1)) return 'Amanhã';
  if (iso === addDaysISO(referenceISO, -1)) return 'Ontem';
  return null;
}
