import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { collectionApi, type CollectionItem, type CollectionTopic } from '../lib/collectionApi';
import { PlusIcon, SearchIcon, TrashIcon } from './Icons';

export function CollectionPanel() {
  const [topics, setTopics] = useState<CollectionTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<CollectionTopic | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    collectionApi.topics().then(setTopics).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Erro ao carregar os tópicos.')).finally(() => setLoading(false));
  }, []);

  async function openTopic(topic: CollectionTopic) {
    setSelectedTopic(topic);
    setLoading(true);
    setError('');
    try { setItems(await collectionApi.items(topic.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao carregar os itens.'); }
    finally { setLoading(false); }
  }

  async function addItem(event: FormEvent) {
    event.preventDefault();
    if (!selectedTopic || !title.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const item = await collectionApi.addItem(selectedTopic.id, title);
      setItems((current) => [item, ...current]);
      setTopics((current) => current.map((topic) => topic.id === selectedTopic.id ? { ...topic, itemCount: topic.itemCount + 1 } : topic));
      setSelectedTopic((current) => current ? { ...current, itemCount: current.itemCount + 1 } : current);
      setTitle('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao salvar o item.'); }
    finally { setSaving(false); }
  }

  async function removeItem(item: CollectionItem) {
    if (!selectedTopic) return;
    try {
      await collectionApi.removeItem(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setTopics((current) => current.map((topic) => topic.id === selectedTopic.id ? { ...topic, itemCount: Math.max(0, topic.itemCount - 1) } : topic));
      setSelectedTopic((current) => current ? { ...current, itemCount: Math.max(0, current.itemCount - 1) } : current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao apagar o item.'); }
  }

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return normalized ? items.filter((item) => item.title.toLocaleLowerCase('pt-BR').includes(normalized)) : items;
  }, [items, query]);

  if (!selectedTopic) {
    return (
      <main className="collection" id="conteudo">
        <div className="collection__heading">
          <div><h2>Minha coleção</h2><p>Escolha um tópico para ver tudo que você guardou.</p></div>
        </div>
        {error ? <p className="collection__error" role="alert">{error}</p> : null}
        {loading ? <p className="collection__empty">Carregando tópicos…</p> : (
          <div className="topic-grid">
            {topics.map((topic) => (
              <button className="topic-card" key={topic.id} type="button" onClick={() => void openTopic(topic)}>
                <span className="topic-card__icon" aria-hidden="true">{topic.icon}</span>
                <span className="topic-card__name">{topic.name}</span>
                <span className="topic-card__count">{topic.itemCount} {topic.itemCount === 1 ? 'item' : 'itens'}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="collection" id="conteudo">
      <div className="collection__heading collection__heading--detail">
        <button className="button button--ghost button--sm" type="button" onClick={() => { setSelectedTopic(null); setQuery(''); }}>← Tópicos</button>
        <div><h2><span aria-hidden="true">{selectedTopic.icon}</span> {selectedTopic.name}</h2><p>{selectedTopic.itemCount} {selectedTopic.itemCount === 1 ? 'item salvo' : 'itens salvos'}</p></div>
      </div>

      <form className="collection-form card" onSubmit={(event) => void addItem(event)}>
        <label htmlFor="collection-title">Adicionar em {selectedTopic.name}</label>
        <div className="collection-form__row">
          <input id="collection-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="Digite o nome…" autoComplete="off" />
          <button className="button button--primary" type="submit" disabled={!title.trim() || saving}><PlusIcon />{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>

      {items.length > 0 ? <div className="collection-search"><SearchIcon /><input className="input input--search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar em ${selectedTopic.name.toLocaleLowerCase('pt-BR')}…`} aria-label={`Buscar em ${selectedTopic.name}`} /></div> : null}
      {error ? <p className="collection__error" role="alert">{error}</p> : null}
      {loading ? <p className="collection__empty">Carregando…</p> : visibleItems.length === 0 ? <p className="collection__empty">{query ? 'Nenhum item encontrado.' : `Nada salvo em ${selectedTopic.name} ainda.`}</p> : (
        <div className="collection-list">
          {visibleItems.map((item) => <article className="collection-item card" key={item.id}><span>{item.title}</span><button className="icon-button icon-button--danger" type="button" onClick={() => void removeItem(item)} aria-label={`Apagar ${item.title}`} title="Apagar"><TrashIcon /></button></article>)}
        </div>
      )}
    </main>
  );
}
