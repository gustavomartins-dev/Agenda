import { type FormEvent, useEffect, useState } from 'react';

import { assistantApi } from '../lib/api';
import { getCategory } from '../lib/categories';
import type { AssistantProposal } from '../types';
import { BatIcon } from './Icons';

interface AssistantPanelProps {
  onChanged: () => Promise<void>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const CHAT_STORAGE_KEY = 'agenda-cavaleiro:hermes-history';
const WELCOME_MESSAGE: ChatMessage = { id: 'welcome', role: 'assistant', text: 'Central online. Posso consultar sua agenda e preparar novos compromissos para sua confirmação.' };

function loadMessages(): ChatMessage[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [WELCOME_MESSAGE];
    const valid = parsed.filter((item): item is ChatMessage => item && typeof item.id === 'string' && (item.role === 'user' || item.role === 'assistant') && typeof item.text === 'string').slice(-50);
    return valid.length ? valid : [WELCOME_MESSAGE];
  } catch {
    return [WELCOME_MESSAGE];
  }
}

function proposalTitle(proposal: Exclude<AssistantProposal, { type: 'none' }>) {
  if (proposal.type === 'delete') return 'Excluir compromisso';
  if (proposal.type === 'update') return 'Editar compromisso';
  return 'Criar compromisso';
}

export function AssistantPanel({ onChanged }: AssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState('');
  const [proposal, setProposal] = useState<AssistantProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  }, [messages]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput('');
    setError('');
    setProposal(null);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: message }]);
    setBusy(true);
    try {
      const response = await assistantApi.chat(message);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: response.proposal.assistantMessage }]);
      if (response.proposal.type !== 'none') setProposal(response.proposal);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'O assistente está indisponível.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!proposal || proposal.type === 'none' || busy) return;
    setBusy(true);
    setError('');
    try {
      await assistantApi.confirm(proposal.proposalId);
      await onChanged();
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'Ação confirmada e arquivo da agenda atualizado.' }]);
      setProposal(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível confirmar a ação.');
    } finally {
      setBusy(false);
    }
  }

  const proposalDraft = proposal && proposal.type !== 'none' && proposal.type !== 'delete' ? proposal.draft : null;
  const proposalAppointment = proposal && proposal.type !== 'none' && proposal.type !== 'create' ? proposal.appointment : null;

  return (
    <main className="assistant-page" id="conteudo">
      <section className="assistant-hero">
        <span className="assistant-hero__mark" aria-hidden="true"><BatIcon /></span>
        <div><p className="assistant-hero__eyebrow">Batcomputador · canal privado</p><h2>Assistente Hermes</h2><p>Ele prepara ações. Você mantém o controle e confirma cada mudança.</p></div>
        <span className="assistant-status"><i /> Online local</span>
      </section>

      <section className="assistant-console card" aria-label="Conversa com o assistente">
        <div className="assistant-messages" aria-live="polite">
          {messages.map((message) => <div key={message.id} className={`assistant-message assistant-message--${message.role}`}><span>{message.role === 'assistant' ? 'Hermes' : 'Você'}</span><p>{message.text}</p></div>)}
          {busy ? <div className="assistant-message assistant-message--assistant"><span>Hermes</span><p>Processando na Batcaverna…</p></div> : null}
        </div>

        {proposal && proposal.type !== 'none' ? <aside className="assistant-proposal" aria-label="Ação proposta">
          <div><p className="assistant-proposal__eyebrow">Aguardando sua autorização</p><h3>{proposalTitle(proposal)}</h3></div>
          <dl>
            <div><dt>Título</dt><dd>{proposalDraft?.title ?? proposalAppointment?.title}</dd></div>
            {(proposalDraft ?? proposalAppointment) ? <><div><dt>Data</dt><dd>{proposalDraft?.date ?? proposalAppointment?.date}</dd></div><div><dt>Horário</dt><dd>{proposalDraft?.startTime ?? proposalAppointment?.startTime} – {proposalDraft?.endTime ?? proposalAppointment?.endTime}</dd></div></> : null}
            {proposalDraft ? <div><dt>Categoria</dt><dd>{getCategory(proposalDraft.categoryId).label}</dd></div> : null}
          </dl>
          <div className="assistant-proposal__actions"><button type="button" className="button button--ghost" onClick={() => setProposal(null)} disabled={busy}>Cancelar</button><button type="button" className={proposal.type === 'delete' ? 'button button--danger' : 'button button--primary'} onClick={confirm} disabled={busy}>Confirmar ação</button></div>
        </aside> : null}

        {error ? <p className="assistant-error" role="alert">{error} A agenda continua disponível normalmente.</p> : null}

        <form className="assistant-composer" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="assistant-input">Mensagem para o Hermes</label>
          <textarea id="assistant-input" className="input input--textarea" value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} placeholder="Ex.: marque dentista amanhã às 14h" disabled={busy} />
          <button className="button button--primary" type="submit" disabled={!input.trim() || busy}>Enviar</button>
        </form>
      </section>
    </main>
  );
}
