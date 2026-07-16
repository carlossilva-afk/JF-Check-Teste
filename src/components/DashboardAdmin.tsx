/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { EntregaTecnica, KPIStats, Usuario, Maquina } from '../types';
import { obterKPIs, getLogs, LogAuditoria, getMaquinas, cadastrarMaquina, atualizarMaquina, excluirMaquina, CHECKLIST_PADRAO, getChecklistPadrao, salvarChecklistPadrao, restaurarChecklistFabrica, getRelativeIndexStr } from '../utils/db';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Users, MapPin, Tractor, AlertTriangle, FileSpreadsheet, 
  FileText, Calendar, Search, ShieldCheck, ClipboardList, Shield, Plus, Trash2, Upload, PlusCircle, Check, Share, Pencil, RotateCcw
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ForageHarvesterIcon } from './ForageHarvesterIcon';
import ConfirmModal from './ConfirmModal';
import jfC120Img from '../assets/images/jf_c120_at_1783939073974.jpg';

// Helper to compress thumbnail image for machines with enhanced resolution and quality
function compressThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Aumentado de 200x150 para 800x600 para obter altíssima nitidez e qualidade visual (HD)
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }
        ctx?.drawImage(img, 0, 0, width, height);
        // Elevado de 0.7 para 0.9 para máxima fidelidade de cores e nitidez
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => {
        resolve(event.target?.result as string); // fallback original
      };
    };
    reader.onerror = () => {
      resolve('');
    };
  });
}

// Converte links normais de compartilhamento do Google Drive em links de imagem direta em alta qualidade
function converterLinkGoogleDrive(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    let fileId = '';
    
    // Padrão 1: /file/d/FILE_ID/view... ou /file/d/FILE_ID/edit...
    const matchD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) {
      fileId = matchD[1];
    } else {
      // Padrão 2: id=FILE_ID
      const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchId && matchId[1]) {
        fileId = matchId[1];
      }
    }
    
    if (fileId) {
      // Retorna a URL de exibição direta oficial e robusta do Google Drive (uc?export=download)
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }
  
  return trimmed;
}

interface DashboardAdminProps {
  entregas: EntregaTecnica[];
  usuarioLogado: Usuario;
}

export default function DashboardAdmin({ entregas, usuarioLogado }: DashboardAdminProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [numSerieQuery, setNumSerieQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'analytics' | 'logs' | 'cadastrar_maquinas' | 'backup_sharing'>('analytics');

  // Estados para Cadastro de Novas Máquinas (Apenas carlos.silva@industriasnb.com.br)
  const [maquinas, setMaquinas] = useState<Maquina[]>(() => getMaquinas());

  useEffect(() => {
    const handleUpdate = () => {
      setMaquinas(getMaquinas());
    };
    window.addEventListener('agro_db_updated', handleUpdate);
    return () => window.removeEventListener('agro_db_updated', handleUpdate);
  }, []);
  const [deleteTargetMachine, setDeleteTargetMachine] = useState<Maquina | null>(null);
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [novoModelo, setNovoModelo] = useState('');
  const [novoTipo, setNovoTipo] = useState('Trator');
  const [novoFabricante, setNovoFabricante] = useState('JF Máquinas');
  const [novaMiniatura, setNovaMiniatura] = useState('');
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [itensChecklist, setItensChecklist] = useState<{ id: string; categoria: string; item: string }[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  const [editingItemCategory, setEditingItemCategory] = useState('');
  
  const [itemTexto, setItemTexto] = useState('');
  const [itemCategoria, setItemCategoria] = useState('Recebimento e Inspeção Geral');
  const [novaCategoriaInput, setNovaCategoriaInput] = useState('');
  const [mostrarInputNovaCategoria, setMostrarInputNovaCategoria] = useState(false);

  // Categorias disponíveis calculadas dinamicamente com base nos itens atuais do checklist
  const categoriasDisponiveis = useMemo(() => {
    const cats = Array.from(new Set(itensChecklist.map(i => i.categoria)));
    if (cats.length === 0) {
      return [
        'Recebimento e Inspeção Geral',
        'Lubrificação e Fluidos',
        'Transmissão, Correias e Correntes',
        'Rolos Alimentadores',
        'Mecanismo de Corte (Rotor e Facas)',
        'Giro e Direcionamento da Descarga',
        'Funcionamento em Vazio (Comissionamento)'
      ];
    }
    return cats;
  }, [itensChecklist]);

  // Sincroniza a categoria selecionada se ela não estiver mais nas disponíveis
  useEffect(() => {
    if (categoriasDisponiveis.length > 0 && !categoriasDisponiveis.includes(itemCategoria) && !mostrarInputNovaCategoria) {
      setItemCategoria(categoriasDisponiveis[0]);
    }
  }, [categoriasDisponiveis, itemCategoria, mostrarInputNovaCategoria]);

  // Logs de auditoria do banco filtrados pelo usuário logado
  const logs = useMemo(() => {
    const todosLogs = getLogs();
    return todosLogs.filter(l => 
      l.usuario.toLowerCase() === usuarioLogado.nome.toLowerCase() || 
      l.usuario.toLowerCase() === usuarioLogado.usuario.toLowerCase()
    );
  }, [entregas, usuarioLogado]);

  // Calcula KPIs filtrados apenas para as entregas do próprio técnico
  const stats = useMemo(() => {
    const isTech = usuarioLogado.perfil !== 'administrador';
    const limitName = isTech 
      ? (usuarioLogado.id === 'u_revjf' || usuarioLogado.id === 'u_revjf_user' ? 'u_revjf_shared' : usuarioLogado.nome)
      : undefined;
    return obterKPIs(dataInicio, dataFim, numSerieQuery, limitName);
  }, [entregas, dataInicio, dataFim, numSerieQuery, usuarioLogado]);

  // Filtra as entregas correspondentes para exportação (apenas do próprio usuário)
  const entregasFiltradas = useMemo(() => {
    let filtradas = entregas.filter(e => e.assinaturas.tecnico && e.assinaturas.cliente);
    
    // Filtragem de conformidade de acesso
    if (usuarioLogado.perfil !== 'administrador') {
      if (usuarioLogado.id === 'u_revjf' || usuarioLogado.id === 'u_revjf_user') {
        // Shared universal login: can see all deliveries created under this shared login ID
        filtradas = filtradas.filter(e => e.tecnico.id === 'u_revjf' || e.tecnico.id === 'u_revjf_user');
      } else {
        filtradas = filtradas.filter(e => e.tecnico.nome.toLowerCase() === usuarioLogado.nome.toLowerCase());
      }
    }

    if (dataInicio) filtradas = filtradas.filter(e => e.data >= dataInicio);
    if (dataFim) filtradas = filtradas.filter(e => e.data <= dataFim);
    if (numSerieQuery) {
      const q = numSerieQuery.toLowerCase();
      filtradas = filtradas.filter(e => 
        e.maquina.numeroSerie.toLowerCase().includes(q) || 
        e.cliente.nome.toLowerCase().includes(q)
      );
    }
    return filtradas;
  }, [entregas, dataInicio, dataFim, numSerieQuery, usuarioLogado]);

  // Formata dados para Recharts
  const dadosTecnico = useMemo(() => {
    return Object.entries(stats.entregasPorTecnico).map(([name, value]) => ({ name, Entregas: value }));
  }, [stats]);

  const dadosRevenda = useMemo(() => {
    return Object.entries(stats.entregasPorRevenda).map(([name, value]) => ({ name, Entregas: value }));
  }, [stats]);

  const dadosModelos = useMemo(() => {
    return Object.entries(stats.entregasPorModelo).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const dadosEstado = useMemo(() => {
    return Object.entries(stats.entregasPorEstado).map(([name, value]) => ({ name, Entregas: value }));
  }, [stats]);

  const CORES_PALETA = ['#fac222', '#51514e', '#dfab14', '#6e6e6a', '#b4870c', '#333331'];

  // Exportar Excel (Formato CSV com codificação UTF-8)
  const exportarExcel = () => {
    if (entregasFiltradas.length === 0) {
      alert("Nenhum dado filtrado para exportar.");
      return;
    }

    // Define cabeçalhos do Excel
    let csvContent = "ID;Data;Cliente;CPF/CNPJ;Fazenda;Cidade;Estado;Técnico;Revenda;Máquina;Nº Série;Tempo Execução (s);Status;N Conformidades\n";

    entregasFiltradas.forEach(e => {
      const nConformidades = e.checklist.filter(item => item.conforme === 'nao_conforme').length;
      csvContent += [
        e.id,
        e.data,
        `"${e.cliente.nome.replace(/"/g, '""')}"`,
        e.cliente.documento,
        `"${e.cliente.fazenda.replace(/"/g, '""')}"`,
        e.cliente.cidade,
        e.cliente.estado,
        `"${e.tecnico.nome}"`,
        `"${e.revenda.nome}"`,
        `"${e.maquina.modelo}"`,
        e.maquina.numeroSerie,
        e.tempoExecucaoSegundos,
        e.status,
        nConformidades
      ].join(";") + "\n";
    });

    // Cria o blob e faz o download
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_Entrega_Tecnica_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar PDF do Resumo Gerencial (Dashboard)
  const exportarPDFResumo = () => {
    const doc = new jsPDF();
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 0, 210, 15, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RELATÓRIO GERENCIAL - ENTREGAS TÉCNICAS', 15, 10);

    doc.setTextColor(33, 33, 33);
    doc.setFontSize(11);
    doc.text(`Período analisado: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`, 15, 25);
    doc.text(`Total de Máquinas Entregues: ${stats.totalEntregas}`, 15, 31);
    doc.text(`Entregas Pendentes de Sincronismo (Local): ${stats.pendenciasAtivas}`, 15, 37);

    // Tabela simples de técnicos
    let y = 50;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DESEMPENHO POR TÉCNICO', 18, y + 5);
    y += 12;

    doc.setFont('helvetica', 'normal');
    Object.entries(stats.entregasPorTecnico).forEach(([tec, total]) => {
      doc.text(`${tec}:`, 18, y);
      doc.text(`${total} entrega(s)`, 150, y);
      y += 6;
    });

    // Distribuição por Estados
    y += 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DISTRIBUIÇÃO POR ESTADO', 18, y + 5);
    y += 12;

    doc.setFont('helvetica', 'normal');
    Object.entries(stats.entregasPorEstado).forEach(([est, total]) => {
      doc.text(`Estado ${est}:`, 18, y);
      doc.text(`${total} máquina(s)`, 150, y);
      y += 6;
    });

    doc.save(`Resumo_Gerencial_Entregas_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="flex flex-col gap-6" id="dashboard-admin-view font-sans">
      {/* Abas Superiores */}
      <div className="flex border-b-2 border-zinc-200">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-4 transition duration-150 ${activeTab === 'analytics' ? 'border-amber-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
          id="btn-tab-analytics"
        >
          Análise Gerencial & KPIs
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-4 transition duration-150 ${activeTab === 'logs' ? 'border-amber-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
          id="btn-tab-logs"
        >
          Trilha de Auditoria (LGPD)
        </button>
        {usuarioLogado.perfil === 'administrador' && (
          <>
            <button
              onClick={() => setActiveTab('cadastrar_maquinas')}
              className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-4 transition duration-150 ${activeTab === 'cadastrar_maquinas' ? 'border-amber-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
              id="btn-tab-cadastrar-maquinas"
            >
              Cadastrar Máquinas
            </button>
            <button
              onClick={() => setActiveTab('backup_sharing')}
              className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-4 transition duration-150 ${activeTab === 'backup_sharing' ? 'border-amber-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
              id="btn-tab-backup-sharing"
            >
              Sincronização & Backup
            </button>
          </>
        )}
      </div>

      {activeTab === 'analytics' ? (
        <>
          {/* Alerta de Segurança / LGPD e Filtro NB Máquinas */}
          <div className="bg-amber-50 border-2 border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md animate-fadeIn" id="security-filter-notice">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-zinc-900 text-amber-500 rounded-xl font-bold shrink-0 border border-zinc-950">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-xs uppercase text-zinc-900 tracking-wider flex items-center gap-1.5">
                  Acesso Individual NB Máquinas
                </h4>
                <p className="text-[11px] text-zinc-700 font-medium leading-normal">
                  Por diretrizes corporativas, este painel exibe exclusivamente as estatísticas, conformidades e auditorias das entregas técnicas que <strong>você realizou</strong>.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[10px] font-black uppercase bg-zinc-900 text-amber-400 px-3 py-1.5 rounded-xl font-mono tracking-wider border border-zinc-950">
                TÉCNICO: {usuarioLogado.nome}
              </span>
            </div>
          </div>

          {/* Painel de Filtros */}
          <div className="bg-white p-5 rounded-2xl border-2 border-zinc-900 shadow-md flex flex-col lg:flex-row items-center gap-4 justify-between" id="dashboard-filters">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              {/* Filtro Data Início */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="px-3 py-2 border-2 border-zinc-300 rounded-xl text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none"
                  title="Data Início"
                  id="filter-date-start"
                />
              </div>
              <span className="text-zinc-400 font-bold hidden sm:inline">até</span>
              {/* Filtro Data Fim */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="px-3 py-2 border-2 border-zinc-300 rounded-xl text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none"
                  title="Data Fim"
                  id="filter-date-end"
                />
              </div>
            </div>

            {/* Pesquisa por Série */}
            <div className="relative w-full lg:max-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Nº de Série ou Cliente..."
                value={numSerieQuery}
                onChange={(e) => setNumSerieQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-zinc-300 rounded-xl text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                id="filter-serial"
              />
            </div>

            {/* Ações de Exportação */}
            <div className="flex gap-2 w-full lg:w-auto justify-end">
              <button
                onClick={exportarExcel}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-white text-xs font-black uppercase tracking-widest rounded-xl border-2 border-zinc-950 transition shadow-sm"
                id="btn-export-excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-500" /> Exportar Excel
              </button>
              <button
                onClick={exportarPDFResumo}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-white text-xs font-black uppercase tracking-widest rounded-xl border-2 border-zinc-950 transition shadow-sm"
                id="btn-export-pdf"
              >
                <FileText className="w-4 h-4 text-rose-400" /> PDF Resumo
              </button>
            </div>
          </div>

          {/* Cards de Métricas (KPIs) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-kpi-cards">
            {/* Total Maquinas Entregues */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-zinc-900 shadow-md flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-amber-100 rounded-xl text-amber-950 border-2 border-zinc-900 w-fit shrink-0">
                <ForageHarvesterIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest block leading-tight mb-0.5 sm:mb-1">Máquinas Entregues</span>
                <span className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-900 tracking-tight block leading-none">{stats.totalEntregas}</span>
              </div>
            </div>

            {/* Técnicos Ativos */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-zinc-900 shadow-md flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-zinc-100 rounded-xl text-zinc-800 border-2 border-zinc-900 w-fit shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest block leading-tight mb-0.5 sm:mb-1">Técnicos Ativos</span>
                <span className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-900 tracking-tight block leading-none">{Object.keys(stats.entregasPorTecnico).length}</span>
              </div>
            </div>

            {/* Revendas Atendidas */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-zinc-900 shadow-md flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-purple-100 rounded-xl text-purple-800 border-2 border-zinc-900 w-fit shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest block leading-tight mb-0.5 sm:mb-1">Revendas Ativas</span>
                <span className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-900 tracking-tight block leading-none">{Object.keys(stats.entregasPorRevenda).length}</span>
              </div>
            </div>

            {/* Pendências de Sincronismo (Offline) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-zinc-900 shadow-md flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-amber-100 rounded-xl text-amber-800 border-2 border-zinc-900 w-fit shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest block leading-tight mb-0.5 sm:mb-1">Sincronismo Local</span>
                <span className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-900 tracking-tight block leading-none">{stats.pendenciasAtivas}</span>
              </div>
            </div>
          </div>

          {/* Seção de Gráficos Recharts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-charts">
            {/* Gráfico de Barras: Entregas por Técnico */}
            <div className="bg-white p-5 rounded-2xl border-2 border-zinc-900 shadow-md">
              <h4 className="text-xs font-black text-zinc-900 mb-4 flex items-center gap-2 border-b-2 border-zinc-900 pb-2.5 uppercase tracking-wider">
                <Users className="w-4 h-4 text-amber-600 shrink-0" />
                Entregas por Técnico Responsável
              </h4>
              <div className="h-64">
                {dadosTecnico.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-400 text-xs">Sem dados para o período selecionado</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosTecnico}>
                      <XAxis dataKey="name" stroke="#51514e" fontSize={11} tickLine={false} style={{ fontWeight: 'bold' }} />
                      <YAxis stroke="#51514e" fontSize={11} allowDecimals={false} style={{ fontWeight: 'bold' }} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="Entregas" fill="#fac222" radius={[4, 4, 0, 0]} barSize={35} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Gráfico de Barras: Entregas por Revenda */}
            <div className="bg-white p-5 rounded-2xl border-2 border-zinc-900 shadow-md">
              <h4 className="text-xs font-black text-zinc-900 mb-4 flex items-center gap-2 border-b-2 border-zinc-900 pb-2.5 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                Entregas por Revenda
              </h4>
              <div className="h-64">
                {dadosRevenda.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-400 text-xs">Sem dados para o período selecionado</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosRevenda}>
                      <XAxis dataKey="name" stroke="#51514e" fontSize={10} tickLine={false} style={{ fontWeight: 'bold' }} />
                      <YAxis stroke="#51514e" fontSize={11} allowDecimals={false} style={{ fontWeight: 'bold' }} />
                      <Tooltip />
                      <Bar dataKey="Entregas" fill="#51514e" radius={[4, 4, 0, 0]} barSize={35} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Gráfico de Pizza: Entregas por Modelo de Máquina */}
            <div className="bg-white p-5 rounded-2xl border-2 border-zinc-900 shadow-md">
              <h4 className="text-xs font-black text-zinc-900 mb-4 flex items-center gap-2 border-b-2 border-zinc-900 pb-2.5 uppercase tracking-wider">
                <ForageHarvesterIcon className="w-4 h-4 text-amber-500 shrink-0" />
                Percentual de Modelos Entregues
              </h4>
              <div className="h-64 flex flex-col md:flex-row items-center justify-around">
                {dadosModelos.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">Sem dados para o período selecionado</div>
                ) : (
                  <>
                    <div className="h-44 w-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dadosModelos}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {dadosModelos.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CORES_PALETA[index % CORES_PALETA.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} máquina(s)`, 'Entrega']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto text-xs w-full md:w-auto mt-4 md:mt-0 px-2 font-bold">
                      {dadosModelos.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded-md border-2 border-zinc-900" style={{ backgroundColor: CORES_PALETA[index % CORES_PALETA.length] }} />
                          <span className="text-zinc-800">{item.name}</span>
                          <span className="text-zinc-400 font-mono">({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Gráfico por Estado */}
            <div className="bg-white p-5 rounded-2xl border-2 border-zinc-900 shadow-md">
              <h4 className="text-xs font-black text-zinc-900 mb-4 flex items-center gap-2 border-b-2 border-zinc-900 pb-2.5 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                Abrangência Geográfica por Estado
              </h4>
              <div className="h-64">
                {dadosEstado.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-400 text-xs">Sem dados para o período selecionado</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosEstado} layout="vertical">
                      <XAxis type="number" stroke="#51514e" fontSize={11} allowDecimals={false} style={{ fontWeight: 'bold' }} />
                      <YAxis dataKey="name" type="category" stroke="#51514e" fontSize={11} width={40} tickLine={false} style={{ fontWeight: 'bold' }} />
                      <Tooltip />
                      <Bar dataKey="Entregas" fill="#dfab14" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'logs' ? (
        /* Seção de Logs de Auditoria */
        <div className="bg-white border-2 border-zinc-900 rounded-3xl shadow-md overflow-hidden" id="dashboard-audit-logs">
          <div className="p-5 bg-zinc-900 text-white flex items-center gap-2 border-b-2 border-zinc-950">
            <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h4 className="font-black text-base uppercase tracking-wider">Trilha de Auditoria Geral</h4>
              <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Conformidade em tempo real com leis de proteção de dados (LGPD)</p>
            </div>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-zinc-900 bg-zinc-150 text-zinc-900 font-black text-[10px] uppercase tracking-widest">
                  <th className="py-3.5 px-3">Código Log</th>
                  <th className="py-3.5 px-3">Data/Hora</th>
                  <th className="py-3.5 px-3">Usuário</th>
                  <th className="py-3.5 px-3">Operação</th>
                  <th className="py-3.5 px-3">Ações e Logs Auditados</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-zinc-100 text-zinc-700 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 transition">
                    <td className="py-3.5 px-3 font-mono text-[10px] text-zinc-400 font-bold">{log.id}</td>
                    <td className="py-3.5 px-3 text-zinc-600 font-semibold">{new Date(log.dataHora).toLocaleString('pt-BR')}</td>
                    <td className="py-3.5 px-3 font-bold text-zinc-900">{log.usuario}</td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border-2 ${
                        log.acao === 'CRIAÇÃO' ? 'bg-amber-50 text-amber-700 border-amber-400' :
                        log.acao === 'ATUALIZAÇÃO' ? 'bg-zinc-100 text-zinc-700 border-zinc-400' :
                        log.acao === 'CADASTRO_CLIENTE' || log.acao === 'CADASTRO_MAQUINA' ? 'bg-purple-50 text-purple-700 border-purple-400' :
                        'bg-zinc-100 text-zinc-700 border-zinc-400'
                      }`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-zinc-800 font-semibold">{log.detalhes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'cadastrar_maquinas' ? (
        /* Seção de Cadastro de Novas Máquinas e Checklists Corporativos */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-register-machines-view">
          {/* Formulário de Cadastro (Esquerda) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-3xl border-2 border-zinc-900 shadow-md flex flex-col gap-5">
              <div>
                <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
                  <ForageHarvesterIcon className="w-5 h-5 text-amber-500" />
                  {editingMachineId ? 'Editar Equipamento Corporativo' : 'Cadastrar Novo Equipamento'}
                </h3>
                <p className="text-xs text-zinc-500 font-semibold mt-0.5">
                  {editingMachineId 
                    ? 'Atualize os dados do modelo, faça o upload de uma nova foto real e altere os itens do checklist.'
                    : 'Preencha os dados do modelo, faça o upload de uma miniatura e defina os itens do checklist correspondente.'}
                </p>
              </div>

              {/* Dados Básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Modelo do Equipamento *</label>
                  <input
                    type="text"
                    placeholder="Ex: Trator John Deere 6100J"
                    value={novoModelo}
                    onChange={(e) => setNovoModelo(e.target.value)}
                    className="px-3.5 py-2.5 border-2 border-zinc-300 rounded-xl text-sm bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 font-semibold text-zinc-800"
                    id="input-new-machine-model"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Fabricante *</label>
                  <input
                    type="text"
                    value="JF Máquinas"
                    disabled
                    className="px-3.5 py-2.5 border-2 border-zinc-200 rounded-xl text-sm bg-zinc-100 text-zinc-500 focus:outline-none cursor-not-allowed font-bold"
                    id="input-new-machine-manufacturer"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Tipo de Equipamento *</label>
                  <input
                    type="text"
                    value={novoTipo}
                    onChange={(e) => setNovoTipo(e.target.value)}
                    placeholder="Ex: Trator, Colhedora, Plantadeira, etc."
                    className="px-3.5 py-2.5 border-2 border-zinc-300 rounded-xl text-sm bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 font-bold text-zinc-800"
                    id="input-new-machine-type"
                    required
                  />
                </div>
              </div>

              {/* Upload ou Link da Miniatura */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Imagem Miniatura do Equipamento</label>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-8 flex flex-col gap-3">
                    {/* Opção 1: Upload Local */}
                    <div 
                      className="border-2 border-dashed border-zinc-300 rounded-2xl p-4 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/20 transition flex flex-col items-center justify-center gap-1.5"
                      onClick={() => document.getElementById('input-machine-thumb')?.click()}
                    >
                      <Upload className="w-5 h-5 text-zinc-400" />
                      <span className="text-[11px] font-bold text-zinc-600">Arraste ou clique para selecionar arquivo local</span>
                      <span className="text-[9px] text-zinc-400 font-semibold font-mono">Resolução e qualidade potencializadas automaticamente</span>
                      <input
                        type="file"
                        id="input-machine-thumb"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const base64 = await compressThumbnail(file);
                            setNovaMiniatura(base64);
                            setDriveLinkInput(''); // Limpa o link se subiu arquivo local
                          }
                        }}
                      />
                    </div>

                    {/* Divisor Visual */}
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-zinc-200"></div>
                      <span className="flex-shrink mx-3 text-[9px] font-black uppercase text-zinc-400 tracking-widest">OU INSIRA UM LINK</span>
                      <div className="flex-grow border-t border-zinc-200"></div>
                    </div>

                    {/* Opção 2: Link do Drive / Web */}
                    <div className="flex flex-col gap-1.5 bg-zinc-50 border border-zinc-200 rounded-2xl p-3">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Link do Google Drive ou URL da Imagem</span>
                      <input
                        type="text"
                        placeholder="Cole o link de compartilhamento do seu Drive ou de uma imagem web"
                        value={driveLinkInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDriveLinkInput(val);
                          const converted = converterLinkGoogleDrive(val);
                          if (converted) {
                            setNovaMiniatura(converted);
                          }
                        }}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs bg-white focus:outline-none focus:border-zinc-900 font-semibold text-zinc-800"
                      />
                      {driveLinkInput && driveLinkInput.includes('drive.google.com') && (
                        <div className="text-[9px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                          <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                          Link do Google Drive detectado! Convertido automaticamente para exibição direta com alta fidelidade.
                        </div>
                      )}
                      <p className="text-[9px] text-zinc-400 font-medium leading-relaxed">
                        Dica: O link do Drive é convertido para visualização direta (<span className="font-mono text-zinc-500">drive.google.com/uc?export=download&id=ID</span>) que exibe a imagem em sua resolução e qualidade originais, sem compressões ou perdas!
                      </p>
                    </div>
                  </div>

                  {/* Preview da Miniatura */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center pt-2">
                    {novaMiniatura ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-28 h-28 bg-white border-2 border-zinc-900 rounded-2xl overflow-hidden shadow-md flex items-center justify-center p-1.5 group">
                          <img 
                            src={novaMiniatura} 
                            alt="Previa Miniatura" 
                            className="w-full h-full object-contain rounded-xl"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              console.error("Erro ao carregar miniatura", e);
                            }}
                          />
                          <button 
                            onClick={() => {
                              setNovaMiniatura('');
                              setDriveLinkInput('');
                            }}
                            className="absolute inset-0 bg-red-600/90 text-white font-black text-[9px] uppercase flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 rounded-xl"
                          >
                            Remover
                          </button>
                        </div>
                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Pré-visualização</span>
                        {novaMiniatura.startsWith('http') ? (
                          <span className="text-[8px] bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full font-bold">
                            Link Externo Original
                          </span>
                        ) : (
                          <span className="text-[8px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                            Imagem Comprimida HD
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-28 h-28 bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-2xl flex flex-col items-center justify-center text-zinc-400 gap-1.5 p-3">
                        <ForageHarvesterIcon className="w-10 h-10 text-zinc-400" />
                        <span className="text-[8px] font-black uppercase tracking-wider text-center text-zinc-400">Sem Imagem</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Itens de Checklist */}
              <div className="border-t border-zinc-200 pt-5 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Checklist de Verificação</h4>
                    <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Defina as etapas e componentes que o técnico precisará avaliar em campo.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const defaultItems = getChecklistPadrao().map(i => ({
                          id: i.id,
                          categoria: i.categoria,
                          item: i.item
                        }));
                        setItensChecklist(defaultItems);
                      }}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-950 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Usar Padrão
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Deseja realmente restaurar o checklist padrão oficial de fábrica para todos os equipamentos? Isso carregará as 7 categorias e 43 itens originais, sobrescrevendo alterações locais no checklist padrão.")) {
                          restaurarChecklistFabrica(usuarioLogado.usuario);
                          const defaultItems = CHECKLIST_PADRAO.map(i => ({
                            id: i.id,
                            categoria: i.categoria,
                            item: i.item
                          }));
                          setItensChecklist(defaultItems);
                          alert("Checklist padrão oficial de fábrica restaurado com sucesso!");
                        }
                      }}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition"
                      title="Restaurar o modelo padrão de fábrica com 43 itens e categorias oficiais"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar Fábrica
                    </button>
                    <button
                      type="button"
                      onClick={() => setItensChecklist([])}
                      className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-300 rounded-lg text-[9px] font-black uppercase tracking-wider transition"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Adicionar Novo Item Individual */}
                <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row gap-2 items-end">
                  <div className="flex-1 flex flex-col gap-1 w-full">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Item de Inspeção</span>
                    <input
                      type="text"
                      placeholder="Ex: Verificar tensão e integridade da correia principal"
                      value={itemTexto}
                      onChange={(e) => setItemTexto(e.target.value)}
                      className="px-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:border-zinc-900 font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 w-full sm:w-auto">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Categoria</span>
                    <select
                      value={mostrarInputNovaCategoria ? '__NOVA_CATEGORIA__' : itemCategoria}
                      onChange={(e) => {
                        if (e.target.value === '__NOVA_CATEGORIA__') {
                          setMostrarInputNovaCategoria(true);
                        } else {
                          setMostrarInputNovaCategoria(false);
                          setItemCategoria(e.target.value);
                        }
                      }}
                      className="px-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white font-bold"
                    >
                      {categoriasDisponiveis.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__NOVA_CATEGORIA__">+ Criar Nova Categoria...</option>
                    </select>
                  </div>

                  {mostrarInputNovaCategoria && (
                    <div className="flex flex-col gap-1 shrink-0 w-full sm:w-48 animate-fade-in">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Nova Categoria</span>
                      <input
                        type="text"
                        placeholder="Nome da Categoria"
                        value={novaCategoriaInput}
                        onChange={(e) => setNovaCategoriaInput(e.target.value)}
                        className="px-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:border-zinc-900 font-bold uppercase"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!itemTexto.trim()) return;
                      const catName = mostrarInputNovaCategoria ? novaCategoriaInput.trim().toUpperCase() : itemCategoria;
                      if (!catName) {
                        alert("Por favor, selecione ou digite o nome de uma categoria.");
                        return;
                      }
                      const newItem = {
                        id: 'item_' + Date.now() + Math.random().toString(36).substr(2, 4),
                        categoria: catName,
                        item: itemTexto.trim()
                      };
                      setItensChecklist(prev => [...prev, newItem]);
                      setItemTexto('');
                      if (mostrarInputNovaCategoria) {
                        setNovaCategoriaInput('');
                        setMostrarInputNovaCategoria(false);
                        setItemCategoria(catName);
                      }
                    }}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 text-amber-500 border border-zinc-950 rounded-lg flex items-center justify-center shrink-0 w-full sm:w-auto h-8 sm:h-auto"
                    title="Adicionar Item"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Lista de Itens do Checklist */}
                <div className="border border-zinc-200 rounded-2xl max-h-64 overflow-y-auto divide-y divide-zinc-100">
                  {itensChecklist.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 text-xs font-semibold">
                      Checklist vazio. Adicione itens acima ou use o modelo padrão corporativo.
                    </div>
                  ) : (
                    itensChecklist.map((it, idx) => (
                      editingItemId === it.id ? (
                        <div key={it.id || idx} className="p-3 flex flex-col gap-2.5 bg-amber-50/40 border-l-4 border-amber-500 text-xs">
                          <div className="flex flex-col sm:flex-row gap-2 w-full">
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Categoria</span>
                              <input
                                type="text"
                                value={editingItemCategory}
                                onChange={(e) => setEditingItemCategory(e.target.value.toUpperCase())}
                                className="px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:border-zinc-900 font-bold uppercase"
                                placeholder="Categoria"
                              />
                            </div>
                            <div className="flex-[2] min-w-0 flex flex-col gap-1">
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Descrição do Item</span>
                              <textarea
                                value={editingItemText}
                                onChange={(e) => setEditingItemText(e.target.value)}
                                rows={2}
                                className="px-2.5 py-1 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:border-zinc-900 font-medium"
                                placeholder="Texto do item"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingItemText.trim() || !editingItemCategory.trim()) {
                                  alert("Categoria e texto do item não podem ficar vazios.");
                                  return;
                                }
                                setItensChecklist(prev => prev.map(item => {
                                  if (item.id === it.id) {
                                    return { ...item, categoria: editingItemCategory.trim(), item: editingItemText.trim() };
                                  }
                                  return item;
                                }));
                                setEditingItemId(null);
                                setEditingItemText('');
                                setEditingItemCategory('');
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider rounded-md transition shadow-sm"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(null);
                                setEditingItemText('');
                                setEditingItemCategory('');
                              }}
                              className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-black text-[10px] uppercase tracking-wider rounded-md transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div key={it.id || idx} className="p-2.5 flex items-center justify-between gap-3 bg-white hover:bg-zinc-50 transition text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[9px] text-zinc-400 font-bold">#{idx + 1}</span>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[8px] font-black uppercase tracking-wider shrink-0">
                              {it.categoria} {getRelativeIndexStr(it, itensChecklist)}
                            </span>
                            <span className="font-semibold text-zinc-800 truncate" title={it.item}>{it.item}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(it.id);
                                setEditingItemText(it.item);
                                setEditingItemCategory(it.categoria);
                              }}
                              className="p-1 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded transition shrink-0"
                              title="Editar Item"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setItensChecklist(prev => prev.filter(item => item.id !== it.id))}
                              className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition shrink-0"
                              title="Excluir Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    ))
                  )}
                </div>
              </div>

              {/* Botão de Envio Principal */}
              {editingMachineId ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!novoModelo.trim()) {
                        alert("Por favor, digite o modelo do equipamento.");
                        return;
                      }
                      if (itensChecklist.length === 0) {
                        alert("Por favor, configure pelo menos 1 item no checklist para este equipamento.");
                        return;
                      }
                      const maqAtualizada: Maquina = {
                        id: editingMachineId,
                        modelo: novoModelo.trim(),
                        tipo: novoTipo,
                        numeroSerie: '', // Base template
                        fabricante: 'JF Máquinas',
                        miniaturaBase64: novaMiniatura || undefined,
                        checklistCustomizado: itensChecklist
                      };

                      atualizarMaquina(maqAtualizada, usuarioLogado.usuario);
                      alert(`Sucesso! Equipamento ${maqAtualizada.modelo} atualizado com sucesso.`);
                      
                      // Reset forms
                      setNovoModelo('');
                      setNovaMiniatura('');
                      setDriveLinkInput('');
                      setItensChecklist([]);
                      setEditingMachineId(null);
                      
                      // Refresh list
                      setMaquinas(getMaquinas());
                    }}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs uppercase rounded-xl transition duration-150 flex items-center justify-center gap-2 border-b-4 border-amber-700 shadow-md"
                    id="btn-save-edited-machine"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNovoModelo('');
                      setNovaMiniatura('');
                      setDriveLinkInput('');
                      setItensChecklist([]);
                      setEditingMachineId(null);
                    }}
                    className="py-3 px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs uppercase rounded-xl transition duration-150 flex items-center justify-center gap-2 border border-zinc-300"
                    id="btn-cancel-edited-machine"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!novoModelo.trim()) {
                      alert("Por favor, digite o modelo do equipamento.");
                      return;
                    }
                    if (itensChecklist.length === 0) {
                      alert("Por favor, configure pelo menos 1 item no checklist para este equipamento.");
                      return;
                    }
                    const novaMaq: Maquina = {
                      id: 'm_' + Date.now(),
                      modelo: novoModelo.trim(),
                      tipo: novoTipo,
                      numeroSerie: '', // Base template
                      fabricante: 'JF Máquinas',
                      miniaturaBase64: novaMiniatura || undefined,
                      checklistCustomizado: itensChecklist
                    };

                    cadastrarMaquina(novaMaq, usuarioLogado.usuario);
                    alert(`Sucesso! Equipamento ${novaMaq.modelo} cadastrado com sucesso.`);
                    
                    // Reset forms
                    setNovoModelo('');
                    setNovaMiniatura('');
                    setDriveLinkInput('');
                    setItensChecklist([]);
                    
                    // Refresh list
                    setMaquinas(getMaquinas());
                  }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs uppercase rounded-xl transition duration-150 flex items-center justify-center gap-2 border-b-4 border-amber-700 shadow-md"
                  id="btn-submit-new-machine"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Cadastrar Máquina Corporativa
                </button>
              )}
            </div>
          </div>

          {/* Lista de Modelos Atuais (Direita) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-3xl border-2 border-zinc-900 shadow-md flex flex-col gap-5">
              <div>
                <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-amber-500" />
                  Modelos Ativos no Sistema
                </h3>
                <p className="text-xs text-zinc-500 font-semibold mt-0.5">
                  Lista total de equipamentos e templates disponíveis para os técnicos em campo.
                </p>
              </div>

              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                {maquinas.map((maq) => {
                  const isDemo = maq.id === 'm1';
                  return (
                    <div 
                      key={maq.id} 
                      className="bg-zinc-50 border-2 border-zinc-900 rounded-2xl p-3.5 flex gap-3 items-center justify-between hover:bg-white hover:shadow-sm transition animate-fadeIn"
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        {/* Miniatura do Equipamento */}
                        <div className="w-14 h-14 bg-white border border-zinc-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-sm">
                          {maq.miniaturaBase64 || maq.modelo.toLowerCase().includes('c120') ? (
                            <img 
                              src={maq.miniaturaBase64 || jfC120Img} 
                              alt={maq.modelo} 
                              className="w-full h-full object-contain rounded-lg"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <ForageHarvesterIcon className="w-8 h-8 text-zinc-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-black text-xs text-zinc-900 uppercase truncate leading-tight">{maq.modelo}</h4>
                          <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">{maq.fabricante} • {maq.tipo}</span>
                          <span className="text-[9px] bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider inline-block mt-1">
                            {maq.checklistCustomizado ? `${maq.checklistCustomizado.length} Itens Checklist` : `${getChecklistPadrao().length} Itens (Padrão)`}
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingMachineId(maq.id);
                            setNovoModelo(maq.modelo);
                            setNovoTipo(maq.tipo);
                            setNovaMiniatura(maq.miniaturaBase64 || '');
                            setDriveLinkInput(maq.miniaturaBase64 && maq.miniaturaBase64.startsWith('http') ? maq.miniaturaBase64 : '');
                            setItensChecklist(
                              maq.checklistCustomizado || 
                              getChecklistPadrao().map(i => ({ id: i.id, categoria: i.categoria, item: i.item }))
                            );
                            // Rola a tela de volta para o formulário
                            document.getElementById('dashboard-register-machines-view')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition border border-transparent hover:border-amber-200"
                          title="Editar Equipamento (Alterar Foto / Checklist / Modelo)"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {!isDemo && (
                          <button
                            onClick={() => {
                              setDeleteTargetMachine(maq);
                            }}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition shrink-0 border border-transparent hover:border-red-200"
                            title="Excluir Equipamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Seção de Sincronização, Backup e Compartilhamento de Templates */
        <div className="bg-white border-2 border-zinc-900 rounded-3xl shadow-md p-6 flex flex-col gap-6" id="dashboard-backup-sharing-view">
          <div>
            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
              <Share className="w-5 h-5 text-amber-500" />
              Sincronização & Compartilhamento de Banco de Dados
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-0.5">
              Como este aplicativo funciona localmente (no dispositivo), os dados que você cria, as máquinas que cadastra e os checklists que personaliza (ex: o bloco RECEBIMENTO e seus 43 itens) são salvos apenas neste navegador. Para que outro técnico ou cliente possa ver as mesmas informações, use as ferramentas abaixo.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Opção 1: Compartilhar via Link Rápido */}
            <div className="bg-zinc-50 border-2 border-zinc-900 p-5 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-black text-zinc-900 uppercase">Compartilhar via Link de Sincronização</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Apenas Templates, Clientes e Máquinas</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed font-semibold">
                Gere um link especial contendo todo o seu checklist customizado (incluindo o bloco <strong>RECEBIMENTO</strong> e seus 43 itens), além de clientes e máquinas que você cadastrou. Quando outra pessoa abrir este link no celular ou computador dela, o aplicativo dela irá se atualizar automaticamente com o seu modelo!
              </p>
              <button
                type="button"
                onClick={() => {
                  try {
                    const checklistPadrao = getChecklistPadrao();
                    const maquinasList = getMaquinas();
                    const clientesList = JSON.parse(localStorage.getItem('agro_clientes') || '[]');
                    const payload = {
                      checklist: checklistPadrao,
                      maquinas: maquinasList,
                      clientes: clientesList
                    };
                    const compressed = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
                    // Gera o link de importação de banco completo
                    const shareLink = `${window.location.origin}${window.location.pathname}?import_db=${compressed}`;
                    
                    navigator.clipboard.writeText(shareLink);
                    alert("Link de Sincronização copiado com sucesso! Envie para o outro técnico ou abra no outro dispositivo para carregar todos os seus dados e o checklist de 43 itens.");
                  } catch (err) {
                    console.error(err);
                    alert("Erro ao gerar link de sincronização.");
                  }
                }}
                className="mt-auto w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-amber-500 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 border border-zinc-950"
              >
                Copiar Link de Sincronização
              </button>
            </div>

            {/* Opção 2: Exportar Arquivo de Backup */}
            <div className="bg-zinc-50 border-2 border-zinc-900 p-5 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-amber-500 border border-zinc-950 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-black text-zinc-900 uppercase">Exportar/Importar Arquivo de Backup</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Backup Total (Inclui Histórico de Entregas)</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed font-semibold">
                Você pode baixar um arquivo de backup completo (.json) contendo todos os seus dados (templates, clientes, máquinas e até o <strong>histórico de check-lists preenchidos</strong>) para guardar como segurança ou importar no celular de outro técnico da sua equipe.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const backup = {
                        agro_checklist_padrao: JSON.parse(localStorage.getItem('agro_checklist_padrao') || '[]'),
                        agro_maquinas: getMaquinas(),
                        agro_clientes: JSON.parse(localStorage.getItem('agro_clientes') || '[]'),
                        agro_revendas: JSON.parse(localStorage.getItem('agro_revendas') || '[]'),
                        agro_tecnicos: JSON.parse(localStorage.getItem('agro_tecnicos') || '[]'),
                        agro_entregas: JSON.parse(localStorage.getItem('agro_entregas') || '[]'),
                        agro_logs: getLogs()
                      };
                      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `backup_jf_check_${new Date().toISOString().slice(0,10)}.json`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } catch (err) {
                      alert("Erro ao exportar backup.");
                    }
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center gap-1.5 border-b-4 border-amber-700"
                >
                  Exportar Backup
                </button>
                <label className="flex-1 py-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-zinc-300">
                  Importar Backup
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const data = JSON.parse(event.target?.result as string);
                          if (data) {
                            if (data.agro_checklist_padrao) localStorage.setItem('agro_checklist_padrao', JSON.stringify(data.agro_checklist_padrao));
                            if (data.agro_maquinas) localStorage.setItem('agro_maquinas', JSON.stringify(data.agro_maquinas));
                            if (data.agro_clientes) localStorage.setItem('agro_clientes', JSON.stringify(data.agro_clientes));
                            if (data.agro_revendas) localStorage.setItem('agro_revendas', JSON.stringify(data.agro_revendas));
                            if (data.agro_tecnicos) localStorage.setItem('agro_tecnicos', JSON.stringify(data.agro_tecnicos));
                            if (data.agro_entregas) localStorage.setItem('agro_entregas', JSON.stringify(data.agro_entregas));
                            if (data.agro_logs) localStorage.setItem('agro_logs', JSON.stringify(data.agro_logs));
                            alert("Backup restaurado com sucesso! Todos os dados (clientes, máquinas, relatórios e o checklist de 43 itens) foram carregados.");
                            window.location.reload();
                          }
                        } catch (err) {
                          alert("Erro ao processar o arquivo de backup. Verifique se o arquivo está correto.");
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Opção 3: Restaurar Padrão de Fábrica */}
            <div className="bg-zinc-50 border-2 border-zinc-900 p-5 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-black text-zinc-900 uppercase">Restaurar Padrão de Fábrica</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Redefinir Checklist (43 Itens Oficiais)</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed font-semibold">
                Se você fez alterações personalizadas nos itens do checklist e deseja retornar ao modelo homologado de fábrica com os <strong>43 itens oficiais</strong> de colhedora (incluindo o bloco Recebimento), clique no botão abaixo. Suas entregas técnicas já realizadas continuarão salvas!
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Tem certeza que deseja redefinir o checklist padrão do aplicativo para os 43 itens oficiais de fábrica? Suas customizações locais de checklist serão descartadas. Suas entregas técnicas já realizadas continuarão salvas.")) {
                    try {
                      salvarChecklistPadrao(CHECKLIST_PADRAO, usuarioLogado.usuario);
                      alert("Sucesso! O checklist padrão corporativo foi redefinido para os 43 itens oficiais de fábrica.");
                      window.location.reload();
                    } catch (err) {
                      alert("Erro ao redefinir checklist para o padrão de fábrica.");
                    }
                  }
                }}
                className="mt-auto w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 border-b-4 border-red-800"
              >
                Restaurar Padrão de Fábrica
              </button>
            </div>

          </div>
        </div>
      )}

      {deleteTargetMachine && (
        <ConfirmModal
          isOpen={deleteTargetMachine !== null}
          onClose={() => setDeleteTargetMachine(null)}
          onConfirm={() => {
            if (deleteTargetMachine) {
              excluirMaquina(deleteTargetMachine.id, usuarioLogado.usuario);
              setMaquinas(getMaquinas());
            }
          }}
          title="Excluir Equipamento"
          message={`Deseja excluir o modelo de equipamento "${deleteTargetMachine.modelo}"?`}
        />
      )}
    </div>
  );
}
