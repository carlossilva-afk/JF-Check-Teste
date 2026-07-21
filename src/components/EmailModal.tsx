import { useState, useEffect } from 'react';
import { Mail, Copy, Check, X, ExternalLink } from 'lucide-react';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  body: string;
  recipientName?: string;
}

export default function EmailModal({ isOpen, onClose, subject, body, recipientName }: EmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customSubject, setCustomSubject] = useState(subject);
  const [customBody, setCustomBody] = useState(body);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setCustomSubject(subject);
      setCustomBody(body);
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
                placeholder="exemplo@fazenda.com.br"
                className="w-full px-4 py-2.5 bg-zinc-50 border-2 border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-semibold"
                id="input-recipient-email"
              />
            </div>
          </div>

          {/* Single option layout matching image exactly */}
          <div className="bg-white border-2 border-zinc-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
            <div>
              <span className="text-[9px] uppercase font-black tracking-wider text-rose-600 block">Opção A (Aplicativo Externo)</span>
              <h4 className="font-black text-zinc-900 text-base uppercase tracking-tight mt-1">Meu Aplicativo de E-mail</h4>
              <p className="text-xs text-zinc-500 font-medium mt-1.5 leading-relaxed">
                Selecione abrir especificamente no Gmail para forçar o uso da sua conta Google, ou use o e-mail padrão do sistema.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <a
                href={gmailUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-rose-600 hover:bg-rose-750 text-white font-black text-xs uppercase rounded-2xl transition duration-150 flex items-center justify-center gap-2 border-b-4 border-rose-800 shadow-sm"
                id="btn-open-gmail-client"
              >
                <Mail className="w-4 h-4" />
                Abrir no Gmail (Exclusivo)
              </a>
              
              <a
                href={mailtoUrl}
                rel="noreferrer"
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs uppercase rounded-2xl transition duration-150 flex items-center justify-center gap-2 border border-zinc-300"
                id="btn-open-mailto-client"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Outros Provedores (Padrão)
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
