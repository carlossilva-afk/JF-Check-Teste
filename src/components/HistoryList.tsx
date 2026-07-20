/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EntregaTecnica } from '../types';
import { 
  Search, FileText, Download, Clock, MapPin, CheckCircle, AlertTriangle, 
  CloudLightning, RefreshCw, Eye, Share2, MessageSquare, Mail, Copy, 
  ExternalLink, X, Check, ShieldCheck, Info, Trash2, Pencil
} from 'lucide-react';
import { gerarPDFEntrega } from '../utils/pdfGenerator';
import EmailModal from './EmailModal';
import jfC120Img from '../assets/images/jf_c120_at_1783939073974.jpg';
import { ForageHarvesterIcon } from './ForageHarvesterIcon';
import { compressEntrega } from '../utils/compression';

interface HistoryListProps {
  onEditDraft: (entrega: EntregaTecnica) => void;
  onSyncTrigger: () => void;
  syncing: boolean;
  entregas: EntregaTecnica[];
  onDeleteEntrega: (id: string) => void;
}

export default function HistoryList({ onEditDraft, onSyncTrigger, syncing, entregas, onDeleteEntrega }: HistoryListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'rascunho' | 'finalizado'>('todos');
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaTecnica | null>(null);
  
  // Estado para Compartilhamento/Envio Inteligente
  const [shareEntrega, setShareEntrega] = useState<EntregaTecnica | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const getShareMessage = (entrega: EntregaTecnica) => {
    // Se a entrega já está sincronizada ou já possui um link curto, utiliza ele diretamente
    let auditUrl = entrega.qrCodeUrl || `${window.location.origin}${window.location.pathname || ''}?verify=${entrega.id}`;
    
    // Fallback apenas se estiver pendente de sincronização (offline) e não tiver dados de compactação no link
    if (entrega.status === 'pendente_sincronizacao' && !auditUrl.includes('&data=')) {
      try {
        const compressed = compressEntrega(entrega);
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(compressed))));
        auditUrl = `${window.location.origin}${window.location.pathname || ''}?verify=${entrega.id}&data=${b64}`;
      } catch (err) {
        console.error("Erro na compactação de fallback:", err);
      }
    }

    return `*JF CHECK - TERMO DE ENTREGA TÉCNICA E GARANTIA* 🌾🚜
--------------------------------------------------
*Nº do Termo:* ${entrega.id}
*Cliente:* ${entrega.cliente.nome}
*Propriedade:* ${entrega.cliente.fazenda} - ${entrega.cliente.cidade}/${entrega.cliente.estado}
*Equipamento:* ${entrega.maquina.modelo} (Série: ${entrega.maquina.numeroSerie || 'N/A'})
*Revenda:* ${entrega.revenda.nome}
*Técnico Responsável:* ${entrega.tecnico.nome}
*Data de Emissão:* ${new Date(entrega.dataFinalizacao || entrega.dataCriacao).toLocaleDateString('pt-BR')}

📍 *Geolocalização do Registro:*
Latitude: ${entrega.localizacao.latitude ? entrega.localizacao.latitude.toFixed(6) : 'N/A'}
Longitude: ${entrega.localizacao.longitude ? entrega.localizacao.longitude.toFixed(6) : 'N/A'}

🔐 *Verificação de Integridade Digital:*
Acesse para auditar: ${auditUrl}

*JF Máquinas - A solução para o produtor* ⚡️`;
  };

  const renderDetailsCard = (entrega: EntregaTecnica, isMobile = false) => {
    return (
      <div className={`bg-white border-2 border-zinc-900 rounded-2xl shadow-md overflow-hidden flex flex-col ${isMobile ? 'max-h-[90vh] w-full' : 'sticky top-4 max-h-[85vh]'}`}>
        {/* Header */}
        <div className="px-5 py-4 bg-zinc-900 text-white flex items-center justify-between border-b-2 border-zinc-950 shrink-0">
          <div>
            <span className="text-[10px] font-mono text-zinc-300 uppercase font-bold tracking-wider">Código de Auditoria</span>
            <h4 className="font-bold text-sm font-mono text-amber-400">{entrega.id}</h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(evt) => {
                evt.stopPropagation();
                onEditDraft(entrega);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
              id={`${isMobile ? 'mobile-' : ''}btn-sidebar-edit`}
              title="Editar Check List"
            >
              <Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Editar</span>
            </button>
            <button
              onClick={(evt) => {
                evt.stopPropagation();
                setShareEntrega(entrega);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition"
              id={`${isMobile ? 'mobile-' : ''}btn-sidebar-share`}
              title="Compartilhar / Enviar"
            >
              <Share2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Enviar</span>
            </button>
            <button
              onClick={(evt) => {
                evt.stopPropagation();
                const doc = gerarPDFEntrega(entrega);
                doc.save(`Check_List_Entrega_Tecnica_${entrega.id}.pdf`);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg transition"
              id={`${isMobile ? 'mobile-' : ''}btn-sidebar-pdf-download`}
            >
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={(evt) => {
                evt.stopPropagation();
                onDeleteEntrega(entrega.id);
                setSelectedEntrega(null);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition border border-rose-700"
              id={`${isMobile ? 'mobile-' : ''}btn-sidebar-delete`}
              title="Apagar Check List"
            >
              <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Apagar</span>
            </button>
            
            {isMobile && (
              <button
                onClick={(evt) => {
                  evt.stopPropagation();
                  setSelectedEntrega(null);
                }}
                className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition ml-1"
                title="Fechar Detalhes"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Corpo */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6 text-sm scrollbar-thin">
          <div>
            <h5 className="font-black text-zinc-900 border-b-2 border-zinc-900 pb-1 text-xs uppercase tracking-wider">Dados Cliente</h5>
            <div className="mt-2.5 space-y-1.5 text-xs text-zinc-700 font-medium">
              <p><span className="font-bold text-zinc-900">Nome:</span> {entrega.cliente.nome}</p>
              <p><span className="font-bold text-zinc-900">Fazenda:</span> {entrega.cliente.fazenda}</p>
              <p><span className="font-bold text-zinc-900">CPF/CNPJ:</span> {entrega.cliente.documento}</p>
              <p><span className="font-bold text-zinc-900">Local:</span> {entrega.cliente.cidade} - {entrega.cliente.estado}</p>
            </div>
          </div>

          <div>
            <h5 className="font-black text-zinc-900 border-b-2 border-zinc-900 pb-1 text-xs uppercase tracking-wider">Dados Maquinário</h5>
            <div className="flex items-start justify-between gap-3 mt-2.5">
              <div className="space-y-1.5 text-xs text-zinc-700 font-medium flex-1">
                <p><span className="font-bold text-zinc-900">Modelo:</span> {entrega.maquina.modelo}</p>
                <p><span className="font-bold text-zinc-900">S/N:</span> <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-zinc-800 text-[11px] font-bold border">{entrega.maquina.numeroSerie}</code></p>
                <p><span className="font-bold text-zinc-900">Fabricante:</span> {entrega.maquina.fabricante}</p>
                <p><span className="font-bold text-zinc-900">Técnico:</span> {entrega.tecnico.nome}</p>
                <p><span className="font-bold text-zinc-900">Revenda:</span> {entrega.revenda.nome}</p>
              </div>
              <div className="w-20 h-20 bg-amber-50/50 border border-amber-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1.5 shadow-sm">
                {entrega.maquina.modelo.toLowerCase().includes('c120') || entrega.maquina.miniaturaBase64 ? (
                  <img 
                    src={entrega.maquina.modelo.toLowerCase().includes('c120') ? jfC120Img : (entrega.maquina.miniaturaBase64 || jfC120Img)} 
                    alt={entrega.maquina.modelo} 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = jfC120Img;
                    }}
                  />
                ) : (
                  <ForageHarvesterIcon className="w-10 h-10 text-zinc-400" />
                )}
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-black text-zinc-900 border-b-2 border-zinc-900 pb-1 text-xs uppercase tracking-wider">Auditoria de Campo</h5>
            <div className="mt-2.5 space-y-2 text-xs text-zinc-700 font-medium">
              <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" /> <span className="font-bold text-zinc-900">Lat:</span> {entrega.localizacao.latitude || 'GPS Desativado'}</p>
              <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" /> <span className="font-bold text-zinc-900">Long:</span> {entrega.localizacao.longitude || 'GPS Desativado'}</p>
              <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> <span className="font-bold text-zinc-900">Tempo Execução:</span> {Math.floor(entrega.tempoExecucaoSegundos / 60)}m {entrega.tempoExecucaoSegundos % 60}s</p>
            </div>
          </div>

          <div>
            <h5 className="font-black text-zinc-900 border-b-2 border-zinc-900 pb-1 text-xs uppercase tracking-wider">Itens do Checklist</h5>
            <div className="mt-2.5 divide-y divide-zinc-100 max-h-48 overflow-y-auto pr-1">
              {entrega.checklist.map((item) => (
                <div key={item.id} className="py-2 flex items-start justify-between gap-2 text-[11px]">
                  <span className="text-zinc-700 font-bold line-clamp-1">{item.item}</span>
                  {item.conforme === 'conforme' ? (
                    <span className="text-emerald-800 font-black uppercase bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] border border-emerald-300">OK</span>
                  ) : (
                    <span className="text-rose-700 font-black uppercase bg-rose-50 px-1.5 py-0.5 rounded text-[9px] border border-rose-200">Ajuste</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="font-black text-zinc-900 border-b-2 border-zinc-900 pb-1 text-xs uppercase tracking-wider">Assinaturas Registradas</h5>
            <div className="grid grid-cols-2 gap-3 mt-2.5">
              <div className="border-2 border-zinc-200 rounded-xl p-2 bg-zinc-50 text-center">
                <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Técnico</span>
                {entrega.assinaturas.tecnico ? (
                  <img 
                    src={entrega.assinaturas.tecnico} 
                    alt="Assinatura Técnico" 
                    className="max-h-12 mx-auto object-contain bg-white border border-zinc-200 rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[10px] text-red-500 font-bold">Pendente</span>
                )}
              </div>
              <div className="border-2 border-zinc-200 rounded-xl p-2 bg-zinc-50 text-center">
                <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Cliente</span>
                {entrega.assinaturas.cliente ? (
                  <img 
                    src={entrega.assinaturas.cliente} 
                    alt="Assinatura Cliente" 
                    className="max-h-12 mx-auto object-contain bg-white border border-zinc-200 rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[10px] text-red-500 font-bold">Pendente</span>
                )}
              </div>
            </div>
          </div>

          {entrega.observacoesGerais && (
            <div>
              <h5 className="font-black text-zinc-900 border-b-2 border-zinc-900 pb-1 text-xs uppercase tracking-wider">Observações Gerais</h5>
              <p className="mt-2.5 text-xs italic text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-200">{entrega.observacoesGerais}</p>
            </div>
          )}
        </div>
        
        {isMobile && (
          <div className="px-5 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-end shrink-0">
            <button
              onClick={(evt) => {
                evt.stopPropagation();
                setSelectedEntrega(null);
              }}
              className="px-4 py-2 bg-zinc-950 text-white font-black text-xs uppercase tracking-wider rounded-xl transition hover:bg-zinc-800"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    );
  };

  // Filtra as entregas
  const filtered = entregas.filter(e => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      e.id.toLowerCase().includes(term) ||
      e.cliente.nome.toLowerCase().includes(term) ||
      e.cliente.fazenda.toLowerCase().includes(term) ||
      e.maquina.modelo.toLowerCase().includes(term) ||
      e.maquina.numeroSerie.toLowerCase().includes(term);

    const matchesStatus = 
      statusFilter === 'todos' || 
      (statusFilter === 'rascunho' && e.status === 'rascunho') ||
      (statusFilter === 'finalizado' && e.status !== 'rascunho');

    return matchesSearch && matchesStatus;
  });

  const handleDownloadPDF = (e: EntregaTecnica, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const doc = gerarPDFEntrega(e);
      doc.save(`Check_List_Entrega_Tecnica_${e.id}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF", err);
      alert("Falha ao gerar o PDF da entrega.");
    }
  };

  return (
    <div className="flex flex-col gap-6" id="history-container">
      {/* Barra de Filtros e Sincronismo */}
      <div className="bg-white p-5 rounded-2xl border-2 border-zinc-900 shadow-md flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por S/N, modelo, fazenda, cliente ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border-2 border-zinc-200 rounded-xl text-sm font-semibold bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition duration-150"
            id="history-search"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto px-4 py-3 border-2 border-zinc-300 rounded-xl text-xs font-black uppercase tracking-wider bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center sm:text-left"
            id="history-status-filter"
          >
            <option value="todos">Todos os status</option>
            <option value="rascunho">Pendente (Rascunho)</option>
            <option value="finalizado">Finalizado</option>
          </select>

          <button
            onClick={onSyncTrigger}
            disabled={syncing}
            className={`flex items-center justify-center gap-1.5 px-5 py-3 text-xs font-black uppercase tracking-widest text-white bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 disabled:bg-zinc-300 rounded-xl transition shadow-md border-2 border-zinc-950 w-full sm:w-auto shrink-0 ${syncing ? 'animate-pulse' : ''}`}
            id="btn-sync-all"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {/* Lista Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Lista de Cards */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2 uppercase tracking-tight">
            <FileText className="text-amber-500 w-5 h-5" />
            Check Lists Registrados ({filtered.length})
          </h3>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-8 text-center text-zinc-500 flex flex-col items-center gap-2">
              <AlertTriangle className="w-8 h-8 text-zinc-300" />
              Nenhum Check List encontrado com as especificações informadas.
            </div>
          ) : (
            filtered.map((e) => {
              const temNaoConforme = e.checklist.some(item => item.conforme === 'nao_conforme');
              return (
                <div
                  key={e.id}
                  onClick={() => setSelectedEntrega(e)}
                  className={`rounded-2xl border-2 p-5 shadow-md hover:shadow-lg transition duration-150 cursor-pointer flex flex-col md:flex-row items-start justify-between gap-4 border-l-8 ${
                    e.status === 'rascunho'
                      ? selectedEntrega?.id === e.id 
                        ? 'bg-amber-50/15 border-zinc-900 border-l-amber-500 ring-2 ring-amber-500/50' 
                        : 'bg-zinc-50 border-zinc-200 border-l-amber-500/60'
                      : selectedEntrega?.id === e.id
                        ? 'bg-emerald-50/10 border-zinc-900 border-l-emerald-500 ring-2 ring-emerald-500/50'
                        : 'bg-white border-zinc-300 border-l-emerald-500'
                  }`}
                  id={`card-delivery-${e.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-zinc-400 font-mono">{e.id}</span>
                      {e.status === 'rascunho' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                          <Clock className="w-3 h-3 animate-pulse text-amber-600" /> Rascunho (Pendente)
                        </span>
                      ) : e.status === 'sincronizado' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Sincronizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-700 bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-300">
                          <CloudLightning className="w-3 h-3 animate-pulse text-zinc-500" /> Offline (Finalizado)
                        </span>
                      )}

                      {temNaoConforme && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> Ajustes
                        </span>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-black text-zinc-900 text-lg uppercase tracking-tight">{e.cliente.nome}</h4>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5 text-xs text-zinc-500">
                          <div>
                            <span className="font-bold text-zinc-700">Fazenda: </span>
                            {e.cliente.fazenda}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-700">Modelo: </span>
                            {e.maquina.modelo}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-700">Chassi: </span>
                            <code className="text-[11px] bg-zinc-100 px-1 py-0.5 rounded font-mono text-zinc-600">{e.maquina.numeroSerie}</code>
                          </div>
                          <div>
                            <span className="font-bold text-zinc-700">Cidade: </span>
                            {e.cliente.cidade} - {e.cliente.estado}
                          </div>
                        </div>
                      </div>

                      <div className="w-16 h-16 bg-amber-50/50 border border-amber-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-sm mt-1">
                        {e.maquina.modelo.toLowerCase().includes('c120') || e.maquina.miniaturaBase64 ? (
                          <img 
                            src={e.maquina.modelo.toLowerCase().includes('c120') ? jfC120Img : (e.maquina.miniaturaBase64 || jfC120Img)} 
                            alt={e.maquina.modelo} 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = jfC120Img;
                            }}
                          />
                        ) : (
                          <ForageHarvesterIcon className="w-8 h-8 text-zinc-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100">
                    <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(e.dataFinalizacao || e.dataCriacao).toLocaleDateString('pt-BR')}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={(evt) => {
                          evt.stopPropagation();
                          onEditDraft(e);
                        }}
                        className="p-2 text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition border border-blue-200"
                        title="Editar Check List"
                        id={`btn-edit-${e.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(evt) => {
                          evt.stopPropagation();
                          setShareEntrega(e);
                        }}
                        className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 rounded-lg transition border border-emerald-200"
                        title="Compartilhar / Enviar"
                        id={`btn-share-${e.id}`}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(evt) => handleDownloadPDF(e, evt)}
                        className="p-2 text-amber-700 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 rounded-lg transition border border-amber-200"
                        title="Baixar Check List em PDF"
                        id={`btn-pdf-${e.id}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(evt) => {
                          evt.stopPropagation();
                          setSelectedEntrega(e);
                        }}
                        className="p-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 rounded-lg transition border"
                        title="Visualizar Detalhes"
                        id={`btn-view-${e.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(evt) => {
                          evt.stopPropagation();
                          onDeleteEntrega(e.id);
                          if (selectedEntrega?.id === e.id) {
                            setSelectedEntrega(null);
                          }
                        }}
                        className="p-2 text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 rounded-lg transition border border-rose-200"
                        title="Apagar Check List"
                        id={`btn-delete-${e.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Lado Direito: Visualizador de Detalhes Completo */}
        <div className="hidden lg:block lg:col-span-1">
          {selectedEntrega ? (
            renderDetailsCard(selectedEntrega, false)
          ) : (
            <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-8 text-center text-zinc-500 flex flex-col items-center gap-3 sticky top-4 bg-white shadow-md">
              <FileText className="w-10 h-10 text-zinc-400" />
              <p className="text-sm font-black uppercase tracking-tight text-zinc-800">Selecione um termo de entrega técnica para visualizar a auditoria completa.</p>
            </div>
          )}
        </div>
      </div>

      {/* Visualizador de Detalhes para Dispositivos Móveis */}
      {selectedEntrega && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-40 lg:hidden flex items-center justify-center p-4" id="modal-details-mobile">
          <div className="w-full max-w-xl">
            {renderDetailsCard(selectedEntrega, true)}
          </div>
        </div>
      )}

      {shareEntrega && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="modal-envio-inteligente">
          <div className="bg-zinc-900 text-white w-full max-w-2xl rounded-3xl border-4 border-amber-500 shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 text-zinc-950 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                  <Share2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">Envio Inteligente</h3>
                  <span className="text-[10px] text-amber-500 font-bold block uppercase tracking-wider">Check List - Entrega Técnica {shareEntrega.id}</span>
                </div>
              </div>
              <button
                onClick={() => setShareEntrega(null)}
                className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
              
              {/* Resumo do Destinatário */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-black block">Cliente / Produtor</span>
                  <span className="font-bold text-white block mt-0.5">{shareEntrega.cliente.nome}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-black block">Máquina / Modelo</span>
                  <span className="font-bold text-white block mt-0.5">{shareEntrega.maquina.modelo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-black block">Fazenda / Local</span>
                  <span className="font-bold text-white block mt-0.5 truncate">{shareEntrega.cliente.fazenda} ({shareEntrega.cliente.cidade}-{shareEntrega.cliente.estado})</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-black block">Data de Registro</span>
                  <span className="font-bold text-white block mt-0.5">{new Date(shareEntrega.dataFinalizacao || shareEntrega.dataCriacao).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* Botões Rápidos de Despacho */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WhatsApp Link */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getShareMessage(shareEntrega))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-950 hover:bg-emerald-900 border-2 border-emerald-500/30 text-emerald-100 p-4 rounded-2xl transition flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-md">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <ExternalLink className="w-4 h-4 text-emerald-400 opacity-50 group-hover:opacity-100 transition" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Canal Preferencial</span>
                    <h5 className="font-black text-sm uppercase tracking-tight text-white mt-0.5">Enviar via WhatsApp</h5>
                    <p className="text-[11px] text-emerald-300 font-medium mt-1">Abre o WhatsApp Web/App com a mensagem formatada para o produtor.</p>
                  </div>
                </a>

                {/* E-mail Link */}
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="bg-sky-950 hover:bg-sky-900 border-2 border-sky-500/30 text-sky-100 p-4 rounded-2xl transition flex flex-col justify-between text-left gap-3 group"
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-sky-500 text-white rounded-xl flex items-center justify-center shadow-md">
                      <Mail className="w-5 h-5" />
                    </div>
                    <ExternalLink className="w-4 h-4 text-sky-400 opacity-50 group-hover:opacity-100 transition" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">Relatório Formal</span>
                    <h5 className="font-black text-sm uppercase tracking-tight text-white mt-0.5">Enviar via E-mail</h5>
                    <p className="text-[11px] text-sky-300 font-medium mt-1">Preenche assunto e corpo no seu aplicativo oficial de e-mail.</p>
                  </div>
                </button>
              </div>

              {/* Pré-visualização da mensagem formatada */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Mensagem de Envio</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(getShareMessage(shareEntrega));
                      setCopiedMessage(true);
                      setTimeout(() => setCopiedMessage(false), 2000);
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded font-black uppercase flex items-center gap-1.5 transition ${
                      copiedMessage 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedMessage ? 'Copiada!' : 'Copiar Mensagem'}
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-32 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  {getShareMessage(shareEntrega)}
                </pre>
              </div>

              {/* Dica Importante */}
              <div className="bg-amber-950/40 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200/80 leading-normal">
                  <strong>Nota técnica:</strong> Se desejar enviar também o arquivo PDF anexo pelo WhatsApp, utilize a opção de e-mail ou faça o download do PDF primeiro e depois anexe-o na janela de chat que será aberta.
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShareEntrega(null)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {shareEntrega && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          subject={`[JF CHECK] Termo de Entrega Técnica Emitido - ${shareEntrega.id}`}
          body={getShareMessage(shareEntrega)}
          recipientName={shareEntrega.cliente.nome}
        />
      )}
    </div>
  );
}
