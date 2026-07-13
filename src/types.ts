/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Usuario {
  id: string;
  nome: string;
  usuario: string;
  perfil: 'tecnico' | 'supervisor' | 'administrador';
  revendaId: string;
}

export interface Cliente {
  id: string;
  nome: string;
  documento: string; // CPF or CNPJ
  fazenda: string;
  cidade: string;
  estado: string;
}

export interface Maquina {
  id: string;
  modelo: string;
  tipo: string; // Trator, Colheitadeira, Plantadeira, etc.
  numeroSerie: string;
  fabricante: string;
  miniaturaBase64?: string;
  checklistCustomizado?: { id: string; categoria: string; item: string }[];
}

export interface Revenda {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
}

export interface ItemChecklist {
  id: string;
  categoria: string;
  item: string;
  conforme: 'conforme' | 'nao_conforme' | null;
  observacao: string;
  fotoBase64?: string;
  videoBase64?: string; // opcional
}

export interface FotosGerais {
  maquinaCompleta?: string;
  numeroSerie?: string;
  clienteRecebendo?: string;
  entregaRealizada?: string;
}

export interface Localizacao {
  latitude: number | null;
  longitude: number | null;
  precisao?: number | null;
  dataHora: string;
}

export interface Assinaturas {
  tecnico?: string; // base64 canvas signature
  cliente?: string; // base64 canvas signature
}

export interface EntregaTecnica {
  id: string;
  cliente: Cliente;
  maquina: Maquina;
  revenda: Revenda;
  tecnico: {
    id: string;
    nome: string;
  };
  data: string; // YYYY-MM-DD
  status: 'rascunho' | 'sincronizado' | 'pendente_sincronizacao';
  checklist: ItemChecklist[];
  fotosGerais: FotosGerais;
  assinaturas: Assinaturas;
  localizacao: Localizacao;
  tempoExecucaoSegundos: number;
  dataCriacao: string;
  dataFinalizacao?: string;
  qrCodeUrl?: string; // Para validação
  observacoesGerais: string;
}

export interface KPIStats {
  totalEntregas: number;
  entregasPorTecnico: { [nome: string]: number };
  entregasPorRevenda: { [nome: string]: number };
  entregasPorEstado: { [estado: string]: number };
  pendenciasAtivas: number;
  maquinasEntregues: number;
  entregasPorModelo: { [modelo: string]: number };
}

