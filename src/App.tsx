import { useMemo, useState } from 'react';

import { AppHeader } from './components/AppHeader';
import { AppointmentDialog } from './components/AppointmentDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { CollectionPanel } from './components/CollectionPanel';
import { DayAgenda } from './components/DayAgenda';
import { FiltersBar } from './components/FiltersBar';
import { MonthCalendar } from './components/MonthCalendar';
import { SearchResults } from './components/SearchResults';
import { useAppointments } from './hooks/useAppointments';
import {
  EMPTY_FILTERS,
  appointmentsOnDate,
  filterAppointments,
  groupByDate,
  isFilterActive,
  type AppointmentFilters,
} from './lib/appointments';
import { todayISO } from './lib/dates';
import type { Appointment, AppointmentDraft } from './types';

type DialogState = { mode: 'create' } | { mode: 'edit'; appointment: Appointment } | null;

type ConfirmState =
  | { kind: 'delete'; appointment: Appointment }
  | { kind: 'clear' }
  | null;

export default function App() {
  const { appointments, loading, error, addAppointment, updateAppointment, toggleCompletion, removeAppointment, clearAll, restoreSamples } =
    useAppointments();

  const [today] = useState(todayISO);
  const [selectedDate, setSelectedDate] = useState(today);
  const [monthAnchor, setMonthAnchor] = useState(today);
  const [filters, setFilters] = useState<AppointmentFilters>(EMPTY_FILTERS);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [activeView, setActiveView] = useState<'agenda' | 'collection'>('agenda');

  const filtersActive = isFilterActive(filters);
  const searching = filters.query.trim().length > 0;

  const filtered = useMemo(() => filterAppointments(appointments, filters), [appointments, filters]);
  const appointmentsByDate = useMemo(() => groupByDate(filtered), [filtered]);
  const dayAppointments = useMemo(
    () => appointmentsOnDate(filtered, selectedDate),
    [filtered, selectedDate],
  );
  const totalOnDay = useMemo(
    () => appointmentsOnDate(appointments, selectedDate).length,
    [appointments, selectedDate],
  );
  const upcomingCount = useMemo(
    () => appointments.filter((appointment) => appointment.date >= today).length,
    [appointments, today],
  );

  function handleSelectDate(iso: string) {
    setSelectedDate(iso);
  }

  function handleGoToday() {
    setSelectedDate(today);
    setMonthAnchor(today);
    setStatusMessage('Voltou para a data de hoje.');
  }

  function handleSubmit(draft: AppointmentDraft) {
    if (dialog?.mode === 'edit') {
      updateAppointment(dialog.appointment.id, draft);
      setStatusMessage(`Compromisso "${draft.title.trim()}" atualizado.`);
    } else {
      addAppointment(draft);
      setStatusMessage(`Compromisso "${draft.title.trim()}" criado.`);
    }
    setSelectedDate(draft.date);
    setMonthAnchor(draft.date);
    setDialog(null);
  }

  function handleToggleCompletion(appointment: Appointment) {
    toggleCompletion(appointment.id);
    setStatusMessage(
      appointment.completed
        ? `Compromisso "${appointment.title}" reaberto.`
        : `Compromisso "${appointment.title}" concluído.`,
    );
  }

  function handleConfirm() {
    if (!confirm) return;

    if (confirm.kind === 'delete') {
      removeAppointment(confirm.appointment.id);
      setStatusMessage(`Compromisso "${confirm.appointment.title}" excluído.`);
    } else {
      clearAll();
      setFilters(EMPTY_FILTERS);
      setStatusMessage('Todos os compromissos foram removidos do banco de dados.');
    }

    setConfirm(null);
  }

  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>

      <div className="app__shell">
        <AppHeader
          showActions={activeView === 'agenda'}
          totalAppointments={appointments.length}
          upcomingCount={upcomingCount}
          onCreate={() => setDialog({ mode: 'create' })}
          onClearData={() => setConfirm({ kind: 'clear' })}
          onRestoreSamples={() => {
            restoreSamples();
            setStatusMessage('Compromissos de exemplo carregados.');
          }}
        />

        <nav className="app-tabs" aria-label="Seções principais">
          <button type="button" className="app-tabs__tab" aria-current={activeView === 'agenda' ? 'page' : undefined} onClick={() => setActiveView('agenda')}>Agenda</button>
          <button type="button" className="app-tabs__tab" aria-current={activeView === 'collection' ? 'page' : undefined} onClick={() => setActiveView('collection')}>Minha coleção</button>
        </nav>

        {activeView === 'agenda' ? <main className="app__main" id="conteudo">
          <div className="app__area app__area--calendar">
            <MonthCalendar
              monthAnchor={monthAnchor}
              selectedDate={selectedDate}
              todayISODate={today}
              appointmentsByDate={appointmentsByDate}
              onSelectDate={handleSelectDate}
              onChangeMonth={setMonthAnchor}
              onGoToday={handleGoToday}
            />
          </div>

          <div className="app__area app__area--day">
            <DayAgenda
              selectedDate={selectedDate}
              todayISODate={today}
              appointments={dayAppointments}
              totalOnDay={totalOnDay}
              filtersActive={filtersActive}
              onCreate={() => setDialog({ mode: 'create' })}
              onEdit={(appointment) => setDialog({ mode: 'edit', appointment })}
              onDelete={(appointment) => setConfirm({ kind: 'delete', appointment })}
              onToggleCompletion={handleToggleCompletion}
              onClearFilters={() => setFilters(EMPTY_FILTERS)}
            />

            {searching ? (
              <SearchResults
                appointments={filtered}
                onSelectDate={(iso) => {
                  setSelectedDate(iso);
                  setMonthAnchor(iso);
                }}
                onEdit={(appointment) => setDialog({ mode: 'edit', appointment })}
                onDelete={(appointment) => setConfirm({ kind: 'delete', appointment })}
                onToggleCompletion={handleToggleCompletion}
                onClearFilters={() => setFilters(EMPTY_FILTERS)}
              />
            ) : null}
          </div>

          <div className="app__area app__area--filters">
            <FiltersBar
              filters={filters}
              onChange={setFilters}
              resultCount={filtered.length}
              filtersActive={filtersActive}
            />
          </div>
        </main> : <CollectionPanel />}

        <footer className="app__footer">
          <p>
            {loading ? 'Conectando ao banco de dados…' : error ? `Aviso: ${error}` : 'Dados salvos no banco SQLite da agenda.'}
          </p>
        </footer>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </div>

      {dialog ? (
        <AppointmentDialog
          appointment={dialog.mode === 'edit' ? dialog.appointment : null}
          defaultDate={selectedDate}
          onSubmit={handleSubmit}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={confirm.kind === 'delete' ? 'Excluir compromisso' : 'Limpar todos os dados'}
          message={
            confirm.kind === 'delete'
              ? `Tem certeza de que deseja excluir "${confirm.appointment.title}"? Esta ação não pode ser desfeita.`
              : 'Isso remove todos os compromissos salvos no banco de dados. Esta ação não pode ser desfeita.'
          }
          confirmLabel={confirm.kind === 'delete' ? 'Excluir' : 'Limpar tudo'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
