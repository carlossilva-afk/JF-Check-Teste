/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Usuario, EntregaTecnica } from './types';
import { 
  inicializarBancoDeDados, getEntregas, sincronizarEntregasLocais, registrarLog, excluirEntrega,
  sincronizarDadosNuvem
} from './utils/db';
import LoginScreen from './components/LoginScreen';
import DeliveryForm from './components/DeliveryForm';
import HistoryList from './components/HistoryList';
import DashboardAdmin from './components/DashboardAdmin';
import PublicVerificationPortal from './components/PublicVerificationPortal';
import ConfirmModal from './components/ConfirmModal';
import { 
  Tractor, LogOut, Wifi, WifiOff, FileText, PlusCircle, LayoutDashboard, 
  Eye, Settings, Compass, ShieldAlert, Sparkles, ArrowUp
} from 'lucide-react';
import { ForageHarvesterIcon } from './components/ForageHarvesterIcon';
import jfLogo from './assets/images/jf_logo.png';

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'admin'>('form');
  const [formStep, setFormStep] = useState(1);
  const [existingDraft, setExistingDraft] = useState<EntregaTecnica | null>(null);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  
  // Sincronização do botão voltar do celular com abas e passos do formulário
  const isNavigatingFromPopstate = useRef(false);

  useEffect(() => {
    if (!usuario) return;
    if (isNavigatingFromPopstate.current) return;

    const currentState = window.history.state;
    if (currentState && currentState.tab === activeTab && currentState.step === formStep) {
      return;
    }

    window.history.pushState({ tab: activeTab, step: formStep }, '');
  }, [activeTab, formStep, usuario]);

  useEffect(() => {
    if (!usuario) return;

    // Inicializa o estado atual do histórico com as abas e passos ativos
    window.history.replaceState({ tab: activeTab, step: formStep }, '');

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && typeof state === 'object' && 'tab' in state) {
        isNavigatingFromPopstate.current = true;
        setActiveTab(state.tab);
        if ('step' in state && state.step !== undefined) {
          setFormStep(state.step);
        }
        setTimeout(() => {
          isNavigatingFromPopstate.current = false;
        }, 0);
      } else {
        // Se voltar para antes do estado inicial, re-empilha para evitar sair do app acidentalmente
        isNavigatingFromPopstate.current = true;
        window.history.pushState({ tab: activeTab, step: formStep }, '');
        setTimeout(() => {
          isNavigatingFromPopstate.current = false;
        }, 0);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, formStep, usuario]);
  
  // Controle de Entrega Técnica Ativa em Andamento
  const [entregaEmAndamento, setEntregaEmAndamento] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [pendingDraftToEdit, setPendingDraftToEdit] = useState<EntregaTecnica | null>(null);
  const [pendingNewDeliveryConfirm, setPendingNewDeliveryConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Lista reativa de entregas carregadas do LocalStorage
  const [entregas, setEntregas] = useState<EntregaTecnica[]>([]);
  
  // Simulações Extras
  const [offlineSimulado, setOfflineSimulado] = useState(false);
  const [altoContraste, setAltoContraste] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Monitora o scroll da página para exibir o botão Voltar ao Topo
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Inicializa o banco de dados local e verifica o link de verificação
  useEffect(() => {
    inicializarBancoDeDados();
    sincronizarDadosNuvem(); // Sincroniza em segundo plano máquinas e checklists

    const handleCloudUpdate = () => {
      refreshData();
    };
    window.addEventListener('agro_db_updated', handleCloudUpdate);

    const urlParams = new URLSearchParams(window.location.search);
    
    // Importa base de dados completa (checklist, maquinas, clientes) de outro dispositivo/técnico
    const importDbParam = urlParams.get('import_db');
    if (importDbParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(importDbParam))));
        if (decoded) {
          if (decoded.checklist) {
            localStorage.setItem('agro_checklist_padrao', JSON.stringify(decoded.checklist));
          }
          if (decoded.maquinas) {
            localStorage.setItem('agro_maquinas', JSON.stringify(decoded.maquinas));
          }
          if (decoded.clientes) {
            localStorage.setItem('agro_clientes', JSON.stringify(decoded.clientes));
          }
          alert('Configurações importadas com sucesso! Seu aplicativo agora possui exatamente os mesmos templates de checklist (ex: bloco RECEBIMENTO de 43 itens), equipamentos cadastrados e clientes do dispositivo de origem.');
          
          // Limpa URL e recarrega
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.reload();
          return;
        }
      } catch (err) {
        console.error('Erro ao importar banco de dados via link:', err);
        alert('Falha ao sincronizar dados. O link de sincronização pode estar incompleto ou corrompido.');
      }
    }

    refreshData();

    const auditId = urlParams.get('verify');
    if (auditId) {
      setVerifyId(auditId);
    }

    return () => {
      window.removeEventListener('agro_db_updated', handleCloudUpdate);
    };
  }, []);

  const refreshData = () => {
    setEntregas(getEntregas());
  };

  const handleLogin = (user: Usuario) => {
    setUsuario(user);
    registrarLog(user.nome, 'LOGIN', `O usuário ${user.nome} efetuou login com sucesso no aplicativo.`);
  };

  const handleLogout = () => {
    if (usuario) {
      registrarLog(usuario.nome, 'LOGOUT', `O usuário ${usuario.nome} encerrou a sessão.`);
    }
    setUsuario(null);
    setExistingDraft(null);
    setEntregaEmAndamento(false);
    setFormStep(1);
  };

  const handleLogoutClick = () => {
    if (entregaEmAndamento) {
      setShowLogoutConfirm(true);
    } else {
      handleLogout();
    }
  };

  const handleSync = async () => {
    if (!usuario) return;
    setSyncing(true);
    const count = await sincronizarEntregasLocais(usuario.nome);
    setSyncing(false);
    refreshData();
    if (count > 0) {
      alert(`Sincronização completa! ${count} Check List(s) pendente(s) sincronizado(s) com a nuvem.`);
    } else {
      alert("Todos os dados do dispositivo já estão atualizados na nuvem.");
    }
  };

  const handleEditDraft = (draft: EntregaTecnica) => {
    if (entregaEmAndamento) {
      setPendingDraftToEdit(draft);
    } else {
      setExistingDraft(draft);
      setActiveTab('form');
    }
  };

  const handleDeleteEntrega = (id: string) => {
    setDeleteTargetId(id);
  };

  // Se houver um ID para verificação de laudo técnico, exibe o portal de auditoria pública sem exigir login
  if (verifyId) {
    return (
      <PublicVerificationPortal 
        verifyId={verifyId} 
        onGoToLogin={() => {
          // Limpa o parâmetro de busca da URL para não recarregar no portal
          window.history.replaceState({}, document.title, window.location.pathname);
          setVerifyId(null);
        }} 
      />
    );
  }

  // Se o usuário não estiver logado, exibe tela de login
  if (!usuario) {
    return <LoginScreen onLoginSuccess={handleLogin} />;
  }

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col font-sans transition-all duration-200 ${altoContraste ? 'theme-high-contrast bg-neutral-200' : ''}`}>
      {/* HEADER PRINCIPAL (BARRA DE STATUS E PERFIL) */}
      <header className="bg-zinc-950 text-white shadow-lg relative z-20 px-3 sm:px-6 py-2 sm:py-3.5 border-b-2 border-amber-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 md:gap-4">
          
          {/* Logo e Info Concessionária + Botão de Sair no mobile */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.45)] hover:shadow-[0_0_15px_rgba(245,158,11,0.7)] transition-all duration-300">
                <img 
                  src={jfLogo} 
                  alt="Logo JF" 
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tighter uppercase leading-none flex items-center gap-1.5">
                  JF <span className="text-amber-500">CHECK</span> <span className="font-mono text-[10px] sm:text-xs font-medium lowercase italic opacity-60">v1.0</span>
                </h1>
                <p className="text-[8px] sm:text-[9px] md:text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest mt-0.5">
                  A solução para o produtor
                </p>
              </div>
            </div>

            {/* Logout visível apenas no mobile na linha do topo */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={handleLogoutClick}
                className="p-1.5 bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-white rounded-lg transition border border-zinc-800"
                title="Sair do aplicativo"
                id="btn-logout-mobile"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Área de Modo de Campo (Offline), Contraste e Perfil */}
          <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto border-t border-zinc-900 md:border-t-0 pt-2 md:pt-0 mt-0.5 md:mt-0">
            
            {/* Badges de Status / Toggles */}
            <div className="flex items-center gap-1.5">
              {/* Toggle de Alto Contraste para Sol do Campo */}
              <button
                onClick={() => setAltoContraste(!altoContraste)}
                className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black border transition uppercase tracking-wider ${
                  altoContraste 
                    ? 'bg-amber-400 text-black border-amber-500 shadow-sm' 
                    : 'bg-zinc-900 text-zinc-300 border-zinc-850 hover:bg-zinc-850'
                }`}
                title="Aumentar contraste para visualização sob luz solar intensa"
                id="btn-high-contrast"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span className="hidden sm:inline">{altoContraste ? 'Contraste Ativo' : 'Modo Campo'}</span>
                <span className="sm:hidden">{altoContraste ? 'Sol Ativo' : 'Modo Sol'}</span>
              </button>

              {/* Simulação Offline */}
              <button
                onClick={() => {
                  const novoEstado = !offlineSimulado;
                  setOfflineSimulado(novoEstado);
                  if (usuario) {
                    registrarLog(usuario.nome, novoEstado ? 'SIMULAÇÃO_OFFLINE' : 'SIMULAÇÃO_ONLINE', `Técnico alterou o status de conectividade para ${novoEstado ? 'OFFLINE' : 'ONLINE'}`);
                  }
                }}
                className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black border transition uppercase tracking-wider ${
                  offlineSimulado 
                    ? 'bg-amber-600 text-white border-amber-500 shadow' 
                    : 'bg-zinc-900 text-zinc-300 border-zinc-850 hover:bg-zinc-850'
                }`}
                id="btn-toggle-offline-simulation"
              >
                {offlineSimulado ? (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" /> Sem Rede
                  </>
                ) : (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-500" /> Sincronizado
                  </>
                )}
              </button>
            </div>

            {/* Perfil Técnico (Desktop) */}
            <div className="hidden md:flex items-center gap-3 border-l border-zinc-800 pl-3">
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-widest opacity-60 font-black block text-amber-500">Técnico</span>
                <span className="text-xs font-bold text-white block">{usuario.nome}</span>
              </div>
              <button
                onClick={handleLogoutClick}
                className="p-2 bg-zinc-900 hover:bg-rose-950 text-zinc-300 hover:text-white rounded-xl transition border border-zinc-850"
                title="Sair do aplicativo"
                id="btn-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* NAVEGAÇÃO PRINCIPAL (ABAS DE SEÇÃO) */}
      <nav className="bg-white border-b-2 border-zinc-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex justify-around sm:justify-start gap-1">
          <button
            onClick={() => {
              if (entregaEmAndamento) {
                if (activeTab === 'form') {
                  setPendingNewDeliveryConfirm(true);
                } else {
                  setActiveTab('form');
                }
              } else {
                setExistingDraft(null);
                setActiveTab('form');
              }
            }}
            className={`flex items-center gap-1.5 py-2.5 px-3 sm:py-3 sm:px-5 font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-wider border-b-4 transition duration-150 ${
              activeTab === 'form' 
                ? 'border-zinc-900 text-zinc-900' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
            id="nav-tab-new"
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Nova Entrega</span>
          </button>

          <button
            onClick={() => {
              refreshData();
              setActiveTab('history');
            }}
            className={`flex items-center gap-1.5 py-2.5 px-3 sm:py-3 sm:px-5 font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-wider border-b-4 transition duration-150 ${
              activeTab === 'history' 
                ? 'border-zinc-900 text-zinc-900' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
            id="nav-tab-history"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Históricos Checklists</span>
          </button>

          {/* O Painel Admin fica visível apenas para o e-mail administrador mestre */}
          {usuario && usuario.usuario.toLowerCase() === 'carlos.silva@industriasnb.com.br' && (
            <button
              onClick={() => {
                refreshData();
                setActiveTab('admin');
              }}
              className={`flex items-center gap-1.5 py-2.5 px-3 sm:py-3 sm:px-5 font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-wider border-b-4 transition duration-150 ${
                activeTab === 'admin' 
                  ? 'border-zinc-900 text-zinc-900' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
              id="nav-tab-admin"
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span>Painel Admin</span>
            </button>
          )}
        </div>
      </nav>

      {/* ÁREA DE CONTEÚDO */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        
        {/* Notificação de simulação Offline ativo */}
        {offlineSimulado && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center justify-between gap-3 animate-pulse">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              Modo Offline Ativo: As novas entregas técnicas finalizadas serão salvas no armazenamento local do dispositivo e precisarão ser sincronizadas quando retornar à rede.
            </span>
            <button
              onClick={() => setOfflineSimulado(false)}
              className="text-[10px] bg-amber-600 text-white px-2.5 py-1 rounded-lg hover:bg-amber-700 transition"
              id="btn-notify-sync"
            >
              Ativar Rede
            </button>
          </div>
        )}

        {/* COMPONENTES DAS ABAS */}
        <div className={activeTab === 'form' ? '' : 'hidden'}>
          <DeliveryForm
            key={formKey}
            usuarioLogado={usuario}
            onFinalized={() => {
              setExistingDraft(null);
              setEntregaEmAndamento(false);
              setFormKey(prev => prev + 1);
              setFormStep(1);
              refreshData();
              setActiveTab('history');
            }}
            existingDraft={existingDraft}
            onStatusChange={setEntregaEmAndamento}
            activeTab={activeTab}
            step={formStep}
            setStep={setFormStep}
          />
        </div>

        {activeTab === 'history' && (
          <HistoryList
            entregas={entregas}
            onEditDraft={handleEditDraft}
            onSyncTrigger={handleSync}
            syncing={syncing}
            onDeleteEntrega={handleDeleteEntrega}
          />
        )}

        {activeTab === 'admin' && (
          <DashboardAdmin entregas={entregas} usuarioLogado={usuario} />
        )}

      </main>

      {/* RODAPÉ PREMIUM CORPORATIVO */}
      <footer className="bg-zinc-950 text-zinc-400 border-t-2 border-amber-500/30 mt-16 relative z-10 overflow-hidden">
        {/* Subtle top decoration */}
        <div className="h-1 bg-gradient-to-r from-amber-500/10 via-amber-500/40 to-amber-500/10" />
        
        <div className="max-w-7xl mx-auto px-6 py-6 md:py-8">
          {/* Notas de rodapé e direitos */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold">
            <div className="text-center md:text-left space-y-1">
              <p className="text-zinc-300">
                © 2026 JF Máquinas • Todos os direitos reservados.
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/60 shrink-0">
              <span className="text-zinc-400">LOGADO:</span>
              <span className="text-amber-500/80 font-black">{usuario.usuario}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Botão Flutuante Voltar ao Topo */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-50 p-3 bg-zinc-900/90 hover:bg-zinc-800 backdrop-blur-md text-amber-500 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-300 flex items-center justify-center group hover:-translate-y-1 ${
          showScrollTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        title="Voltar ao topo"
        aria-label="Voltar ao topo"
        id="btn-back-to-top"
      >
        <ArrowUp className="w-5 h-5 stroke-[2] transition-transform duration-200 group-hover:-translate-y-0.5" />
      </button>

      <ConfirmModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            excluirEntrega(deleteTargetId, usuario?.nome || 'Sistema');
            refreshData();
          }
        }}
        title="Excluir Check List - Entrega Técnica"
        message={`Tem certeza de que deseja apagar o Check List - Entrega Técnica "${deleteTargetId}"? Essa operação é irreversível e removerá todos os registros associados.`}
      />

      <ConfirmModal
        isOpen={pendingNewDeliveryConfirm}
        onClose={() => setPendingNewDeliveryConfirm(false)}
        onConfirm={() => {
          setPendingNewDeliveryConfirm(false);
          setExistingDraft(null);
          setEntregaEmAndamento(false);
          setFormKey(prev => prev + 1);
          setFormStep(1);
        }}
        title="Descartar Entrega Técnica"
        message="Você já possui uma entrega técnica em andamento. Deseja descartar a atual para iniciar uma nova do zero?"
      />

      <ConfirmModal
        isOpen={pendingDraftToEdit !== null}
        onClose={() => setPendingDraftToEdit(null)}
        onConfirm={() => {
          if (pendingDraftToEdit) {
            setFormKey(prev => prev + 1);
            setExistingDraft(pendingDraftToEdit);
            setEntregaEmAndamento(true);
            setActiveTab('form');
            setPendingDraftToEdit(null);
          }
        }}
        title="Substituir Entrega Técnica"
        message={`Você já possui uma entrega técnica em andamento. Deseja descartar a atual para abrir o rascunho de "${pendingDraftToEdit?.cliente?.nome}"?`}
      />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          setFormKey(prev => prev + 1);
          setFormStep(1);
          handleLogout();
        }}
        title="Sair do Aplicativo"
        message="Você possui uma entrega técnica ativa em andamento. Se você sair agora, todos os dados não finalizados e fotos serão perdidos definitivamente. Deseja sair mesmo assim?"
      />
    </div>
  );
}
