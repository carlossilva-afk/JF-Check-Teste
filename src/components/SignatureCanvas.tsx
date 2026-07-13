/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, PenTool } from 'lucide-react';

interface SignatureCanvasProps {
  id: string;
  label: string;
  onSave: (base64: string) => void;
  savedImage?: string;
}

export default function SignatureCanvas({ id, label, onSave, savedImage }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(savedImage);

  // Garante sincronismo de previews salvos
  useEffect(() => {
    setPreview(savedImage || undefined);
    if (!savedImage) {
      setHasDrawn(false);
    }
  }, [savedImage]);

  // Inicializa o canvas e configura escala de retina para traços nítidos
  useEffect(() => {
    if (!preview && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Ajusta tamanho lógico de acordo com o CSS do elemento
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1e293b'; // Slate-800
        ctx.lineWidth = 2.5;
        
        // Fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
    }
  }, [preview]);

  const getCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Suporte para mouse e toque mobile
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e.nativeEvent);
    if (!coords || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
      setHasDrawn(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    
    const coords = getCoordinates(e.nativeEvent);
    if (!coords) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
        setPreview(undefined);
      }
    } else {
      setPreview(undefined);
      setHasDrawn(false);
    }
    onSave("");
  };

  const handleSave = () => {
    if (canvasRef.current && hasDrawn) {
      // Obtém o base64
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setPreview(dataUrl);
      onSave(dataUrl);
    }
  };

  return (
    <div className="flex flex-col w-full border-2 border-zinc-900 rounded-2xl bg-white shadow-md overflow-hidden" id={`sig-container-${id}`}>
      {/* Header do Pad */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 text-white border-b-2 border-zinc-950">
        <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
          <PenTool className="w-4 h-4 text-amber-500 shrink-0" />
          {label}
        </span>
        {preview && (
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
            <Check className="w-3.5 h-3.5" /> Assinado
          </span>
        )}
      </div>

      {/* Área de Desenho / Preview */}
      <div className="relative w-full h-44 bg-white touch-none">
        {preview ? (
          <div className="w-full h-full flex items-center justify-center p-2 bg-zinc-100">
            <img 
              src={preview} 
              alt={`Assinatura ${label}`} 
              className="max-w-full max-h-full object-contain border-2 border-zinc-300 rounded-xl bg-white shadow-inner"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full cursor-crosshair bg-white"
            style={{ touchAction: 'none' }}
          />
        )}
        
        {!preview && !hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-400 text-xs font-bold">
            Assine livremente com o dedo ou mouse neste espaço
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 border-t-2 border-zinc-200">
        <button
          type="button"
          onClick={clearCanvas}
          className="flex items-center justify-center gap-2 h-12 px-5 rounded-2xl text-xs font-black uppercase tracking-wider text-zinc-700 bg-white hover:bg-zinc-100 active:bg-zinc-200 transition duration-150 border-2 border-zinc-300 shadow-sm"
          id={`btn-clear-${id}`}
        >
          <RotateCcw className="w-4 h-4 text-zinc-500" />
          <span>Limpar</span>
        </button>
        
        {!preview && (
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn}
            className={`flex items-center justify-center gap-2 h-12 px-5 rounded-2xl text-xs font-black uppercase tracking-wider transition duration-150 border-2 ${
              hasDrawn 
                ? 'bg-zinc-850 hover:bg-zinc-800 active:bg-zinc-900 text-white border-zinc-950 shadow-md' 
                : 'bg-zinc-200 text-zinc-400 border-transparent cursor-not-allowed'
            }`}
            id={`btn-save-${id}`}
          >
            <Check className="w-4 h-4 text-zinc-300" />
            <div className="flex flex-col items-start text-left leading-none">
              <span className={hasDrawn ? "text-[11px] font-extrabold text-amber-400 tracking-wider" : "text-[11px] font-extrabold text-zinc-400 tracking-wider"}>SALVAR</span>
              <span className={hasDrawn ? "text-[11px] font-extrabold text-sky-400 tracking-wider" : "text-[11px] font-extrabold text-zinc-400 tracking-wider"}>ASSINATURA</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
