import type { CSSProperties } from 'react';

import { getCategory } from '../lib/categories';
import { formatDuration, formatShortDate } from '../lib/dates';
import type { Appointment } from '../types';
import { CheckCircleIcon, ClockIcon, PencilIcon, TrashIcon } from './Icons';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
  onToggleCompletion: (appointment: Appointment) => void;
  /** Exibe a data no cartão — usado na lista de resultados da busca. */
  showDate?: boolean;
}

export function AppointmentCard({
  appointment,
  onEdit,
  onDelete,
  onToggleCompletion,
  showDate = false,
}: AppointmentCardProps) {
  const category = getCategory(appointment.categoryId);
  const duration = formatDuration(appointment.startTime, appointment.endTime);
  const { completed, title } = appointment;

  return (
    <li
      className="appointment"
      data-completed={completed ? 'true' : 'false'}
      style={{ borderInlineStartColor: completed ? 'var(--color-success)' : category.color }}
    >
      <button
        type="button"
        className="appointment__check"
        aria-pressed={completed}
        aria-label={`${completed ? 'Marcar como não concluído' : 'Marcar como concluído'} o compromisso ${title}`}
        title={completed ? 'Marcar como não concluído' : 'Marcar como concluído'}
        onClick={() => onToggleCompletion(appointment)}
      >
        <CheckCircleIcon />
      </button>

      <div className="appointment__main">
        <div className="appointment__meta">
          <span className="appointment__time">
            <ClockIcon />
            <span>
              {appointment.startTime} – {appointment.endTime}
            </span>
          </span>
          {duration ? <span className="appointment__duration">{duration}</span> : null}
          {showDate ? <span className="appointment__date">{formatShortDate(appointment.date)}</span> : null}
        </div>

        <h4 className="appointment__title">{title}</h4>

        {appointment.description ? (
          <p className="appointment__description">{appointment.description}</p>
        ) : null}

        <div className="appointment__tags">
          <span className="tag" style={{ '--tag-color': category.color } as CSSProperties}>
            {category.label}
          </span>
          {completed ? <span className="appointment__status">Concluído</span> : null}
        </div>
      </div>

      <div className="appointment__actions">
        <button
          type="button"
          className="icon-button"
          onClick={() => onEdit(appointment)}
          aria-label={`Editar compromisso ${title}`}
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          className="icon-button icon-button--danger"
          onClick={() => onDelete(appointment)}
          aria-label={`Excluir compromisso ${title}`}
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}
