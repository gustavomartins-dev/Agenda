import { formatLongDate } from '../lib/dates';
import type { Appointment } from '../types';
import { AppointmentCard } from './AppointmentCard';
import { EmptyState } from './EmptyState';
import { SearchIcon } from './Icons';

interface SearchResultsProps {
  appointments: Appointment[];
  onSelectDate: (iso: string) => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
  onToggleCompletion: (appointment: Appointment) => void;
  onClearFilters: () => void;
}

/** Resultados da busca agrupados por dia, cobrindo todos os meses. */
export function SearchResults({
  appointments,
  onSelectDate,
  onEdit,
  onDelete,
  onToggleCompletion,
  onClearFilters,
}: SearchResultsProps) {
  if (appointments.length === 0) {
    return (
      <section className="card search-results" aria-labelledby="resultados-busca">
        <h2 className="section-title" id="resultados-busca">
          Resultados da busca
        </h2>
        <EmptyState
          icon={<SearchIcon />}
          title="Nenhum compromisso encontrado"
          message="Tente outros termos ou remova alguns filtros de categoria."
          action={
            <button type="button" className="button button--ghost" onClick={onClearFilters}>
              Limpar filtros
            </button>
          }
        />
      </section>
    );
  }

  const days = [...new Set(appointments.map((appointment) => appointment.date))].sort();

  return (
    <section className="card search-results" aria-labelledby="resultados-busca">
      <h2 className="section-title" id="resultados-busca">
        Resultados da busca <span className="badge">{appointments.length}</span>
      </h2>

      {days.map((day) => (
        <div className="search-results__group" key={day}>
          <button type="button" className="search-results__day" onClick={() => onSelectDate(day)}>
            {formatLongDate(day)}
          </button>
          <ul className="appointment-list">
            {appointments
              .filter((appointment) => appointment.date === day)
              .map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleCompletion={onToggleCompletion}
                  showDate
                />
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
