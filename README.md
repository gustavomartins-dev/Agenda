# Agenda Pessoal

> [!IMPORTANT]
> **Este projeto foi desenvolvido com assistência substancial de inteligência artificial.**
> A ideia, a direção, as decisões finais e a validação são de Gustavo Martins;
> planejamento, implementação, testes e documentação contaram com o apoio de ferramentas de IA.

Aplicação web de agenda pessoal: calendário mensal, compromissos por categoria, busca e
filtros. Os dados são persistidos em um banco SQLite por uma API local.

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
- **Marcar como concluído** direto no cartão, em um clique, e desmarcar do mesmo jeito.
  O cartão concluído recebe distinção visual (título riscado, borda e selo verdes) e
  continua editável e excluível. A conclusão sobrevive à edição dos outros campos.

**Minha coleção**
- Aba separada para listas pessoais por tópico (ex.: Filmes, Assistir).
- Adicionar e apagar itens, com busca dentro do tópico e bloqueio de item repetido.

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
- O botão de conclusão é um alternador com `aria-pressed` e rótulo que nomeia o
  compromisso, então a mudança de estado é anunciada sem depender só da cor.
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
| Backend | Node.js + Express |
| Persistência | SQLite (`data/agenda.sqlite`) |

O comando de desenvolvimento inicia a interface e a API juntas.

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

O `build` gera a interface em `dist/`. Depois, `npm start` serve a interface, a API e o
banco local pela porta 3001.

### Acesso remoto privado

A agenda pode ser acessada fora de casa enquanto este computador estiver ligado. A
configuração recomendada usa [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve):
o navegador recebe HTTPS, o banco continua somente neste computador e a URL só funciona
para dispositivos autorizados na mesma tailnet. Nenhuma porta do roteador deve ser aberta.

1. Instale o Tailscale neste computador pelo instalador oficial e conecte sua conta:

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2. Instale o Tailscale no celular/notebook, entre na mesma tailnet e confirme que ambos
   aparecem como conectados.
3. Na pasta do projeto, inicie a agenda:

```bash
npm run remote:start
```

O comando cria o build, salva uma cópia do SQLite em `backups/`, configura o proxy HTTPS
privado e mostra a URL `https://<nome-do-pc>.<tailnet>.ts.net`. O processo deve continuar
aberto. `Ctrl+C` para o servidor da agenda; para também remover a publicação configurada:

```bash
npm run remote:stop
```

> [!WARNING]
> Não use `tailscale funnel`: ele deixaria a aplicação disponível na internet inteira, e
> esta agenda não possui tela de login própria. Use somente `tailscale serve`.

#### Iniciar automaticamente no Linux

Depois de instalar, conectar e testar o Tailscale, é possível criar um serviço do usuário:

```bash
npm run remote:install-service
```

O serviço `agenda-cavaleiro.service` gera o build, faz backup e inicia a agenda na entrada
do usuário. Comandos úteis:

```bash
systemctl --user status agenda-cavaleiro
systemctl --user restart agenda-cavaleiro
systemctl --user disable --now agenda-cavaleiro
```

O Express escuta apenas em `127.0.0.1` por padrão. Assim, no modo de produção, a origem não
fica exposta diretamente à rede local; o acesso remoto passa pelo Tailscale Serve.

### Assistente Hermes

A seção **Assistente** conversa com o Hermes local através do Express. O navegador nunca
recebe a chave privada e a porta `8642` não é publicada pelo Tailscale. Antes de ativar,
confirme o isolamento da API do Hermes:

```bash
hermes config set platform_toolsets.api_server '["no_mcp"]'
hermes config get platform_toolsets.api_server --json
```

O serviço da agenda reutiliza a configuração privada existente em
`~/agenda-namorada/server/.env`, que deve conter `HERMES_API_BASE_URL`,
`HERMES_API_SERVER_KEY`, `HERMES_NO_MCP_CONFIRMED=true`, `HERMES_SESSION_ID` e
`HERMES_TIMEOUT_MS`. Cada conversa gera apenas uma proposta temporária no servidor;
criar, editar ou excluir exige o botão **Confirmar ação**. A agenda continua funcionando
normalmente quando o Hermes estiver offline.

---

## 4. Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Checagem de tipos (`tsc -b`) + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção |
| `npm run backup` | Cria uma cópia datada do SQLite em `backups/` |
| `npm run remote:start` | Prepara e inicia a agenda com acesso privado pelo Tailscale |
| `npm run remote:stop` | Remove a configuração do Tailscale Serve |
| `npm run remote:install-service` | Instala a inicialização automática no systemd do usuário |
| `npm run lint` | ESLint em todo o projeto |
| `npm run lint:fix` | ESLint aplicando correções automáticas |
| `npm test` | Executa a suíte de testes uma vez |
| `npm run test:watch` | Testes em modo observador |
| `npm run test:coverage` | Testes com relatório de cobertura (`coverage/`) |

---

## 5. API local

| Método e rota | O que faz |
|---|---|
| `GET /api/health` | Sinal de vida do servidor |
| `GET /api/appointments` | Lista os compromissos ordenados por data e horário |
| `POST /api/appointments` | Cria um compromisso — sempre pendente |
| `PUT /api/appointments/:id` | Edita os campos do compromisso, preservando a conclusão |
| `PATCH /api/appointments/:id/completion` | Define a conclusão (`{ "completed": true \| false }`) |
| `DELETE /api/appointments/:id` | Exclui um compromisso |
| `DELETE /api/appointments` | Limpa a agenda |
| `GET /api/collection/topics` | Lista os tópicos da coleção com a contagem de itens |
| `GET`/`POST /api/collection/topics/:id/items` | Lê e cria itens de um tópico |
| `DELETE /api/collection/items/:id` | Apaga um item |

A rota de conclusão recebe o **estado desejado** em vez de alternar, o que a torna
idempotente: reenviar o mesmo valor devolve o mesmo resultado, sem corrida entre cliques.

O esquema é versionado em `schema_migrations` e as migrações são **aditivas** — a coluna
`completed` entrou por `ALTER TABLE ... ADD COLUMN`, sem reescrever nenhuma linha, e bancos
já existentes continuam com todos os compromissos, valendo como não concluídos.

---

## 6. Estrutura

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
│   ├── api.ts               # cliente HTTP do banco de dados
│   ├── storage.ts           # compatibilidade e isolamento dos testes antigos
│   └── validation.ts        # regras de validação do formulário
├── components/              # MonthCalendar, DayAgenda, AppointmentDialog, Modal, …
└── test/setup.ts            # setup do Vitest (jest-dom, limpeza do localStorage)

server/
├── index.mjs                # sobe o servidor HTTP
├── app.mjs                  # rotas da API (agenda e coleção)
├── database.mjs             # abre data/agenda.sqlite e aplica o esquema
└── schema.mjs               # tabelas, migrações e serialização das linhas
```

Duas decisões que valem o registro:

- **Datas sempre em horário local.** Todo o app usa strings `AAAA-MM-DD` e as converte com
  helpers próprios. `new Date('2026-03-09')` seria interpretado como UTC e cairia no dia
  anterior em fusos negativos — como o do Brasil.
- **Leitura defensiva do storage.** Registro corrompido ou incompleto é descartado na
  carga, e categoria desconhecida vira `Outros`. Dado ruim no navegador do usuário nunca
  derruba a aplicação.

---

## 7. Testes

```bash
npm test
```

A suíte cobre as funções puras (datas, validação, busca/ordenação, storage), o hook de
estado com persistência e os fluxos de ponta a ponta na aplicação renderizada: primeira
carga com exemplos, criação, edição, exclusão com confirmação, busca, filtros por
categoria, navegação de mês, botão Hoje, navegação por teclado no calendário, conclusão e
reabertura de compromissos, fechamento de diálogo por `Esc` e permanência dos dados após
recarregar.

Os testes do servidor (`server/*.test.mjs`) rodam em Node com um banco temporário por teste
— o `data/agenda.sqlite` do usuário nunca é tocado. Eles cobrem a API de conclusão e a
migração aplicada sobre o esquema antigo, verificando que nada se perde no caminho.

---

## 8. Privacidade e limites conhecidos

- A interface acessa a API local em `/api`; não há serviço externo.
- Os dados vivem em `data/agenda.sqlite` e são compartilhados por todos os navegadores que
  acessarem esta instalação da agenda.
- Não há sincronização, múltiplos usuários, compromissos recorrentes, notificações,
  fuso horário por evento nem exportação — fora do escopo desta versão.
