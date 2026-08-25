import { CalendarIcon, PlusIcon } from './Icons';

interface AppHeaderProps {
  showActions?: boolean;
  totalAppointments: number;
  upcomingCount: number;
  onCreate: () => void;
  onClearData: () => void;
  onRestoreSamples: () => void;
}

export function AppHeader({
  showActions = true,
  totalAppointments,
  upcomingCount,
  onCreate,
  onClearData,
  onRestoreSamples,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo" aria-hidden="true">
          <CalendarIcon />
        </span>
        <div>
          <h1 className="app-header__title">Agenda Pessoal</h1>
          <p className="app-header__subtitle">
            {totalAppointments === 0
              ? 'Agenda conectada ao banco de dados'
              : `${totalAppointments} compromisso(s) salvos · ${upcomingCount} a partir de hoje`}
          </p>
        </div>
      </div>

      {showActions ? <div className="app-header__actions">
        {totalAppointments === 0 ? (
          <button type="button" className="button button--ghost button--sm" onClick={onRestoreSamples}>
            Carregar exemplos
          </button>
        ) : (
          <button type="button" className="button button--ghost button--sm" onClick={onClearData}>
            Limpar dados
          </button>
        )}
        <button type="button" className="button button--subtle" onClick={onCreate}>
          <PlusIcon />
          <span className="app-header__cta-label">Novo compromisso</span>
        </button>
      </div> : null}
    </header>
  );
}
