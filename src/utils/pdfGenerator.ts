/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { EntregaTecnica } from '../types';

// Helper para desenhar assinaturas simuladas para os dados de demonstração (quando for SVG)
function drawMockSignature(doc: jsPDF, x: number, y: number, w: number, h: number, seed: string) {
  doc.setDrawColor(30, 41, 59); // Cinza escuro elegante
  doc.setLineWidth(1);
  
  const points = seed === 'tecnico' ? [
    [x + 15, y + h - 10],
    [x + 25, y + 10],
    [x + 35, y + h - 15],
    [x + 45, y + 8],
    [x + 55, y + h - 12],
    [x + 65, y + 14],
    [x + 72, y + h - 10]
  ] : [
    [x + 12, y + h - 12],
    [x + 22, y + 8],
    [x + 32, y + h - 8],
    [x + 42, y + 12],
    [x + 52, y + h - 14],
    [x + 62, y + 10],
    [x + 70, y + h - 12]
  ];
  
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i][0], points[i][1], points[i+1][0], points[i+1][1]);
  }
}

// Helper para desenhar fotos ilustrativas simuladas para os dados de demonstração (quando for SVG)
function drawMockPhoto(doc: jsPDF, title: string, x: number, y: number, w: number, h: number) {
  // Fundo cinza/verde suave com borda estilizada
  doc.setFillColor(240, 244, 240);
  doc.rect(x, y, w, h, 'F');
  
  // Borda Cinza
  doc.setDrawColor(81, 81, 78);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h, 'S');
  
  // Ícone de trator com formas geométricas estilizadas
  doc.setFillColor(43, 83, 41); // Verde JF / Agro
  doc.rect(x + w/2 - 12, y + h/2 - 6, 24, 12, 'F'); // chassi
  doc.rect(x + w/2, y + h/2 - 12, 10, 8, 'F'); // cabine
  
  // Rodas
  doc.setFillColor(81, 81, 78);
  doc.circle(x + w/2 - 8, y + h/2 + 6, 5, 'F'); // roda traseira
  doc.circle(x + w/2 + 8, y + h/2 + 6, 3.5, 'F'); // roda dianteira
  
  // Texto descritivo
  doc.setTextColor(51, 51, 49);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(title, x + w/2, y + h - 4, { align: 'center' });
}

// Helper de inserção de imagens resiliente
function safeAddImage(doc: jsPDF, base64: string | undefined, format: string, x: number, y: number, w: number, h: number): boolean {
  if (!base64) return false;

  // Interceptar imagens mockadas (SVG) e renderizar belos vetores nativos
  if (base64.startsWith('data:image/svg+xml') || base64.includes('<svg')) {
    if (base64.includes('MÁQUINA ENTREGUE') || base64.includes('maquinaCompleta')) {
      drawMockPhoto(doc, 'Máquina Completa (Demonstração)', x, y, w, h);
      return true;
    } else if (base64.includes('PLAQUETA') || base64.includes('numeroSerie')) {
      drawMockPhoto(doc, 'Plaqueta Número de Série (Demonstração)', x, y, w, h);
      return true;
    } else if (base64.includes('tecnico') || base64.includes('stroke="%23475569"')) {
      drawMockSignature(doc, x, y, w, h, 'tecnico');
      return true;
    } else {
      drawMockSignature(doc, x, y, w, h, 'cliente');
      return true;
    }
  }

  // Adicionar imagens reais em base64 (JPEG/PNG)
  try {
    let cleanBase = base64;
    // Garante cabeçalho básico se estiver ausente
    if (!cleanBase.startsWith('data:')) {
      cleanBase = `data:image/${format.toLowerCase()};base64,${cleanBase}`;
    }
    doc.addImage(cleanBase, format, x, y, w, h);
    return true;
  } catch (error) {
    console.warn("Falha ao adicionar imagem ao PDF:", error);
    // Fallback: desenhar um retângulo elegante
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(x, y, w, h, 'FD');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text('[Imagem Anexada]', x + w/2, y + h/2, { align: 'center' });
    return false;
  }
}

// Desenha caixas de seleção (checkboxes) em vetor nativo para perfeita nitidez e evitar cortes de fonte
function drawCheckbox(doc: jsPDF, x: number, y: number, status: 'conforme' | 'nao_conforme' | null) {
  // Reseta espessura inicial para a borda do quadrado
  doc.setLineWidth(0.25);
  
  if (status === 'conforme') {
    // Quadrado Verde sutil
    doc.setFillColor(232, 245, 233);
    doc.setDrawColor(46, 125, 50);
    doc.rect(x, y - 3.2, 3.5, 3.5, 'FD');
    
    // Símbolo V (Checkmark) com traço elegante
    doc.setLineWidth(0.45);
    doc.setDrawColor(46, 125, 50);
    doc.line(x + 0.8, y - 1.8, x + 1.5, y - 0.8);
    doc.line(x + 1.5, y - 0.8, x + 2.8, y - 2.5);
    
    doc.setTextColor(46, 125, 50);
    doc.setFont('helvetica', 'bold');
    doc.text('Realizado', x + 5, y);
  } else if (status === 'nao_conforme') {
    // Quadrado Vermelho sutil
    doc.setFillColor(255, 235, 235);
    doc.setDrawColor(211, 47, 47);
    doc.rect(x, y - 3.2, 3.5, 3.5, 'FD');
    
    // Símbolo X
    doc.setLineWidth(0.45);
    doc.setDrawColor(211, 47, 47);
    doc.line(x + 0.8, y - 2.4, x + 2.7, y - 0.8);
    doc.line(x + 0.8, y - 0.8, x + 2.7, y - 2.4);
    
    doc.setTextColor(211, 47, 47);
    doc.setFont('helvetica', 'bold');
    doc.text('Não Conforme', x + 5, y);
  } else {
    // Quadrado Cinza sutil (N/A)
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(150, 150, 150);
    doc.rect(x, y - 3.2, 3.5, 3.5, 'FD');
    
    // Traço central (-)
    doc.setLineWidth(0.4);
    doc.setDrawColor(150, 150, 150);
    doc.line(x + 0.8, y - 1.5, x + 2.7, y - 1.5);
    
    doc.setTextColor(110, 110, 106);
    doc.setFont('helvetica', 'normal');
    doc.text('N/A', x + 5, y);
  }
  
  // Reseta para espessura padrão do jsPDF ao finalizar
  doc.setLineWidth(0.2);
}

export function gerarPDFEntrega(entrega: EntregaTecnica): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const brandYellow = [250, 194, 34]; // #fac222 (JF Amarela)
  const brandGray = [81, 81, 78];     // #51514e (JF Cinza)
  const charcoal = [51, 51, 49];      // #333331 (JF Cinza Escuro)
  const grayLight = [241, 241, 240];  // #f1f1f0 (JF Cinza Claro)
  const grayText = [110, 110, 106];   // #6e6e6a (JF Cinza Texto)

  // --- PÁGINA 1: CABEÇALHO E DADOS GERAIS ---
  
  // Faixa decorativa superior - Amarela JF
  doc.setFillColor(brandYellow[0], brandYellow[1], brandYellow[2]);
  doc.rect(0, 0, 210, 15, 'F');

  // Cabeçalho / Título (Texto escuro em fundo amarelo para perfeito contraste)
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Check List de Entrega Técnica', 15, 9);
  
  // Número do Termo e Status (Texto escuro em fundo amarelo)
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.setFontSize(10);
  doc.text(`Nº: ${entrega.id}`, 195, 9, { align: 'right' });

  // Informações de Emissão (Logo e identificação)
  doc.setTextColor(brandGray[0], brandGray[1], brandGray[2]);
  doc.setFontSize(18);
  doc.text('JF CHECK', 15, 28);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('Soluções Tecnológicas para Agronegócio', 15, 33);

  // Data de Emissão Verdadeira (Incluindo Horário)
  const dataEmissaoObj = new Date(entrega.dataFinalizacao || entrega.dataCriacao || new Date());
  const dataEmissaoStr = dataEmissaoObj.toLocaleDateString('pt-BR');
  const horaEmissaoStr = dataEmissaoObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  doc.text(`Data de Emissão: ${dataEmissaoStr} ${horaEmissaoStr}`, 195, 33, { align: 'right' });

  // Linha divisória robusta em JF Amarelo
  doc.setDrawColor(brandYellow[0], brandYellow[1], brandYellow[2]);
  doc.setLineWidth(1);
  doc.line(15, 38, 195, 38);

  // --- SEÇÃO 1: DADOS DO CLIENTE ---
  // Background JF Gray com detalhe lateral em JF Yellow para sofisticação
  doc.setFillColor(brandGray[0], brandGray[1], brandGray[2]);
  doc.rect(15, 43, 180, 7, 'F');
  doc.setFillColor(brandYellow[0], brandYellow[1], brandYellow[2]);
  doc.rect(15, 43, 3, 7, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. DADOS DO CLIENTE E DA PROPRIEDADE', 21, 48);

  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.setFontSize(9);
  
  // Grid de Dados do Cliente com Alinhamento Perfeito
  let startY = 56;
  doc.setFont('helvetica', 'bold'); doc.text('Cliente/Razão Social:', 15, startY);
  doc.setFont('helvetica', 'normal'); doc.text(entrega.cliente.nome, 52, startY);
  
  doc.setFont('helvetica', 'bold'); doc.text('Fazenda/Propriedade:', 110, startY);
  doc.setFont('helvetica', 'normal'); doc.text(entrega.cliente.fazenda, 148, startY);

  startY += 6;
  doc.setFont('helvetica', 'bold'); doc.text('CPF/CNPJ:', 15, startY);
  doc.setFont('helvetica', 'normal'); doc.text(entrega.cliente.documento, 52, startY);
  
  doc.setFont('helvetica', 'bold'); doc.text('Cidade/Estado:', 110, startY);
  doc.setFont('helvetica', 'normal'); doc.text(`${entrega.cliente.cidade} - ${entrega.cliente.estado}`, 148, startY);

  // --- SEÇÃO 2: DADOS DA MÁQUINA ---
  startY += 10;
  doc.setFillColor(brandGray[0], brandGray[1], brandGray[2]);
  doc.rect(15, startY, 180, 7, 'F');
  doc.setFillColor(brandYellow[0], brandYellow[1], brandYellow[2]);
  doc.rect(15, startY, 3, 7, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('2. IDENTIFICAÇÃO DO EQUIPAMENTO', 21, startY + 5);

  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  startY += 12;
  doc.setFont('helvetica', 'bold'); doc.text('Equipamento/Modelo:', 15, startY);
  doc.setFont('helvetica', 'normal'); doc.text(entrega.maquina.modelo, 52, startY);
  
  doc.setFont('helvetica', 'bold'); doc.text('Número de Série (CHASSI):', 110, startY);
  doc.setFont('helvetica', 'normal'); doc.text(entrega.maquina.numeroSerie, 155, startY);

  startY += 6;
  doc.setFont('helvetica', 'bold'); doc.text('Fabricante/Marca:', 15, startY);
  doc.setFont('helvetica', 'normal'); doc.text(entrega.maquina.fabricante, 52, startY);
  
  doc.setFont('helvetica', 'bold'); doc.text('Revenda:', 110, startY);
  doc.setFont('helvetica', 'normal'); doc.text(entrega.revenda.nome, 155, startY);

  startY += 6;
  doc.setFont('helvetica', 'bold'); doc.text('Técnico Responsável:', 15, startY);
  doc.setFont('helvetica', 'normal'); doc.text(entrega.tecnico.nome, 52, startY);

  // --- SEÇÃO 3: RASTREABILIDADE DIGITAL ---
  startY += 10;
  doc.setFillColor(brandGray[0], brandGray[1], brandGray[2]);
  doc.rect(15, startY, 180, 7, 'F');
  doc.setFillColor(brandYellow[0], brandYellow[1], brandYellow[2]);
  doc.rect(15, startY, 3, 7, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('3. GEOLOCALIZAÇÃO E INTEGRALIDADE DIGITAL', 21, startY + 5);

  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  startY += 12;
  
  doc.setFont('helvetica', 'bold'); doc.text('Data/Hora de Registro:', 15, startY);
  doc.setFont('helvetica', 'normal'); doc.text(new Date(entrega.localizacao.dataHora).toLocaleString('pt-BR'), 55, startY);
  
  doc.setFont('helvetica', 'bold'); doc.text('Tempo de Atendimento:', 110, startY);
  const min = Math.floor(entrega.tempoExecucaoSegundos / 60);
  const seg = entrega.tempoExecucaoSegundos % 60;
  doc.setFont('helvetica', 'normal'); doc.text(`${min} min e ${seg} seg`, 155, startY);

  startY += 6;
  doc.setFont('helvetica', 'bold'); doc.text('Latitude:', 15, startY);
  doc.setFont('helvetica', 'normal'); doc.text(entrega.localizacao.latitude ? `${entrega.localizacao.latitude.toFixed(6)}` : 'GPS Offline/Não Autorizado', 55, startY);
  
  doc.setFont('helvetica', 'bold'); doc.text('Longitude:', 110, startY);
  doc.setFont('helvetica', 'normal'); doc.text(entrega.localizacao.longitude ? `${entrega.localizacao.longitude.toFixed(6)}` : 'GPS Offline/Não Autorizado', 155, startY);

  startY += 6;
  doc.setFont('helvetica', 'bold'); doc.text('Assinatura Digital:', 15, startY);
  doc.setFont('helvetica', 'normal'); doc.text(`TOKEN-${entrega.id}-${entrega.localizacao.latitude || '0'}`.toUpperCase(), 55, startY);

  // Notas finais sobre conformidade e integridade no rodapé (Sem QR Code)
  startY += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  
  const footerNote1 = '* Este documento possui fé pública privada e registro de auditoria eletrônica em conformidade com as exigências técnicas nacionais.';
  const wrappedNote1 = doc.splitTextToSize(footerNote1, 180);
  doc.text(wrappedNote1, 15, startY);

  // --- PÁGINA 2: O CHECKLIST COMPLETO ---
  doc.addPage();
  
  // Faixa decorativa superior Pág 2 (JF Gray + Linha amarela)
  doc.setFillColor(brandGray[0], brandGray[1], brandGray[2]);
  doc.rect(0, 0, 210, 10, 'F');
  doc.setFillColor(brandYellow[0], brandYellow[1], brandYellow[2]);
  doc.rect(0, 10, 210, 1, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`CHECKLIST DE CONFORMIDADE TÉCNICA - ${entrega.id}`, 15, 6.5);

  let currentY = 20;
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.setFontSize(8.5);

  // Agrupa os itens do checklist por categoria
  const categoriasUnicas = Array.from(new Set(entrega.checklist.map(item => item.categoria)));
  
  categoriasUnicas.forEach(cat => {
    // Se houver pouco espaço na página para o cabeçalho e pelo menos um item, realiza quebra de página preventiva para evitar órfãos
    if (currentY > 255) {
      doc.addPage();
      doc.setFillColor(brandGray[0], brandGray[1], brandGray[2]);
      doc.rect(0, 0, 210, 10, 'F');
      doc.setFillColor(brandYellow[0], brandYellow[1], brandYellow[2]);
      doc.rect(0, 10, 210, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`CHECKLIST DE CONFORMIDADE TÉCNICA (CONTINUAÇÃO) - ${entrega.id}`, 15, 6.5);
      currentY = 20;
    }

    // Cabeçalho da Categoria com borda e detalhe em amarelo (altura de 7mm para perfeito respiro)
    doc.setFillColor(grayLight[0], grayLight[1], grayLight[2]);
    doc.rect(15, currentY, 180, 7, 'F');
    doc.setDrawColor(brandGray[0], brandGray[1], brandGray[2]);
    doc.rect(15, currentY, 180, 7, 'S');
    doc.setFillColor(brandYellow[0], brandYellow[1], brandYellow[2]);
    doc.rect(15, currentY, 3, 7, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(brandGray[0], brandGray[1], brandGray[2]);
    doc.text(cat.toUpperCase(), 20, currentY + 4.8);
    
    // Espaçamento de 12.5mm entre o topo da categoria e a linha base do primeiro item para perfeito respiro vertical (2.33mm de espaço livre real)
    currentY += 12.5;
    
    // Itens da Categoria
    const itensCat = entrega.checklist.filter(i => i.categoria === cat);
    itensCat.forEach((item, idxInCat) => {
      const idxStr = `${String(idxInCat + 1).padStart(2, '0')}/${String(itensCat.length).padStart(2, '0')}`;
      const fullText = `${idxStr} - ${item.item}`;
      // Medição prévia das linhas para quebra preventiva de página se necessário
      const textLines = doc.splitTextToSize(fullText, 135);
      const totalItemHeight = (textLines.length - 1) * 4.5 + (item.observacao ? 8.0 : 0) + 6.0;

      // Se o item inteiro não couber na página, quebra de página preventiva para mantê-lo íntegro
      if (currentY + totalItemHeight > 280) {
        doc.addPage();
        doc.setFillColor(brandGray[0], brandGray[1], brandGray[2]);
        doc.rect(0, 0, 210, 10, 'F');
        doc.setFillColor(brandYellow[0], brandYellow[1], brandYellow[2]);
        doc.rect(0, 10, 210, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`CHECKLIST DE CONFORMIDADE TÉCNICA (CONTINUAÇÃO) - ${entrega.id}`, 15, 6.5);
        currentY = 20;
      }

      // Desenha o status/checkbox de forma perfeitamente alinhada com a primeira linha do item
      drawCheckbox(doc, 160, currentY, item.conforme);

      // Renderiza as linhas do texto do item (sem truncar, com quebra dinâmica de altíssimo profissionalismo)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      
      textLines.forEach((line: string, index: number) => {
        if (index > 0) {
          currentY += 4.5;
        }
        doc.text(line, 18, currentY);
      });

      // Se houver observações associadas a este item específico
      if (item.observacao) {
        currentY += 4.5;
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(grayText[0], grayText[1], grayText[2]);
        doc.setFontSize(8);
        const obsWrap = doc.splitTextToSize(`Obs: ${item.observacao}`, 135);
        obsWrap.forEach((line: string, index: number) => {
          if (index > 0) {
            currentY += 3.5;
          }
          doc.text(line, 22, currentY);
        });
        doc.setFontSize(8.5);
      }

      // Espaço de 6mm entre itens
      currentY += 6;
    });

    // Espaçamento de 3mm extra após o último item para distanciar da próxima categoria (total de 9mm de espaço real)
    currentY += 3;
  });

  // --- PÁGINA 3: EVIDÊNCIAS FOTOGRÁFICAS, ASSINATURAS E OBSERVAÇÕES ---
  doc.addPage();
  doc.setFillColor(brandGray[0], brandGray[1], brandGray[2]);
  doc.rect(0, 0, 210, 10, 'F');
  doc.setFillColor(brandYellow[0], brandYellow[1], brandYellow[2]);
  doc.rect(0, 10, 210, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`REGISTROS DE CAMPO E EVIDÊNCIAS - ${entrega.id}`, 15, 6.5);

  currentY = 18;
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('4. EVIDÊNCIAS FOTOGRÁFICAS EXIGIDAS', 15, currentY);
  
  // Quadrante de fotos
  currentY += 4;
  const photoW = 82;
  const photoH = 50;

  // Desenhar molduras com cores da marca JF Gray e preenchimento cinza claro
  doc.setDrawColor(brandGray[0], brandGray[1], brandGray[2]);
  doc.setLineWidth(0.5);

  // Foto 1: Máquina Completa
  doc.setFontSize(8);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.rect(15, currentY, photoW, photoH);
  safeAddImage(doc, entrega.fotosGerais.maquinaCompleta, 'JPEG', 15, currentY, photoW, photoH);
  doc.text('Foto 1: Máquina Agrícola Completa', 15, currentY + photoH + 4);

  // Foto 2: Número de Série
  doc.rect(110, currentY, photoW, photoH);
  safeAddImage(doc, entrega.fotosGerais.numeroSerie, 'JPEG', 110, currentY, photoW, photoH);
  doc.text('Foto 2: Placa do Número de Série', 110, currentY + photoH + 4);

  currentY += photoH + 10;

  // Observações Gerais / Parecer Técnico Real
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text('5. PARECER TÉCNICO E OBSERVAÇÕES GERAIS', 15, currentY);
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2]);
  doc.rect(15, currentY, 180, 20, 'F');
  doc.setDrawColor(brandGray[0], brandGray[1], brandGray[2]);
  doc.rect(15, currentY, 180, 20, 'S');
  
  doc.setFontSize(8.5);
  const obsGeraisTexto = entrega.observacoesGerais || 'Nenhuma observação técnica adicional registrada.';
  const obsGeraisLines = doc.splitTextToSize(obsGeraisTexto, 174);
  doc.text(obsGeraisLines, 18, currentY + 5);

  currentY += 28;

  // Painel de Assinaturas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('6. ASSINATURA DOS RESPONSÁVEIS', 15, currentY);
  
  currentY += 4;
  const sigW = 82;
  const sigH = 30;

  // Moldura Assinatura Técnico
  doc.setDrawColor(brandGray[0], brandGray[1], brandGray[2]);
  doc.rect(15, currentY, sigW, sigH);
  safeAddImage(doc, entrega.assinaturas.tecnico, 'PNG', 15, currentY, sigW, sigH);
  
  // Moldura Assinatura Cliente
  doc.rect(110, currentY, sigW, sigH);
  safeAddImage(doc, entrega.assinaturas.cliente, 'PNG', 110, currentY, sigW, sigH);

  currentY += sigH + 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  // Nomes Reais do Técnico e do Cliente
  const nomeTecnicoReal = (entrega.tecnico.nome || 'TÉCNICO RESPONSÁVEL').toUpperCase();
  const nomeClienteReal = (entrega.cliente.nome || 'CLIENTE RECEBEDOR').toUpperCase();
  doc.text(nomeTecnicoReal, 15, currentY);
  doc.text(nomeClienteReal, 110, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('Técnico Homologado / CPF: ***.***.***-**', 15, currentY);
  doc.text(`Cliente Recebedor / Doc: ${entrega.cliente.documento}`, 110, currentY);

  // Rodapé final de segurança
  doc.setFontSize(7);
  doc.text('Declaro que realizei todas as orientações, treinamentos de segurança de operação e entreguei o manual correspondente ao equipamento.', 15, currentY + 7);
  doc.text('Ao assinar digitalmente este termo, o cliente confere plena conformidade às condições físicas e técnicas do maquinário recebido.', 15, currentY + 10);

  return doc;
}
