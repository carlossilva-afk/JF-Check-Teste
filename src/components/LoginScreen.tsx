/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Usuario } from '../types';
import { getTecnicos } from '../utils/db';
import { Shield, Lock, User, AlertCircle, HelpCircle, Mail, Eye, EyeOff } from 'lucide-react';

const jfLogo = 'https://www.jfmaquinas.com/lib/img/logo-jf-maquinas.png';

interface LoginScreenProps {
  onLoginSuccess: (usuario: Usuario) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loginTab, setLoginTab] = useState<'geral' | 'admin'>('geral');
  const [usuarioInput, setUsuarioInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const userClean = usuarioInput.trim().toLowerCase();
    const passClean = senhaInput.trim();

    if (loginTab === 'admin') {
      // Regra de Acesso Administrativo
      if (userClean === 'carlos.silva@industriasnb.com.br' && passClean === '753268') {
        // Busca se já existe no banco ou cria um correspondente
        const tecnicos = getTecnicos();
        const encontrado = tecnicos.find(t => t.usuario.toLowerCase() === 'carlos.silva@industriasnb.com.br');
        
        const adminUser: Usuario = encontrado || {
          id: 'u_carlos_mestre',
          nome: 'Carlos Silva Administrador',
          usuario: 'carlos.silva@industriasnb.com.br',
          perfil: 'administrador',
          revendaId: 'r1'
        };
        onLoginSuccess(adminUser);
      } else {
        setErrorMsg('Acesso administrativo inválido. Apenas o e-mail autorizado com a senha correspondente é permitido.');
      }
    } else {
      // Regra de Acesso Geral / Técnico
      if (userClean === 'revjf' && passClean === '9jf-54)N') {
        const tecnicos = getTecnicos();
        const encontrado = tecnicos.find(t => t.usuario.toLowerCase() === 'revjf');

        const techUser: Usuario = encontrado || {
          id: 'u_revjf_user',
          nome: 'Técnico Autorizado RevJF',
          usuario: 'revjf',
          perfil: 'tecnico',
          revendaId: 'r1'
        };
        onLoginSuccess(techUser);
      } else {
        setErrorMsg('Credenciais inválidas. Verifique o usuário e a senha única de acesso geral.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-0 sm:p-6 font-sans relative overflow-hidden" id="login-screen">
      {/* Background Decorativo Tech */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-950 to-black pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Glowes sutis de background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-xl sm:max-w-md md:max-w-lg min-h-screen sm:min-h-0 bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-0 sm:border border-zinc-200/80 overflow-y-auto sm:overflow-hidden relative z-10 transition-all duration-300 hover:shadow-[0_25px_60px_rgba(0,0,0,0.35)] animate-fadeIn my-0 sm:my-auto flex flex-col justify-between">
        
        {/* Banner do Cabeçalho */}
        <div className="px-5 py-4 sm:px-6 sm:pt-10 sm:pb-8 bg-zinc-950 text-center flex flex-row sm:flex-col items-center justify-center gap-3.5 sm:gap-3 relative overflow-hidden shrink-0">
          {/* Luz de destaque interna */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-24 bg-amber-500/10 blur-xl rounded-full" />
          
          <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full flex items-center justify-center relative group shadow-[0_0_12px_rgba(245,158,11,0.4)] sm:shadow-[0_0_15px_rgba(245,158,11,0.45)] hover:shadow-[0_0_25px_rgba(245,158,11,0.7)] transition-all duration-300 shrink-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
            <img 
              src={jfLogo} 
              alt="Logo JF" 
              className="w-full h-full object-cover rounded-full" 
            />
          </div>
          
          <div className="space-y-1 text-left sm:text-center">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              JF <span className="text-amber-500">CHECK</span>
            </h1>
            <p className="text-xs sm:text-sm text-amber-400 font-bold uppercase tracking-wider leading-relaxed">
              Entrega técnica digital JF Máquinas
            </p>
          </div>
          
          {/* Detalhe de linha dourada refinado */}
          <div className="absolute bottom-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-80" />
        </div>

        {/* Seletor de Abas (Acesso Técnico / Acesso Administrativo) */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 shrink-0">
          <button
            type="button"
            onClick={() => { setLoginTab('geral'); setErrorMsg(''); setUsuarioInput(''); setSenhaInput(''); setShowPassword(false); }}
            className={`flex-1 py-3.5 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${
              loginTab === 'geral'
                ? 'bg-white text-amber-600 border-b-2 border-amber-500 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Acesso Técnico
          </button>
          <button
            type="button"
            onClick={() => { setLoginTab('admin'); setErrorMsg(''); setUsuarioInput(''); setSenhaInput(''); setShowPassword(false); }}
            className={`flex-1 py-3.5 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${
              loginTab === 'admin'
                ? 'bg-white text-amber-600 border-b-2 border-amber-500 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Acesso Administrativo
          </button>
        </div>

        {/* Corpo do Form */}
        <div className="p-5 sm:p-8 md:p-10 flex flex-col justify-between flex-1 gap-5 sm:gap-6 text-center bg-white">
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 text-zinc-800 text-xs font-bold uppercase tracking-wider rounded-full border border-zinc-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {loginTab === 'admin' ? 'Área Administrativa' : 'Área Técnica Autorizada'}
            </div>
            <h2 className="text-zinc-900 font-extrabold text-lg sm:text-2xl tracking-tight uppercase">
              {loginTab === 'admin' ? 'Acesso Administrativo' : 'Acesso Técnico Geral'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 font-medium px-2 leading-relaxed">
              {loginTab === 'admin' 
                ? 'Área de uso exclusivo da JF Máquinas' 
                : 'Realize checklists, registre entregas técnicas e tenha total controle de rastreabilidade.'}
            </p>
          </div>
 
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm font-bold flex items-center gap-2.5 text-left animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <p className="leading-tight">{errorMsg}</p>
            </div>
          )}
 
          {/* Formulário de Credenciais */}
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs sm:text-sm font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                {loginTab === 'admin' ? (
                  <>
                    <Mail className="w-4 h-4 text-amber-600" /> E-mail de Administrador
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 text-amber-600" /> Usuário Geral
                  </>
                )}
              </label>
              <input
                type={loginTab === 'admin' ? 'email' : 'text'}
                required
                value={usuarioInput}
                onChange={(e) => setUsuarioInput(e.target.value)}
                className="w-full px-4 py-3 sm:py-3.5 border border-zinc-300 rounded-xl text-sm sm:text-base font-bold bg-zinc-50 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-150"
                placeholder={loginTab === 'admin' ? 'ex: administrador@jfmaquinas.com.br' : 'Informe o seu usuário'}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs sm:text-sm font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-600" /> Senha de Segurança
              </label>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={senhaInput}
                  onChange={(e) => setSenhaInput(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 sm:py-3.5 border border-zinc-300 rounded-xl text-sm sm:text-base font-bold bg-zinc-50 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-150"
                  placeholder="Sua senha de acesso"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-700 active:text-zinc-900 transition-colors focus:outline-none rounded-lg"
                  title={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3.5 sm:py-4 bg-zinc-950 hover:bg-zinc-900 active:bg-black text-white font-black text-sm sm:text-base uppercase tracking-wider rounded-xl transition duration-150 shadow-md flex items-center justify-center gap-2.5"
            >
              <Shield className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Autenticar e Entrar</span>
            </button>
          </form>

          {/* Dicas / Ajuda */}
          <div className="mt-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-xs sm:text-sm font-bold text-zinc-500 hover:text-amber-600 uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto transition"
            >
              <HelpCircle className="w-4 h-4 text-amber-500" />
              Precisa de ajuda com o acesso?
            </button>

            {showHelp && (
              <div className="mt-3 p-3.5 sm:p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl sm:rounded-2xl text-left text-zinc-700 text-xs sm:text-sm leading-relaxed space-y-1.5 animate-fadeIn">
                <p className="font-bold text-zinc-900">Instruções de acesso:</p>
                {loginTab === 'admin' ? (
                  <p>Insira o e-mail administrativo mestre cadastrado e sua respectiva senha autorizada.</p>
                ) : (
                  <p>O acesso técnico geral utiliza o usuário de acesso geral autorizado com a senha correspondente.</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-zinc-600 uppercase tracking-wider bg-zinc-50 py-2.5 sm:py-3 px-4 rounded-xl border border-zinc-200 mt-1">
            <Shield className="w-4 h-4 text-amber-500 shrink-0" />
            Certificado de Conformidade Digital JF
          </div>

        </div>

      </div>
    </div>
  );
}
