export type UserRole = 'admin' | 'gestor';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  equipe_ids?: string[];
}

export interface Cliente {
  id: string;
  nome: string;
  id_whatsapp: string;
  escalation: string;
  responsavel_interno_id: string | null;
  ativo: boolean;
}

export interface Equipe {
  id: string;
  nome: string;
  cliente_id?: string | null;
  ativo: boolean;
}

export interface Cargo {
  id: string;
  nome: string;
  equipe_id: string;
  ativo: boolean;
}

export type ModeloTrabalho = 'presencial' | 'hibrido' | 'remoto';
export type TipoContrato = 'clt' | 'pj' | 'estagio' | 'temporario';

export interface Colaborador {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  equipe_id: string | null;
  cargo_id?: string | null;
  data_admissao?: string | null;
  tipo_contrato: TipoContrato;
  modelo_trabalho: ModeloTrabalho;
  ativo: boolean;
}

export interface Gestor {
  id: string;
  nome: string;
  email: string;
  equipe_ids: string[];
}

export type TipoEscala = '12x36' | '5x2' | 'personalizada';
export type TipoRotacao = 'semanal' | 'quinzenal' | 'fim_semana';
export type OrigemEscala = 'manual' | 'automatico';
export type TipoPlantao = 'plantao' | 'trabalho';

export interface Turno {
  id: string;
  nome: string;
  descricao: string;
}

export interface Escala {
  id: string;
  nome: string;
  tipo: TipoEscala;
  descricao: string;
}

export interface EscalaColaborador {
  id: string;
  colaborador_id: string;
  escala_id: string;
  data_inicio: string;
  data_fim: string;
}

export interface EscalaDetalhe {
  id: string;
  escala_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  turno_id?: string | null;
  quantidade_pessoas?: number;
}

export interface EscalaRotacao {
  id: string;
  escala_id: string;
  turno_id?: string | null;
  tipo_rotacao: TipoRotacao;
  data_referencia: string;
  ativo: boolean;
}

export interface EscalaRotacaoMembro {
  id: string;
  rotacao_id: string;
  colaborador_id: string;
  ordem: number;
}

export interface EscalaOverride {
  id: string;
  data: string;
  colaborador_id: string;
  equipe_id?: string | null;
  turno_id?: string | null;
  hora_inicio: string;
  hora_fim: string;
  tipo: TipoPlantao;
  origem: OrigemEscala;
  observacao?: string;
}

export interface Plantao {
  id: string;
  colaborador_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  tipo: string;
  origem?: OrigemEscala;
  turno_id?: string | null;
  escala_id?: string | null;
  equipe_id?: string | null;
  observacao?: string;
}

export type StatusFerias = 'aprovado' | 'pendente' | 'rejeitado';

export interface Ferias {
  id: string;
  colaborador_id: string;
  data_inicio: string;
  data_fim: string;
  status: StatusFerias;
}

export interface BootstrapData {
  clientes: Cliente[];
  equipes: Equipe[];
  cargos: Cargo[];
  turnos: Turno[];
  colaboradores: Colaborador[];
  gestores: Gestor[];
  escalas: Escala[];
  escalaDetalhes: EscalaDetalhe[];
  escalaColaboradores: EscalaColaborador[];
  escalaRotacoes: EscalaRotacao[];
  escalaRotacaoMembros: EscalaRotacaoMembro[];
  escalaOverrides: EscalaOverride[];
  ferias: Ferias[];
}
