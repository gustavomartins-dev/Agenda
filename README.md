# Agenda Pessoal

Aplicação web de agenda pessoal: calendário mensal, compromissos por categoria, busca e
filtros — tudo rodando **localmente no navegador**, sem login, sem backend e sem rede.
Os dados ficam no `localStorage` da própria máquina.

Interface em **pt-BR**, responsiva para desktop e celular, com tema claro e escuro
automáticos (segue a preferência do sistema).

---

## 1. Funcionalidades

**Calendário**
- Grade mensal de domingo a sábado, com dias vizinhos preenchendo as semanas incompletas.
- Navegação por mês anterior / próximo mês e botão **Hoje**.
- O dia atual é destacado e o dia selecionado fica em evidência.
- Marcadores coloridos por categoria em cada dia (até 3 pontos + contador `+N`).
- Navegação por teclado: `←` `→` `↑` `↓` (dia/semana), `Home`/`End` (início/fim da semana),
  `PageUp`/`PageDown` (mês anterior/seguinte).

**Compromissos**
- Criar, editar e excluir, com **confirmação obrigatória antes de excluir**.
- Campos: título, descrição, data, horário inicial, horário final e categoria com cor.
- Duração calculada automaticamente (ex.: `1 h 30 min`).
- Lista do dia selecionado ordenada por horário.

**Busca e filtros**
- Busca por texto em título e descrição, tolerante a acentos e maiúsculas
  (`reuniao` encontra `Reunião`) e com múltiplos termos (todos precisam casar).
- Filtro por categoria (múltipla escolha, alternando os chips).
- Os resultados da busca atravessam todos os meses, agrupados por dia, e cada dia é
  clicável para saltar direto para aquela data.
- Botão para limpar filtros.

**Validações**
- Título obrigatório (máx. 120 caracteres).
- Descrição limitada a 500 caracteres, com contador.
- Data obrigatória e existente de fato (`30/02` é rejeitada).
- Horários obrigatórios e válidos; o término precisa ser **depois** do início.
- Erros aparecem sob o campo, com `aria-invalid`, e o foco vai para o primeiro campo inválido.

**Dados**
- Compromissos de exemplo carregados **apenas no primeiro uso**, ancorados na data atual.
- **Limpar dados** apaga tudo (com confirmação) e os exemplos não voltam sozinhos.
- **Carregar exemplos** recoloca a amostra quando a agenda está vazia.

**Acessibilidade**
- Calendário exposto como `grid` com `columnheader`, `gridcell` e `aria-selected`; cada dia
  tem rótulo por extenso, incluindo a contagem de compromissos.
- Diálogos com `aria-modal`, foco preso enquanto abertos, fechamento por `Esc` ou clique no
  fundo, e devolução do foco ao elemento que os abriu.
- Confirmação de exclusão usa `alertdialog`.
- Regiões `aria-live` anunciam criação, edição, exclusão e retorno ao dia de hoje.
- Link "Ir para o conteúdo", rótulos em todos os campos e respeito a
  `prefers-reduced-motion`.
- Estados vazios distinguem "dia livre" de "nenhum resultado para o filtro".

---

## 2. Stack

| Camada | Escolha |
|---|---|
| UI | React 19 + TypeScript (strict) |
| Build/dev server | Vite 8 |
| Testes | Vitest 4 + Testing Library + jsdom |
| Lint | ESLint 10 (flat config) + typescript-eslint |
| Estilo | CSS puro com custom properties (sem framework de UI) |
| Persistência | `localStorage` |

Sem dependências de runtime além de `react` e `react-dom`.

---

## 3. Como rodar

Requisitos: **Node.js 20.19+ ou 22.12+** e npm.

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`.

Para conferir o pacote de produção localmente:

```bash
npm run build
npm run preview      # http://localhost:4173
```

O `build` gera arquivos estáticos em `dist/` — basta servi-los por qualquer servidor de
estáticos ou hospedagem de páginas. Não há variável de ambiente nem backend a configurar.

---

## 4. Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Checagem de tipos (`tsc -b`) + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção |
| `npm run lint` | ESLint em todo o projeto |
| `npm run lint:fix` | ESLint aplicando correções automáticas |
| `npm test` | Executa a suíte de testes uma vez |
| `npm run test:watch` | Testes em modo observador |
| `npm run test:coverage` | Testes com relatório de cobertura (`coverage/`) |

---

## 5. Estrutura

```
src/
├── App.tsx                  # composição da tela e orquestração de estado da UI
├── main.tsx                 # ponto de entrada
├── styles.css               # tokens de design + todos os estilos
├── types.ts                 # Appointment, Category, tipos do formulário
├── hooks/
│   └── useAppointments.ts   # estado dos compromissos + persistência + carga inicial
├── lib/
│   ├── appointments.ts      # ordenação, busca, filtros e agrupamento (funções puras)
│   ├── categories.ts        # catálogo fixo de categorias e cores
│   ├── dates.ts             # datas em horário local, grade do mês, formatação pt-BR
│   ├── seed.ts              # compromissos de exemplo
│   ├── storage.ts           # leitura/escrita tolerante a falhas no localStorage
│   └── validation.ts        # regras de validação do formulário
├── components/              # MonthCalendar, DayAgenda, AppointmentDialog, Modal, …
└── test/setup.ts            # setup do Vitest (jest-dom, limpeza do localStorage)
```

Duas decisões que valem o registro:

- **Datas sempre em horário local.** Todo o app usa strings `AAAA-MM-DD` e as converte com
  helpers próprios. `new Date('2026-03-09')` seria interpretado como UTC e cairia no dia
  anterior em fusos negativos — como o do Brasil.
- **Leitura defensiva do storage.** Registro corrompido ou incompleto é descartado na
  carga, e categoria desconhecida vira `Outros`. Dado ruim no navegador do usuário nunca
  derruba a aplicação.

---

## 6. Testes

```bash
npm test
```

A suíte cobre as funções puras (datas, validação, busca/ordenação, storage), o hook de
estado com persistência e os fluxos de ponta a ponta na aplicação renderizada: primeira
carga com exemplos, criação, edição, exclusão com confirmação, busca, filtros por
categoria, navegação de mês, botão Hoje, navegação por teclado no calendário, fechamento de
diálogo por `Esc` e permanência dos dados após recarregar.

---

## 7. Privacidade e limites conhecidos

- Nada trafega pela rede: não há chamadas HTTP em runtime.
- Os dados vivem no `localStorage` **daquele navegador e daquele perfil**. Trocar de
  navegador, de máquina ou usar aba anônima significa uma agenda vazia. Limpar os dados do
  site apaga a agenda.
- Não há sincronização, múltiplos usuários, compromissos recorrentes, notificações,
  fuso horário por evento nem exportação — fora do escopo desta versão.
