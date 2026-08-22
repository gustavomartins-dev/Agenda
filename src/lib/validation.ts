import type { AppointmentDraft, AppointmentFormErrors } from '../types';
import { isCategoryId } from './categories';
import { isValidISODate, isValidTime, timeToMinutes } from './dates';

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 500;

export function validateAppointment(draft: AppointmentDraft): AppointmentFormErrors {
  const errors: AppointmentFormErrors = {};

  const title = draft.title.trim();
  if (title.length === 0) {
    errors.title = 'Informe um título para o compromisso.';
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `O título deve ter no máximo ${TITLE_MAX_LENGTH} caracteres.`;
  }

  if (draft.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`;
  }

  if (draft.date.trim().length === 0) {
    errors.date = 'Informe a data do compromisso.';
  } else if (!isValidISODate(draft.date)) {
    errors.date = 'Data inválida. Use o formato dia/mês/ano.';
  }

  if (draft.startTime.trim().length === 0) {
    errors.startTime = 'Informe o horário inicial.';
  } else if (!isValidTime(draft.startTime)) {
    errors.startTime = 'Horário inicial inválido.';
  }

  if (draft.endTime.trim().length === 0) {
    errors.endTime = 'Informe o horário final.';
  } else if (!isValidTime(draft.endTime)) {
    errors.endTime = 'Horário final inválido.';
  }

  if (!errors.startTime && !errors.endTime) {
    if (timeToMinutes(draft.endTime) <= timeToMinutes(draft.startTime)) {
      errors.endTime = 'O horário final deve ser depois do inicial.';
    }
  }

  if (!isCategoryId(draft.categoryId)) {
    errors.categoryId = 'Escolha uma categoria válida.';
  }

  return errors;
}

export function hasErrors(errors: AppointmentFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
