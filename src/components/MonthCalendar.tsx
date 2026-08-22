import { useEffect, useId, useMemo, useRef, type KeyboardEvent } from 'react';

import { getCategory } from '../lib/categories';
import {
  WEEKDAY_FULL_LABELS,
  WEEKDAY_LABELS,
  addDaysISO,
  addMonthsISO,
  formatLongDate,
  formatMonthYear,
  fromISODate,
  buildMonthGrid,
} from '../lib/dates';
import type { Appointment } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface MonthCalendarProps {
  /** Qualquer data dentro do mês exibido. */
  monthAnchor: string;
  selectedDate: string;
  todayISODate: string;
  appointmentsByDate: Map<string, Appointment[]>;
  onSelectDate: (iso: string) => void;
  onChangeMonth: (anchor: string) => void;
  onGoToday: () => void;
}

const MAX_DOTS = 3;

export function MonthCalendar({
  monthAnchor,
  selectedDate,
  todayISODate,
  appointmentsByDate,
  onSelectDate,
  onChangeMonth,
  onGoToday,
}: MonthCalendarProps) {
  const headingId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);

  const anchorDate = fromISODate(monthAnchor);
  const weeks = useMemo(
    () => buildMonthGrid(anchorDate.getFullYear(), anchorDate.getMonth()),
    // A grade só depende do mês/ano ancorados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthAnchor],
  );

  // Mantém o foco no dia recém-navegado, inclusive quando a troca muda de mês.
  useEffect(() => {
    const iso = pendingFocus.current;
    if (!iso) return;
    pendingFocus.current = null;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)?.focus();
  }, [selectedDate, monthAnchor]);

  function moveTo(iso: string) {
    pendingFocus.current = iso;
    onSelectDate(iso);
    onChangeMonth(iso);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, iso: string) {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };

    if (event.key in moves) {
      event.preventDefault();
      moveTo(addDaysISO(iso, moves[event.key] ?? 0));
      return;
    }

    switch (event.key) {
      case 'Home': {
        event.preventDefault();
        moveTo(addDaysISO(iso, -fromISODate(iso).getDay()));
        break;
      }
      case 'End': {
        event.preventDefault();
        moveTo(addDaysISO(iso, 6 - fromISODate(iso).getDay()));
        break;
      }
      case 'PageUp': {
        event.preventDefault();
        moveTo(addMonthsISO(iso, -1));
        break;
      }
      case 'PageDown': {
        event.preventDefault();
        moveTo(addMonthsISO(iso, 1));
        break;
      }
      default:
        break;
    }
  }

  // Garante que exista sempre exatamente um dia tabulável na grade.
  const focusableDate = weeks.flat().some((day) => day.iso === selectedDate)
    ? selectedDate
    : (weeks.flat().find((day) => day.inCurrentMonth)?.iso ?? selectedDate);

  return (
    <section className="calendar card" aria-labelledby={headingId}>
      <header className="calendar__header">
        <h2 className="calendar__title" id={headingId}>
          {formatMonthYear(monthAnchor)}
        </h2>

        <div className="calendar__controls">
          <button
            type="button"
            className="icon-button"
            onClick={() => onChangeMonth(addMonthsISO(monthAnchor, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeftIcon />
          </button>
          <button type="button" className="button button--subtle" onClick={onGoToday}>
            Hoje
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => onChangeMonth(addMonthsISO(monthAnchor, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </header>

      <div className="calendar__grid" role="grid" aria-labelledby={headingId} ref={gridRef}>
        <div className="calendar__row calendar__row--head" role="row">
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={label} className="calendar__weekday" role="columnheader" aria-label={WEEKDAY_FULL_LABELS[index]}>
              {label}
            </span>
          ))}
        </div>

        {weeks.map((week) => (
          <div className="calendar__row" role="row" key={week[0]?.iso}>
            {week.map((day) => {
              const dayAppointments = appointmentsByDate.get(day.iso) ?? [];
              const isSelected = day.iso === selectedDate;
              const isToday = day.iso === todayISODate;
              const count = dayAppointments.length;
              const countLabel =
                count === 0 ? 'nenhum compromisso' : count === 1 ? '1 compromisso' : `${count} compromissos`;

              return (
                <div className="calendar__cell" role="gridcell" aria-selected={isSelected} key={day.iso}>
                  <button
                    type="button"
                    data-date={day.iso}
                    className="day"
                    data-outside={!day.inCurrentMonth}
                    data-today={isToday}
                    data-selected={isSelected}
                    tabIndex={day.iso === focusableDate ? 0 : -1}
                    aria-label={`${formatLongDate(day.iso)}${isToday ? ' (hoje)' : ''}, ${countLabel}`}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => {
                      pendingFocus.current = day.iso;
                      onSelectDate(day.iso);
                      if (!day.inCurrentMonth) onChangeMonth(day.iso);
                    }}
                    onKeyDown={(event) => handleKeyDown(event, day.iso)}
                  >
                    <span className="day__number">{day.dayOfMonth}</span>
                    {count > 0 ? (
                      <span className="day__dots" aria-hidden="true">
                        {dayAppointments.slice(0, MAX_DOTS).map((appointment) => (
                          <span
                            key={appointment.id}
                            className="day__dot"
                            style={{ backgroundColor: getCategory(appointment.categoryId).color }}
                          />
                        ))}
                        {count > MAX_DOTS ? <span className="day__more">+{count - MAX_DOTS}</span> : null}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
