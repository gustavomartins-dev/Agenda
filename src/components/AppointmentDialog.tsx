import { useId, useRef, useState, type CSSProperties, type FormEvent } from 'react';

import { CATEGORIES, DEFAULT_CATEGORY_ID } from '../lib/categories';
import { formatDuration } from '../lib/dates';
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, hasErrors, validateAppointment } from '../lib/validation';
import type { Appointment, AppointmentDraft, AppointmentFormErrors } from '../types';
import { Modal } from './Modal';

interface AppointmentDialogProps {
  /** Compromisso em edição; ausente significa criação. */
  appointment?: Appointment | null;
  /** Data pré-selecionada ao criar. */
  defaultDate: string;
  onSubmit: (draft: AppointmentDraft) => void;
  onClose: () => void;
}

function draftFrom(appointment: Appointment | null | undefined, defaultDate: string): AppointmentDraft {
  return {
    title: appointment?.title ?? '',
    description: appointment?.description ?? '',
    date: appointment?.date ?? defaultDate,
    startTime: appointment?.startTime ?? '09:00',
    endTime: appointment?.endTime ?? '10:00',
    categoryId: appointment?.categoryId ?? DEFAULT_CATEGORY_ID,
  };
}

/** Ordem usada para levar o foco ao primeiro campo com erro. */
const FIELD_ORDER: (keyof AppointmentDraft)[] = [
  'title',
  'date',
  'startTime',
  'endTime',
  'description',
  'categoryId',
];

export function AppointmentDialog({
  appointment,
  defaultDate,
  onSubmit,
  onClose,
}: AppointmentDialogProps) {
  const isEditing = Boolean(appointment);
  const [draft, setDraft] = useState<AppointmentDraft>(() => draftFrom(appointment, defaultDate));
  const [errors, setErrors] = useState<AppointmentFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();

  const fieldId = (field: string) => `${formId}-${field}`;
  const errorId = (field: string) => `${formId}-${field}-erro`;

  function update<K extends keyof AppointmentDraft>(field: K, value: AppointmentDraft[K]) {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (submitted) {
      setErrors(validateAppointment(next));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const validation = validateAppointment(draft);
    setErrors(validation);

    if (hasErrors(validation)) {
      const firstInvalid = FIELD_ORDER.find((field) => validation[field]);
      if (firstInvalid) {
        formRef.current
          ?.querySelector<HTMLElement>(`[data-field="${firstInvalid}"]`)
          ?.focus();
      }
      return;
    }

    onSubmit(draft);
  }

  const duration = formatDuration(draft.startTime, draft.endTime);
  const errorList = FIELD_ORDER.map((field) => errors[field]).filter(Boolean);

  return (
    <Modal
      title={isEditing ? 'Editar compromisso' : 'Novo compromisso'}
      description={
        isEditing
          ? 'Atualize as informações e salve para confirmar.'
          : 'Preencha os campos obrigatórios marcados com asterisco.'
      }
      onClose={onClose}
    >
      <form className="form" onSubmit={handleSubmit} noValidate ref={formRef}>
        <div className="sr-only" role="status" aria-live="polite">
          {submitted && errorList.length > 0
            ? `O formulário tem ${errorList.length} erro(s). Corrija os campos destacados.`
            : ''}
        </div>

        <div className="field">
          <label className="field__label" htmlFor={fieldId('title')}>
            Título <span aria-hidden="true">*</span>
            <span className="sr-only">(obrigatório)</span>
          </label>
          <input
            id={fieldId('title')}
            data-field="title"
            data-autofocus
            className="input"
            type="text"
            value={draft.title}
            maxLength={TITLE_MAX_LENGTH}
            autoComplete="off"
            placeholder="Ex.: Reunião com o time de produto"
            aria-required="true"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? errorId('title') : undefined}
            onChange={(event) => update('title', event.target.value)}
          />
          {errors.title ? (
            <p className="field__error" id={errorId('title')} role="alert">
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label className="field__label" htmlFor={fieldId('date')}>
            Data <span aria-hidden="true">*</span>
            <span className="sr-only">(obrigatório)</span>
          </label>
          <input
            id={fieldId('date')}
            data-field="date"
            className="input"
            type="date"
            value={draft.date}
            aria-required="true"
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={errors.date ? errorId('date') : undefined}
            onChange={(event) => update('date', event.target.value)}
          />
          {errors.date ? (
            <p className="field__error" id={errorId('date')} role="alert">
              {errors.date}
            </p>
          ) : null}
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field__label" htmlFor={fieldId('startTime')}>
              Início <span aria-hidden="true">*</span>
              <span className="sr-only">(obrigatório)</span>
            </label>
            <input
              id={fieldId('startTime')}
              data-field="startTime"
              className="input"
              type="time"
              value={draft.startTime}
              aria-required="true"
              aria-invalid={errors.startTime ? true : undefined}
              aria-describedby={errors.startTime ? errorId('startTime') : undefined}
              onChange={(event) => update('startTime', event.target.value)}
            />
            {errors.startTime ? (
              <p className="field__error" id={errorId('startTime')} role="alert">
                {errors.startTime}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor={fieldId('endTime')}>
              Término <span aria-hidden="true">*</span>
              <span className="sr-only">(obrigatório)</span>
            </label>
            <input
              id={fieldId('endTime')}
              data-field="endTime"
              className="input"
              type="time"
              value={draft.endTime}
              aria-required="true"
              aria-invalid={errors.endTime ? true : undefined}
              aria-describedby={errors.endTime ? errorId('endTime') : undefined}
              onChange={(event) => update('endTime', event.target.value)}
            />
            {errors.endTime ? (
              <p className="field__error" id={errorId('endTime')} role="alert">
                {errors.endTime}
              </p>
            ) : null}
          </div>
        </div>

        {duration && !errors.endTime ? (
          <p className="form__hint">Duração: {duration}</p>
        ) : null}

        <fieldset className="fieldset">
          <legend className="field__label">Categoria</legend>
          <div className="category-picker">
            {CATEGORIES.map((category) => (
              <label
                key={category.id}
                className="category-chip"
                style={{ '--chip-color': category.color } as CSSProperties}
                data-selected={draft.categoryId === category.id}
              >
                <input
                  type="radio"
                  name={`${formId}-categoria`}
                  value={category.id}
                  className="sr-only"
                  checked={draft.categoryId === category.id}
                  onChange={() => update('categoryId', category.id)}
                />
                <span className="category-chip__dot" aria-hidden="true" />
                {category.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label className="field__label" htmlFor={fieldId('description')}>
            Descrição
          </label>
          <textarea
            id={fieldId('description')}
            data-field="description"
            className="input input--textarea"
            rows={3}
            value={draft.description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder="Detalhes, local, links…"
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={
              errors.description ? `${errorId('description')} ${fieldId('description-contador')}` : fieldId('description-contador')
            }
            onChange={(event) => update('description', event.target.value)}
          />
          <p className="field__hint" id={fieldId('description-contador')}>
            {draft.description.length} de {DESCRIPTION_MAX_LENGTH} caracteres
          </p>
          {errors.description ? (
            <p className="field__error" id={errorId('description')} role="alert">
              {errors.description}
            </p>
          ) : null}
        </div>

        <div className="modal__footer modal__footer--inline">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary">
            {isEditing ? 'Salvar alterações' : 'Criar compromisso'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
