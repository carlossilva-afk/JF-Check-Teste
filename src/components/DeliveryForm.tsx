/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Cliente, Maquina, Revenda, ItemChecklist, EntregaTecnica, Usuario, FotosGerais 
} from '../types';
import { 
  CLIENTES_PADRAO, MAQUINAS_PADRAO, REVENDAS_PADRAO, CHECKLIST_PADRAO, 
  salvarEntrega, gerarIdEntrega, getMaquinas, cadastrarMaquina,
  getChecklistPadrao, salvarChecklistPadrao, getRelativeIndexStr
} from '../utils/db';
import { 
  Tractor, User, FileText, CheckCircle2, ChevronRight, ChevronLeft, 
  Camera, MapPin, Sparkles, Clock, Info, Check, X, AlertTriangle, Eye, Video,
  Share2, Send, Mail, FileDown, ExternalLink, Copy, ArrowRight, MessageSquare,
  AlertCircle, ChevronDown, ChevronUp, Pencil, Plus, Trash2
} from 'lucide-react';
import { ForageHarvesterIcon } from './ForageHarvesterIcon';
import SignatureCanvas from './SignatureCanvas';
import EmailModal from './EmailModal';
import { gerarPDFEntrega } from '../utils/pdfGenerator';
import ConfirmModal from './ConfirmModal';
import jfC120Img from '../assets/images/jf_c120_at_1783939073974.jpg';

interface DeliveryFormProps {
  key?: any;
  usuarioLogado: Usuario;
  onFinalized: () => void;
  existingDraft?: EntregaTecnica | null;
  onStatusChange?: (iniciada: boolean) => void;
  activeTab?: string;
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
}

// Compressão resiliente e de alta fidelidade de imagens em canvas para poupar local storage mantendo máxima nitidez
function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Aumentado para 1200x900 para obter altíssima legibilidade (fundamental para números de chassi e detalhes técnicos)
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 900;
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
        // Elevado de 0.65 para 0.88 para obter fotos extremamente límpidas com baixos artefatos de compressão
        resolve(canvas.toDataURL('image/jpeg', 0.88));
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

// Formatação progressiva dinâmica de CPF e CNPJ sob digitação
function formatCPFOrCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  
  if (digits.length <= 11) {
    if (digits.length <= 3) {
      return digits;
    }
    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  } else {
    if (digits.length <= 12) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
}

// Formatação progressiva dinâmica do CHASSI sob digitação: LLLL-NNNNNNNN (4 letras, hífen, 6 a 8 números)
function formatChassi(value: string): string {
  const raw = value.replace(/[^A-Za-z0-9]/g, '');
  
  let prefix = '';
  let suffix = '';
  
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (prefix.length < 4) {
      if (/[A-Za-z]/.test(char)) {
        prefix += char.toUpperCase();
      }
    } else {
      if (/[0-9]/.test(char)) {
        if (suffix.length < 8) {
          suffix += char;
        }
      }
    }
  }
  
  if (prefix.length === 4) {
    if (suffix.length > 0) {
      return `${prefix}-${suffix}`;
    }
    if (raw.length > 4) {
      return `${prefix}-`;
    }
    return prefix;
  }
  
  return prefix;
}

export default function DeliveryForm({ usuarioLogado, onFinalized, existingDraft, onStatusChange, activeTab, step, setStep }: DeliveryFormProps) {
  // Estados de navegação do Checklist Passo 3
  const [currentChecklistItemIndex, setCurrentChecklistItemIndex] = useState(0);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [ignoredItemIds, setIgnoredItemIds] = useState<string[]>([]);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState(false);
  const [editingCategoryText, setEditingCategoryText] = useState<string>('');
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false);
  const [showAddTopicInput, setShowAddTopicInput] = useState(false);
  const [newTopicText, setNewTopicText] = useState<string>('');
  const [showDeleteTopicConfirm, setShowDeleteTopicConfirm] = useState(false);
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryFirstTopic, setNewCategoryFirstTopic] = useState<string>('');
 
   // Reseta estado de expansão de texto ao mudar de item
   useEffect(() => {
     setIsTextExpanded(false);
     setEditingItemId(null);
     setEditingCategory(false);
     setShowDeleteCategoryConfirm(false);
     setShowAddTopicInput(false);
     setNewTopicText('');
     setShowDeleteTopicConfirm(false);
     setShowAddCategoryInput(false);
     setNewCategoryName('');
     setNewCategoryFirstTopic('');
   }, [currentChecklistItemIndex]);

  // Controle de Tempo de Execução
  const startTimeRef = useRef<number>(Date.now());
  const [tempoPassado, setTempoPassado] = useState(0);
  const [entregaIniciada, setEntregaIniciada] = useState<boolean>(() => {
    return !!existingDraft;
  });
  const [showDescartarConfirm, setShowDescartarConfirm] = useState(false);

  // Notifica o componente pai sobre a mudança no estado de início da entrega técnica
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(entregaIniciada);
    }
  }, [entregaIniciada, onStatusChange]);

  // Dados Gerais
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('novo');
  const [clienteForm, setClienteForm] = useState<Omit<Cliente, 'id'>>({
    nome: '', documento: '', fazenda: '', cidade: '', estado: 'MT'
  });

  const [listaMaquinas, setListaMaquinas] = useState<Maquina[]>([]);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<string>('');
  const [maquinaForm, setMaquinaForm] = useState<Omit<Maquina, 'id'>>({
    modelo: 'Colhedora JF C120 AT', tipo: 'Colhedora', numeroSerie: '', fabricante: 'JF Máquinas'
  });
  const [salvarParaFuturo, setSalvarParaFuturo] = useState<boolean>(false);

  const [nomeRevenda, setNomeRevenda] = useState<string>(() => {
    if (existingDraft?.revenda?.nome) {
      return existingDraft.revenda.nome;
    }
    return '';
  });
  const [dataEntrega, setDataEntrega] = useState<string>(new Date().toISOString().slice(0, 10));

  // Fotos Gerais Exigidas
  const [fotosGerais, setFotosGerais] = useState<FotosGerais>({});
  const [videoEnviado, setVideoEnviado] = useState<boolean>(false);

  // Checklist
  const [checklist, setChecklist] = useState<ItemChecklist[]>([]);

  // Localização Capturada
  const [localizacao, setLocalizacao] = useState<{ latitude: number | null; longitude: number | null; precisao: number | null }>({
    latitude: null, longitude: null, precisao: null
  });
  const [gpsCapturing, setGpsCapturing] = useState(false);

  // Assinaturas e Notas Finais
  const [assinaturaTecnico, setAssinaturaTecnico] = useState('');
  const [assinaturaCliente, setAssinaturaCliente] = useState('');
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // OCR Simulator
  const [ocrScanning, setOcrScanning] = useState(false);

  // Envio Inteligente do PDF Gerado
  const [finalizedEntrega, setFinalizedEntrega] = useState<EntregaTecnica | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Escuta atualizações do banco na nuvem
  useEffect(() => {
    const handleUpdate = () => {
      const list = getMaquinas();
      setListaMaquinas(list);
    };
    window.addEventListener('agro_db_updated', handleUpdate);
    return () => window.removeEventListener('agro_db_updated', handleUpdate);
  }, []);

  // Inicializa lista de máquinas
  useEffect(() => {
    const list = getMaquinas();
    setListaMaquinas(list);
    if (!existingDraft && list.length > 0) {
      setMaquinaSelecionada(list[0].id);
      setMaquinaForm({
        modelo: list[0].modelo,
        tipo: list[0].tipo,
        numeroSerie: '',
        fabricante: list[0].fabricante
      });
    }
  }, [existingDraft]);

  // Recarrega a lista de máquinas toda vez que a aba de Nova Entrega se torna ativa para carregar alterações salvas
  useEffect(() => {
    if (activeTab === 'form') {
      const list = getMaquinas();
      setListaMaquinas(list);
      
      // Se houver uma máquina selecionada, garante que ela se mantenha selecionada com os dados atualizados
      if (maquinaSelecionada && maquinaSelecionada !== 'novo') {
        const maq = list.find(m => m.id === maquinaSelecionada);
        if (maq) {
          setMaquinaForm(prev => ({
            ...prev,
            modelo: maq.modelo,
            tipo: maq.tipo,
            fabricante: maq.fabricante
          }));
          
          // Se o checklist não foi preenchido ainda pelo usuário (todos como null),
          // atualiza o checklist para usar o checklist customizado mais recente da máquina
          const allNull = checklist.every(item => item.conforme === null);
          if (allNull) {
            if (maq.checklistCustomizado && maq.checklistCustomizado.length > 0) {
              setChecklist(
                maq.checklistCustomizado.map(item => {
                  const oficial = CHECKLIST_PADRAO.find(p => p.id === item.id);
                  return {
                    ...item,
                    categoria: oficial ? oficial.categoria : item.categoria,
                    item: oficial ? oficial.item : item.item,
                    conforme: null,
                    observacao: ''
                  };
                })
              );
            } else {
              setChecklist(
                getChecklistPadrao().map(item => ({
                  ...item,
                  conforme: null,
                  observacao: ''
                }))
              );
            }
          }
        }
      }
    }
  }, [activeTab]);

  // Inicia contador e geolocalização automática
  useEffect(() => {
    let interval: any = null;
    if (entregaIniciada) {
      interval = setInterval(() => {
        setTempoPassado(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }

    // Dispara GPS
    capturarGPS();

    // Semeia checklist
    if (existingDraft) {
      setChecklist(
        existingDraft.checklist.map(item => {
          const oficial = CHECKLIST_PADRAO.find(p => p.id === item.id);
          if (oficial) {
            return {
              ...item,
              categoria: oficial.categoria,
              item: oficial.item
            };
          }
          return item;
        })
      );
      setFotosGerais(existingDraft.fotosGerais);
      setObservacoesGerais(existingDraft.observacoesGerais);
      if (existingDraft.assinaturas.tecnico) setAssinaturaTecnico(existingDraft.assinaturas.tecnico);
      if (existingDraft.assinaturas.cliente) setAssinaturaCliente(existingDraft.assinaturas.cliente);
      if (existingDraft.revenda?.nome) setNomeRevenda(existingDraft.revenda.nome);
      
      const savedTempo = existingDraft.tempoExecucaoSegundos || 0;
      setTempoPassado(savedTempo);
      startTimeRef.current = Date.now() - savedTempo * 1000;
      setEntregaIniciada(true);
      
      const hasPhotos = !!(existingDraft.fotosGerais && existingDraft.fotosGerais.maquinaCompleta && existingDraft.fotosGerais.numeroSerie);
      if (hasPhotos) {
        const isChecklistComplete = existingDraft.checklist && existingDraft.checklist.length > 0 && existingDraft.checklist.every(item => item.conforme !== null);
        if (isChecklistComplete) {
          setStep(4);
        } else {
          setStep(3);
        }
      } else {
        setStep(2);
      }
      
      // Mapeia cliente
      const cliPad = CLIENTES_PADRAO.find(c => c.documento === existingDraft.cliente.documento);
      if (cliPad) {
        setClienteSelecionado(cliPad.id);
      } else {
        setClienteSelecionado('novo');
        setClienteForm(existingDraft.cliente);
      }

      // Mapeia máquina
      const list = getMaquinas();
      const maqPad = list.find(m => m.numeroSerie === existingDraft.maquina.numeroSerie || m.modelo === existingDraft.maquina.modelo);
      if (maqPad) {
        setMaquinaSelecionada(maqPad.id);
      } else {
        setMaquinaSelecionada('novo');
        setMaquinaForm(existingDraft.maquina);
      }
    } else {
      const list = getMaquinas();
      const firstMaq = list[0];
      if (firstMaq && firstMaq.checklistCustomizado && firstMaq.checklistCustomizado.length > 0) {
        setChecklist(
          firstMaq.checklistCustomizado.map(item => ({
            ...item,
            conforme: null,
            observacao: ''
          }))
        );
      } else {
        setChecklist(
          getChecklistPadrao().map(item => ({
            ...item,
            conforme: null,
            observacao: ''
          }))
        );
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [existingDraft, entregaIniciada]);

  // Reseta índice do checklist se a lista ou o passo mudar
  useEffect(() => {
    if (step === 3) {
      if (existingDraft) {
        // Encontra o primeiro item que não tem resposta (conforme === null)
        const firstUncheckedIndex = checklist.findIndex(item => item.conforme === null);
        if (firstUncheckedIndex !== -1) {
          setCurrentChecklistItemIndex(firstUncheckedIndex);
        } else {
          setCurrentChecklistItemIndex(0);
        }
      } else {
        setCurrentChecklistItemIndex(0);
      }
      setShowSkipWarning(false);
      setShowValidationErrors(false);
      setIgnoredItemIds([]);
    }
  }, [step, checklist.length, existingDraft]);

  // Captura GPS Real
  const capturarGPS = () => {
    setGpsCapturing(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocalizacao({
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            precisao: pos.coords.accuracy
          });
          setGpsCapturing(false);
        },
        () => {
          // Fallback de localização de campo (simulando coordenadas no cinturão da soja Sorriso-MT)
          const lat = -12.5441 + (Math.random() - 0.5) * 0.1;
          const lng = -55.7231 + (Math.random() - 0.5) * 0.1;
          setLocalizacao({
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lng.toFixed(6)),
            precisao: 15
          });
          setGpsCapturing(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setLocalizacao({
        latitude: -12.5441,
        longitude: -55.7231,
        precisao: 99
      });
      setGpsCapturing(false);
    }
  };

  // Observa mudanças do cliente para preencher form
  const handleClienteDropdownChange = (id: string) => {
    setClienteSelecionado(id);
    if (id !== 'novo') {
      const cli = CLIENTES_PADRAO.find(c => c.id === id);
      if (cli) {
        setClienteForm({
          nome: cli.nome,
          documento: cli.documento,
          fazenda: cli.fazenda,
          cidade: cli.cidade,
          estado: cli.estado
        });
      }
    } else {
      setClienteForm({ nome: '', documento: '', fazenda: '', cidade: '', estado: 'MT' });
    }
  };

  // Observa máquina dropdown
  const handleMaquinaDropdownChange = (id: string) => {
    setMaquinaSelecionada(id);
    if (id !== 'novo') {
      const maq = listaMaquinas.find(m => m.id === id);
      if (maq) {
        setMaquinaForm({
          modelo: maq.modelo,
          tipo: maq.tipo,
          numeroSerie: '', // Let them enter the specific S/N for this machine delivery
          fabricante: maq.fabricante
        });

        // Carrega checklist customizado da máquina se existir
        if (maq.checklistCustomizado && maq.checklistCustomizado.length > 0) {
          setChecklist(
            maq.checklistCustomizado.map(item => ({
              ...item,
              conforme: null,
              observacao: ''
            }))
          );
        } else {
          setChecklist(
            getChecklistPadrao().map(item => ({
              ...item,
              conforme: null,
              observacao: ''
            }))
          );
        }
      }
    } else {
      setMaquinaForm({ modelo: '', tipo: 'Colhedora', numeroSerie: '', fabricante: 'JF Máquinas' });
      setChecklist(
        getChecklistPadrao().map(item => ({
          ...item,
          conforme: null,
          observacao: ''
        }))
      );
    }
  };

  // Upload e compressão de foto geral
  const handleFotoGeralUpload = async (key: keyof FotosGerais, file: File | null) => {
    if (!file) return;
    const base64 = await compressImage(file);
    setFotosGerais(prev => ({ ...prev, [key]: base64 }));
  };

  // Upload de foto do checklist individual
  const handleFotoItemUpload = async (index: number, file: File | null) => {
    if (!file) return;
    const base64 = await compressImage(file);
    setChecklist(prev => {
      const copy = [...prev];
      copy[index].fotoBase64 = base64;
      return copy;
    });
  };

  // Gravação / Upload de vídeo opcional para item de checklist
  const handleVideoItemUpload = async (index: number, file: File | null) => {
    if (!file) return;
    // Para simplificar no LocalStorage, guardamos uma marcação ou comprimimos
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setChecklist(prev => {
        const copy = [...prev];
        // Salvamos apenas os primeiros 100kb para não explodir cota, ou apenas o estado ativo
        copy[index].videoBase64 = 'data:video/mp4;base64,video_gravado';
        return copy;
      });
      setVideoEnviado(true);
    };
  };

  // Simulador de Leitor de Chassi / Número de Série por OCR inteligente
  const dispararOcrChassi = () => {
    setOcrScanning(true);
    setTimeout(() => {
      // Gera um número de série de fabricante realista (4 letras, hífen, 6 a 8 números)
      const randomPrefix = ['JDFX', 'MFWH', 'NHPT', 'CIHX', 'AGRO'][Math.floor(Math.random() * 5)];
      const randomSuffix = Math.floor(Math.random() * 900000 + 100000); // 6 dígitos numéricos
      const generatedChassi = `${randomPrefix}-${randomSuffix}`;
      
      setMaquinaForm(prev => ({ ...prev, numeroSerie: generatedChassi }));
      setOcrScanning(false);
      alert(`OCR Sucesso! Placa de identificação escaneada. Chassi detectado: ${generatedChassi}`);
    }, 1500);
  };

  const resetForm = () => {
    setStep(1);
    setEntregaIniciada(false);
    setTempoPassado(0);
    setClienteSelecionado('novo');
    setClienteForm({ nome: '', documento: '', fazenda: '', cidade: '', estado: 'MT' });
    setMaquinaSelecionada('');
    setMaquinaForm({ modelo: 'Colhedora JF C120 AT', tipo: 'Colhedora', numeroSerie: '', fabricante: 'JF Máquinas' });
    setSalvarParaFuturo(false);
    setNomeRevenda('');
    setFotosGerais({});
    setVideoEnviado(false);
    setChecklist(
      getChecklistPadrao().map(item => ({
        ...item,
        conforme: null,
        observacao: ''
      }))
    );
    setAssinaturaTecnico('');
    setAssinaturaCliente('');
    setObservacoesGerais('');
    
    if (onStatusChange) {
      onStatusChange(false);
    }
  };

  // Manipulador de mudança de conformidade de item do checklist
  const handleConformidadeChange = (index: number, val: 'conforme' | 'nao_conforme' | null) => {
    setChecklist(prev => {
      const copy = [...prev];
      copy[index].conforme = val;
      // Limpa alertas ou fotos caso mude para conforme ou nulo
      if (val === 'conforme' || val === null) {
        copy[index].observacao = '';
        copy[index].fotoBase64 = undefined;
      }
      return copy;
    });
  };

  const handleObservacaoItemChange = (index: number, val: string) => {
    setChecklist(prev => {
      const copy = [...prev];
      copy[index].observacao = val;
      return copy;
    });
  };

  // Verificações rígidas de conformidade de cada passo
  const validarPasso1 = () => {
    const cf = clienteForm;
    const mf = maquinaForm;
    return (
      cf.nome.trim() !== '' &&
      cf.documento.trim() !== '' &&
      cf.fazenda.trim() !== '' &&
      cf.cidade.trim() !== '' &&
      mf.modelo.trim() !== '' &&
      mf.numeroSerie.trim() !== '' &&
      nomeRevenda.trim() !== ''
    );
  };

  const validarPasso2 = () => {
    // 2 fotos gerais são obrigatórias para auditoria de campo
    return (
      fotosGerais.maquinaCompleta !== undefined &&
      fotosGerais.numeroSerie !== undefined
    );
  };

  const handlePrevChecklistItem = () => {
    if (currentChecklistItemIndex > 0) {
      setCurrentChecklistItemIndex(prev => prev - 1);
      setShowSkipWarning(false);
    } else {
      setStep(2);
    }
  };

  const handleNextChecklistItem = () => {
    const currentItem = checklist[currentChecklistItemIndex];
    if (!currentItem) return;

    const isTicked = currentItem.conforme === 'conforme';

    if (isTicked) {
      if (currentChecklistItemIndex === checklist.length - 1) {
        setStep(4);
      } else {
        setCurrentChecklistItemIndex(prev => prev + 1);
        setShowSkipWarning(false);
      }
    } else {
      setShowSkipWarning(true);
    }
  };

  const handleConfirmSkipChecklistItem = (autoTick: boolean) => {
    if (autoTick) {
      handleConformidadeChange(currentChecklistItemIndex, 'conforme');
    }
    
    setShowSkipWarning(false);
    
    if (currentChecklistItemIndex === checklist.length - 1) {
      setStep(4);
    } else {
      setCurrentChecklistItemIndex(prev => prev + 1);
    }
  };

  const validarPasso3 = () => {
    return true;
  };

  const handleSalvarComoRascunho = () => {
    let finalMaquinaId = maquinaSelecionada;
    if (maquinaSelecionada === 'novo') {
      if (salvarParaFuturo) {
        const novaMaqId = `m_${Date.now()}`;
        const novaMaq: Maquina = {
          id: novaMaqId,
          modelo: maquinaForm.modelo,
          tipo: maquinaForm.tipo,
          numeroSerie: maquinaForm.numeroSerie,
          fabricante: maquinaForm.fabricante
        };
        cadastrarMaquina(novaMaq, usuarioLogado.nome);
        finalMaquinaId = novaMaqId;
        setListaMaquinas(getMaquinas());
        setMaquinaSelecionada(novaMaqId);
      } else {
        finalMaquinaId = 'm_custom';
      }
    }

    const novaEntrega: EntregaTecnica = {
      id: existingDraft?.id || gerarIdEntrega(),
      cliente: { id: 'c_custom', ...clienteForm },
      maquina: { 
        id: finalMaquinaId, 
        ...maquinaForm,
        miniaturaBase64: listaMaquinas.find(m => m.id === finalMaquinaId)?.miniaturaBase64
      },
      revenda: { id: 'custom', nome: nomeRevenda, cidade: clienteForm.cidade, estado: clienteForm.estado },
      tecnico: { id: usuarioLogado.id, nome: usuarioLogado.nome },
      data: dataEntrega,
      status: 'rascunho', // Salva local offline como rascunho
      checklist,
      fotosGerais,
      assinaturas: { tecnico: assinaturaTecnico || undefined, cliente: assinaturaCliente || undefined },
      localizacao: {
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        precisao: localizacao.precisao,
        dataHora: new Date().toISOString()
      },
      tempoExecucaoSegundos: tempoPassado,
      dataCriacao: existingDraft?.dataCriacao || new Date().toISOString(),
      observacoesGerais
    };

    salvarEntrega(novaEntrega, usuarioLogado.nome);
    alert("Termo de entrega técnica gravado como rascunho offline com sucesso!");
    onFinalized();
  };

  const handleFinalizarEGerarCheckList = () => {
    if (!assinaturaTecnico || !assinaturaCliente) {
      alert("É obrigatório que o Técnico e o Cliente assinem o termo para emissão do Check List - Entrega Técnica.");
      return;
    }

    let finalMaquinaId = maquinaSelecionada;
    if (maquinaSelecionada === 'novo') {
      if (salvarParaFuturo) {
        const novaMaqId = `m_${Date.now()}`;
        const novaMaq: Maquina = {
          id: novaMaqId,
          modelo: maquinaForm.modelo,
          tipo: maquinaForm.tipo,
          numeroSerie: maquinaForm.numeroSerie,
          fabricante: maquinaForm.fabricante
        };
        cadastrarMaquina(novaMaq, usuarioLogado.nome);
        finalMaquinaId = novaMaqId;
        setListaMaquinas(getMaquinas());
        setMaquinaSelecionada(novaMaqId);
      } else {
        finalMaquinaId = 'm_custom';
      }
    }

    const finalId = existingDraft?.id || gerarIdEntrega();
    const novaEntrega: EntregaTecnica = {
      id: finalId,
      cliente: { id: 'c_custom', ...clienteForm },
      maquina: { 
        id: finalMaquinaId, 
        ...maquinaForm,
        miniaturaBase64: listaMaquinas.find(m => m.id === finalMaquinaId)?.miniaturaBase64
      },
      revenda: { id: 'custom', nome: nomeRevenda, cidade: clienteForm.cidade, estado: clienteForm.estado },
      tecnico: { id: usuarioLogado.id, nome: usuarioLogado.nome },
      data: dataEntrega,
      status: 'sincronizado', // Online / Sincronizado ao finalizar
      checklist,
      fotosGerais,
      assinaturas: { tecnico: assinaturaTecnico, cliente: assinaturaCliente },
      localizacao: {
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        precisao: localizacao.precisao,
        dataHora: new Date().toISOString()
      },
      tempoExecucaoSegundos: tempoPassado,
      dataCriacao: existingDraft?.dataCriacao || new Date().toISOString(),
      dataFinalizacao: new Date().toISOString(),
      qrCodeUrl: (() => {
        try {
          const lightweight = {
            id: finalId,
            cliente: { id: 'c_custom', ...clienteForm },
            tecnico: { id: usuarioLogado.id, nome: usuarioLogado.nome },
            revenda: { id: 'custom', nome: nomeRevenda, cidade: clienteForm.cidade, estado: clienteForm.estado },
            maquina: { 
              id: finalMaquinaId, 
              ...maquinaForm,
              miniaturaBase64: listaMaquinas.find(m => m.id === finalMaquinaId)?.miniaturaBase64
            },
            data: dataEntrega,
            status: 'sincronizado',
            checklist,
            fotosGerais: [],
            assinaturas: { tecnico: "", cliente: "" },
            localizacao: {
              latitude: localizacao.latitude,
              longitude: localizacao.longitude,
              precisao: localizacao.precisao,
              dataHora: new Date().toISOString()
            },
            tempoExecucaoSegundos: tempoPassado,
            dataCriacao: existingDraft?.dataCriacao || new Date().toISOString(),
            dataFinalizacao: new Date().toISOString(),
            observacoesGerais
          };
          const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(lightweight))));
          return `${window.location.origin}${window.location.pathname}?verify=${finalId}&data=${b64}`;
        } catch (err) {
          console.error(err);
          return `${window.location.origin}?verify=${finalId}`;
        }
      })(),
      observacoesGerais
    };

    // Salva no banco local
    salvarEntrega(novaEntrega, usuarioLogado.nome);

    // Dispara geração do PDF e define o estado para a Área de Envio Inteligente
    try {
      const doc = gerarPDFEntrega(novaEntrega);
      doc.save(`Check_List_Entrega_Tecnica_${finalId}.pdf`);
    } catch (err) {
      console.error(err);
    }
    
    setFinalizedEntrega(novaEntrega);
  };

  const getShareMessage = (entrega: EntregaTecnica) => {
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
Acesse para auditar: ${entrega.qrCodeUrl}

*JF Máquinas - Soluções Tecnológicas para Agronegócio* ⚡️`;
  };

  if (finalizedEntrega) {
    const shareMessageText = getShareMessage(finalizedEntrega);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessageText)}`;
    const emailSubject = `[JF CHECK] Termo de Entrega Técnica Emitido - ${finalizedEntrega.id}`;
    const emailBody = shareMessageText;
    const emailUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    const handleCopyMessage = () => {
      navigator.clipboard.writeText(shareMessageText);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    };

    const handleCopyLink = () => {
      navigator.clipboard.writeText(finalizedEntrega.qrCodeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    };

    const handleDownloadAgain = () => {
      try {
        const doc = gerarPDFEntrega(finalizedEntrega);
        doc.save(`Check_List_Entrega_Tecnica_${finalizedEntrega.id}.pdf`);
      } catch (err) {
        console.error(err);
        alert("Erro ao gerar PDF.");
      }
    };

    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full py-4" id="wizard-envio-inteligente">
        {/* Sucesso Cabeçalho Minimalista */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 bg-amber-500 text-zinc-950 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition duration-300">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">Termo Finalizado com Sucesso</span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight uppercase mt-1">Área de Envio Inteligente</h2>
            <p className="text-xs text-zinc-500 font-medium max-w-md mt-1">
              O termo foi devidamente registrado e assinado. Escolha um dos canais oficiais abaixo para realizar o envio ao produtor.
            </p>
          </div>

          <div className="bg-zinc-100 border border-zinc-200 px-4 py-2 rounded-2xl mt-1 flex items-center gap-2 shadow-sm font-mono text-xs font-bold text-zinc-700">
            <span>Identificador Único:</span>
            <span className="text-amber-600 font-black tracking-wider">{finalizedEntrega.id}</span>
          </div>
        </div>

        {/* Canais Rápidos (WhatsApp & Email) */}
        <div className="bg-white border-2 border-zinc-800 rounded-3xl p-6 shadow-md flex flex-col gap-5 mt-4">
          <div>
            <h4 className="font-black text-zinc-900 text-base uppercase tracking-tight flex items-center gap-2">
              <Share2 className="w-5 h-5 text-amber-500" />
              Canais de Envio Direto
            </h4>
            <p className="text-xs text-zinc-500 font-semibold mt-1">Dispare a comprovação técnica diretamente para os contatos do cliente.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WhatsApp */}
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-50 hover:bg-emerald-100/80 border-2 border-emerald-500/30 text-emerald-950 p-4 rounded-2xl transition flex flex-col justify-between gap-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-md">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-600 opacity-50 group-hover:opacity-100 transition" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">Canal Preferencial</span>
                <h5 className="font-black text-sm uppercase tracking-tight text-emerald-900 mt-0.5">Enviar via WhatsApp</h5>
                <p className="text-[11px] text-emerald-800 font-medium mt-1">Abre o WhatsApp Web/App com a mensagem formatada para o produtor.</p>
              </div>
            </a>

            {/* Email */}
            <button 
              onClick={() => setIsEmailModalOpen(true)}
              className="bg-sky-50 hover:bg-sky-100/80 border-2 border-sky-500/30 text-sky-950 p-4 rounded-2xl transition flex flex-col justify-between text-left gap-3 group"
              type="button"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-sky-500 text-white rounded-xl flex items-center justify-center shadow-md">
                  <Mail className="w-5 h-5" />
                </div>
                <ExternalLink className="w-4 h-4 text-sky-600 opacity-50 group-hover:opacity-100 transition" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-sky-700">Relatório Formal</span>
                <h5 className="font-black text-sm uppercase tracking-tight text-sky-900 mt-0.5">Enviar via E-mail</h5>
                <p className="text-[11px] text-sky-800 font-medium mt-1">Preenche assunto e corpo do e-mail no aplicativo padrão de e-mail.</p>
              </div>
            </button>
          </div>

          {/* Dica de Envio do PDF */}
          <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h6 className="text-xs font-black text-amber-950 uppercase tracking-tight">Como enviar o PDF pelo WhatsApp?</h6>
              <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                O texto pré-configurado já contém o Link de Verificação Digital QR, permitindo que seu cliente acesse o Check List original a qualquer momento. Se desejar enviar também o arquivo PDF físico, utilize a opção do e-mail ou anexe-o normalmente na janela do WhatsApp aberta.
              </p>
            </div>
          </div>

          {/* Pré-visualização da mensagem formatada */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Conteúdo do Despacho Inteligente</span>
              <button 
                onClick={handleCopyMessage}
                className={`text-[10px] px-2.5 py-1 rounded font-black uppercase flex items-center gap-1.5 transition ${
                  copiedMessage 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                }`}
              >
                <Copy className="w-3 h-3" />
                {copiedMessage ? 'Copiado!' : 'Copiar Texto'}
              </button>
            </div>
            <pre className="text-[10px] font-mono text-zinc-700 overflow-x-auto whitespace-pre-wrap max-h-40 bg-white p-3 rounded-xl border border-zinc-200 shadow-inner">
              {shareMessageText}
            </pre>
          </div>
        </div>

        {/* Botão de Conclusão Final */}
        <div className="flex justify-end mt-4">
          <button
            onClick={() => {
              setFinalizedEntrega(null);
              onFinalized();
            }}
            className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-sm uppercase tracking-wider rounded-2xl border-b-4 border-amber-700 shadow-md hover:shadow-lg transition flex items-center gap-2 group"
            id="btn-finish-and-exit"
          >
            Concluir e Voltar ao Início
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
          </button>
        </div>

        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          subject={emailSubject}
          body={emailBody}
          recipientName={finalizedEntrega.cliente.nome}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6" id="delivery-form-wizard">
      {/* Indicador de Passos */}
      <div className="bg-zinc-950 text-white rounded-2xl shadow-lg border-2 border-zinc-900 flex flex-col sm:flex-row items-center justify-between p-3.5 sm:p-4 gap-3.5">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="rounded-full shrink-0 overflow-hidden flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11">
            <img 
              src="https://lh3.googleusercontent.com/d/1_1AYI1j9md2diNRj_8RhdPEs9tM_vUmy" 
              alt="Logo JF" 
              className="w-full h-full object-cover rounded-full" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                if (e.currentTarget.src !== "https://drive.google.com/thumbnail?id=1_1AYI1j9md2diNRj_8RhdPEs9tM_vUmy&sz=w300") {
                  e.currentTarget.src = "https://drive.google.com/thumbnail?id=1_1AYI1j9md2diNRj_8RhdPEs9tM_vUmy&sz=w300";
                }
              }}
            />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-wider text-left text-sm sm:text-base md:text-lg">Nova Entrega</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-[10px] sm:text-xs text-amber-400 font-bold flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse" />
                {entregaIniciada ? `TEMPO: ${Math.floor(tempoPassado / 60)}m ${tempoPassado % 60}s` : 'AGUARDANDO...'}
              </span>
              {entregaIniciada && (
                <button
                  type="button"
                  onClick={() => setShowDescartarConfirm(true)}
                  className="px-1.5 py-0.5 bg-rose-950/60 hover:bg-rose-900/85 text-rose-300 hover:text-white border border-rose-800/80 rounded text-[8px] font-black uppercase tracking-wider transition duration-150 shadow-sm"
                  title="Descartar a entrega atual e começar do zero"
                  id="btn-cancel-delivery"
                >
                  Sair
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Círculos dos passos */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-zinc-900 sm:border-0">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`rounded-full flex items-center justify-center font-black transition duration-150 border-2 ${
                step === s 
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg ring-2 sm:ring-4 ring-amber-500/30' 
                  : step > s 
                    ? 'bg-zinc-800 text-amber-400 border-zinc-700' 
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
              } w-7 h-7 sm:w-9 sm:h-9 text-xs sm:text-sm`}>
                {s}
              </div>
              {s < 4 && <div className={`h-0.5 sm:h-1 ${step > s ? 'bg-amber-500' : 'bg-zinc-800'} w-4 sm:w-8`} />}
            </div>
          ))}
        </div>
      </div>

      {/* CONTEÚDO DOS PASSOS */}
      <div className="bg-white border-2 border-zinc-200 rounded-2xl shadow-md p-4 sm:p-6 md:p-8">
        
        {/* PASSO 1: IDENTIFICAÇÃO (CLIENTE E MÁQUINA) */}
        {step === 1 && (
          <div className="flex flex-col gap-6" id="wizard-step-1">
            <h4 className="text-xl md:text-2xl font-black text-zinc-900 border-b-4 border-zinc-900 pb-3 flex items-center gap-2 uppercase tracking-tight">
              <ForageHarvesterIcon className="text-amber-500 w-6 h-6 shrink-0" />
              Identificação do Equipamento
            </h4>

            {/* Dropdown Máquinas */}
            <div className="grid grid-cols-1 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Selecionar Modelo Padrão</label>
                <select
                  value={maquinaSelecionada}
                  onChange={(e) => handleMaquinaDropdownChange(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  id="dropdown-select-machine"
                >
                  <option value="novo">-- Cadastrar Maquinário Customizado --</option>
                  {listaMaquinas.map(m => (
                    <option key={m.id} value={m.id}>{m.modelo} ({m.fabricante})</option>
                  ))}
                </select>
              </div>

              {(() => {
                const maquinaCarregada = listaMaquinas.find(m => m.id === maquinaSelecionada);
                if (maquinaCarregada) {
                  const isC120 = maquinaCarregada.modelo.toLowerCase().includes('c120');
                  const hasMiniatura = !!maquinaCarregada.miniaturaBase64;
                  return (
                    <div className="flex items-center gap-4 p-4 bg-amber-50/50 border-2 border-amber-500/20 rounded-2xl shadow-sm">
                      <div className="w-20 h-20 bg-white border border-amber-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-sm">
                        {hasMiniatura || isC120 ? (
                          <img 
                            src={maquinaCarregada.miniaturaBase64 || jfC120Img} 
                            alt={maquinaCarregada.modelo} 
                            className="w-full h-full object-contain rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ForageHarvesterIcon className="w-10 h-10 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-black text-amber-950 uppercase tracking-tight">{maquinaCarregada.modelo}</h5>
                        <p className="text-xs text-amber-800 font-medium mt-1">
                          {hasMiniatura 
                            ? `Equipamento corporativo customizado cadastrado por admin selecionado para esta entrega técnica.` 
                            : isC120 
                              ? `Equipamento oficial JF Máquinas selecionado para esta entrega técnica.`
                              : `Modelo padrão cadastrado selecionado para esta entrega técnica.`}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="border-t border-zinc-100 my-2" />

            {/* Form de Dados do Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold text-zinc-600">Nome do Cliente / Razão Social *</label>
                <input
                  type="text"
                  placeholder="Nome completo do produtor ou empresa"
                  value={clienteForm.nome}
                  onChange={(e) => setClienteForm({ ...clienteForm, nome: e.target.value })}
                  className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                  id="input-client-name"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-600">CPF ou CNPJ *</label>
                <input
                  type="text"
                  placeholder="Apenas números ou formatado"
                  value={clienteForm.documento}
                  onChange={(e) => setClienteForm({ ...clienteForm, documento: formatCPFOrCNPJ(e.target.value) })}
                  className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                  required
                  id="input-client-doc"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-600">Nome da Fazenda *</label>
                <input
                  type="text"
                  placeholder="Ex: Fazenda Ouro Verde"
                  value={clienteForm.fazenda}
                  onChange={(e) => setClienteForm({ ...clienteForm, fazenda: e.target.value })}
                  className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:outline-none"
                  required
                  id="input-client-farm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-600">Cidade *</label>
                <input
                  type="text"
                  placeholder="Ex: Sorriso"
                  value={clienteForm.cidade}
                  onChange={(e) => setClienteForm({ ...clienteForm, cidade: e.target.value })}
                  className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:outline-none"
                  required
                  id="input-client-city"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-600">Estado (UF) *</label>
                <select
                  value={clienteForm.estado}
                  onChange={(e) => setClienteForm({ ...clienteForm, estado: e.target.value })}
                  className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:outline-none"
                  id="input-client-state"
                >
                  {['MT', 'GO', 'BA', 'PR', 'RS', 'MS', 'SP', 'MG', 'TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Form de Dados da Máquina */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-100 pt-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-600">Modelo da Máquina *</label>
                <input
                  type="text"
                  placeholder="Ex: Trator 6100J"
                  value={maquinaForm.modelo}
                  onChange={(e) => setMaquinaForm({ ...maquinaForm, modelo: e.target.value })}
                  disabled={maquinaSelecionada !== 'novo'}
                  className={`px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    maquinaSelecionada !== 'novo' ? 'bg-zinc-100 cursor-not-allowed font-medium text-zinc-600' : 'bg-zinc-50 focus:bg-white'
                  }`}
                  required
                  id="input-machine-model"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-600 flex items-center justify-between">
                  <span>Número de Série (CHASSI) *</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: ABCD-123456"
                  value={maquinaForm.numeroSerie}
                  onChange={(e) => setMaquinaForm({ ...maquinaForm, numeroSerie: formatChassi(e.target.value) })}
                  className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-xs font-bold"
                  required
                  id="input-machine-serial"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-600">Fabricante *</label>
                <input
                  type="text"
                  value="JF Máquinas"
                  disabled
                  className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-100 text-zinc-500 focus:outline-none cursor-not-allowed font-semibold"
                  id="input-machine-manufacturer"
                />
              </div>

              {maquinaSelecionada === 'novo' && (
                <div className="flex items-center gap-2 md:col-span-3 mt-1 p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="checkbox-save-future"
                    checked={salvarParaFuturo}
                    onChange={(e) => setSalvarParaFuturo(e.target.checked)}
                    className="w-4 h-4 text-amber-500 border-zinc-300 rounded focus:ring-amber-500"
                  />
                  <label htmlFor="checkbox-save-future" className="text-xs font-bold text-zinc-700 cursor-pointer select-none">
                    Salvar este modelo de máquina nos Modelos Padrão para futuras entregas
                  </label>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-600">Revenda *</label>
                <input
                  type="text"
                  placeholder="Nome da revenda"
                  value={nomeRevenda}
                  onChange={(e) => setNomeRevenda(e.target.value)}
                  className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                  id="input-dealership"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-600">Técnico Responsável</label>
                <input
                  type="text"
                  value={usuarioLogado.nome}
                  disabled
                  className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-100 text-zinc-500 focus:outline-none cursor-not-allowed font-semibold"
                  id="input-technician-readonly"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-600">Data de Entrega *</label>
                <input
                  type="date"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                  className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:outline-none"
                  id="input-delivery-date"
                />
              </div>
            </div>

            {/* GPS Status */}
            <div className="mt-4 p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <span className="text-xs text-zinc-500 font-semibold flex items-center gap-1.5 shrink-0">
                <MapPin className="w-4 h-4 text-amber-500" />
                Coordenadas de Auditoria de Campo (GPS)
              </span>
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                {localizacao.latitude ? (
                  <span className="text-xs font-bold font-mono text-zinc-700 bg-white border px-2.5 py-1 rounded shadow-inner break-all">
                    LAT: {localizacao.latitude.toFixed(6)} | LNG: {localizacao.longitude.toFixed(6)}
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 font-bold animate-pulse">Capturando sinal GPS...</span>
                )}
                <button
                  type="button"
                  onClick={capturarGPS}
                  disabled={gpsCapturing}
                  className="px-2.5 py-1 text-[11px] font-black uppercase text-zinc-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded shrink-0"
                  id="btn-re-gps"
                >
                  {gpsCapturing ? 'Refazendo...' : 'Forçar Recaptura'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 2: FOTOS GERAIS DA MÁQUINA */}
        {step === 2 && (
          <div className="flex flex-col gap-6" id="wizard-step-2">
            <div>
              <h4 className="text-xl md:text-2xl font-black text-zinc-900 border-b-4 border-zinc-900 pb-3 flex items-center gap-2 uppercase tracking-tight">
                <Camera className="text-amber-500 w-6 h-6 shrink-0" />
                Fotografia e Evidências do Equipamento
              </h4>
              <p className="text-sm font-bold text-zinc-500 mt-2">Para garantir conformidade de faturamento e integridade de entrega, anexe as 2 fotos exigidas no painel abaixo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto w-full gap-6">
              {/* Foto 1: Máquina Completa */}
              <div className="border-2 border-zinc-900 bg-[#F8FAFC] rounded-2xl p-4 text-center flex flex-col items-center justify-between gap-3 shadow-md">
                <span className="text-xs font-black text-zinc-800 uppercase tracking-wider">1. Máquina Agrícola *</span>
                <div className="w-full h-36 border-2 border-dashed border-zinc-300 bg-white rounded-xl overflow-hidden flex items-center justify-center relative shadow-inner">
                  {fotosGerais.maquinaCompleta ? (
                    <img src={fotosGerais.maquinaCompleta} alt="Máquina Completa" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ForageHarvesterIcon className="w-12 h-12 text-zinc-300 animate-pulse" />
                  )}
                </div>
                <label className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs uppercase tracking-widest rounded-xl transition shadow-md cursor-pointer block">
                  <Camera className="w-4 h-4 inline mr-1.5" />
                  {fotosGerais.maquinaCompleta ? 'Alterar Foto' : 'Fotografar'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFotoGeralUpload('maquinaCompleta', e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Foto 2: Número de Série */}
              <div className="border-2 border-zinc-900 bg-[#F8FAFC] rounded-2xl p-4 text-center flex flex-col items-center justify-between gap-3 shadow-md">
                <span className="text-xs font-black text-zinc-800 uppercase tracking-wider">2. Plaqueta S/N *</span>
                <div className="w-full h-36 border-2 border-dashed border-zinc-300 bg-white rounded-xl overflow-hidden flex items-center justify-center relative shadow-inner">
                  {fotosGerais.numeroSerie ? (
                    <img src={fotosGerais.numeroSerie} alt="Número de Série" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <FileText className="w-10 h-10 text-zinc-300 animate-pulse" />
                  )}
                </div>
                <label className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs uppercase tracking-widest rounded-xl transition shadow-md cursor-pointer block">
                  <Camera className="w-4 h-4 inline mr-1.5" />
                  {fotosGerais.numeroSerie ? 'Alterar Foto' : 'Fotografar'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFotoGeralUpload('numeroSerie', e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 3: CHECKLIST TÉCNICO COMPLETO */}
        {step === 3 && (() => {
          const currentItem = checklist[currentChecklistItemIndex];
          if (!currentItem) {
            return (
              <div className="flex flex-col gap-6" id="wizard-step-3">
                <p className="text-sm text-zinc-500 font-bold p-6">Nenhum item de checklist disponível.</p>
              </div>
            );
          }

          const totalItens = checklist.length;
          const totalVerificados = checklist.filter(item => item.conforme === 'conforme').length;
          const progressPercent = totalItens > 0 ? Math.round((totalVerificados / totalItens) * 100) : 0;

          const itemsInCategory = checklist.filter(item => item.categoria === currentItem.categoria);
          const indexInThisCategory = itemsInCategory.findIndex(item => item.id === currentItem.id);
          const tickedInCategoryCount = itemsInCategory.filter(item => item.conforme === 'conforme').length;
          
          const isConforme = currentItem.conforme === 'conforme';

          return (
            <div className="flex flex-col gap-2 sm:gap-6" id="wizard-step-3">
              <div className="hidden sm:block">
                <h4 className="text-sm sm:text-lg md:text-2xl font-black text-zinc-900 border-b-2 sm:border-b-4 border-zinc-900 pb-1.5 sm:pb-3 flex items-center gap-1.5 sm:gap-2 uppercase tracking-tight">
                  <FileText className="text-amber-500 w-4 h-4 sm:w-6 sm:h-6 shrink-0" />
                  Checklist Geral de Inspeção Técnica
                </h4>
              </div>

              {/* Barra de Progresso Geral */}
              <div className="flex flex-col gap-1 bg-zinc-50 border border-zinc-900/60 rounded-xl p-1.5 sm:p-4 shadow-sm">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[8px] sm:text-[11px] font-black uppercase text-zinc-600 tracking-wider">
                    Status do Checklist
                  </span>
                  <span className="text-[8px] sm:text-[11px] font-mono font-black text-zinc-800 bg-zinc-200/60 px-1 py-0.5 rounded">
                    VERIFICADOS: {totalVerificados}/{totalItens} ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-1.5 sm:h-3 overflow-hidden border border-zinc-300">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Card do Item Ativo */}
              <div className="border-2 border-zinc-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg bg-white">
                {/* Header do Card - Categoria e Progresso na Categoria */}
                <div className="px-3.5 py-3 sm:px-5 sm:py-4 bg-zinc-900 text-white flex flex-col gap-2 sm:gap-3 border-b border-zinc-800">
                  <div className="flex flex-row items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                      {/* Badge do total de itens: e.g. 02/25 */}
                      <div className="px-1.5 py-1 sm:px-3.5 sm:py-1.5 bg-zinc-850 border border-amber-500 rounded sm:rounded-xl flex items-center justify-center shadow-md shrink-0">
                        <span className="text-amber-400 font-mono text-[11px] sm:text-sm font-black tracking-wide">
                          {String(currentChecklistItemIndex + 1).padStart(2, '0')}/{String(checklist.length).padStart(2, '0')}
                        </span>
                      </div>

                      {/* Título da Categoria */}
                      {editingCategory ? (
                        <div className="flex items-center gap-2 max-w-xs sm:max-w-md w-full shrink-0 sm:shrink">
                          <input
                            type="text"
                            value={editingCategoryText}
                            onChange={(e) => setEditingCategoryText(e.target.value)}
                            className="px-2 py-1 bg-white text-zinc-900 font-black rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
                            placeholder="Nome da categoria"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!editingCategoryText.trim()) return;
                              const oldCat = currentItem.categoria;
                              const newCat = editingCategoryText.trim();
                              
                              // 1. Atualizar no checklist atual em memória
                              setChecklist(prev => prev.map(item => item.categoria === oldCat ? { ...item, categoria: newCat } : item));
                              
                              // 2. Atualizar na checklist padrão
                              const defaultList = getChecklistPadrao();
                              const updatedDefault = defaultList.map(item => item.categoria === oldCat ? { ...item, categoria: newCat } : item);
                              salvarChecklistPadrao(updatedDefault, usuarioLogado.usuario);
                              
                              setEditingCategory(false);
                            }}
                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition shrink-0 flex items-center justify-center border border-emerald-700"
                            title="Salvar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategory(false)}
                            className="p-1 bg-zinc-700 hover:bg-zinc-650 text-zinc-300 rounded transition shrink-0 flex items-center justify-center border border-zinc-600"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (() => {
                        const relIndexStr = getRelativeIndexStr(currentItem, checklist);
                        const displayedCatText = `${currentItem.categoria} ${relIndexStr}`;
                        return (
                          <div className="flex items-center gap-1.5 min-w-0 max-w-[150px] sm:max-w-[320px] md:max-w-[450px]">
                            {displayedCatText.length > 22 ? (
                              <div className="overflow-hidden whitespace-nowrap w-full relative flex items-center">
                                <div className="animate-marquee-container">
                                  <span className="font-black text-xs sm:text-base md:text-lg uppercase tracking-wider text-sky-400 select-none pr-8">
                                    {displayedCatText}
                                  </span>
                                  <span className="font-black text-xs sm:text-base md:text-lg uppercase tracking-wider text-sky-400 select-none pr-8">
                                    {displayedCatText}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="font-black text-xs sm:text-base md:text-lg uppercase tracking-wider text-sky-400 select-none whitespace-nowrap">
                                {displayedCatText}
                              </span>
                            )}
                            {usuarioLogado?.usuario?.toLowerCase() === 'carlos.silva@industriasnb.com.br' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(true);
                                  setEditingCategoryText(currentItem.categoria);
                                }}
                                className="p-0.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition shrink-0"
                                title="Editar nome da categoria/bloco"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Badge de progresso na categoria: e.g. 1/4 VERIFICADOS */}
                    <div className="flex items-center shrink-0">
                      <div className="px-1.5 py-0.5 bg-zinc-850 border border-amber-500 rounded sm:rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-amber-400 font-mono text-[10px] sm:text-xs font-black tracking-wide uppercase">
                          Item {String(indexInThisCategory + 1)} de {itemsInCategory.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Controles Administrativos de Bloco (Apenas para o Carlos) */}
                  {usuarioLogado?.usuario?.toLowerCase() === 'carlos.silva@industriasnb.com.br' && (
                    <div className="mt-2 pt-3 border-t border-zinc-800 flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddTopicInput(!showAddTopicInput);
                            setShowDeleteCategoryConfirm(false);
                            setShowAddCategoryInput(false);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-xl transition duration-150 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar Tópico
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddCategoryInput(!showAddCategoryInput);
                            setShowAddTopicInput(false);
                            setShowDeleteCategoryConfirm(false);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-xl transition duration-150 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar Bloco
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeleteCategoryConfirm(!showDeleteCategoryConfirm);
                            setShowAddTopicInput(false);
                            setShowAddCategoryInput(false);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-xl transition duration-150 shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir Bloco
                        </button>
                      </div>

                      {/* Input de Adicionar Bloco */}
                      {showAddCategoryInput && (
                        <div className="bg-zinc-850 p-3.5 rounded-2xl border-2 border-zinc-800 flex flex-col gap-3 shadow-inner">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Nome do Bloco / Categoria</label>
                            <input
                              type="text"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              className="w-full px-3 py-2 bg-white text-zinc-900 text-xs sm:text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                              placeholder="Ex: SISTEMA ELÉTRICO, DETALHES DE CABINE..."
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Primeiro Tópico do Bloco</label>
                            <input
                              type="text"
                              value={newCategoryFirstTopic}
                              onChange={(e) => setNewCategoryFirstTopic(e.target.value)}
                              className="w-full px-3 py-2 bg-white text-zinc-900 text-xs sm:text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                              placeholder="Descreva o primeiro tópico de checklist para este bloco..."
                            />
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newCategoryName.trim() || !newCategoryFirstTopic.trim()) return;

                                const newCatName = newCategoryName.trim().toUpperCase();
                                const newTopicName = newCategoryFirstTopic.trim();
                                const newItemId = `item_${Date.now()}`;

                                const newItem: ItemChecklist = {
                                  id: newItemId,
                                  categoria: newCatName,
                                  item: newTopicName,
                                  conforme: null,
                                  observacao: ''
                                };

                                // Adiciona no fim do checklist atual
                                const updatedChecklist = [...checklist, newItem];
                                setChecklist(updatedChecklist);

                                // Adiciona na lista padrão global para futuros checklists
                                const defaultList = getChecklistPadrao();
                                const updatedDefault = [...defaultList, {
                                  id: newItemId,
                                  categoria: newCatName,
                                  item: newTopicName
                                }];
                                salvarChecklistPadrao(updatedDefault, usuarioLogado.usuario);

                                // Seleciona o recém-criado item ativo
                                setCurrentChecklistItemIndex(updatedChecklist.length - 1);

                                setNewCategoryName('');
                                setNewCategoryFirstTopic('');
                                setShowAddCategoryInput(false);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-lg transition"
                            >
                              Criar Bloco
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddCategoryInput(false);
                                setNewCategoryName('');
                                setNewCategoryFirstTopic('');
                              }}
                              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-650 text-zinc-300 font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-lg transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Input de Adicionar Tópico */}
                      {showAddTopicInput && (
                        <div className="bg-zinc-850 p-3.5 rounded-2xl border-2 border-zinc-800 flex flex-col gap-3 shadow-inner">
                          <input
                            type="text"
                            value={newTopicText}
                            onChange={(e) => setNewTopicText(e.target.value)}
                            className="w-full px-3 py-2 bg-white text-zinc-900 text-xs sm:text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="Descreva o novo tópico de checklist..."
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newTopicText.trim()) return;
                                
                                const newItemId = `item_${Date.now()}`;
                                const newItem: ItemChecklist = {
                                  id: newItemId,
                                  categoria: currentItem.categoria,
                                  item: newTopicText.trim(),
                                  conforme: null,
                                  observacao: ''
                                };

                                // Encontra o último index desta categoria no checklist atual
                                const lastIndexInCategory = checklist.reduce((lastIdx, item, idx) => {
                                  return item.categoria === currentItem.categoria ? idx : lastIdx;
                                }, currentChecklistItemIndex);

                                const updatedChecklist = [...checklist];
                                updatedChecklist.splice(lastIndexInCategory + 1, 0, newItem);
                                setChecklist(updatedChecklist);

                                // Adiciona na lista padrão global para futuros checklists
                                const defaultList = getChecklistPadrao();
                                const lastDefaultIndexInCategory = defaultList.reduce((lastIdx, item, idx) => {
                                  return item.categoria === currentItem.categoria ? idx : lastIdx;
                                }, -1);

                                const updatedDefault = [...defaultList];
                                const newDefaultItem = {
                                  id: newItemId,
                                  categoria: currentItem.categoria,
                                  item: newTopicText.trim()
                                };

                                if (lastDefaultIndexInCategory !== -1) {
                                  updatedDefault.splice(lastDefaultIndexInCategory + 1, 0, newDefaultItem);
                                } else {
                                  updatedDefault.push(newDefaultItem);
                                }
                                salvarChecklistPadrao(updatedDefault, usuarioLogado.usuario);

                                setNewTopicText('');
                                setShowAddTopicInput(false);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-lg transition"
                            >
                              Confirmar Adição
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddTopicInput(false);
                                setNewTopicText('');
                              }}
                              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-650 text-zinc-300 font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-lg transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Confirmação de Exclusão de Bloco */}
                      {showDeleteCategoryConfirm && (
                        <div className="bg-red-950/40 p-3.5 rounded-2xl border-2 border-red-900/60 flex flex-col gap-3 shadow-inner">
                          <p className="text-xs sm:text-sm font-black text-red-200 leading-relaxed">
                            Tem certeza que deseja excluir o bloco "{currentItem.categoria}" por completo? Todos os {itemsInCategory.length} tópicos deste bloco serão removidos permanentemente para todos.
                          </p>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const categoryToRemove = currentItem.categoria;
                                
                                // Remove do checklist atual
                                const remainingChecklist = checklist.filter(item => item.categoria !== categoryToRemove);
                                
                                // Remove do checklist padrão global
                                const defaultList = getChecklistPadrao();
                                const updatedDefault = defaultList.filter(item => item.categoria !== categoryToRemove);
                                salvarChecklistPadrao(updatedDefault, usuarioLogado.usuario);

                                // Se não restou nenhum item, adiciona um item padrão vazio para evitar quebras
                                if (remainingChecklist.length === 0) {
                                  const dummyItem: ItemChecklist = {
                                    id: `item_${Date.now()}`,
                                    categoria: 'GERAL',
                                    item: 'Item padrão de checklist',
                                    conforme: null,
                                    observacao: ''
                                  };
                                  setChecklist([dummyItem]);
                                  salvarChecklistPadrao([{ id: dummyItem.id, categoria: dummyItem.categoria, item: dummyItem.item }], usuarioLogado.usuario);
                                } else {
                                  setChecklist(remainingChecklist);
                                }
                                
                                setCurrentChecklistItemIndex(0);
                                setShowDeleteCategoryConfirm(false);
                              }}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-lg transition"
                            >
                              Confirmar Exclusão
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDeleteCategoryConfirm(false)}
                              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-650 text-zinc-300 font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-lg transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col p-3.5 sm:p-6 gap-3.5 sm:gap-6">
                  {/* Título do Item */}
                  <div className="bg-zinc-50 border-2 border-zinc-900 rounded-xl sm:rounded-2xl flex flex-row items-center justify-between shadow-inner p-3.5 sm:p-6 gap-4 sm:gap-6">
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5 sm:gap-2 text-left">
                      {usuarioLogado?.usuario?.toLowerCase() === 'carlos.silva@industriasnb.com.br' && editingItemId === currentItem.id ? (
                        <div className="flex flex-col gap-3 w-full">
                          <textarea
                            value={editingItemText}
                            onChange={(e) => setEditingItemText(e.target.value)}
                            className="w-full p-3 border-2 border-zinc-900 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 min-h-[120px]"
                            placeholder="Edite o texto do item..."
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingItemText.trim()) return;
                                // Atualiza a checklist atual no formulário
                                setChecklist(prev => prev.map(item => item.id === currentItem.id ? { ...item, item: editingItemText } : item));
                                
                                // Salva na checklist padrão de localStorage para persistir para todos
                                const dynamicCheck = getChecklistPadrao();
                                const updatedCheck = dynamicCheck.map(item => item.id === currentItem.id ? { ...item, item: editingItemText } : item);
                                salvarChecklistPadrao(updatedCheck, usuarioLogado.usuario);
                                
                                setEditingItemId(null);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-lg transition shadow-sm flex items-center gap-1 border border-emerald-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Salvar para Todos
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-black text-xs uppercase tracking-wider rounded-lg transition border border-zinc-300"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : usuarioLogado?.usuario?.toLowerCase() === 'carlos.silva@industriasnb.com.br' && showDeleteTopicConfirm ? (
                        <div className="flex flex-col gap-3 w-full bg-red-50 p-4 border-2 border-red-500 rounded-xl">
                          <p className="text-sm font-black text-red-950">
                            Tem certeza de que deseja excluir este tópico? Ele será removido permanentemente de todos os checklists ativos e futuros para todos os usuários.
                          </p>
                          <p className="text-xs font-semibold text-red-800 italic">
                            "{currentItem.item}"
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const idToRemove = currentItem.id;
                                
                                // 1. Remove do checklist atual em memória
                                const updatedChecklist = checklist.filter(item => item.id !== idToRemove);
                                
                                // 2. Remove do checklist padrão global
                                const defaultList = getChecklistPadrao();
                                const updatedDefault = defaultList.filter(item => item.id !== idToRemove);
                                salvarChecklistPadrao(updatedDefault, usuarioLogado.usuario);

                                if (updatedChecklist.length === 0) {
                                  const dummyItem: ItemChecklist = {
                                    id: `item_${Date.now()}`,
                                    categoria: 'GERAL',
                                    item: 'Item padrão de checklist',
                                    conforme: null,
                                    observacao: ''
                                  };
                                  setChecklist([dummyItem]);
                                  salvarChecklistPadrao([{ id: dummyItem.id, categoria: dummyItem.categoria, item: dummyItem.item }], usuarioLogado.usuario);
                                } else {
                                  setChecklist(updatedChecklist);
                                }

                                // Ajusta o index atual se necessário
                                if (currentChecklistItemIndex >= Math.max(1, updatedChecklist.length)) {
                                  setCurrentChecklistItemIndex(Math.max(0, updatedChecklist.length - 1));
                                }

                                setShowDeleteTopicConfirm(false);
                              }}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-lg transition shadow-sm flex items-center gap-1 border border-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir para Todos
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDeleteTopicConfirm(false)}
                              className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-black text-xs uppercase tracking-wider rounded-lg transition border border-zinc-300"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3 w-full overflow-hidden">
                            <h5 className="font-bold sm:font-black text-zinc-900 tracking-tight leading-snug sm:leading-relaxed break-words flex-1 text-base sm:text-lg md:text-xl">
                              {currentItem.item.length > 65 && !isTextExpanded
                                ? `${currentItem.item.substring(0, 65)}...`
                                : currentItem.item}
                            </h5>
                            {usuarioLogado?.usuario?.toLowerCase() === 'carlos.silva@industriasnb.com.br' && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItemId(currentItem.id);
                                    setEditingItemText(currentItem.item);
                                  }}
                                  className="p-1 bg-zinc-150 hover:bg-amber-100 text-zinc-650 hover:text-amber-700 border border-zinc-300 rounded transition shrink-0"
                                  title="Editar este item para todos os usuários"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowDeleteTopicConfirm(true);
                                  }}
                                  className="p-1 bg-zinc-150 hover:bg-red-100 text-zinc-650 hover:text-red-700 border border-zinc-300 rounded transition shrink-0"
                                  title="Excluir este item/tópico para todos os usuários"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          {currentItem.item.length > 65 && (
                            <button
                              type="button"
                              onClick={() => setIsTextExpanded(!isTextExpanded)}
                              className="self-start flex items-center gap-1 mt-1 font-black uppercase tracking-wider text-amber-600 hover:text-amber-700 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 hover:border-amber-500/50 rounded-lg transition duration-150 shadow-sm text-[10px] sm:text-xs px-2.5 py-1"
                            >
                              {isTextExpanded ? (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  Recolher Texto
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  Ver Texto Completo
                                </>
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Botão Único com Símbolo de Certo */}
                    <div className="flex justify-center items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const novoStatus = isConforme ? null : 'conforme';
                          handleConformidadeChange(currentChecklistItemIndex, novoStatus);
                          setShowSkipWarning(false);
                        }}
                        className={`w-14 h-14 sm:w-24 sm:h-24 rounded-full border-2 sm:border-4 transition-all duration-300 flex items-center justify-center shadow-md sm:shadow-lg cursor-pointer select-none shrink-0 ${
                          isConforme
                            ? 'bg-emerald-600 border-emerald-700 text-white scale-105 sm:scale-110 shadow-emerald-200'
                            : 'bg-white border-zinc-300 text-zinc-300 hover:bg-zinc-100 hover:border-zinc-400 hover:text-zinc-500 hover:scale-105 active:scale-95'
                        }`}
                        title={isConforme ? "Desmarcar item" : "Marcar como verificado"}
                      >
                        <Check className={`w-7 h-7 sm:w-12 sm:h-12 stroke-[4] transition-transform duration-300 ${isConforme ? 'scale-110' : 'scale-90 opacity-60'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                  {/* Nota / Warning se o usuário tentar avançar sem ticar */}
                  {showSkipWarning && (
                    <div className="p-4 sm:p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col gap-4 shadow-md animate-fadeIn">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h6 className="text-xs font-black text-amber-950 uppercase tracking-wider">Item Não Verificado</h6>
                          <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                            Você está prestes a avançar sem responder a este item do checklist. Deseja marcar como verificado agora ou ignorar e prosseguir?
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleConfirmSkipChecklistItem(true);
                          }}
                          className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition shadow-sm text-center"
                        >
                          Verificar e Avançar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleConfirmSkipChecklistItem(false);
                          }}
                          className="flex-1 px-4 py-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition border border-zinc-300 text-center"
                        >
                          Apenas Avançar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSkipWarning(false);
                          }}
                          className="flex-1 px-4 py-2.5 bg-white hover:bg-zinc-50 text-zinc-500 font-bold text-[10px] uppercase tracking-wider rounded-xl transition border border-zinc-200 text-center"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
        })()}

        {/* PASSO 4: ASSINATURAS E PARECER FINAL */}
        {step === 4 && (
          <div className="flex flex-col gap-6" id="wizard-step-4">
            <div>
              <h4 className="text-base font-bold text-zinc-800 border-b pb-2 flex items-center gap-2">
                <FileText className="text-amber-500 w-5 h-5" />
                Assinatura de Entrega Técnica e Garantia
              </h4>
              <p className="text-xs text-zinc-400 mt-1">Ao assinar digitalmente este termo, ambas as partes confirmam que o maquinário agrícola foi inspecionado, testado e recebido em total conformidade técnica.</p>
            </div>

            {/* Observações Gerais */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-700">Parecer Técnico e Observações Finais</label>
              <textarea
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
                placeholder="Informe comentários gerais, recomendações de cuidados ou orientações passadas ao operador durante a demonstração de funcionamento."
                className="w-full p-3 border border-zinc-300 rounded-lg text-sm bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                rows={3}
                id="textarea-general-obs"
              />
            </div>

            {/* Signature Canvases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SignatureCanvas
                id="tecnico"
                label="Assinatura do Técnico Responsável *"
                onSave={(base64) => setAssinaturaTecnico(base64)}
                savedImage={assinaturaTecnico}
              />

              <SignatureCanvas
                id="cliente"
                label="Assinatura Digital do Produtor (Cliente) *"
                onSave={(base64) => setAssinaturaCliente(base64)}
                savedImage={assinaturaCliente}
              />
            </div>
          </div>
        )}

      </div>

      {/* BOTÕES DE NAVEGAÇÃO DO WIZARD */}
      <div className="flex items-center gap-2 sm:gap-4 bg-zinc-50 border-2 border-zinc-900 rounded-2xl shadow-md w-full box-border p-2 sm:p-4">
        <button
          type="button"
          onClick={() => {
            if (step === 3) {
              handlePrevChecklistItem();
            } else {
              setStep(prev => Math.max(prev - 1, 1));
            }
          }}
          disabled={step === 1}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1 h-10 sm:h-11 px-1 sm:px-5 text-[9px] sm:text-sm font-black uppercase tracking-wider border-2 border-zinc-300 rounded-xl bg-white text-zinc-700 hover:bg-zinc-100 hover:border-zinc-400 active:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition select-none"
          id="btn-wizard-prev"
        >
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          <span>{step === 3 && currentChecklistItemIndex > 0 ? "Voltar Item" : "Voltar"}</span>
        </button>

        {/* Spacer to push buttons to the right on desktop, keeps them grouped equally on mobile */}
        <div className="hidden sm:block flex-1" />

        {/* Salvar Rascunho */}
        <button
          type="button"
          onClick={handleSalvarComoRascunho}
          className="flex-1 sm:flex-none flex items-center justify-center h-10 sm:h-11 px-1 sm:px-5 border-2 border-zinc-300 rounded-xl bg-white text-[9px] sm:text-sm font-black uppercase tracking-wider text-zinc-700 hover:bg-zinc-100 hover:border-zinc-400 active:bg-zinc-200 transition select-none whitespace-nowrap"
          id="btn-save-draft"
        >
          <span>Salvar<span className="hidden min-[380px]:inline"> Rascunho</span></span>
        </button>

        {/* Próximo ou Finalizar */}
        {step < 4 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                setEntregaIniciada(true);
                if (tempoPassado === 0) {
                  startTimeRef.current = Date.now();
                } else {
                  startTimeRef.current = Date.now() - (tempoPassado * 1000);
                }
              }
              if (step === 3) {
                handleNextChecklistItem();
              } else {
                setStep(prev => prev + 1);
              }
            }}
            disabled={
              (step === 1 && !validarPasso1()) ||
              (step === 2 && !validarPasso2()) ||
              (step === 3 && !validarPasso3())
            }
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 h-10 sm:h-11 px-1.5 sm:px-6 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-zinc-950 font-black text-[9px] sm:text-sm uppercase tracking-wider rounded-xl transition shadow-md select-none whitespace-nowrap"
            id="btn-wizard-next"
          >
            <span>{step === 3 ? (currentChecklistItemIndex === checklist.length - 1 ? "Assinatura" : "Próximo Item") : "Avançar"}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalizarEGerarCheckList}
            disabled={!assinaturaTecnico || !assinaturaCliente}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 h-10 sm:h-11 px-1.5 sm:px-7 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-zinc-950 font-black text-[9px] sm:text-sm uppercase tracking-wider rounded-xl transition shadow-lg select-none whitespace-nowrap"
            id="btn-wizard-finalize"
          >
            <span>Finalizar</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={showDescartarConfirm}
        onClose={() => setShowDescartarConfirm(false)}
        onConfirm={resetForm}
        title="Descartar Entrega Técnica"
        message="Tem certeza de que deseja descartar esta entrega técnica? Todos os dados preenchidos, fotos tiradas e progresso do checklist serão perdidos definitivamente."
      />
    </div>
  );
}
