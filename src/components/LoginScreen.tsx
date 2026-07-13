/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Usuario, Revenda } from '../types';
import { getTecnicos, getRevendas, registrarUsuario } from '../utils/db';
import { Tractor, Shield, Lock, User, AlertCircle, HelpCircle, Mail, UserPlus, X, Briefcase, MapPin } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (usuario: Usuario) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [usuarioInput, setUsuarioInput] = useState('carlos.silva@industriasnb.com.br'); // Default matching metadata email
  const [senhaInput, setSenhaInput] = useState('1234');
  const [errorMsg, setErrorMsg] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Modo de visualização: login normal ou cadastro de usuário
  const [viewMode, setViewMode] = useState<'login' | 'register'>('login');

  // Estados de Cadastro de Novo Usuário
  const [regNome, setRegNome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCustomRevendaNome, setRegCustomRevendaNome] = useState('');

  // Estados do Google Chooser
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNomeInput, setGoogleNomeInput] = useState('');
  const [googleError, setGoogleError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Procura por credenciais cadastradas
    const encontrado = getTecnicos().find(
      t => t.usuario.toLowerCase() === usuarioInput.toLowerCase()
    );

    if (encontrado) {
      onLoginSuccess(encontrado);
    } else if (usuarioInput.toLowerCase() === 'admin' && senhaInput === 'admin') {
      // Login admin reserva
      const adminUser: Usuario = {
        id: 'u_admin',
        nome: 'Supervisor Geral Agro',
        usuario: 'admin',
        perfil: 'administrador',
        revendaId: 'r1'
      };
      onLoginSuccess(adminUser);
    } else if (usuarioInput.trim().length > 3 && senhaInput.length >= 4) {
      // Login genérico como técnico para flexibilidade
      const generico: Usuario = {
        id: 'u_gen_' + Math.random().toString(36).substring(2, 6),
        nome: usuarioInput.split('@')[0].replace('.', ' ').toUpperCase(),
        usuario: usuarioInput,
        perfil: usuarioInput.includes('admin') ? 'administrador' : 'tecnico',
        revendaId: 'r1'
      };
      // Salva no banco local para persistência futura
      registrarUsuario(generico);
      onLoginSuccess(generico);
    } else {
      setErrorMsg('Credenciais inválidas. Insira um usuário de pelo menos 4 caracteres e senha.');
    }
  };

  const handleCustomRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regNome.trim()) {
      setErrorMsg('Por favor, informe seu nome completo.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMsg('Por favor, informe seu e-mail ou usuário.');
      return;
    }
    if (!regCustomRevendaNome.trim()) {
      setErrorMsg('Por favor, informe o nome da sua revenda / empresa.');
      return;
    }

    // Procura se já está cadastrado
    const tecnicos = getTecnicos();
    const existe = tecnicos.some(t => t.usuario.toLowerCase() === regEmail.trim().toLowerCase());
    if (existe) {
      setErrorMsg('Este e-mail/usuário já está cadastrado na plataforma.');
      return;
    }

    // Cria a revenda digitada
    const novaRevId = 'r_custom_' + Math.random().toString(36).substring(2, 6);
    const novaRevenda: Revenda = {
      id: novaRevId,
      nome: regCustomRevendaNome.trim(),
      cidade: 'Personalizada',
      estado: 'BR'
    };
    
    const revendas = getRevendas();
    revendas.push(novaRevenda);
    localStorage.setItem('agro_revendas', JSON.stringify(revendas));

    const novoUsuario: Usuario = {
      id: 'u_reg_' + Math.random().toString(36).substring(2, 6),
      nome: regNome.trim(),
      usuario: regEmail.trim().toLowerCase(),
      perfil: regEmail.trim().toLowerCase().includes('admin') ? 'administrador' : 'tecnico',
      revendaId: novaRevId
    };

    registrarUsuario(novoUsuario);
    onLoginSuccess(novoUsuario);
  };

  const selectGoogleAccount = (nome: string, email: string) => {
    const existentes = getTecnicos();
    const encontrado = existentes.find(t => t.usuario.toLowerCase() === email.toLowerCase());

    if (encontrado) {
      setShowGoogleChooser(false);
      onLoginSuccess(encontrado);
    } else {
      // Registra como novo usuário ativo (qualquer e-mail do Google agora é aceito!)
      const googleUser: Usuario = {
        id: 'u_goog_' + Math.random().toString(36).substring(2, 6),
        nome: nome,
        usuario: email,
        perfil: 'administrador', // Perfil administrador para habilitar o Painel Admin
        revendaId: 'r1'
      };
      registrarUsuario(googleUser);
      setShowGoogleChooser(false);
      onLoginSuccess(googleUser);
    }
  };

  const handleAddGoogleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleError('');

    const email = googleEmailInput.trim().toLowerCase();
    const nome = googleNomeInput.trim();

    if (!nome) {
      setGoogleError('Por favor, informe seu nome completo.');
      return;
    }
    if (!email) {
      setGoogleError('Por favor, informe seu e-mail.');
      return;
    }

    selectGoogleAccount(nome, email);
  };

  const handleGoogleLoginClick = () => {
    setShowGoogleChooser(true);
    setGoogleError('');
    setGoogleNomeInput('');
    setGoogleEmailInput('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-sans relative overflow-hidden" id="login-screen">
      {/* Background Decorativo Tech */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-950 to-black pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Glowes sutis de background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-zinc-200/80 overflow-hidden relative z-10 transition-all duration-300 hover:shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
        
        {/* Banner do Cabeçalho */}
        <div className="px-6 pt-12 pb-8 bg-zinc-950 text-center flex flex-col items-center gap-3 relative overflow-hidden">
          {/* Luz de destaque interna */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-24 bg-amber-500/10 blur-xl rounded-full" />
          
          <div className="w-20 h-20 rounded-full flex items-center justify-center relative group shadow-[0_0_15px_rgba(245,158,11,0.45)] hover:shadow-[0_0_25px_rgba(245,158,11,0.7)] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
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
          
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
              JF <span className="text-amber-500">CHECK</span>
            </h1>
            <p className="text-[10px] text-amber-500/90 font-black uppercase tracking-widest leading-relaxed">
              Entrega técnica digital JF Máquinas
            </p>
          </div>
          
          {/* Detalhe de linha dourada refinado */}
          <div className="absolute bottom-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-80" />
        </div>
 
        {/* Seletor de Abas (Entrar / Cadastrar) */}
        <div className="flex border-b border-zinc-100 bg-zinc-50">
          <button
            type="button"
            onClick={() => { setViewMode('login'); setErrorMsg(''); }}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
              viewMode === 'login'
                ? 'bg-white text-amber-500 border-b-2 border-amber-500'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Acessar Sistema
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('register'); setErrorMsg(''); }}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
              viewMode === 'register'
                ? 'bg-white text-amber-500 border-b-2 border-amber-500'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Cadastrar-se
          </button>
        </div>

        {/* Corpo do Form */}
        <div className="p-8 md:p-10 flex flex-col gap-6 text-center bg-white">
          
          {viewMode === 'login' ? (
            <>
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 text-zinc-800 text-[10px] font-bold uppercase tracking-wider rounded-full border border-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Plataforma Aberta
                </div>
                <h2 className="text-zinc-900 font-extrabold text-xl tracking-tight uppercase">Entrar no Sistema</h2>
                <p className="text-xs text-zinc-500 font-medium px-4 leading-relaxed">
                  Realize checklists, registre entregas técnicas e tenha total controle de rastreabilidade.
                </p>
              </div>
     
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2.5 text-left animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <p className="leading-tight">{errorMsg}</p>
                </div>
              )}
     
              {/* Google Login */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleLoginClick}
                  className="w-full py-4 px-6 bg-zinc-950 hover:bg-zinc-900 active:bg-black text-white border border-zinc-900 font-black text-xs uppercase tracking-widest rounded-2xl transition-all duration-150 flex items-center justify-center gap-3.5 shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 active:translate-y-0"
                  id="login-btn-google"
                >
                  {/* SVG do Logo Google */}
                  <div className="w-7 h-7 bg-white p-1 rounded-xl shadow-sm flex items-center justify-center shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 24 24">
                      <g transform="matrix(1, 0, 0, 1, 0, 0)">
                        <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.56h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.49C21.68,11.96 21.56,11.5 21.35,11.1z" fill="#4285F4" />
                        <path d="M12,20.58c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.56c-0.9,0.6 -2.07,0.98 -3.3,0.98c-2.34,0 -4.33,-1.58 -5.04,-3.71H2.88v2.64C4.38,18.72 7.97,20.58 12,20.58z" fill="#34A853" />
                        <path d="M6.96,13.1c-0.18,-0.54 -0.29,-1.11 -0.29,-1.7c0,-0.59 0.11,-1.16 0.29,-1.7V7.06H2.88C2.26,8.29 1.91,9.7 1.91,11.4c0,1.7 0.35,3.11 0.97,4.34L6.96,13.1z" fill="#FBBC05" />
                        <path d="M12,4.96c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,2.2 14.43,1.4 12,1.4C7.97,1.4 4.38,3.28 2.88,6.26l4.08,3.16C7.67,6.54 9.66,4.96 12,4.96z" fill="#EA4335" />
                      </g>
                    </svg>
                  </div>
                  <span className="tracking-widest">Fazer Login com Google</span>
                </button>
                
                <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
                  Entre com qualquer conta de e-mail do Google para acesso instantâneo.
                </p>
              </div>

              {/* Separador */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-200"></div>
                <span className="flex-shrink mx-4 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">ou use credenciais</span>
                <div className="flex-grow border-t border-zinc-200"></div>
              </div>

              {/* Login por Credenciais */}
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-zinc-400" /> E-mail ou Usuário
                  </label>
                  <input
                    type="text"
                    required
                    value={usuarioInput}
                    onChange={(e) => setUsuarioInput(e.target.value)}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-150"
                    placeholder="Seu usuário ou e-mail cadastrado"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" /> Senha de Acesso
                  </label>
                  <input
                    type="password"
                    required
                    value={senhaInput}
                    onChange={(e) => setSenhaInput(e.target.value)}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-150"
                    placeholder="Sua senha de segurança"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3.5 bg-zinc-950 hover:bg-zinc-900 active:bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl transition duration-150 shadow-md"
                >
                  Entrar no Painel
                </button>
              </form>
            </>
          ) : (
            /* Formulário de Cadastro */
            <form onSubmit={handleCustomRegisterSubmit} className="flex flex-col gap-4 text-left animate-fadeIn">
              <div className="space-y-2.5 text-center mb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-200">
                  <UserPlus className="w-3 h-3 text-amber-600 animate-pulse" />
                  Novo Cadastro de Usuário
                </div>
                <h2 className="text-zinc-900 font-extrabold text-xl tracking-tight uppercase">Criar Sua Conta</h2>
                <p className="text-xs text-zinc-500 font-medium px-4 leading-relaxed">
                  Cadastre-se grátis e tenha acesso instantâneo ao aplicativo JF Check de entregas.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2.5 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <p className="leading-tight">{errorMsg}</p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-zinc-400" /> Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={regNome}
                  onChange={(e) => setRegNome(e.target.value)}
                  placeholder="ex: João Silva Neto"
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-150"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" /> E-mail / Nome de Usuário
                </label>
                <input
                  type="text"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="ex: joao.silva@gmail.com"
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-150"
                />
              </div>



              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Nome da Sua Revenda / Empresa
                </label>
                <input
                  type="text"
                  required
                  value={regCustomRevendaNome}
                  onChange={(e) => setRegCustomRevendaNome(e.target.value)}
                  placeholder="ex: Agropecuária Noroeste Tratores"
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-150"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-zinc-950 font-extrabold text-xs uppercase tracking-widest rounded-xl transition duration-150 shadow-md"
              >
                Criar Conta e Acessar
              </button>
            </form>
          )}

          <div className="flex items-center justify-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-50 py-3 px-4 rounded-xl border border-zinc-150">
            <Shield className="w-4 h-4 text-amber-500 shrink-0" />
            Certificado de Conformidade Digital JF
          </div>

        </div>

      </div>

      {/* MODAL SIMULADOR GOOGLE ACCOUNTS CHOOSER */}
      {showGoogleChooser && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="google-chooser-modal">
          <div className="bg-white rounded-3xl w-full max-w-md border border-zinc-200 shadow-2xl overflow-hidden flex flex-col font-sans animate-fadeIn">
            {/* Cabeçalho Google */}
            <div className="px-6 py-5 bg-zinc-50 border-b border-zinc-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 bg-white p-0.5 rounded shadow-sm" viewBox="0 0 24 24">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.56h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.49C21.68,11.96 21.56,11.5 21.35,11.1z" fill="#4285F4" />
                  <path d="M12,20.58c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.56c-0.9,0.6 -2.07,0.98 -3.3,0.98c-2.34,0 -4.33,-1.58 -5.04,-3.71H2.88v2.64C4.38,18.72 7.97,20.58 12,20.58z" fill="#34A853" />
                  <path d="M6.96,13.1c-0.18,-0.54 -0.29,-1.11 -0.29,-1.7c0,-0.59 0.11,-1.16 0.29,-1.7V7.06H2.88C2.26,8.29 1.91,9.7 1.91,11.4c0,1.7 0.35,3.11 0.97,4.34L6.96,13.1z" fill="#FBBC05" />
                  <path d="M12,4.96c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,2.2 14.43,1.4 12,1.4C7.97,1.4 4.38,3.28 2.88,6.26l4.08,3.16C7.67,6.54 9.66,4.96 12,4.96z" fill="#EA4335" />
                </svg>
                <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Fazer login com o Google</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowGoogleChooser(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-200 transition text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
 
            {/* Corpo / Seletor de Contas */}
            <div className="p-6 md:p-8 flex-1 flex flex-col gap-6 max-h-[420px] overflow-y-auto">
              {googleError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{googleError}</span>
                </div>
              )}
 
              <form onSubmit={handleAddGoogleAccountSubmit} className="flex flex-col gap-4 text-left">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Informe a conta do Google</p>
 
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: João Silva"
                    value={googleNomeInput}
                    onChange={(e) => setGoogleNomeInput(e.target.value)}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-150"
                  />
                </div>
 
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">E-mail do Google</label>
                  <input
                    type="email"
                    required
                    placeholder="ex: joao@gmail.com"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-150 font-mono"
                  />
                </div>
 
                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowGoogleChooser(false)}
                    className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs uppercase tracking-widest rounded-xl transition duration-150"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition duration-150"
                  >
                    Autenticar
                  </button>
                </div>
              </form>
            </div>
 
            {/* Rodapé explicativo */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-150 text-center">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Acesso Seguro Integrado JF Check</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

