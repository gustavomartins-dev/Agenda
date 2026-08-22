import type { CSSProperties } from 'react';

import { getCategory } from '../lib/categories';
import { formatDuration, formatShortDate } from '../lib/dates';
import type { Appointment } from '../types';
import { ClockIcon, PencilIcon, TrashIcon } from './Icons';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
  /** Exibe a data no cartão — usado na lista de resultados da busca. */
  showDate?: boolean;
}

export function AppointmentCard({ appointment, onEdit, onDelete, showDate = false }: AppointmentCardProps) {
  const category = getCategory(appointment.categoryId);
  const duration = formatDuration(appointment.startTime, appointment.endTime);

  return (
    <li className="appointment" style={{ borderInlineStartColor: category.color }}>
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

        <h4 className="appointment__title">{appointment.title}</h4>

        {appointment.description ? (
          <p className="appointment__description">{appointment.description}</p>
        ) : null}

        <span className="tag" style={{ '--tag-color': category.color } as CSSProperties}>
          {category.label}
        </span>
      </div>

      <div className="appointment__actions">
        <button
          type="button"
          className="icon-button"
          onClick={() => onEdit(appointment)}
          aria-label={`Editar compromisso ${appointment.title}`}
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          className="icon-button icon-button--danger"
          onClick={() => onDelete(appointment)}
          aria-label={`Excluir compromisso ${appointment.title}`}
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}
