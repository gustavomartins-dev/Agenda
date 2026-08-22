import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import App from './App';
import { addDaysISO, addMonthsISO, formatLongDate, formatMonthYear, todayISO } from './lib/dates';
import { SEED_FLAG_KEY, STORAGE_KEY } from './lib/storage';
import type { Appointment } from './types';

const TODAY = todayISO();

function fixture(overrides: Partial<Appointment> & { id: string }): Appointment {
  return {
    title: 'Compromisso',
    description: '',
    date: TODAY,
    startTime: '09:00',
    endTime: '10:00',
    categoryId: 'trabalho',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Marca o app como "já usado" para os exemplos não interferirem no teste. */
function seedStorage(appointments: Appointment[]) {
  window.localStorage.setItem(SEED_FLAG_KEY, 'true');
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
}

function storedAppointments(): Appointment[] {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as Appointment[];
}

function openNewAppointmentDialog(user: ReturnType<typeof userEvent.setup>) {
  const buttons = screen.getAllByRole('button', { name: 'Novo compromisso' });
  return user.click(buttons[0] as HTMLElement);
}

describe('primeira execução', () => {
  it('carrega compromissos de exemplo e os persiste', async () => {
    render(<App />);

    expect(await screen.findByText('Reunião de alinhamento semanal')).toBeInTheDocument();
    expect(storedAppointments().length).toBeGreaterThan(0);
    expect(window.localStorage.getItem(SEED_FLAG_KEY)).toBe('true');
  });

  it('não recarrega os exemplos quando o usuário já limpou tudo', () => {
    seedStorage([]);
    render(<App />);

    expect(screen.getByText('Dia livre')).toBeInTheDocument();
    expect(screen.queryByText('Reunião de alinhamento semanal')).not.toBeInTheDocument();
  });
});

describe('criação de compromisso', () => {
  beforeEach(() => seedStorage([]));

  it('cria, exibe no dia selecionado e persiste no localStorage', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openNewAppointmentDialog(user);
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText(/^título/i), 'Dentista');
    await user.type(within(dialog).getByLabelText(/^descrição/i), 'Levar a carteirinha');
    fireEvent.change(within(dialog).getByLabelText(/^início/i), { target: { value: '14:00' } });
    fireEvent.change(within(dialog).getByLabelText(/^término/i), { target: { value: '15:30' } });
    await user.click(within(dialog).getByRole('radio', { name: 'Saúde' }));
    await user.click(within(dialog).getByRole('button', { name: /criar compromisso/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.getByText('Dentista')).toBeInTheDocument();
    expect(screen.getByText('Levar a carteirinha')).toBeInTheDocument();
    expect(screen.getByText('14:00 – 15:30')).toBeInTheDocument();
    expect(screen.getByText('1 h 30 min')).toBeInTheDocument();

    const stored = storedAppointments();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ title: 'Dentista', date: TODAY, categoryId: 'saude' });
  });

  it('mantém os dados após recarregar a aplicação', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await openNewAppointmentDialog(user);
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^título/i), 'Persistente');
    await user.click(within(dialog).getByRole('button', { name: /criar compromisso/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    unmount();
    render(<App />);

    expect(await screen.findByText('Persistente')).toBeInTheDocument();
  });
});

describe('validações do formulário', () => {
  beforeEach(() => seedStorage([]));

  it('bloqueia o envio sem título e devolve o foco ao campo', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openNewAppointmentDialog(user);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /criar compromisso/i }));

    expect(await screen.findByText('Informe um título para o compromisso.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^título/i)).toHaveFocus();
    expect(within(dialog).getByLabelText(/^título/i)).toHaveAttribute('aria-invalid', 'true');
    expect(storedAppointments()).toHaveLength(0);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('bloqueia término anterior ou igual ao início', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openNewAppointmentDialog(user);
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^título/i), 'Intervalo inválido');
    fireEvent.change(within(dialog).getByLabelText(/^início/i), { target: { value: '15:00' } });
    fireEvent.change(within(dialog).getByLabelText(/^término/i), { target: { value: '14:00' } });
    await user.click(within(dialog).getByRole('button', { name: /criar compromisso/i }));

    expect(await screen.findByText('O horário final deve ser depois do inicial.')).toBeInTheDocument();
    expect(storedAppointments()).toHaveLength(0);
  });

  it('limpa o erro assim que o campo é corrigido', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openNewAppointmentDialog(user);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /criar compromisso/i }));
    expect(await screen.findByText('Informe um título para o compromisso.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/^título/i), 'Agora vai');
    await waitFor(() =>
      expect(screen.queryByText('Informe um título para o compromisso.')).not.toBeInTheDocument(),
    );
  });
});

describe('edição', () => {
  it('abre o formulário preenchido e salva as alterações', async () => {
    seedStorage([fixture({ id: '1', title: 'Reunião antiga', startTime: '08:00', endTime: '09:00' })]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Editar compromisso Reunião antiga' }));
    const dialog = await screen.findByRole('dialog');

    const titleInput = within(dialog).getByLabelText(/^título/i);
    expect(titleInput).toHaveValue('Reunião antiga');
    expect(within(dialog).getByLabelText(/^início/i)).toHaveValue('08:00');

    await user.clear(titleInput);
    await user.type(titleInput, 'Reunião nova');
    await user.click(within(dialog).getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Reunião nova')).toBeInTheDocument();
    expect(screen.queryByText('Reunião antiga')).not.toBeInTheDocument();
    expect(storedAppointments()[0]?.title).toBe('Reunião nova');
  });
});

describe('exclusão', () => {
  beforeEach(() => {
    seedStorage([fixture({ id: '1', title: 'Almoço com cliente' })]);
  });

  it('pede confirmação e mantém o compromisso ao cancelar', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Excluir compromisso Almoço com cliente' }));
    const confirmDialog = await screen.findByRole('alertdialog');
    expect(within(confirmDialog).getByText(/não pode ser desfeita/i)).toBeInTheDocument();

    await user.click(within(confirmDialog).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByText('Almoço com cliente')).toBeInTheDocument();
    expect(storedAppointments()).toHaveLength(1);
  });

  it('remove o compromisso ao confirmar', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Excluir compromisso Almoço com cliente' }));
    const confirmDialog = await screen.findByRole('alertdialog');
    await user.click(within(confirmDialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(screen.queryByText('Almoço com cliente')).not.toBeInTheDocument());
    expect(screen.getByText('Dia livre')).toBeInTheDocument();
    expect(storedAppointments()).toHaveLength(0);
  });
});

describe('busca e filtros', () => {
  beforeEach(() => {
    seedStorage([
      fixture({ id: '1', title: 'Academia', categoryId: 'saude', startTime: '07:00', endTime: '08:00' }),
      fixture({ id: '2', title: 'Daily do time', categoryId: 'trabalho' }),
      fixture({ id: '3', title: 'Cinema com amigos', categoryId: 'social', date: addDaysISO(TODAY, 3) }),
    ]);
  });

  it('encontra compromissos de outros dias e permite saltar para a data', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/buscar compromissos/i), 'cinema');

    const results = await screen.findByRole('region', { name: /resultados da busca/i });
    expect(within(results).getByText('Cinema com amigos')).toBeInTheDocument();
    expect(within(results).queryByText('Academia')).not.toBeInTheDocument();

    const otherDay = addDaysISO(TODAY, 3);
    await user.click(within(results).getByRole('button', { name: formatLongDate(otherDay) }));

    expect(
      screen.getByRole('region', { name: formatLongDate(otherDay) }),
    ).toBeInTheDocument();
  });

  it('ignora acentos e diferenças de caixa', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/buscar compromissos/i), 'ACADEMIA');
    const results = await screen.findByRole('region', { name: /resultados da busca/i });
    expect(within(results).getByText('Academia')).toBeInTheDocument();
  });

  it('mostra estado vazio quando a busca não encontra nada', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/buscar compromissos/i), 'viagem para marte');

    expect(await screen.findByText('Nenhum compromisso encontrado')).toBeInTheDocument();
  });

  it('filtra por categoria e explica o estado vazio do dia', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Saúde' }));

    const dayPanel = screen.getByRole('region', { name: formatLongDate(TODAY) });
    expect(within(dayPanel).getByText('Academia')).toBeInTheDocument();
    expect(within(dayPanel).queryByText('Daily do time')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Estudos' }));
    await user.click(screen.getByRole('button', { name: 'Saúde' }));

    expect(await screen.findByText('Nenhum compromisso corresponde aos filtros')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0] as HTMLElement);
    expect(screen.getByText('Daily do time')).toBeInTheDocument();
  });
});

describe('navegação no calendário', () => {
  beforeEach(() => seedStorage([]));

  it('avança e volta de mês e retorna com o botão Hoje', async () => {
    const user = userEvent.setup();
    render(<App />);

    const currentMonth = formatMonthYear(TODAY);
    const nextMonth = formatMonthYear(addMonthsISO(TODAY, 1));

    expect(screen.getByRole('heading', { name: currentMonth })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(await screen.findByRole('heading', { name: nextMonth })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(await screen.findByRole('heading', { name: currentMonth })).toBeInTheDocument();
  });

  it('navega entre dias pelo teclado com as setas', async () => {
    const user = userEvent.setup();
    render(<App />);

    const grid = screen.getByRole('grid');
    const todayCell = within(grid).getByRole('button', { name: new RegExp('\\(hoje\\)') });
    await user.click(todayCell);

    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      const selected = within(grid).getByRole('gridcell', { selected: true });
      expect(within(selected).getByRole('button')).toHaveAttribute('data-date', addDaysISO(TODAY, 1));
    });

    expect(
      screen.getByRole('region', { name: formatLongDate(addDaysISO(TODAY, 1)) }),
    ).toBeInTheDocument();

    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      const selected = within(grid).getByRole('gridcell', { selected: true });
      expect(within(selected).getByRole('button')).toHaveAttribute('data-date', addDaysISO(TODAY, 8));
    });
  });
});

describe('gestão dos dados locais', () => {
  it('limpa todos os compromissos após confirmação e oferece recarregar exemplos', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText('Reunião de alinhamento semanal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpar dados' }));
    const confirmDialog = await screen.findByRole('alertdialog');
    await user.click(within(confirmDialog).getByRole('button', { name: 'Limpar tudo' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByText('Dia livre')).toBeInTheDocument();
    expect(storedAppointments()).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Carregar exemplos' }));
    expect(await screen.findByText('Reunião de alinhamento semanal')).toBeInTheDocument();
  });
});

describe('acessibilidade', () => {
  beforeEach(() => seedStorage([fixture({ id: '1', title: 'Compromisso acessível' })]));

  it('fecha o diálogo com Esc e devolve o foco ao gatilho', async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getAllByRole('button', { name: 'Novo compromisso' })[0] as HTMLElement;
    await user.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('expõe o calendário como grade com dias rotulados', () => {
    render(<App />);

    const grid = screen.getByRole('grid');
    expect(within(grid).getAllByRole('columnheader')).toHaveLength(7);
    expect(within(grid).getByRole('button', { name: /\(hoje\), 1 compromisso/ })).toBeInTheDocument();
    expect(within(grid).getByRole('gridcell', { selected: true })).toBeInTheDocument();
  });

  it('mantém um único dia tabulável na grade', () => {
    render(<App />);

    const grid = screen.getByRole('grid');
    const tabbable = within(grid)
      .getAllByRole('button')
      .filter((button) => button.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
  });
});
