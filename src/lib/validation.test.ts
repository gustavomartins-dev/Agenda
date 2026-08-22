import { describe, expect, it } from 'vitest';

import type { AppointmentDraft } from '../types';
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, hasErrors, validateAppointment } from './validation';

function draft(overrides: Partial<AppointmentDraft> = {}): AppointmentDraft {
  return {
    title: 'Reunião de time',
    description: 'Pauta semanal',
    date: '2026-03-09',
    startTime: '09:00',
    endTime: '10:00',
    categoryId: 'trabalho',
    ...overrides,
  };
}

describe('validateAppointment', () => {
  it('não aponta erros para um rascunho válido', () => {
    const errors = validateAppointment(draft());
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });

  it('exige título e ignora espaços em branco', () => {
    expect(validateAppointment(draft({ title: '   ' })).title).toMatch(/informe um título/i);
  });

  it('limita o tamanho do título', () => {
    const errors = validateAppointment(draft({ title: 'a'.repeat(TITLE_MAX_LENGTH + 1) }));
    expect(errors.title).toContain(String(TITLE_MAX_LENGTH));
  });

  it('limita o tamanho da descrição', () => {
    const errors = validateAppointment(draft({ description: 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1) }));
    expect(errors.description).toContain(String(DESCRIPTION_MAX_LENGTH));
  });

  it('exige data e rejeita data inexistente', () => {
    expect(validateAppointment(draft({ date: '' })).date).toMatch(/informe a data/i);
    expect(validateAppointment(draft({ date: '2026-02-30' })).date).toMatch(/inválida/i);
  });

  it('exige horários válidos', () => {
    expect(validateAppointment(draft({ startTime: '' })).startTime).toMatch(/informe o horário inicial/i);
    expect(validateAppointment(draft({ endTime: '' })).endTime).toMatch(/informe o horário final/i);
    expect(validateAppointment(draft({ startTime: '25:00' })).startTime).toMatch(/inválido/i);
  });

  it('exige que o término venha depois do início', () => {
    expect(validateAppointment(draft({ startTime: '10:00', endTime: '09:00' })).endTime).toMatch(
      /depois do inicial/i,
    );
    expect(validateAppointment(draft({ startTime: '10:00', endTime: '10:00' })).endTime).toMatch(
      /depois do inicial/i,
    );
  });

  it('não reclama da ordem quando algum horário já é inválido', () => {
    const errors = validateAppointment(draft({ startTime: 'xx', endTime: '09:00' }));
    expect(errors.startTime).toBeDefined();
    expect(errors.endTime).toBeUndefined();
  });

  it('rejeita categoria desconhecida', () => {
    const errors = validateAppointment(
      draft({ categoryId: 'inexistente' as AppointmentDraft['categoryId'] }),
    );
    expect(errors.categoryId).toBeDefined();
  });
});
