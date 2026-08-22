import { formatLongDate, relativeDayLabel } from '../lib/dates';
import type { Appointment } from '../types';
import { AppointmentCard } from './AppointmentCard';
import { EmptyState } from './EmptyState';
import { CalendarIcon, PlusIcon, SearchIcon } from './Icons';

interface DayAgendaProps {
  selectedDate: string;
  todayISODate: string;
  appointments: Appointment[];
  /** Total do dia sem filtros, para distinguir "dia vazio" de "filtro sem resultado". */
  totalOnDay: number;
  filtersActive: boolean;
  onCreate: () => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
  onClearFilters: () => void;
}

export function DayAgenda({
  selectedDate,
  todayISODate,
  appointments,
  totalOnDay,
  filtersActive,
  onCreate,
  onEdit,
  onDelete,
  onClearFilters,
}: DayAgendaProps) {
  const relative = relativeDayLabel(selectedDate, todayISODate);
  const count = appointments.length;

  return (
    <section className="day-agenda card" aria-labelledby="dia-selecionado">
      <header className="day-agenda__header">
        <div>
          <p className="day-agenda__eyebrow">{relative ?? 'Dia selecionado'}</p>
          <h2 className="day-agenda__title" id="dia-selecionado">
            {formatLongDate(selectedDate)}
          </h2>
          <p className="day-agenda__count" aria-live="polite">
            {count === 0
              ? 'Nenhum compromisso para exibir'
              : count === 1
                ? '1 compromisso'
                : `${count} compromissos`}
            {filtersActive && totalOnDay !== count ? ` de ${totalOnDay} no dia` : ''}
          </p>
        </div>

        <button type="button" className="button button--primary" onClick={onCreate}>
          <PlusIcon />
          Novo compromisso
        </button>
      </header>

      {count > 0 ? (
        <ul className="appointment-list">
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : totalOnDay > 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="Nenhum compromisso corresponde aos filtros"
          message={`Este dia tem ${totalOnDay} compromisso(s), mas nenhum passa pela busca ou pelas categorias selecionadas.`}
          action={
            <button type="button" className="button button--ghost" onClick={onClearFilters}>
              Limpar filtros
            </button>
          }
        />
      ) : (
        <EmptyState
          icon={<CalendarIcon />}
          title="Dia livre"
          message="Você ainda não tem nada marcado para esta data."
          action={
            <button type="button" className="button button--primary" onClick={onCreate}>
              <PlusIcon />
              Criar o primeiro compromisso
            </button>
          }
        />
      )}
    </section>
  );
}
