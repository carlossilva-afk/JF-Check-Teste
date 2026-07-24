import { useState, useEffect } from 'react';
import { Mail, Copy, Check, X, ExternalLink, AlertTriangle, Send, Loader2, CheckCircle2, Zap } from 'lucide-react';
import { enviarEmailResend } from '../utils/email';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  body: string;
  recipientName?: string;
}

export default function EmailModal({ isOpen, onClose, subject, body, recipientName }: EmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('carlos.silva@industriasnb.com.br');
  const [customSubject, setCustomSubject] = useState(subject);
  const [customBody, setCustomBody] = useState(body);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Estados de envio automático via Firebase Extension
  const [isSendingAuto, setIsSendingAuto] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setRecipientEmail('carlos.silva@industriasnb.com.br');
      setCustomSubject(subject);
      setCustomBody(body);
      setIsSendingAuto(false);
      setSendSuccess(false);
      setSendError(null);
    }
  }, [isOpen, subject, body]);

  if (!isOpen) return null;

  const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(customSubject)}&body=${encodeURIComponent(customBody)}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(customSubject)}&body=${encodeURIComponent(customBody)}`;

  const handleCopySubject = () => {
    navigator.clipboard.writeText(customSubject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(customBody);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleSendAutomaticEmail = async () => {
    if (!recipientEmail.trim()) {
      setSendError('Por favor informe o e-mail do destinatário.');
      return;
    }

    setIsSendingAuto(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      await enviarEmailResend({
        to: recipientEmail.trim(),
        subject: customSubject,
        text: customBody,
      });
      setSendSuccess(true);
    } catch (err: any) {
      console.error('Erro ao enviar e-mail via Resend:', err);
      setSendError(err.message || 'Erro ao enviar e-mail via servidor Resend.');
    } finally {
      setIsSendingAuto(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="email-share-modal">
      <div className="bg-white border-2 border-zinc-900 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="bg-zinc-950 text-white p-5 border-b-2 border-amber-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 text-zinc-950 rounded-xl flex items-center justify-center shadow-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-widest text-amber-500 font-black block">Compartilhamento Oficial</span>
              <h3 className="text-lg font-black uppercase tracking-tight">Despacho de Check List via E-mail</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-white rounded-xl transition border border-zinc-800"
            title="Fechar"
            id="btn-close-email-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-zinc-50">
          
          {/* Recipient Input */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
            <label className="text-xs font-black text-zinc-700 uppercase tracking-wide">
              E-mail do Produtor / Destinatário *
            </label>
            {recipientName && (
              <p className="text-[10px] text-zinc-500 font-bold -mt-1">
                Cliente: <span className="text-zinc-850 uppercase">{recipientName}</span>
              </p>
            )}
            <div>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="carlos.silva@industriasnb.com.br"
                className="w-full px-4 py-2.5 bg-zinc-50 border-2 border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-semibold"
                id="input-recipient-email"
              />
            </div>
          </div>

          {/* Alerta de Prazo de Download no Firebase (3 Dias) */}
          <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-950 uppercase tracking-tight">⚠️ Alerta - Prazo de 3 Dias para Download (Firebase)</p>
              <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed font-medium">
                O relatório e o link de verificação ficam hospedados no Firebase e estarão disponíveis para download por no máximo <strong>3 dias</strong>. Recomende ao destinatário baixar o PDF em até 3 dias!
              </p>
            </div>
          </div>

          {/* OPÇÃO 1: ENVIO AUTOMÁTICO VIA RESEND API */}
          <div className="bg-amber-50/80 border-2 border-amber-500/50 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-zinc-950 text-amber-400 rounded-lg flex items-center justify-center font-black">
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black tracking-wider text-amber-800 block">Opção Recomendada (Oficial)</span>
                  <h4 className="font-black text-zinc-900 text-sm uppercase tracking-tight">Disparo Automático Instantâneo (Resend)</h4>
                </div>
              </div>
              <span className="text-[10px] bg-amber-500 text-zinc-950 font-black px-2.5 py-0.5 rounded-full shadow-sm">RESEND API</span>
            </div>

            <p className="text-xs text-zinc-600 font-medium leading-relaxed">
              Envia o e-mail em tempo real diretamente via API do Resend sem precisar abrir o seu leitor ou aplicativo de e-mail local.
            </p>

            {sendSuccess && (
              <div className="bg-emerald-100 border border-emerald-400 text-emerald-900 p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">E-mail enviado com sucesso!</p>
                  <p className="text-[11px] text-emerald-800">A mensagem foi despachada para {recipientEmail} via API do Resend.</p>
                </div>
              </div>
            )}

            {sendError && (
              <div className="bg-rose-100 border border-rose-300 text-rose-900 p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <p className="font-medium">{sendError}</p>
              </div>
            )}

            <button
              onClick={handleSendAutomaticEmail}
              disabled={isSendingAuto}
              type="button"
              className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-850 active:bg-black text-amber-400 font-black text-xs uppercase rounded-2xl transition duration-150 flex items-center justify-center gap-2.5 shadow-md disabled:opacity-50 cursor-pointer"
              id="btn-send-auto-resend-email"
            >
              {isSendingAuto ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  Enviando e-mail via Resend...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-400" />
                  Enviar E-mail Automático Agora
                </>
              )}
            </button>
          </div>

          {/* OPÇÃO 2: APLICATIVO LOCAL (GMAIL / OUTROS) */}
          <div className="bg-white border-2 border-zinc-200 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
            <div>
              <span className="text-[9px] uppercase font-black tracking-wider text-zinc-500 block">Opção Alternativa (Manual)</span>
              <h4 className="font-black text-zinc-900 text-sm uppercase tracking-tight mt-0.5">Abrir no Seu Aplicativo de E-mail</h4>
              <p className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">
                Abre a mensagem pré-formatada no Gmail ou no seu leitor de e-mail local no dispositivo.
              </p>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <a
                href={gmailUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase rounded-xl transition duration-150 flex items-center justify-center gap-2 border-b-2 border-rose-800 shadow-sm"
                id="btn-open-gmail-client"
              >
                <Mail className="w-4 h-4" />
                Abrir no Gmail Web
              </a>
              
              <a
                href={mailtoUrl}
                rel="noreferrer"
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs uppercase rounded-xl transition duration-150 flex items-center justify-center gap-2 border border-zinc-300"
                id="btn-open-mailto-client"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir no App de E-mail do Dispositivo
              </a>
            </div>
          </div>

          {/* Form Details Preview */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider block border-b border-zinc-100 pb-1.5">
              Visualização do Conteúdo (Opcional - Copiar e Colar)
            </span>

            <div className="space-y-3 text-xs">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-zinc-700">Assunto do E-mail</label>
                  <button
                    onClick={handleCopySubject}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase transition flex items-center gap-1 ${
                      copiedSubject ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {copiedSubject ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedSubject ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-zinc-700">Corpo da Mensagem</label>
                  <button
                    onClick={handleCopyBody}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase transition flex items-center gap-1 ${
                      copiedBody ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {copiedBody ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedBody ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-600 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
