/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cliente, Maquina, Revenda, Usuario, EntregaTecnica, ItemChecklist, KPIStats } from '../types';
import { compressEntrega } from './compression';
import { salvarEntregaCompartilhada } from './firebase';

/// Checklist padrão
export const CHECKLIST_PADRAO: Omit<ItemChecklist, 'conforme' | 'observacao'>[] = [
  // Recebimento (2 items)
  { id: 'rec_1', categoria: 'Recebimento', item: 'Conferência da nota fiscal e número de série do chassi com a plaqueta física do equipamento.' },
  { id: 'rec_2', categoria: 'Recebimento', item: 'Verificação de avarias de transporte (amassados, arranhões na pintura, amassamentos estruturais).' },

  // PREPARAÇÃO DA MÁQUINA (10 items)
  { id: 'prep_1', categoria: 'PREPARAÇÃO DA MÁQUINA', item: 'Alinhamento das polias do acionamento principal do rotor de corte.' },
  { id: 'prep_2', categoria: 'PREPARAÇÃO DA MÁQUINA', item: 'Verificação e ajuste do tensionamento da correia principal de transmissão del rotor.' },
  { id: 'prep_3', categoria: 'PREPARAÇÃO DA MÁQUINA', item: 'Inspeção do estado visual das correias de transmissão (ausência de desfiados ou trincas).' },
  { id: 'prep_4', categoria: 'PREPARAÇÃO DA MÁQUINA', item: 'Regulagem e esticamento correto das correntes de acionamento dos rolos de alimentação.' },
  { id: 'prep_5', categoria: 'PREPARAÇÃO DA MÁQUINA', item: 'Verificação do encaixe e travamento seguro de todas as chavetas e anéis elásticos nos eixos.' },
  { id: 'prep_6', categoria: 'PREPARAÇÃO DA MÁQUINA', item: 'Ajuste da folga e contato ideal entre os pinhões metálicos das engrenagens.' },
  { id: 'prep_7', categoria: 'PREPARAÇÃO DA MÁQUINA', item: 'Inspeção do estado de desgaste e garras dos dentes dos rolos alimentadores dianteiros.' },
  { id: 'prep_8', categoria: 'PREPARAÇÃO DA MÁQUINA', item: 'Ajuste correto da pressão de compressão das molas tensoras dos rolos oscilantes superiores.' },
  { id: 'prep_9', categoria: 'PREPARAÇÃO DA MÁQUINA', item: 'Verificação do espaçamento mínimo e livre curso dos braços oscilantes dos rolos.' },
  { id: 'prep_10', categoria: 'PREPARAÇÃO DA MÁQUINA', item: 'Inspeção e verificação do estado dos pinos fusíveis (pinos de segurança de quebra rápida).' },

  // ACOPLAMENTO DA MÁQUINA AO TRATOR (4 items)
  { id: 'acop_1', categoria: 'ACOPLAMENTO DA MÁQUINA AO TRATOR', item: 'Acoplamento e travamento correto do cabeçalho de engate da máquina à barra de tração do trator.' },
  { id: 'acop_2', categoria: 'ACOPLAMENTO DA MÁQUINA AO TRATOR', item: 'Acoplamento e lubrificação do eixo cardan de transmissão de potência (TDP) com pino de segurança.' },
  { id: 'acop_3', categoria: 'ACOPLAMENTO DA MÁQUINA AO TRATOR', item: 'Verificação do comprimento do eixo cardan e folga de segurança em curvas de trabalho.' },
  { id: 'acop_4', categoria: 'ACOPLAMENTO DA MÁQUINA AO TRATOR', item: 'Conexão e fixação correta do cabo de aço de controle ou mangueiras hidráulicas de comando.' },

  // MANUTENÇÃO (11 items)
  { id: 'man_1', categoria: 'MANUTENÇÃO', item: 'Verificação do estado das facas de corte do rotor (ausência de dentes quebrados ou trincas).' },
  { id: 'man_2', categoria: 'MANUTENÇÃO', item: 'Verificação do torque de aperto e fixação segura de todos os parafusos das facas.' },
  { id: 'man_3', categoria: 'MANUTENÇÃO', item: 'Ajuste milimétrico de folga regulamentar entre as facas do rotor e a contra-faca.' },
  { id: 'man_4', categoria: 'MANUTENÇÃO', item: 'Inspeção visual do gume de corte da contra-faca (necessidade de inversão ou substituição).' },
  { id: 'man_5', categoria: 'MANUTENÇÃO', item: 'Verificação de folgas axiais ou radiais nos mancais principais do rotor de corte.' },
  { id: 'man_6', categoria: 'MANUTENÇÃO', item: 'Inspeção do rebolo do afiador de facas integrado (estado físico da pedra de afiação).' },
  { id: 'man_7', categoria: 'MANUTENÇÃO', item: 'Ajuste da guia e curso completo de translação do afiador de facas sobre o rotor.' },
  { id: 'man_8', categoria: 'MANUTENÇÃO', item: 'Verificação do balanceamento geral do rotor girando-o manualmente (suavidade e rotação livre).' },
  { id: 'man_9', categoria: 'MANUTENÇÃO', item: 'Verificação mecânica do cabo de aço e engrenagens de giro de 360 graus da bica de descarga.' },
  { id: 'man_10', categoria: 'MANUTENÇÃO', item: 'Ajuste e funcionamento suave do mecanismo de insignação vertical da bica de descarga (quebra-jato).' },
  { id: 'man_11', categoria: 'MANUTENÇÃO', item: 'Fixação correta e integridade do defletor de ponta da bica de descarga.' },

  // LUBRIFICAÇÃO COM GRAXA (3 items)
  { id: 'graxa_1', categoria: 'LUBRIFICAÇÃO COM GRAXA', item: 'Lubrificação completa com graxa recomendada em todos os pinos graxeiros da máquina (cruzetas, eixos).' },
  { id: 'graxa_2', categoria: 'LUBRIFICAÇÃO COM GRAXA', item: 'Lubrificação da coroa e pinhão de giro da bica de descarga (engrenagem de rotação).' },
  { id: 'graxa_3', categoria: 'LUBRIFICAÇÃO COM GRAXA', item: 'Aplicação de graxa de alta temperatura nos mancais e rolamentos do rotor principal.' },

  // Lubrificação com óleo (4 items)
  { id: 'oleo_1', categoria: 'Lubrificação com óleo', item: 'Verificação do nível e viscosidade do óleo da caixa de transmissão principal.' },
  { id: 'oleo_2', categoria: 'Lubrificação com óleo', item: 'Verificação do nível de óleo e vedação das caixas satélites e redutoras de engrenagem.' },
  { id: 'oleo_3', categoria: 'Lubrificação com óleo', item: 'Inspeção de possíveis vazamentos ou gotejamentos de óleo sob todas as caixas redutoras.' },
  { id: 'oleo_4', categoria: 'Lubrificação com óleo', item: 'Verificação da lubrificação das correntes de acionamento mecânico dos rolos.' },

  // Periodicidade para as Trocas de óleo - Caixas de Transmissão (2 items)
  { id: 'troca_1', categoria: 'Periodicidade para as Trocas de óleo - Caixas de Transmissão', item: 'Orientação ao cliente sobre a primeira troca de óleo das caixas de transmissão após as primeiras 50 horas de trabalho.' },
  { id: 'troca_2', categoria: 'Periodicidade para as Trocas de óleo - Caixas de Transmissão', item: 'Orientação sobre a periodicidade regular de trocas de óleo das caixas a cada 300 horas ou anualmente.' },

  // CONSERVAÇÃO E LIMPEZA (3 items)
  { id: 'cons_1', categoria: 'CONSERVAÇÃO E LIMPEZA', item: 'Verificação de trincas ou defeitos visuais de solda nas junções estruturais do chassi e engates.' },
  { id: 'cons_2', categoria: 'CONSERVAÇÃO E LIMPEZA', item: 'Verificação da integridade de todas as proteções laterais metálicas e coberturas de fibra/plástico.' },
  { id: 'cons_3', categoria: 'CONSERVAÇÃO E LIMPEZA', item: 'Inspeção de pontos de oxidação ou corrosão precoce e estado geral da pintura protetiva.' },

  // REVISÃO ANUAL (2 items)
  { id: 'rev_1', categoria: 'REVISÃO ANUAL', item: 'Inspeção do bocal de descarga (bica de saída) e chapas internas antidesgaste (liner protetor).' },
  { id: 'rev_2', categoria: 'REVISÃO ANUAL', item: 'Verificação do quebra-jato da bica e curso livre do cabo de controle de descarga.' },

  // PREENCHIMENTO DO TERMO DE RECEBIMENTO (2 items)
  { id: 'termo_1', categoria: 'PREENCHIMENTO DO TERMO DE RECEBIMENTO', item: 'Verificação e contagem de itens sobressalentes e caixa de ferramentas de acompanhamento de fábrica.' },
  { id: 'termo_2', categoria: 'PREENCHIMENTO DO TERMO DE RECEBIMENTO', item: 'Verificação da presença dos manuais de operação físicos e guia de garantia de fábrica.' }
];

// Dados iniciais padrões para seleção rápida
export const CLIENTES_PADRAO: Cliente[] = [
  { id: 'c1', nome: 'Fazendas Reunidas Agropastoril', documento: '12.345.678/0001-90', fazenda: 'Fazenda Rio Grande', cidade: 'Sorriso', estado: 'MT' },
  { id: 'c2', nome: 'João da Silva Santos', documento: '123.456.789-00', fazenda: 'Fazenda Ouro Verde', cidade: 'Rio Verde', estado: 'GO' },
  { id: 'c3', nome: 'Agropecuária Terra Nova S/A', documento: '98.765.432/0001-10', fazenda: 'Fazenda Bela Vista', cidade: 'Luís Eduardo Magalhães', estado: 'BA' },
  { id: 'c4', nome: 'Marcos Roberto Pizzolo', documento: '456.789.012-33', fazenda: 'Sítio Sol Nascente', cidade: 'Cascavel', estado: 'PR' },
  { id: 'c5', nome: 'Juliana Mendes Moreira', documento: '789.012.345-44', fazenda: 'Fazenda Santa Maria', cidade: 'Passo Fundo', estado: 'RS' }
];

export const MAQUINAS_PADRAO: Maquina[] = [
  { id: 'm1', modelo: 'Colhedora JF C120 AT', tipo: 'Colhedora', numeroSerie: 'JF120AT0001', fabricante: 'JF Máquinas' }
];

export const REVENDAS_PADRAO: Revenda[] = [
  { id: 'r1', nome: 'AgroSul Máquinas e Equipamentos', cidade: 'Sorriso', estado: 'MT' },
  { id: 'r2', nome: 'Ouro Verde Concessionária', cidade: 'Rio Verde', estado: 'GO' },
  { id: 'r3', nome: 'Terra Viva Agrícola', cidade: 'Luís Eduardo Magalhães', estado: 'BA' },
  { id: 'r4', nome: 'Paraná Agro Tratores', cidade: 'Cascavel', estado: 'PR' },
  { id: 'r5', nome: 'Sul Campo Equipamentos', cidade: 'Passo Fundo', estado: 'RS' }
];

export const TECNICOS_PADRAO: Usuario[] = [
  { id: 'u1', nome: 'Carlos Eduardo Oliveira', usuario: 'carlos.oliveira', perfil: 'tecnico', revendaId: 'r1' },
  { id: 'u2', nome: 'Rodrigo Medeiros Souza', usuario: 'rodrigo.tecnico', perfil: 'tecnico', revendaId: 'r2' },
  { id: 'u3', nome: 'André Ramos Silva', usuario: 'andre.supervisor', perfil: 'supervisor', revendaId: 'r3' },
  { id: 'u4', nome: 'Marcos Vinicius Borges', usuario: 'marcos.borges', perfil: 'tecnico', revendaId: 'r4' },
  { id: 'u5', nome: 'Carlos Silva Administrador', usuario: 'carlos.silva@industriasnb.com.br', perfil: 'administrador', revendaId: 'r1' },
  { id: 'u_revjf', nome: 'Técnico Autorizado RevJF', usuario: 'revjf', perfil: 'tecnico', revendaId: 'r1' }
];

// Placeholder SVG base64 para assinaturas e fotos reais
const MOCK_SIGNATURE_TECH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80"><path d="M 10 40 Q 50 10, 80 50 T 150 20 T 190 60" fill="none" stroke="%23475569" stroke-width="2"/></svg>';
const MOCK_SIGNATURE_CLIENT = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80"><path d="M 20 50 Q 70 20, 100 40 T 160 30 T 180 50" fill="none" stroke="black" stroke-width="2"/></svg>';

const MOCK_PHOTO_MACHINE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%232b5329"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="20">MÁQUINA ENTREGUE (FOTO)</text></svg>';
const MOCK_PHOTO_SERIAL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23334155"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="20">PLAQUETA Nº DE SÉRIE</text></svg>';

// Histórico inicial de entregas
const MOCK_ENTREGAS_INICIAIS: EntregaTecnica[] = [
  {
    id: 'ET-2026-0001',
    cliente: CLIENTES_PADRAO[0],
    maquina: { id: 'm1', modelo: 'Colhedora JF C120 AT', tipo: 'Colhedora', numeroSerie: 'JF120AT0001', fabricante: 'JF Máquinas' },
    revenda: REVENDAS_PADRAO[0],
    tecnico: { id: 'u1', nome: 'Carlos Eduardo Oliveira' },
    data: '2026-06-15',
    status: 'sincronizado',
    checklist: CHECKLIST_PADRAO.map(item => ({
      ...item,
      conforme: 'conforme',
      observacao: ''
    })),
    fotosGerais: {
      maquinaCompleta: MOCK_PHOTO_MACHINE,
      numeroSerie: MOCK_PHOTO_SERIAL,
      clienteRecebendo: MOCK_PHOTO_MACHINE,
      entregaRealizada: MOCK_PHOTO_MACHINE
    },
    assinaturas: {
      tecnico: MOCK_SIGNATURE_TECH,
      cliente: MOCK_SIGNATURE_CLIENT
    },
    localizacao: {
      latitude: -12.5441,
      longitude: -55.7231,
      precisao: 12,
      dataHora: '2026-06-15T10:32:00-03:00'
    },
    tempoExecucaoSegundos: 1420,
    dataCriacao: '2026-06-15T09:45:00-03:00',
    dataFinalizacao: '2026-06-15T10:35:00-03:00',
    qrCodeUrl: 'https://ais-dev-2o7o4k5o6sf7eq5agahryd-54279175677.us-west1.run.app/verify/ET-2026-0001',
    observacoesGerais: 'Entrega técnica finalizada com sucesso. Operador orientado sobre a limpeza periódica do radiador em períodos de colheita seca.'
  },
  {
    id: 'ET-2026-0002',
    cliente: CLIENTES_PADRAO[1],
    maquina: { id: 'm1-alt1', modelo: 'Colhedora JF C120 AT', tipo: 'Colhedora', numeroSerie: 'JF120AT0002', fabricante: 'JF Máquinas' },
    revenda: REVENDAS_PADRAO[1],
    tecnico: { id: 'u2', nome: 'Rodrigo Medeiros Souza' },
    data: '2026-06-20',
    status: 'sincronizado',
    checklist: CHECKLIST_PADRAO.map((item, idx) => {
      // Cria uma não conformidade proposital regulada para teste
      if (item.id === 'reg_1') {
        return {
          ...item,
          conforme: 'nao_conforme',
          observacao: 'As facas necessitaram de ajuste de folga e reaperto no torque nominal.',
          fotoBase64: MOCK_PHOTO_SERIAL
        };
      }
      return {
        ...item,
        conforme: 'conforme',
        observacao: ''
      };
    }),
    fotosGerais: {
      maquinaCompleta: MOCK_PHOTO_MACHINE,
      numeroSerie: MOCK_PHOTO_SERIAL,
      clienteRecebendo: MOCK_PHOTO_MACHINE,
      entregaRealizada: MOCK_PHOTO_MACHINE
    },
    assinaturas: {
      tecnico: MOCK_SIGNATURE_TECH,
      cliente: MOCK_SIGNATURE_CLIENT
    },
    localizacao: {
      latitude: -17.7831,
      longitude: -50.9234,
      precisao: 8,
      dataHora: '2026-06-20T14:15:10-03:00'
    },
    tempoExecucaoSegundos: 1850,
    dataCriacao: '2026-06-20T13:10:00-03:00',
    dataFinalizacao: '2026-06-20T14:20:00-03:00',
    qrCodeUrl: 'https://ais-dev-2o7o4k5o6sf7eq5agahryd-54279175677.us-west1.run.app/verify/ET-2026-0002',
    observacoesGerais: 'Ajustada não conformidade das facas na hora. Máquina em perfeito funcionamento após regulagem fina.'
  },
  {
    id: 'ET-2026-0003',
    cliente: CLIENTES_PADRAO[2],
    maquina: { id: 'm1-alt2', modelo: 'Colhedora JF C120 AT', tipo: 'Colhedora', numeroSerie: 'JF120AT0003', fabricante: 'JF Máquinas' },
    revenda: REVENDAS_PADRAO[2],
    tecnico: { id: 'u1', nome: 'Carlos Eduardo Oliveira' },
    data: '2026-06-22',
    status: 'sincronizado',
    checklist: CHECKLIST_PADRAO.map(item => ({
      ...item,
      conforme: 'conforme',
      observacao: ''
    })),
    fotosGerais: {
      maquinaCompleta: MOCK_PHOTO_MACHINE,
      numeroSerie: MOCK_PHOTO_SERIAL,
      clienteRecebendo: MOCK_PHOTO_MACHINE,
      entregaRealizada: MOCK_PHOTO_MACHINE
    },
    assinaturas: {
      tecnico: MOCK_SIGNATURE_TECH,
      cliente: MOCK_SIGNATURE_CLIENT
    },
    localizacao: {
      latitude: -12.1121,
      longitude: -45.7421,
      precisao: 15,
      dataHora: '2026-06-22T08:44:21-03:00'
    },
    tempoExecucaoSegundos: 1220,
    dataCriacao: '2026-06-22T08:00:00-03:00',
    dataFinalizacao: '2026-06-22T08:50:00-03:00',
    qrCodeUrl: 'https://ais-dev-2o7o4k5o6sf7eq5agahryd-54279175677.us-west1.run.app/verify/ET-2026-0003',
    observacoesGerais: 'Manual físico entregue, manual em PDF enviado via WhatsApp para o gerente da fazenda.'
  },
  {
    id: 'ET-2026-0004',
    cliente: CLIENTES_PADRAO[3],
    maquina: { id: 'm1-alt3', modelo: 'Colhedora JF C120 AT', tipo: 'Colhedora', numeroSerie: 'JF120AT0004', fabricante: 'JF Máquinas' },
    revenda: REVENDAS_PADRAO[3],
    tecnico: { id: 'u4', nome: 'Marcos Vinicius Borges' },
    data: '2026-06-25',
    status: 'pendente_sincronizacao', // Offline, salva localmente
    checklist: CHECKLIST_PADRAO.map(item => ({
      ...item,
      conforme: 'conforme',
      observacao: ''
    })),
    fotosGerais: {
      maquinaCompleta: MOCK_PHOTO_MACHINE,
      numeroSerie: MOCK_PHOTO_SERIAL,
      clienteRecebendo: MOCK_PHOTO_MACHINE,
      entregaRealizada: MOCK_PHOTO_MACHINE
    },
    assinaturas: {
      tecnico: MOCK_SIGNATURE_TECH,
      cliente: MOCK_SIGNATURE_CLIENT
    },
    localizacao: {
      latitude: -24.9555,
      longitude: -53.4552,
      precisao: 22,
      dataHora: '2026-06-25T11:20:00-03:00'
    },
    tempoExecucaoSegundos: 1600,
    dataCriacao: '2026-06-25T10:15:00-03:00',
    dataFinalizacao: '2026-06-25T11:25:00-03:00',
    qrCodeUrl: 'https://ais-dev-2o7o4k5o6sf7eq5agahryd-54279175677.us-west1.run.app/verify/ET-2026-0004',
    observacoesGerais: 'Entregue em área com baixa conectividade celular, rascunho de entrega armazenado localmente no dispositivo para sincronismo automático.'
  },
  {
    id: 'ET-2026-0005',
    cliente: CLIENTES_PADRAO[4],
    maquina: { id: 'm1-alt4', modelo: 'Colhedora JF C120 AT', tipo: 'Colhedora', numeroSerie: 'JF120AT0005', fabricante: 'JF Máquinas' },
    revenda: REVENDAS_PADRAO[4],
    tecnico: { id: 'u1', nome: 'Carlos Eduardo Oliveira' },
    data: '2026-06-28',
    status: 'sincronizado',
    checklist: CHECKLIST_PADRAO.map((item, idx) => {
      if (item.id === 'ele_2') {
        return {
          ...item,
          conforme: 'nao_conforme',
          observacao: 'Farol auxiliar traseiro esquerdo queimado. Efetuada a substituição da lâmpada halógena por nova antes do encerramento.',
          fotoBase64: MOCK_PHOTO_SERIAL
        };
      }
      return {
        ...item,
        conforme: 'conforme',
        observacao: ''
      };
    }),
    fotosGerais: {
      maquinaCompleta: MOCK_PHOTO_MACHINE,
      numeroSerie: MOCK_PHOTO_SERIAL,
      clienteRecebendo: MOCK_PHOTO_MACHINE,
      entregaRealizada: MOCK_PHOTO_MACHINE
    },
    assinaturas: {
      tecnico: MOCK_SIGNATURE_TECH,
      cliente: MOCK_SIGNATURE_CLIENT
    },
    localizacao: {
      latitude: -28.2612,
      longitude: -52.4083,
      precisao: 9,
      dataHora: '2026-06-28T16:30:11-03:00'
    },
    tempoExecucaoSegundos: 2100,
    dataCriacao: '2026-06-28T15:05:00-03:00',
    dataFinalizacao: '2026-06-28T16:40:00-03:00',
    qrCodeUrl: 'https://ais-dev-2o7o4k5o6sf7eq5agahryd-54279175677.us-west1.run.app/verify/ET-2026-0005',
    observacoesGerais: 'Farol trocado em campo e re-testado. Cliente treinado no painel principal.'
  }
];

export interface LogAuditoria {
  id: string;
  usuario: string;
  acao: string;
  detalhes: string;
  dataHora: string;
}

// Inicializa LocalStorage
export function inicializarBancoDeDados() {
  if (!localStorage.getItem('agro_clientes')) {
    localStorage.setItem('agro_clientes', JSON.stringify(CLIENTES_PADRAO));
  }
  if (!localStorage.getItem('agro_maquinas')) {
    localStorage.setItem('agro_maquinas', JSON.stringify(MAQUINAS_PADRAO));
  } else {
    try {
      const existing = localStorage.getItem('agro_maquinas');
      if (existing) {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          const hasOld = parsed.some((m: any) => 
            ['m2', 'm3', 'm4', 'm5'].includes(m.id) || 
            (m.modelo && (m.modelo.includes('John Deere') || m.modelo.includes('Case IH') || m.modelo.includes('Massey Ferguson') || m.modelo.includes('New Holland') || m.modelo.includes('Jacto')))
          );
          if (hasOld) {
            // Overwrite to keep only the new MAQUINAS_PADRAO and any genuine user custom ones
            const cleanCustom = parsed.filter((m: any) => 
              !['m1', 'm2', 'm3', 'm4', 'm5'].includes(m.id) && 
              !(m.modelo && (m.modelo.includes('John Deere') || m.modelo.includes('Case IH') || m.modelo.includes('Massey Ferguson') || m.modelo.includes('New Holland') || m.modelo.includes('Jacto')))
            );
            localStorage.setItem('agro_maquinas', JSON.stringify([...MAQUINAS_PADRAO, ...cleanCustom]));
          }
        }
      }
    } catch (err) {
      localStorage.setItem('agro_maquinas', JSON.stringify(MAQUINAS_PADRAO));
    }
  }
  if (!localStorage.getItem('agro_revendas')) {
    localStorage.setItem('agro_revendas', JSON.stringify(REVENDAS_PADRAO));
  }
  if (!localStorage.getItem('agro_tecnicos')) {
    localStorage.setItem('agro_tecnicos', JSON.stringify(TECNICOS_PADRAO));
  }
  if (!localStorage.getItem('agro_entregas')) {
    localStorage.setItem('agro_entregas', JSON.stringify(MOCK_ENTREGAS_INICIAIS));
  }
  const storedChk = localStorage.getItem('agro_checklist_padrao');
  if (!storedChk) {
    localStorage.setItem('agro_checklist_padrao', JSON.stringify(CHECKLIST_PADRAO));
  } else {
    try {
      const parsed = JSON.parse(storedChk);
      const hasOldCat = Array.isArray(parsed) && parsed.some((it: any) => 
        it.categoria === 'Recebimento e Inspeção Geral' || 
        it.categoria === 'Recebimento e Inspeção Ge' ||
        it.categoria.toLowerCase().includes('recebimento e inspe')
      );
      if (hasOldCat || (Array.isArray(parsed) && parsed.length !== 43)) {
        // Upgrade to 43 factory-default items with 10 correct categories automatically
        localStorage.setItem('agro_checklist_padrao', JSON.stringify(CHECKLIST_PADRAO));
        localStorage.setItem('agro_checklist_updated_at', String(Date.now()));
      }
    } catch (e) {}
  }
  if (!localStorage.getItem('agro_checklist_updated_at')) {
    localStorage.setItem('agro_checklist_updated_at', '1');
  }
  if (!localStorage.getItem('agro_maquinas_updated_at')) {
    localStorage.setItem('agro_maquinas_updated_at', '1');
  }
  if (!localStorage.getItem('agro_logs')) {
    const logs: LogAuditoria[] = [
      { id: 'l1', usuario: 'sistema', acao: 'Inicialização', detalhes: 'Banco de dados local semeado com dados históricos de entrega técnica.', dataHora: '2026-06-30T09:00:00-03:00' }
    ];
    localStorage.setItem('agro_logs', JSON.stringify(logs));
  }
}

// Getters básicos
export function fixGoogleDriveUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  
  // Se for o formato antigo lh3: https://lh3.googleusercontent.com/d/FILE_ID
  const matchLh = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (matchLh && matchLh[1]) {
    return `https://drive.google.com/uc?export=download&id=${matchLh[1]}`;
  }
  
  // Se for link direto de visualização/edição do drive ou outro link do drive
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    const matchD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) {
      return `https://drive.google.com/uc?export=download&id=${matchD[1]}`;
    }
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) {
      return `https://drive.google.com/uc?export=download&id=${matchId[1]}`;
    }
  }
  return url;
}

export function getClientes(): Cliente[] {
  inicializarBancoDeDados();
  return JSON.parse(localStorage.getItem('agro_clientes') || '[]');
}

export function getMaquinas(): Maquina[] {
  inicializarBancoDeDados();
  const list: Maquina[] = JSON.parse(localStorage.getItem('agro_maquinas') || '[]');
  return list.map(m => ({
    ...m,
    miniaturaBase64: fixGoogleDriveUrl(m.miniaturaBase64)
  }));
}

export function getRevendas(): Revenda[] {
  inicializarBancoDeDados();
  return JSON.parse(localStorage.getItem('agro_revendas') || '[]');
}

export function getTecnicos(): Usuario[] {
  inicializarBancoDeDados();
  const list: Usuario[] = JSON.parse(localStorage.getItem('agro_tecnicos') || '[]');
  const temCarlos = list.some(u => u.usuario.toLowerCase() === 'carlos.silva@industriasnb.com.br');
  const temRevjf = list.some(u => u.usuario.toLowerCase() === 'revjf');
  let mudou = false;
  if (!temCarlos) {
    list.push({ id: 'u_carlos_mestre', nome: 'Carlos Silva Administrador', usuario: 'carlos.silva@industriasnb.com.br', perfil: 'administrador', revendaId: 'r1' });
    mudou = true;
  }
  if (!temRevjf) {
    list.push({ id: 'u_revjf_user', nome: 'Técnico Autorizado RevJF', usuario: 'revjf', perfil: 'tecnico', revendaId: 'r1' });
    mudou = true;
  }
  if (mudou) {
    localStorage.setItem('agro_tecnicos', JSON.stringify(list));
  }
  return list;
}

export function getEntregas(): EntregaTecnica[] {
  inicializarBancoDeDados();
  try {
    const stored = localStorage.getItem('agro_entregas');
    if (stored) {
      const parsed: EntregaTecnica[] = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map(e => ({
          ...e,
          maquina: {
            ...e.maquina,
            miniaturaBase64: fixGoogleDriveUrl(e.maquina.miniaturaBase64)
          },
          checklist: Array.isArray(e.checklist) ? e.checklist.map(item => {
            const oficial = CHECKLIST_PADRAO.find(p => p.id === item.id);
            if (oficial) {
              return {
                ...item,
                categoria: oficial.categoria,
                item: oficial.item
              };
            }
            return item;
          }) : []
        }));
      }
    }
  } catch (err) {}
  
  const fallbackList: EntregaTecnica[] = JSON.parse(localStorage.getItem('agro_entregas') || '[]');
  return fallbackList.map(e => ({
    ...e,
    maquina: {
      ...e.maquina,
      miniaturaBase64: fixGoogleDriveUrl(e.maquina.miniaturaBase64)
    }
  }));
}

export function getLogs(): LogAuditoria[] {
  inicializarBancoDeDados();
  return JSON.parse(localStorage.getItem('agro_logs') || '[]');
}

// Adicionar Nova Entrega (Salvar rascunho ou finalizar)
export function salvarEntrega(entrega: EntregaTecnica, logado: string): void {
  const entregas = getEntregas();
  const index = entregas.findIndex(e => e.id === entrega.id);
  
  if (index >= 0) {
    entregas[index] = entrega;
    registrarLog(logado, 'ATUALIZAÇÃO', `Entrega ${entrega.id} foi atualizada. Status: ${entrega.status}`);
  } else {
    entregas.unshift(entrega);
    registrarLog(logado, 'CRIAÇÃO', `Nova Entrega Técnica registrada: ${entrega.id} para o cliente ${entrega.cliente.nome}`);
  }
  localStorage.setItem('agro_entregas', JSON.stringify(entregas));
}

// Registrar Log
export function registrarLog(usuario: string, acao: string, detalhes: string) {
  const logs = getLogs();
  const novoLog: LogAuditoria = {
    id: 'LOG-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    usuario,
    acao,
    detalhes,
    dataHora: new Date().toISOString()
  };
  logs.unshift(novoLog);
  localStorage.setItem('agro_logs', JSON.stringify(logs.slice(0, 1000))); // Limita a 1000 logs
}

// Cloud Sync Configuration using JSONBlob.com
const CLOUD_SYNC_URL = 'https://jsonblob.com/api/jsonBlob/019f5c60-fa31-700d-be80-62a517b4b23a';

// Function to trigger state refresh across the app
export function dispararAtualizacaoLocal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agro_db_updated'));
  }
}

// Background sync on app load and on local changes
export async function sincronizarDadosNuvem() {
  try {
    const res = await fetch(CLOUD_SYNC_URL);
    
    const localChkStr = localStorage.getItem('agro_checklist_padrao');
    const localChkUpdatedAt = Number(localStorage.getItem('agro_checklist_updated_at') || '1');
    let localChk: Omit<ItemChecklist, 'conforme' | 'observacao'>[] = [];
    try {
      if (localChkStr) localChk = JSON.parse(localChkStr);
    } catch (e) {}

    const localMaqStr = localStorage.getItem('agro_maquinas');
    const localMaqUpdatedAt = Number(localStorage.getItem('agro_maquinas_updated_at') || '1');
    let localMaq: Maquina[] = [];
    try {
      if (localMaqStr) localMaq = JSON.parse(localMaqStr);
    } catch (e) {}

    let cloudData: any = null;
    if (res.ok) {
      cloudData = await res.json();
    }

    let needsUpload = false;
    let finalCloudChk = localChk;
    let finalCloudChkUpdatedAt = localChkUpdatedAt;
    let finalCloudMaq = localMaq;
    let finalCloudMaqUpdatedAt = localMaqUpdatedAt;

    // 1. Sincronizar Checklist Padrão
    if (cloudData && cloudData.checklist && typeof cloudData.checklist.updatedAt === 'number') {
      const cloudChkUpdatedAt = cloudData.checklist.updatedAt;
      const cloudChk = cloudData.checklist.data;

      // Sanitizar dados recebidos da nuvem com as categorias e textos atualizados de fábrica
      let sanitizedCloudChk = cloudChk;
      if (Array.isArray(cloudChk)) {
        sanitizedCloudChk = cloudChk.map((item: any) => {
          const oficial = CHECKLIST_PADRAO.find(p => p.id === item.id);
          if (oficial) {
            return {
              ...item,
              categoria: oficial.categoria,
              item: oficial.item
            };
          }
          return item;
        });
      }

      if (cloudChkUpdatedAt > localChkUpdatedAt) {
        // Nuvem é mais recente, atualiza local
        localStorage.setItem('agro_checklist_padrao', JSON.stringify(sanitizedCloudChk));
        localStorage.setItem('agro_checklist_updated_at', String(cloudChkUpdatedAt));
        finalCloudChk = sanitizedCloudChk;
        finalCloudChkUpdatedAt = cloudChkUpdatedAt;
      } else if (localChkUpdatedAt > cloudChkUpdatedAt) {
        // Local é mais recente, marca para subir
        needsUpload = true;
      }
    } else if (localChk.length > 0) {
      // Nuvem não possui dados ainda de checklist, marca para subir
      needsUpload = true;
    }

    // 2. Sincronizar Máquinas Corporativas
    if (cloudData && cloudData.maquinas && typeof cloudData.maquinas.updatedAt === 'number') {
      const cloudMaqUpdatedAt = cloudData.maquinas.updatedAt;
      const cloudMaq = cloudData.maquinas.data;

      if (cloudMaqUpdatedAt > localMaqUpdatedAt) {
        // Nuvem é mais recente, atualiza local
        localStorage.setItem('agro_maquinas', JSON.stringify(cloudMaq));
        localStorage.setItem('agro_maquinas_updated_at', String(cloudMaqUpdatedAt));
        finalCloudMaq = cloudMaq;
        finalCloudMaqUpdatedAt = cloudMaqUpdatedAt;
      } else if (localMaqUpdatedAt > cloudMaqUpdatedAt) {
        // Local é mais recente, marca para subir
        needsUpload = true;
      }
    } else if (localMaq.length > 0) {
      // Nuvem não possui dados de máquinas corporativas ainda, marca para subir
      needsUpload = true;
    }

    // Se houver atualizações locais mais recentes do que na nuvem, faz o upload consolidado
    if (needsUpload) {
      await fetch(CLOUD_SYNC_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist: {
            updatedAt: finalCloudChkUpdatedAt,
            data: finalCloudChk
          },
          maquinas: {
            updatedAt: finalCloudMaqUpdatedAt,
            data: finalCloudMaq
          }
        })
      });
    }
  } catch (err) {
    console.warn('Erro ao sincronizar dados com a nuvem:', err);
  }

  dispararAtualizacaoLocal();
}

// Push local machines to the cloud (Updates local timestamp and triggers smart sync)
async function salvarMaquinasNuvem(maquinas: Maquina[]) {
  localStorage.setItem('agro_maquinas_updated_at', String(Date.now()));
  await sincronizarDadosNuvem();
}

// Push local custom checklist to the cloud (Updates local timestamp and triggers smart sync)
async function salvarChecklistNuvem(checklist: Omit<ItemChecklist, 'conforme' | 'observacao'>[]) {
  localStorage.setItem('agro_checklist_updated_at', String(Date.now()));
  await sincronizarDadosNuvem();
}

// Registrar novo Cliente dinamicamente se necessário
export function cadastrarCliente(cliente: Cliente, logado: string) {
  const clientes = getClientes();
  clientes.push(cliente);
  localStorage.setItem('agro_clientes', JSON.stringify(clientes));
  registrarLog(logado, 'CADASTRO_CLIENTE', `Cadastrou o cliente ${cliente.nome} (${cliente.fazenda})`);
}

// Registrar nova Máquina dinamicamente
export function cadastrarMaquina(maquina: Maquina, logado: string) {
  const maquinas = getMaquinas();
  maquinas.push(maquina);
  localStorage.setItem('agro_maquinas', JSON.stringify(maquinas));
  registrarLog(logado, 'CADASTRO_MAQUINA', `Cadastrou a máquina modelo ${maquina.modelo} S/N: ${maquina.numeroSerie}`);
  salvarMaquinasNuvem(maquinas).then(() => dispararAtualizacaoLocal());
}

// Atualizar Máquina existente (com fotos reais, checklists customizados, etc)
export function atualizarMaquina(maquina: Maquina, logado: string) {
  const maquinas = getMaquinas();
  const index = maquinas.findIndex(m => m.id === maquina.id);
  if (index >= 0) {
    maquinas[index] = maquina;
    localStorage.setItem('agro_maquinas', JSON.stringify(maquinas));
    registrarLog(logado, 'ATUALIZACAO_MAQUINA', `Atualizou os dados da máquina modelo ${maquina.modelo}`);
    salvarMaquinasNuvem(maquinas).then(() => dispararAtualizacaoLocal());
  }
}

// Excluir Máquina
export function excluirMaquina(id: string, logado: string) {
  const maquinas = getMaquinas();
  const index = maquinas.findIndex(m => m.id === id);
  if (index >= 0) {
    const maq = maquinas[index];
    maquinas.splice(index, 1);
    localStorage.setItem('agro_maquinas', JSON.stringify(maquinas));
    registrarLog(logado, 'EXCLUSAO_MAQUINA', `Excluiu a máquina modelo ${maq.modelo}`);
    salvarMaquinasNuvem(maquinas).then(() => dispararAtualizacaoLocal());
  }
}

export function excluirEntrega(id: string, logado: string) {
  const entregas = getEntregas();
  const index = entregas.findIndex(e => e.id === id);
  if (index >= 0) {
    const ent = entregas[index];
    entregas.splice(index, 1);
    localStorage.setItem('agro_entregas', JSON.stringify(entregas));
    registrarLog(logado, 'EXCLUSAO_ENTREGA', `Excluiu o Check List - Entrega Técnica ${id} do cliente ${ent.cliente.nome}`);
  }
}

// Forçar sincronismo offline -> online
export async function sincronizarEntregasLocais(logado: string): Promise<number> {
  const entregas = getEntregas();
  let count = 0;
  
  const novasEntregas = await Promise.all(entregas.map(async (e) => {
    if (e.status === 'pendente_sincronizacao') {
      count++;
      const updated = { ...e, status: 'sincronizado' as const };
      
      // Quando sincroniza com a nuvem, atualiza o QR Code URL para o link curto
      // e envia o checklist para o Firestore
      try {
        const compressed = compressEntrega(updated);
        updated.qrCodeUrl = `${window.location.origin}${window.location.pathname}?verify=${e.id}`;
        await salvarEntregaCompartilhada(e.id, compressed);
      } catch (err) {
        console.error("Erro ao sincronizar com o Firebase Firestore:", err);
      }
      
      return updated;
    }
    return e;
  }));

  localStorage.setItem('agro_entregas', JSON.stringify(novasEntregas));
  
  if (count > 0) {
    registrarLog(logado, 'SINCRONIZAÇÃO', `Sincronizou ${count} entrega(s) técnica(s) pendente(s) com a nuvem.`);
  }
  
  return count;
}

// Cálculo de KPIs com suporte a filtros de data e número de série
export function obterKPIs(filtroDataInicio?: string, filtroDataFim?: string, filtroNumSerie?: string, tecnicoNomeLimitado?: string): KPIStats {
  const entregas = getEntregas();
  
  // Filtra as entregas finalizadas (que possuem assinaturas)
  let filtradas = entregas.filter(e => e.assinaturas.tecnico && e.assinaturas.cliente);
  
  if (tecnicoNomeLimitado) {
    const nomeLimitado = tecnicoNomeLimitado.toLowerCase();
    if (nomeLimitado === 'u_revjf_shared') {
      filtradas = filtradas.filter(e => e.tecnico.id === 'u_revjf' || e.tecnico.id === 'u_revjf_user');
    } else {
      filtradas = filtradas.filter(e => e.tecnico.nome.toLowerCase() === nomeLimitado);
    }
  }

  if (filtroDataInicio) {
    filtradas = filtradas.filter(e => e.data >= filtroDataInicio);
  }
  if (filtroDataFim) {
    filtradas = filtradas.filter(e => e.data <= filtroDataFim);
  }
  if (filtroNumSerie) {
    const termo = filtroNumSerie.toLowerCase();
    filtradas = filtradas.filter(e => e.maquina.numeroSerie.toLowerCase().includes(termo) || e.cliente.nome.toLowerCase().includes(termo));
  }

  const pendenciasFiltro = tecnicoNomeLimitado 
    ? (tecnicoNomeLimitado.toLowerCase() === 'u_revjf_shared'
        ? entregas.filter(e => e.status === 'pendente_sincronizacao' && (e.tecnico.id === 'u_revjf' || e.tecnico.id === 'u_revjf_user'))
        : entregas.filter(e => e.status === 'pendente_sincronizacao' && e.tecnico.nome.toLowerCase() === tecnicoNomeLimitado.toLowerCase()))
    : entregas.filter(e => e.status === 'pendente_sincronizacao');

  const kpis: KPIStats = {
    totalEntregas: filtradas.length,
    entregasPorTecnico: {},
    entregasPorRevenda: {},
    entregasPorEstado: {},
    pendenciasAtivas: pendenciasFiltro.length,
    maquinasEntregues: filtradas.length,
    entregasPorModelo: {}
  };

  filtradas.forEach(e => {
    // Técnico
    const tecNome = e.tecnico.nome;
    kpis.entregasPorTecnico[tecNome] = (kpis.entregasPorTecnico[tecNome] || 0) + 1;

    // Revenda
    const revNome = e.revenda.nome;
    kpis.entregasPorRevenda[revNome] = (kpis.entregasPorRevenda[revNome] || 0) + 1;

    // Estado
    const estado = e.cliente.estado;
    kpis.entregasPorEstado[estado] = (kpis.entregasPorEstado[estado] || 0) + 1;

    // Modelo Máquina
    const modelo = e.maquina.modelo;
    kpis.entregasPorModelo[modelo] = (kpis.entregasPorModelo[modelo] || 0) + 1;
  });

  return kpis;
}

// Auxiliar para gerar ID Sequencial de Entrega
export function gerarIdEntrega(): string {
  const entregas = getEntregas();
  const ano = new Date().getFullYear();
  const totalDesteAno = entregas.filter(e => e.id.startsWith(`ET-${ano}`)).length;
  const seq = String(totalDesteAno + 1).padStart(4, '0');
  return `ET-${ano}-${seq}`;
}

export function registrarUsuario(novoUsuario: Usuario): void {
  inicializarBancoDeDados();
  const tecnicos = getTecnicos();
  const existe = tecnicos.some(t => t.usuario.toLowerCase() === novoUsuario.usuario.toLowerCase());
  if (!existe) {
    tecnicos.push(novoUsuario);
    localStorage.setItem('agro_tecnicos', JSON.stringify(tecnicos));
    registrarLog(novoUsuario.nome, 'CADASTRO_USUARIO', `Novo usuário cadastrado na plataforma: ${novoUsuario.nome} (${novoUsuario.usuario})`);
  }
}

export function getChecklistPadrao(): Omit<ItemChecklist, 'conforme' | 'observacao'>[] {
  inicializarBancoDeDados();
  try {
    const stored = localStorage.getItem('agro_checklist_padrao');
    if (stored) {
      const parsed: Omit<ItemChecklist, 'conforme' | 'observacao'>[] = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          const oficial = CHECKLIST_PADRAO.find(p => p.id === item.id);
          if (oficial) {
            return {
              ...item,
              categoria: oficial.categoria,
              item: oficial.item
            };
          }
          return item;
        });
      }
    }
  } catch (err) {}
  return CHECKLIST_PADRAO;
}

export function salvarChecklistPadrao(checklist: Omit<ItemChecklist, 'conforme' | 'observacao'>[], logado: string): void {
  localStorage.setItem('agro_checklist_padrao', JSON.stringify(checklist));
  localStorage.setItem('agro_checklist_updated_at', String(Date.now()));
  registrarLog(logado, 'ATUALIZAR_CHECKLIST_PADRAO', `O checklist padrão de itens foi atualizado pelo usuário.`);
  salvarChecklistNuvem(checklist).then(() => dispararAtualizacaoLocal());
}

export function restaurarChecklistFabrica(logado: string): void {
  localStorage.setItem('agro_checklist_padrao', JSON.stringify(CHECKLIST_PADRAO));
  localStorage.setItem('agro_checklist_updated_at', String(Date.now()));
  registrarLog(logado, 'RESTAURAR_FABRICA', 'Restaurou o checklist padrão oficial de fábrica (43 itens e categorias oficiais).');
  salvarChecklistNuvem(CHECKLIST_PADRAO).then(() => {
    dispararAtualizacaoLocal();
  });
}

export function getRelativeIndexStr(item: { id: string; categoria: string }, list: { id: string; categoria: string }[]): string {
  const itemsInCat = list.filter(i => i.categoria === item.categoria);
  const idx = itemsInCat.findIndex(i => i.id === item.id);
  if (idx === -1) return '';
  const num = String(idx + 1).padStart(2, '0');
  const total = String(itemsInCat.length).padStart(2, '0');
  return `${num}/${total}`;
}

