/** Identificador de categoria. Categorias são fixas para manter o app simples e offline. */
export type CategoryId = 'trabalho' | 'pessoal' | 'saude' | 'estudos' | 'social' | 'outros';

export interface Category {
  id: CategoryId;
  label: string;
  /** Cor base da categoria (hex), usada em pontos, bordas e etiquetas. */
  color: string;
}

export interface Appointment {
  id: string;
  title: string;
  description: string;
  /** Data no formato ISO curto `AAAA-MM-DD`. */
  date: string;
  /** Horário inicial no formato `HH:MM` (24h). */
  startTime: string;
  /** Horário final no formato `HH:MM` (24h). */
  endTime: string;
  categoryId: CategoryId;
  /** Marcado quando o compromisso já foi cumprido. */
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Dados que o formulário produz — o restante é gerado pela camada de persistência. */
export type AppointmentDraft = Pick<
  Appointment,
  'title' | 'description' | 'date' | 'startTime' | 'endTime' | 'categoryId'
>;

export type AppointmentFormErrors = Partial<Record<keyof AppointmentDraft, string>>;
