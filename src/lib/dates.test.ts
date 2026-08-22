import { describe, expect, it } from 'vitest';

import {
  addDaysISO,
  addMonthsISO,
  buildMonthGrid,
  formatDuration,
  formatLongDate,
  formatMonthYear,
  fromISODate,
  isValidISODate,
  isValidTime,
  relativeDayLabel,
  timeToMinutes,
  toISODate,
} from './dates';

describe('toISODate / fromISODate', () => {
  it('usa componentes locais, sem deslocar o dia por fuso horário', () => {
    expect(toISODate(new Date(2026, 2, 9, 23, 30))).toBe('2026-03-09');
    expect(toISODate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('faz o caminho de volta preservando a data', () => {
    const parsed = fromISODate('2026-03-09');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(9);
    expect(toISODate(parsed)).toBe('2026-03-09');
  });
});

describe('isValidISODate', () => {
  it.each(['2026-01-01', '2024-02-29', '2026-12-31'])('aceita %s', (value) => {
    expect(isValidISODate(value)).toBe(true);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-1-1', '09/03/2026', '', 'abc'])(
    'rejeita %s',
    (value) => {
      expect(isValidISODate(value)).toBe(false);
    },
  );
});

describe('isValidTime / timeToMinutes', () => {
  it.each(['00:00', '09:30', '23:59'])('aceita %s', (value) => {
    expect(isValidTime(value)).toBe(true);
  });

  it.each(['24:00', '9:30', '12:60', '', '12h'])('rejeita %s', (value) => {
    expect(isValidTime(value)).toBe(false);
  });

  it('converte para minutos desde a meia-noite', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('devolve NaN para horário inválido', () => {
    expect(Number.isNaN(timeToMinutes('99:99'))).toBe(true);
  });
});

describe('addDaysISO', () => {
  it('atravessa a virada de mês e de ano', () => {
    expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysISO('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('addMonthsISO', () => {
  it('mantém o dia quando ele existe no mês de destino', () => {
    expect(addMonthsISO('2026-03-15', 1)).toBe('2026-04-15');
    expect(addMonthsISO('2026-03-15', -1)).toBe('2026-02-15');
  });

  it('trunca para o último dia quando o mês de destino é mais curto', () => {
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsISO('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('atravessa o ano', () => {
    expect(addMonthsISO('2026-12-10', 1)).toBe('2027-01-10');
    expect(addMonthsISO('2026-01-10', -1)).toBe('2025-12-10');
  });
});

describe('buildMonthGrid', () => {
  it('monta semanas completas de domingo a sábado', () => {
    const weeks = buildMonthGrid(2026, 2); // março/2026
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]?.[0]?.weekday).toBe(0);
    expect(weeks.at(-1)?.at(-1)?.weekday).toBe(6);
  });

  it('inclui todos os dias do mês exatamente uma vez', () => {
    const days = buildMonthGrid(2026, 2)
      .flat()
      .filter((day) => day.inCurrentMonth);
    expect(days).toHaveLength(31);
    expect(new Set(days.map((day) => day.iso)).size).toBe(31);
  });

  it('marca os dias vizinhos como fora do mês', () => {
    const weeks = buildMonthGrid(2026, 0); // janeiro/2026 começa numa quinta-feira
    expect(weeks[0]?.[0]?.iso).toBe('2025-12-28');
    expect(weeks[0]?.[0]?.inCurrentMonth).toBe(false);
    expect(weeks[0]?.[4]?.iso).toBe('2026-01-01');
    expect(weeks[0]?.[4]?.inCurrentMonth).toBe(true);

    const march = buildMonthGrid(2026, 2); // março/2026 transborda para abril
    expect(march.at(-1)?.at(-1)?.iso).toBe('2026-04-04');
    expect(march.at(-1)?.at(-1)?.inCurrentMonth).toBe(false);
  });

  it('não acrescenta semanas quando o mês já fecha em semanas inteiras', () => {
    // 01/02/2026 é domingo e fevereiro tem 28 dias: 4 semanas exatas.
    const weeks = buildMonthGrid(2026, 1);
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((day) => day.inCurrentMonth)).toBe(true);
  });
});

describe('formatação em pt-BR', () => {
  it('formata mês e ano com inicial maiúscula', () => {
    expect(formatMonthYear('2026-03-09')).toBe('Março de 2026');
  });

  it('formata a data por extenso', () => {
    expect(formatLongDate('2026-03-09')).toBe('Segunda-feira, 09 de março de 2026');
  });
});

describe('formatDuration', () => {
  it.each([
    ['09:00', '10:30', '1 h 30 min'],
    ['09:00', '10:00', '1 h'],
    ['09:00', '09:45', '45 min'],
    ['09:00', '12:00', '3 h'],
  ])('%s → %s = %s', (start, end, expected) => {
    expect(formatDuration(start, end)).toBe(expected);
  });

  it('devolve vazio quando o intervalo é nulo ou negativo', () => {
    expect(formatDuration('10:00', '10:00')).toBe('');
    expect(formatDuration('11:00', '10:00')).toBe('');
    expect(formatDuration('xx', '10:00')).toBe('');
  });
});

describe('relativeDayLabel', () => {
  it('reconhece ontem, hoje e amanhã em relação à referência', () => {
    expect(relativeDayLabel('2026-03-09', '2026-03-09')).toBe('Hoje');
    expect(relativeDayLabel('2026-03-10', '2026-03-09')).toBe('Amanhã');
    expect(relativeDayLabel('2026-03-08', '2026-03-09')).toBe('Ontem');
    expect(relativeDayLabel('2026-03-20', '2026-03-09')).toBeNull();
  });
});
