/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CHECKLIST_PADRAO } from './db';
import { EntregaTecnica, ItemChecklist } from '../types';

/**
 * Compresses an EntregaTecnica object into a highly compact representation (v2)
 * to keep the shared QR code URLs as short and clean as possible.
 */
export function compressEntrega(entrega: any, includeSignatures: boolean = true): any {
  if (!entrega) return null;

  // 1. Map conforme status to a single char
  const mapConforme = (c: string | null): string => {
    if (c === 'conforme') return 'c';
    if (c === 'nao_conforme') return 'n';
    if (c === 'nao_se_aplica') return 'a';
    return 'x';
  };

  // 2. Build the compact checklist string of standard items and collect observations/custom items
  const stdCount = CHECKLIST_PADRAO.length;
  const statusArray = Array(stdCount).fill('x');
  const obsMap: { [index: number]: string } = {};
  const customItems: any[] = [];

  const items = entrega.checklist || [];
  items.forEach((item: any) => {
    const stdIndex = CHECKLIST_PADRAO.findIndex((s) => s.id === item.id);
    if (stdIndex !== -1) {
      statusArray[stdIndex] = mapConforme(item.conforme);
      if (item.observacao && item.observacao.trim() !== '') {
        obsMap[stdIndex] = item.observacao.trim();
      }
    } else {
      // Custom item
      customItems.push({
        cat: item.categoria,
        txt: item.item,
        c: mapConforme(item.conforme),
        o: item.observacao && item.observacao.trim() !== '' ? item.observacao.trim() : undefined
      });
    }
  });

  const cs = statusArray.join('');

  const comp: any = {
    v: 2, // version 2 (ultra-compressed)
    id: entrega.id,
    cli: [
      entrega.cliente?.nome || '',
      entrega.cliente?.documento || '',
      entrega.cliente?.fazenda || '',
      entrega.cliente?.cidade || '',
      entrega.cliente?.estado || ''
    ],
    tec: entrega.tecnico?.nome || '',
    rev: entrega.revenda?.nome || '',
    maq: [
      entrega.maquina?.modelo || '',
      entrega.maquina?.numeroSerie || '',
      entrega.maquina?.fabricante || 'JF Máquinas'
    ],
    dat: entrega.data,
    st: entrega.status,
    cs, // string of compliance e.g. "cccccccccccaaacccc..."
  };

  if (includeSignatures && entrega.assinaturas) {
    comp.ass = [
      entrega.assinaturas.tecnico || '',
      entrega.assinaturas.cliente || ''
    ];
  }

  if (Object.keys(obsMap).length > 0) {
    comp.co = obsMap; // e.g. { "5": "Ajustado", "12": "Falta pino" }
  }

  if (customItems.length > 0) {
    comp.cc = customItems;
  }

  if (entrega.localizacao?.latitude || entrega.localizacao?.longitude) {
    comp.loc = [
      entrega.localizacao.latitude,
      entrega.localizacao.longitude
    ];
  }

  if (entrega.observacoesGerais && entrega.observacoesGerais.trim() !== '') {
    comp.obs = entrega.observacoesGerais.trim();
  }

  if (entrega.dataCriacao) comp.dc = entrega.dataCriacao;
  if (entrega.dataFinalizacao) comp.df = entrega.dataFinalizacao;

  return comp;
}

/**
 * Decompresses a compressed EntregaTecnica representation back into a full EntregaTecnica object.
 * Fully backward-compatible with Version 1 and uncompressed objects.
 */
export function decompressEntrega(comp: any): EntregaTecnica {
  if (!comp) return null as any;

  // Backward compatibility: if it doesn't have the compressed version field, treat it as a full object
  if (comp.v === undefined) {
    return comp as EntregaTecnica;
  }

  // Version 1 (old compression):
  if (comp.v === 1) {
    const mapConformeBackV1 = (c: string | undefined): any => {
      if (c === 'c') return 'conforme';
      if (c === 'nc') return 'nao_conforme';
      if (c === 'na') return 'nao_se_aplica';
      return null;
    };
    const decompressedChecklist: ItemChecklist[] = (comp.chk || []).map((item: any) => {
      const std = CHECKLIST_PADRAO.find((s: any) => s.id === item.i);
      return {
        id: item.i,
        categoria: item.cat || (std ? std.categoria : ''),
        item: item.txt || (std ? std.item : ''),
        conforme: mapConformeBackV1(item.c),
        observacao: item.o || ''
      };
    });

    return {
      id: comp.id,
      cliente: {
        id: 'c_custom',
        nome: comp.cli?.n || '',
        documento: comp.cli?.d || '',
        fazenda: comp.cli?.f || '',
        cidade: comp.cli?.c || '',
        estado: comp.cli?.e || ''
      },
      tecnico: {
        id: 'custom',
        nome: comp.tec?.n || ''
      },
      revenda: {
        id: 'custom',
        nome: comp.rev?.n || '',
        cidade: comp.cli?.c || '',
        estado: comp.cli?.e || ''
      },
      maquina: {
        id: 'm_custom',
        modelo: comp.maq?.m || '',
        tipo: 'Equipamento',
        numeroSerie: comp.maq?.s || '',
        fabricante: comp.maq?.f || 'JF Máquinas'
      },
      data: comp.dat,
      status: comp.st || 'sincronizado',
      checklist: decompressedChecklist,
      fotosGerais: {},
      assinaturas: { tecnico: "", cliente: "" },
      localizacao: {
        latitude: comp.loc?.la || null,
        longitude: comp.loc?.lo || null,
        precisao: null,
        dataHora: comp.df || comp.dc || new Date().toISOString()
      },
      tempoExecucaoSegundos: 0,
      dataCriacao: comp.dc || new Date().toISOString(),
      dataFinalizacao: comp.df,
      observacoesGerais: comp.obs || ''
    };
  }

  // Version 2 (super compressed):
  const mapConformeBack = (c: string | undefined): any => {
    if (c === 'c') return 'conforme';
    if (c === 'n') return 'nao_conforme';
    if (c === 'a') return 'nao_se_aplica';
    return null;
  };

  const decompressedChecklist: ItemChecklist[] = [];

  // Reconstruct standard items
  const cs = comp.cs || '';
  const obsMap = comp.co || {};
  
  CHECKLIST_PADRAO.forEach((std, index) => {
    const char = cs[index] || 'x';
    const conforme = mapConformeBack(char);
    const observacao = obsMap[index] || '';
    decompressedChecklist.push({
      id: std.id,
      categoria: std.categoria,
      item: std.item,
      conforme,
      observacao
    });
  });

  // Reconstruct custom items
  if (comp.cc && Array.isArray(comp.cc)) {
    comp.cc.forEach((item: any, idx: number) => {
      decompressedChecklist.push({
        id: `custom_${idx}`,
        categoria: item.cat || 'Customizado',
        item: item.txt || '',
        conforme: mapConformeBack(item.c),
        observacao: item.o || ''
      });
    });
  }

  const cliArr = comp.cli || [];
  const maqArr = comp.maq || [];
  const locArr = comp.loc || [];

  return {
    id: comp.id,
    cliente: {
      id: 'c_custom',
      nome: cliArr[0] || '',
      documento: cliArr[1] || '',
      fazenda: cliArr[2] || '',
      cidade: cliArr[3] || '',
      estado: cliArr[4] || ''
    },
    tecnico: {
      id: 'custom',
      nome: comp.tec || ''
    },
    revenda: {
      id: 'custom',
      nome: comp.rev || '',
      cidade: cliArr[3] || '',
      estado: cliArr[4] || ''
    },
    maquina: {
      id: 'm_custom',
      modelo: maqArr[0] || '',
      tipo: 'Equipamento',
      numeroSerie: maqArr[1] || '',
      fabricante: maqArr[2] || 'JF Máquinas'
    },
    data: comp.dat,
    status: comp.st || 'sincronizado',
    checklist: decompressedChecklist,
    fotosGerais: {},
    assinaturas: {
      tecnico: (comp.ass && comp.ass[0]) || "",
      cliente: (comp.ass && comp.ass[1]) || ""
    },
    localizacao: {
      latitude: locArr[0] || null,
      longitude: locArr[1] || null,
      precisao: null,
      dataHora: comp.df || comp.dc || new Date().toISOString()
    },
    tempoExecucaoSegundos: 0,
    dataCriacao: comp.dc || new Date().toISOString(),
    dataFinalizacao: comp.df,
    observacoesGerais: comp.obs || ''
  };
}
