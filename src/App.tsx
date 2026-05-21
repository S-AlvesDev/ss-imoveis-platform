/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Home, 
  FileText, 
  LayoutDashboard, 
  UserPlus, 
  LogOut, 
  Menu, 
  ChevronRight,
  ChevronLeft,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Download,
  Plus,
  MapPin,
  MessageSquare,
  Activity,
  Package,
  PackageSearch,
  Search,
  Calculator,
  Briefcase,
  Settings,
  Lightbulb,
  BarChart3,
  Check,
  Headset,
  ShieldCheck,
  ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { AmortizationType } from './lib/finance';
import DashboardCliente from './components/DashboardCliente';
import EstoqueAdmin from './components/EstoqueAdmin';
import AlmoxarifadoView from './components/AlmoxarifadoView';
import AdminComissoesPanel from './components/AdminComissoesPanel';
import SimuladorMCMV from './components/SimuladorMCMV';

// Icons mapping for SUAP style
const ICONS = {
  dashboard: <LayoutDashboard size={20} />,
  clients: <Users size={20} />,
  properties: <Home size={20} />,
  contracts: <FileText size={20} />,
  staff: <UserPlus size={20} />,
  settings: <TrendingDown size={20} />,
  logout: <LogOut size={20} />,
  menu: <Menu size={20} />,
  arrow: <ChevronRight size={16} />,
  chat: <MessageSquare size={20} />
};

const PropertyGallery = ({ images, status }: { images?: string[], status: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-50 flex flex-col items-center justify-center text-gray-300 rounded-t-lg">
        <Home size={32} className="mb-2 text-blue-200" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Sem imagens</span>
      </div>
    );
  }

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative w-full h-48 bg-gray-200 overflow-hidden rounded-t-lg group">
      <img src={images[currentIndex]} alt="imóvel" className={`w-full h-full object-cover transition-transform duration-500 ${status !== 'DISPONÍVEL' ? 'grayscale opacity-80' : 'group-hover:scale-105'}`} />
      
      {images.length > 1 && (
        <>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 pointer-events-none" />
          <button 
            type="button"
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:scale-110 transition-all z-10 focus:outline-none"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            type="button"
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:scale-110 transition-all z-10 focus:outline-none"
          >
            <ChevronRight size={16} />
          </button>
          
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-all z-10 pointer-events-none">
            {images.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-white scale-125' : 'bg-white/50'}`} 
              />
            ))}
          </div>
          
          <div className="absolute top-2 right-2 bg-black/50 text-white text-[9px] font-bold px-2 py-1 rounded-full pointer-events-none shadow-sm backdrop-blur-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [view, setView] = useState('dashboard');
  const [data, setData] = useState<any>({ clients: [], properties: [], contracts: [], staff: [], updateLogs: [] });
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientEditForm, setClientEditForm] = useState({ nome: '', telefone: '', email: '' });
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState({ nome: '', email: '', telefone: '', senha: '' });

  // Use useEffect to check localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [recoveryData, setRecoveryData] = useState({ email: '', code: '', newPassword: '' });
  const [emailCode, setEmailCode] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);
  
  // Distrato State
  const [showDistratoModal, setShowDistratoModal] = useState(false);
  const [distratoContract, setDistratoContract] = useState<any>(null);
  const [distratoSummary, setDistratoSummary] = useState<any>(null);
  const [distratoOption, setDistratoOption] = useState<'50' | '80'>('80');
  const [distratoInstallments, setDistratoInstallments] = useState(12);
  const [isProcessingDistrato, setIsProcessingDistrato] = useState(false);
  
  // Login Form State
  const [loginForm, setLoginForm] = useState({ matricula: '', senha: '' });
  const [loginError, setLoginError] = useState('');

  // Property Form State
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propertyForm, setPropertyForm] = useState({ id: null as number | null, nome: '', valor: 0, localizacao: '', descricao: '' });

  // Contract Filter State
  const [contractFilter, setContractFilter] = useState<'TODOS' | 'ATIVO' | 'ATRASO' | 'DISTRATADO'>('TODOS');

  // Property Filter State
  const [propertyFilterStatus, setPropertyFilterStatus] = useState('TODOS');
  const [propertySearchText, setPropertySearchText] = useState('');

  // Contract Form State
  const [contractForm, setContractForm] = useState({
    clientId: '',
    propertyId: '',
    valorImovel: 0,
    valorEntrada: 0,
    taxaJuros: 0.8,
    numParcelas: 120,
    tipoAmortizacao: AmortizationType.SAC,
    dataInicio: new Date().toISOString().split('T')[0],
    corretorMatricula: '',
    tipoContrato: 'Lote',
    statusFinanceiro: 'Em Pagamento'
  });

  const [staffForm, setStaffForm] = useState({ nome: '', email: '', matricula: '', senha: '', role: 'CORRETOR_ATENDIMENTO' });

  // Mass Update State
  const [massUpdateTaxa, setMassUpdateTaxa] = useState(0.8);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);



  const loadApplicationData = async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadApplicationData();
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const body = await res.json();
      if (res.ok) {
        setUser(body.user);
        setToken(body.token);
        localStorage.setItem('user', JSON.stringify(body.user));
        localStorage.setItem('token', body.token);
        setLoginError('');
      } else {
        setLoginError(body.details || body.error || 'Matrícula ou senha incorretos.');
      }
    } catch (err) {
      setLoginError('Erro ao conectar ao servidor.');
    }
  };

  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerForm.email })
      });
      const body = await res.json();
      if (res.ok) {
        setIsVerifyingEmail(true);
        setResendCountdown(15);
        // Em um app de produção não mostramos o código claro
        toast.success(body.message + (body.devCode ? `\n(Simulação do Email: O código é ${body.devCode})` : ''));
      } else {
        setLoginError(body.error || 'Erro ao enviar código.');
        toast.error(body.error || 'Erro ao enviar código.');
      }
    } catch (err) {
      setLoginError('Problema de conexão, tente novamente.');
      toast.error('Problema de conexão, tente novamente.');
    }
  };

  const handleRecoverRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    try {
      const r = await fetch('/api/auth/reset-password-request', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: recoveryData.email })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro.');
      toast.success(d.message + (d.devCode ? `\n(Simulação do Email: O código é ${d.devCode})` : ''));
      setRecoveryStep(2);
      setResendCountdown(15);
    } catch (err: any) {
      setLoginError(err.message);
      toast.error(err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...registerForm, code: emailCode })
      });
      const body = await res.json();
      if (res.ok) {
        toast.success(`Cadastro realizado com sucesso! Sua matrícula é ${body.matricula}. Você já pode fazer login.`);
        setLoginForm({ matricula: body.matricula, senha: registerForm.senha });
        setIsRegistering(false);
        setIsVerifyingEmail(false);
        setEmailCode('');
        setRegisterForm({ nome: '', email: '', telefone: '', senha: '' });
      } else {
        setLoginError(body.error || 'Erro ao realizar cadastro.');
        toast.error(body.error || 'Erro ao realizar cadastro.');
      }
    } catch (err) {
      setLoginError('Erro ao conectar ao servidor.');
      toast.error('Erro ao conectar ao servidor.');
    }
  };

  const [contractFiles, setContractFiles] = useState<FileList | null>(null);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('clientId', contractForm.clientId);
      formData.append('propertyId', contractForm.propertyId);
      formData.append('valorImovel', contractForm.valorImovel);
      formData.append('valorEntrada', contractForm.valorEntrada);
      formData.append('taxaJuros', contractForm.taxaJuros);
      formData.append('numParcelas', contractForm.numParcelas);
      formData.append('tipoAmortizacao', contractForm.tipoAmortizacao);
      formData.append('dataInicio', contractForm.dataInicio);
      formData.append('corretorMatricula', contractForm.corretorMatricula);
      formData.append('tipoContrato', contractForm.tipoContrato);
      
      if (contractFiles) {
          for (let i = 0; i < contractFiles.length; i++) {
              formData.append('files', contractFiles[i]);
          }
      }

      const res = await fetch('/api/contracts', {
        method: 'POST',
        body: formData
      });

      const body = await res.json();
      if (res.ok) {
        toast.success('Contrato criado com sucesso!');
        loadApplicationData();
        setView('contracts');
        // Reset form
        setContractForm({
          clientId: '',
          propertyId: '',
          valorImovel: 0,
          valorEntrada: 0,
          taxaJuros: 0.8,
          numParcelas: 120,
          tipoAmortizacao: AmortizationType.SAC,
          dataInicio: new Date().toISOString().split('T')[0],
          corretorMatricula: '',
          tipoContrato: 'Lote',
          statusFinanceiro: 'Em Pagamento'
        });
      } else {
        toast.error('Erro ao criar contrato: ' + (body.details || body.error || 'Erro desconhecido'));
      }
    } catch (err) {
      toast.error('Erro ao conectar ao servidor.');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm)
      });
      const body = await res.json();
      if (res.ok) {
        toast.success(`Funcionário cadastrado! Matrícula: ${body.matricula}`);
        loadApplicationData();
        setStaffForm({ nome: '', senha: '', role: 'CORRETOR_ATENDIMENTO' });
      } else {
        toast.error('Erro ao cadastrar funcionário: ' + (body.error || 'Erro desconhecido'));
      }
    } catch (err) {
      toast.error('Erro ao cadastrar funcionário.');
    }
  };

  const handleMassUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/contracts/update-interest-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaTaxa: massUpdateTaxa, adminId: user.id })
      });
      if (res.ok) {
          const result = await res.json();
          toast.success(`${result.count} contratos atualizados com sucesso!`);
          loadApplicationData();
          setShowUpdateModal(false);
      }
    } catch (err) {
      toast.error('Erro ao processar atualização em massa.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePayInstallment = async (contractId: number, installmentNum: number) => {
    try {
        const res = await fetch(`/api/contracts/pay/${contractId}/${installmentNum}`, { method: 'POST' });
        if (res.ok) {
            loadApplicationData();
        }
    } catch (err) {
        console.error('Error paying installment:', err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
        <main className="flex-1">
          {/* HERO & LOGIN SECTION */}
          <section className="relative min-h-screen md:min-h-[85vh] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#1d2d3d] to-[#121c26] text-white">
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 hidden md:block">
              <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500 blur-[120px]" />
              <div className="absolute bottom-[0%] -right-[10%] w-[50%] h-[50%] rounded-full bg-teal-500 blur-[120px]" />
            </div>
            
            <div className="z-10 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="hidden md:block space-y-6">
                <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">Imobiliária SãoSeverino</h1>
                <p className="text-xl text-gray-300">Gestão inteligente. Soluções completas para seu negócio imobiliário.</p>
                <div className="pt-4 flex gap-4">
                  <span className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-blue-400"/> Inovação</span>
                  <span className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-blue-400"/> Confiança</span>
                </div>
              </div>

              <div className="flex justify-center md:justify-end">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-md bg-white text-gray-800 rounded-2xl shadow-2xl overflow-hidden"
                  id="login-card"
                >
          <div className="bg-[#1d2d3d] p-8 text-center text-white">
            <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-1 border-2 border-blue-400">
                    {/* Em produção, src="/ss.webp" */}
                    <img src="/logo-ss-imoveis.webp" alt="SS Imóveis" className="rounded-full" />
                </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">SS IMÓVEIS</h1>
            <p className="text-blue-200 text-sm opacity-80">Sistema de Gestão Imobiliário</p>
          </div>
          
          <form onSubmit={(e) => {
               if (isRecovering) {
                  e.preventDefault();
                  // Handle recovery
                  if (recoveryStep === 1) {
                      handleRecoverRequest();
                  } else {
                      setLoginError('');
                      fetch('/api/auth/reset-password', {
                         method: 'POST', headers: {'Content-Type': 'application/json'},
                         body: JSON.stringify(recoveryData)
                      }).then(async r => {
                         const d = await r.json();
                         if (!r.ok) throw new Error(d.error || 'Erro.');
                         setIsRecovering(false);
                         setRecoveryStep(1);
                         setRecoveryData({ email: '', code: '', newPassword: '' });
                         toast.success('Senha alterada com sucesso! Faça login.');
                      }).catch(err => setLoginError(err.message));
                  }
               } else if (isRegistering) {
                  if (isVerifyingEmail) handleRegister(e);
                  else handleRequestCode(e);
               } else {
                  handleLogin(e);
               }
          }} className="p-8 space-y-6">
            {isRecovering ? (
              <>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Recuperar Senha</h3>
                  <p className="text-sm text-gray-500">{recoveryStep === 1 ? 'Insira sua matrícula ou email' : 'Insira o código recebido no e-mail'}</p>
                </div>
                {recoveryStep === 1 ? (
                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-1">Matrícula ou E-mail</label>
                     <input 
                       type="text" required
                       className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none"
                       value={recoveryData.email} onChange={e => setRecoveryData({...recoveryData, email: e.target.value})}
                     />
                   </div>
                ) : (
                   <>
                     <div>
                       <label className="block text-sm font-semibold text-gray-700 mb-1">Código (6 dígitos)</label>
                       <input 
                         type="text" required maxLength={6}
                         className="w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-xl border border-gray-300 rounded-md outline-none"
                         value={recoveryData.code} onChange={e => setRecoveryData({...recoveryData, code: e.target.value})}
                       />
                       <div className="text-right mt-1">
                         <button 
                           type="button" 
                           onClick={() => handleRecoverRequest()}
                           disabled={resendCountdown > 0}
                           className="text-xs text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline font-medium"
                         >
                           {resendCountdown > 0 ? `Reenviar código em ${resendCountdown}s` : 'Reenviar código'}
                         </button>
                       </div>
                     </div>
                     <div className="mt-4">
                       <label className="block text-sm font-semibold text-gray-700 mb-1">Nova Senha</label>
                       <input 
                         type="password" required
                         className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none"
                         value={recoveryData.newPassword} onChange={e => setRecoveryData({...recoveryData, newPassword: e.target.value})}
                       />
                     </div>
                   </>
                )}
                <div className="text-center mt-2">
                   <button type="button" onClick={() => { setIsRecovering(false); setLoginError(''); }} className="text-xs text-gray-500 hover:text-gray-700">Voltar ao Login</button>
                </div>
              </>
            ) : !isRegistering ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Matrícula ou E-mail</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Sua matrícula"
                    value={loginForm.matricula}
                    onChange={e => setLoginForm({...loginForm, matricula: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
                  <input 
                    type="password" 
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                    value={loginForm.senha}
                    onChange={e => setLoginForm({...loginForm, senha: e.target.value})}
                  />
                </div>
                <div className="mt-2 text-right">
                   <button type="button" onClick={() => setIsRecovering(true)} className="text-xs text-blue-600 hover:underline">Esqueceu a senha?</button>
                </div>
              </>
            ) : isVerifyingEmail ? (
              <>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Verifique seu E-mail</h3>
                  <p className="text-sm text-gray-500">Enviamos um código de 6 dígitos para <br/><span className="font-semibold text-gray-700">{registerForm.email}</span></p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Código de Verificação</label>
                  <input 
                    type="text" required
                    maxLength={6}
                    placeholder="000000"
                    className="w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-xl border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    value={emailCode} onChange={e => setEmailCode(e.target.value)}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsVerifyingEmail(false)}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium p-1"
                  >
                    Voltar
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleRequestCode()}
                    disabled={resendCountdown > 0}
                    className="text-sm text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline font-medium p-1"
                  >
                    {resendCountdown > 0 ? `Reenviar código em ${resendCountdown}s` : 'Reenviar código'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    value={registerForm.nome} onChange={e => setRegisterForm({...registerForm, nome: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
                  <input 
                    type="email" required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    value={registerForm.email} onChange={e => setRegisterForm({...registerForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    value={registerForm.telefone} onChange={e => setRegisterForm({...registerForm, telefone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
                  <input 
                    type="password" required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    value={registerForm.senha} onChange={e => setRegisterForm({...registerForm, senha: e.target.value})}
                  />
                </div>
              </>
            )}
            
            {loginError && <p className="text-red-500 text-xs font-medium">{loginError}</p>}
            
            <button 
              type="submit"
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-md transition-colors shadow-lg shadow-blue-200"
            >
              {isRecovering ? (recoveryStep === 1 ? 'ENVIAR CÓDIGO' : 'REDEFINIR') : isRegistering ? (isVerifyingEmail ? 'CONFIRMAR CADASTRO' : 'CONTINUAR') : 'ENTRAR NO SISTEMA'}
            </button>

            {!isRecovering && (
                <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={() => { setIsRegistering(!isRegistering); setLoginError(''); }}
                    className="text-blue-600 text-sm font-bold hover:underline"
                  >
                    {isRegistering ? 'Já tenho uma conta. Fazer Login' : 'Não tem uma conta? Cadastre-se aqui'}
                  </button>
                </div>
            )}

          </form>
                </motion.div>
              </div>
            </div>
            
            {/* Scroll Indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce hidden md:flex flex-col items-center opacity-70">
              <span className="text-xs tracking-widest uppercase mb-2 text-blue-200">Saiba Mais</span>
              <div className="w-6 h-10 border-2 border-blue-200 rounded-full flex justify-center p-1">
                 <div className="w-1.5 h-3 bg-blue-200 rounded-full animate-pulse" />
              </div>
            </div>
          </section>

          {/* SERVIÇOS SECTION */}
          <section className="py-20 px-4 bg-gray-50 border-y border-gray-200">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tight text-gray-800 uppercase mb-16">Serviços</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                <div className="flex gap-4">
                  <div className="mt-1 flex-shrink-0"><Briefcase className="w-8 h-8 text-blue-600" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Colaboração Empresarial</h3>
                    <p className="text-gray-600">Trabalhamos com parcerias com várias empresas na região.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 flex-shrink-0"><Settings className="w-8 h-8 text-orange-500" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Serviços E Engenharia</h3>
                    <p className="text-gray-600">Nossos serviços são de alta qualidade para satisfazer nossos clientes.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 flex-shrink-0"><Lightbulb className="w-8 h-8 text-teal-600" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Mentes Criativas</h3>
                    <p className="text-gray-600">Nossos profissionais são especialistas que pensam em soluções criativas para lançar os melhores produtos.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 flex-shrink-0"><BarChart3 className="w-8 h-8 text-red-500" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Gestão De Negócios</h3>
                    <p className="text-gray-600">Trabalhamos com as melhores ferramentas do mercado para gerir nossos negócios.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* LOTEAMENTO SECTION */}
          <section className="py-24 px-4 bg-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-50/50 rounded-l-[100px] -z-10 hidden lg:block" />
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="order-2 md:order-1 relative flex justify-center">
                <div className="w-full max-w-[500px] relative">
                  <img src="/novo1_ssimoveis.png" alt="Residencial" className="w-full h-auto object-contain animate-float" />
                  <img src="/novo3_ssimoveis.png" alt="Pássaros" className="absolute bottom-[5%] left-[10%] w-[170px] h-[159.7px] -ml-[22px] transition-all duration-300 hover:scale-110 hover:-translate-y-2" />
                </div>
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <div>
                  <span className="text-blue-700 font-bold uppercase tracking-wider text-sm">Loteamento</span>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-[#2a3c5a] mt-2 mb-4">ALTO DE SÃO SEVERINO II</h2>
                  <p className="text-gray-600 text-lg leading-relaxed">O local ideal para investir e morar bem. O mais próximo da feira livre de Nova Cruz.</p>
                </div>
                
                <div className="space-y-6 pt-6 border-t border-gray-100">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1"><Check className="w-6 h-6 text-blue-700 bg-blue-100 rounded-full p-1" /></div>
                    <div>
                      <h4 className="font-bold text-gray-800 tracking-wide">PERTO DE TUDO</h4>
                      <p className="text-gray-600 text-sm mt-1 leading-relaxed">Caic, feira livre de Nova Cruz, redes de supermercados, rodoviária e muito mais.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1"><Check className="w-6 h-6 text-blue-700 bg-blue-100 rounded-full p-1" /></div>
                    <div>
                      <h4 className="font-bold text-gray-800 tracking-wide">INFRAESTRUTURA</h4>
                      <p className="text-gray-600 text-sm mt-1 leading-relaxed">Rede de abastecimento de água, rede de energia elétrica, iluminação pública, meio-fio e ruas pavimentadas.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PORQUE ESCOLHER SECTION */}
          <section className="py-24 px-4 bg-[#f8fafc] border-t border-gray-200">
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#2a3c5a] mb-4">PORQUE ESCOLHER A SS IMÓVEIS?</h2>
              <p className="text-gray-600 text-lg mb-16 max-w-2xl mx-auto">Oferecemos as melhores soluções para clientes e parceiros.</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                {/* Left side */}
                <div className="space-y-8 lg:space-y-12">
                  <div className="flex flex-col md:flex-row items-center md:items-end justify-center lg:justify-end gap-4 text-center lg:text-right">
                    <div className="order-2 md:order-1">
                      <h4 className="font-bold text-gray-800 mb-1 tracking-wide">ESTRATÉGIA</h4>
                    </div>
                    <div className="order-1 md:order-2 bg-white p-3 shadow-md rounded-xl text-blue-600"><FileText className="w-8 h-8" /></div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center md:items-end justify-center lg:justify-end gap-4 text-center lg:text-right">
                    <div className="order-2 md:order-1">
                      <h4 className="font-bold text-gray-800 mb-1 tracking-wide">ALTO DESEMPENHO</h4>
                    </div>
                    <div className="order-1 md:order-2 bg-white p-3 shadow-md rounded-xl text-blue-600"><BarChart3 className="w-8 h-8" /></div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center md:items-end justify-center lg:justify-end gap-4 text-center lg:text-right">
                    <div className="order-2 md:order-1">
                      <h4 className="font-bold text-gray-800 mb-1 tracking-wide">SUPORTE AO CLIENTE</h4>
                    </div>
                    <div className="order-1 md:order-2 bg-white p-3 shadow-md rounded-xl text-blue-600"><Headset className="w-8 h-8" /></div>
                  </div>
                </div>
                
                {/* Center Image */}
                <div className="hidden lg:flex justify-center p-8 items-center">
                  <img src="/novo_ssimoveis.png" alt="Equipe" className="w-80 h-auto object-contain animate-float-horizontal" />
                </div>

                {/* Right side */}
                <div className="space-y-8 lg:space-y-12">
                  <div className="flex flex-col md:flex-row items-center md:items-start justify-center lg:justify-start gap-4 text-center lg:text-left">
                    <div className="order-1 bg-white p-3 shadow-md rounded-xl text-blue-600"><Settings className="w-8 h-8" /></div>
                    <div className="order-2">
                      <h4 className="font-bold text-gray-800 mb-1 mt-3 tracking-wide">TECNOLOGIA</h4>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center md:items-start justify-center lg:justify-start gap-4 text-center lg:text-left">
                    <div className="order-1 bg-white p-3 shadow-md rounded-xl text-blue-600"><Briefcase className="w-8 h-8" /></div>
                    <div className="order-2">
                      <h4 className="font-bold text-gray-800 mb-1 mt-3 tracking-wide">MARKETING DE NEGÓCIOS</h4>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center md:items-start justify-center lg:justify-start gap-4 text-center lg:text-left">
                    <div className="order-1 bg-white p-3 shadow-md rounded-xl text-blue-600"><ShieldCheck className="w-8 h-8" /></div>
                    <div className="order-2">
                      <h4 className="font-bold text-gray-800 mb-1 mt-3 tracking-wide">PROTEÇÃO DE INFORMAÇÕES</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="bg-[#1d2d3d] text-gray-400 py-8 text-center text-sm border-t border-gray-700">
             <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <p>&copy; {new Date().getFullYear()} SS Imóveis - Gestão Inteligente. Todos os direitos reservados.</p>
                <div className="flex gap-4">
                   <a href="#" className="hover:text-white transition-colors">Termos</a>
                   <a href="#" className="hover:text-white transition-colors">Privacidade</a>
                </div>
             </div>
          </footer>
        </main>
      </div>
    );
  }

  const Sidebar = () => (
    <aside className={`bg-[#1d2d3d] text-gray-300 w-64 fixed h-full flex flex-col overflow-y-auto transition-all duration-300 z-50 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="p-6 border-b border-gray-700 flex flex-col items-center shrink-0">
        <div className="w-16 h-16 bg-white rounded-full mb-3 flex items-center justify-center overflow-hidden border-2 border-blue-400">
           <img src="/logo-ss-imoveis.webp" alt="SS Imóveis" />
        </div>
        <h2 className="text-white font-bold tracking-wider">SS IMÓVEIS</h2>
        <span className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mt-1">Gestão Inteligente</span>
      </div>
      
      <nav className="mt-4 px-2 space-y-1 mb-8">
        <button onClick={() => setView('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'dashboard' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
          <span className="mr-3">{ICONS.dashboard}</span>
          <span className="text-sm font-medium">Dashboard</span>
        </button>
        
        {user.role !== 'CLIENTE' && (
          <>
            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR' || user.role === 'CORRETOR_ATENDIMENTO') && (
              <button onClick={() => setView('clients')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'clients' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                <span className="mr-3">{ICONS.clients}</span>
                <span className="text-sm font-medium">Clientes</span>
              </button>
            )}
            
            <button onClick={() => setView('properties')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'properties' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
              <span className="mr-3">{ICONS.properties}</span>
              <span className="text-sm font-medium">Imóveis</span>
            </button>
            
            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR' || user.role === 'FINANCEIRO_ATENDIMENTO' || user.role === 'CORRETOR_ATENDIMENTO') && (
              <button onClick={() => setView('contracts')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'contracts' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                <span className="mr-3">{ICONS.contracts}</span>
                <span className="text-sm font-medium">Vendas / Contratos</span>
              </button>
            )}

            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR') && (
              <>
                <button onClick={() => setView('estoque')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'estoque' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                  <span className="mr-3"><PackageSearch size={20} /></span>
                  <span className="text-sm font-medium">Controle de Estoque</span>
                </button>
              </>
            )}

            {user.role === 'CORRETOR_ATENDIMENTO' && (
               <button onClick={() => setView('minhas-comissoes')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'minhas-comissoes' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                  <span className="mr-3"><Activity size={20} /></span>
                  <span className="text-sm font-medium">Minhas Comissões</span>
               </button>
            )}

            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR' || user.role === 'CORRETOR_ATENDIMENTO') && (
               <button onClick={() => setView('simulador-mcmv')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'simulador-mcmv' ? 'bg-orange-500 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                  <span className="mr-3"><Calculator size={20} /></span>
                  <span className="text-sm font-medium">Simulador MCMV</span>
               </button>
            )}

            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR' || user.role === 'FINANCEIRO_ATENDIMENTO') && (
               <button onClick={() => setView('admin-comissoes')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'admin-comissoes' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                  <span className="mr-3"><Activity size={20} /></span>
                  <span className="text-sm font-medium">Painel de Comissões</span>
               </button>
            )}
          </>
        )}
        
        {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR') && (
          <>
            <button onClick={() => setView('staff')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'staff' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
              <span className="mr-3">{ICONS.staff}</span>
              <span className="text-sm font-medium">Gestão de Equipe</span>
            </button>
            <button onClick={() => setView('admin-settings')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'admin-settings' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
              <span className="mr-3">{ICONS.settings}</span>
              <span className="text-sm font-medium">Configuração Global</span>
            </button>
          </>
        )}

        <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 rounded-md hover:bg-gray-800 mt-10 text-red-400">
          <span className="mr-3">{ICONS.logout}</span>
          <span className="text-sm font-medium">Sair</span>
        </button>
      </nav>
      
      <div className="mt-auto shrink-0 w-full p-4 bg-[#162230] text-[10px] text-gray-500 border-t border-gray-700">
        <p>Usuário: <span className="text-gray-300">{user.nome}</span></p>
        <p>Matrícula: <span className="text-gray-300">{user.matricula}</span></p>
      </div>
    </aside>
  );

  const isOverdueByMonths = (installments: any[], months: number) => {
    const today = new Date();
    return installments.some(i => {
      if (i.pago) return false;
      const dueDate = new Date(i.vencimento);
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return dueDate < today && diffDays > (months * 30);
    });
  };

  const getContractStatus = (contract: any) => {
    if (contract.status === 'DISTRATADO') return 'DISTRATADO';
    const isOverdue = contract.installments.some((i: any) => !i.pago && new Date(i.vencimento) < new Date());
    return isOverdue ? 'ATRASO' : 'ATIVO';
  };

  const filteredContracts = data.contracts.filter((c: any) => {
    if (contractFilter === 'TODOS') return true;
    if (contractFilter === 'DISTRATADO') return c.status === 'DISTRATADO';
    if (contractFilter === 'ATIVO') return getContractStatus(c) === 'ATIVO';
    if (contractFilter === 'ATRASO') return getContractStatus(c) === 'ATRASO';
    return true;
  });

  const StatCard = ({ title, value, color, icon }: any) => (
    <div className={`bg-white p-6 rounded-lg shadow-sm border-l-4 overflow-hidden relative`} style={{ borderColor: color }}>
      <div className="relative z-10">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-black text-gray-800">{value}</p>
      </div>
      <div className="absolute right-[-10px] bottom-[-10px] opacity-5 text-gray-800 scale-[2]">
        {icon}
      </div>
    </div>
  );

  if (user.role === 'CLIENTE') {
    // Find the client's actual data from the loaded application data
    const clientContract = data.contracts.find((c: any) => {
      // Find by clientId. The user object's ID might refer to the user table ID or client table ID.
      // Since we sync them, we check against the data.clients first if needed or just use user.id
      // but to be safe, we match by matricula if possible.
      const client = data.clients.find((cl: any) => cl.matricula === user.matricula);
      return c.clientId === (client?.id || user.id);
    });
    const property = data.properties.find((p: any) => p.id === clientContract?.propertyId);
    
    return (
      <DashboardCliente 
        onLogout={handleLogout} 
        clienteNome={user.nome} 
        contratoData={clientContract}
        imovelData={property}
        todosImoveis={data.properties}
      />
    );
  }

  if (user.role === 'ALMOXARIFADO' || user.matricula?.startsWith('E')) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        {/* Simple topbar */}
        <header className="bg-[#1D2D3D] text-white p-4 shadow-md flex justify-between items-center z-50 relative">
          <div className="flex items-center space-x-3">
             <div className="bg-white p-1 rounded-lg">
               <img src="/logo-ss-imoveis.webp" alt="SS Imóveis" className="h-8 object-contain" />
             </div>
             <div>
                <h1 className="text-sm font-bold uppercase tracking-widest">{user.nome}</h1>
                <p className="text-[10px] text-blue-200">Painel do Almoxarifado</p>
             </div>
          </div>
          <button 
             onClick={handleLogout}
             className="text-white/60 hover:text-white transition-colors bg-white/5 p-2 rounded-lg"
          >
             <LogOut size={20} />
          </button>
        </header>

        <main className="p-4 sm:p-6 max-w-5xl mx-auto mt-4">
          <AlmoxarifadoView data={data} user={user} onRefresh={loadApplicationData} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <Sidebar />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-0 md:ml-64' : 'ml-0'}`}>
        {/* Topbar */}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden text-gray-500">
            {ICONS.menu}
          </button>
          <div className="flex items-center space-x-2">
             <div className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:block">SS Imóveis</div>
             <span className="text-gray-300 hidden sm:block">/</span>
             <div className="text-sm font-semibold text-gray-700 capitalize">{view.replace('-', ' ')}</div>
          </div>
          <div className="flex items-center space-x-4">
             <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-800">{user.nome}</p>
                <p className="text-[10px] text-blue-600 font-bold uppercase">{user.role}</p>
             </div>
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs border border-blue-200">
                {user.nome[0]}
             </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Contratos Ativos" value={data.contracts.filter((c:any) => c.status === 'ATIVO').length} color="#2563eb" icon={<FileText />} />
                  <StatCard title="Parcelas em Atraso" value={data.contracts.filter((c:any) => getContractStatus(c) === 'ATRASO').length} color="#ef4444" icon={<AlertCircle />} />
                  <StatCard title="Contratos Distratados" value={data.contracts.filter((c:any) => c.status === 'DISTRATADO').length} color="#64748b" icon={<TrendingDown />} />
                  <StatCard title="Total de Clientes" value={data.clients.length} color="#10b981" icon={<Users />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                     <h3 className="font-bold text-gray-800 text-sm uppercase tracking-tight mb-4">Status dos Contratos</h3>
                     <div className="h-64" style={{ minWidth: 0, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                           <BarChart data={[
                              { name: 'Ativos', total: data.contracts.filter((c:any) => getContractStatus(c) === 'ATIVO').length, fill: '#10b981' },
                              { name: 'Atrasados', total: data.contracts.filter((c:any) => getContractStatus(c) === 'ATRASO').length, fill: '#ef4444' },
                              { name: 'Distratados', total: data.contracts.filter((c:any) => getContractStatus(c) === 'DISTRATADO').length, fill: '#64748b' },
                           ]}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} />
                              <YAxis axisLine={false} tickLine={false} />
                              <Tooltip cursor={{fill: 'transparent'}} />
                              <Bar dataKey="total" radius={[4, 4, 0, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col">
                     <h3 className="font-bold text-gray-800 text-sm uppercase tracking-tight mb-4">Evolução de Propriedades</h3>
                     <div className="h-64 flex-1" style={{ minWidth: 0, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                           <PieChart>
                             <Pie 
                                data={[
                                  { name: 'Disponível', value: data.properties.filter((p:any) => p.status === 'DISPONÍVEL').length, fill: '#3b82f6' },
                                  { name: 'Vendido', value: data.properties.filter((p:any) => p.status === 'VENDIDO').length, fill: '#10b981' }
                                ]}
                                cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                             >
                                <Cell fill="#3b82f6" />
                                <Cell fill="#10b981" />
                             </Pie>
                             <Tooltip />
                           </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center space-x-4 mt-2 text-xs">
                           <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span> Disponíveis ({data.properties.filter((p:any) => p.status === 'DISPONÍVEL').length})</span>
                           <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span> Vendidos ({data.properties.filter((p:any) => p.status === 'VENDIDO').length})</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-[#fbfcfd] flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-tight">Últimas Atividades</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 italic text-gray-500">
                          <th className="px-6 py-3 font-semibold">Cliente</th>
                          <th className="px-6 py-3 font-semibold">Propriedade</th>
                          <th className="px-6 py-3 font-semibold">Valor Financ.</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.contracts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">Nenhum contrato registrado recentemente</td>
                          </tr>
                        ) : data.contracts.map((c: any) => {
                          const status = getContractStatus(c);
                          return (
                            <tr key={c.id} className="hover:bg-blue-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-800">{data.clients.find((cl:any) => cl.id === c.clientId)?.nome}</td>
                              <td className="px-6 py-4 text-gray-600">{data.properties.find((p:any) => p.id === c.propertyId)?.nome}</td>
                              <td className="px-6 py-4 font-mono text-blue-600 font-bold">R$ {(c.valorFinanciado ?? 0).toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {status === 'DISTRATADO' ? (
                                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-200">DISTRATADO</span>
                                ) : status === 'ATRASO' ? (
                                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200">EM ATRASO</span>
                                ) : (
                                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200">ATIVO</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'clients' && (
              <motion.div 
                key="clients"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">Clientes Cadastrados</h2>
                  <div className="flex space-x-4">
                    <button onClick={() => {
                        let csv = "ID,Matricula,Nome,Email,Telefone\n";
                        data.clients.forEach((c:any) => { csv += `${c.id},${c.matricula},"${c.nome}","${c.email}","${c.telefone}"\n`; });
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = "clientes.csv";
                        link.click();
                    }} className="flex items-center text-gray-600 text-xs font-bold hover:text-blue-600 transition-colors">
                      <Download size={14} className="mr-1" /> Exportar CSV
                    </button>
                    <button onClick={() => loadApplicationData()} className="text-blue-600 text-xs font-bold hover:underline">Atualizar Lista</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Register Client */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center"><UserPlus size={18} className="mr-2 text-blue-600"/> Cadastrar Novo Cliente</h3>
                    <form className="space-y-4" onSubmit={async (e) => {
                         e.preventDefault();
                         const form = e.target as any;
                         const res = await fetch('/api/clients', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({ 
                               nome: form.nome.value, 
                               email: form.email.value,
                               telefone: form.telefone.value,
                               senha: form.senha.value 
                             })
                         });
                         if (res.ok) {
                            const newClient = await res.json();
                            toast.success(`Cliente cadastrado! Matrícula: ${newClient.matricula}`);
                            const shouldLink = form.incluirImovel.checked;
                            form.reset();
                            await loadApplicationData();
                            if (shouldLink) {
                               setContractForm(prev => ({...prev, clientId: String(newClient.id)}));
                               setView('contracts');
                            }
                         } else {
                            const errorData = await res.json();
                            toast.error('Erro ao cadastrar cliente: ' + (errorData.error || 'Erro desconhecido'));
                         }
                    }}>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Nome Completo</label>
                            <input name="nome" required className="w-full px-3 py-2 border rounded-md outline-none focus:ring-1 ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">E-mail</label>
                            <input name="email" type="email" required className="w-full px-3 py-2 border rounded-md outline-none focus:ring-1 ring-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Telefone</label>
                                <input name="telefone" required className="w-full px-3 py-2 border rounded-md outline-none focus:ring-1 ring-blue-500" placeholder="(81) 90000-0000" />
                            </div>
                            <div>
                                 <label className="block text-xs font-bold text-gray-500 mb-1">Senha de Acesso</label>
                                <input name="senha" type="password" required className="w-full px-3 py-2 border rounded-md outline-none focus:ring-1 ring-blue-500" placeholder="••••••••" />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2 pb-2">
                           <input type="checkbox" id="incluirImovel" name="incluirImovel" className="w-4 h-4 text-blue-600" />
                           <label htmlFor="incluirImovel" className="text-xs font-bold text-gray-700">Já incluir lote/imóvel (Redirecionar para Vínculo após cadastro)</label>
                        </div>
                        <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-md text-sm hover:bg-blue-700 transition-colors">ADICIONAR CLIENTE</button>
                    </form>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-y-auto max-h-[400px]">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-gray-50 font-bold border-b text-gray-500">
                                <tr>
                                    <th className="px-4 py-2">ID</th>
                                    <th className="px-4 py-2">Nome</th>
                                    <th className="px-4 py-2 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.clients.map((cl: any) => (
                                    <tr key={cl.id} className="hover:bg-blue-50">
                                        <td className="px-4 py-3">{cl.id}</td>
                                        <td className="px-4 py-3 font-medium">{cl.nome}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                              onClick={() => setSelectedClient(cl)}
                                              className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors mr-2"
                                            >
                                              DETALHAR
                                            </button>
                                            <button 
                                              onClick={() => {
                                                 setContractForm(prev => ({...prev, clientId: String(cl.id)}));
                                                 setView('contracts');
                                              }}
                                              className="text-green-600 bg-green-50 px-2 py-1 rounded text-[10px] font-bold border border-green-100 hover:bg-green-100 transition-colors"
                                            >
                                              VINCULAR IMÓVEL
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'properties' && (
              <motion.div 
                key="properties"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 gap-4">
                  <h2 className="text-lg font-bold text-gray-800">Imóveis Disponíveis</h2>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Buscar imóvel..." 
                        className="pl-9 pr-3 py-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500"
                        value={propertySearchText}
                        onChange={e => setPropertySearchText(e.target.value)}
                      />
                    </div>
                    <select 
                      className="px-3 py-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 text-gray-600 font-bold"
                      value={propertyFilterStatus}
                      onChange={e => setPropertyFilterStatus(e.target.value)}
                    >
                      <option value="TODOS">Todos Status</option>
                      <option value="DISPONÍVEL">Disponíveis</option>
                      <option value="VENDIDO">Vendidos</option>
                    </select>
                    <button onClick={() => setShowPropertyModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center">
                      <Plus size={16} className="mr-1" /> CADASTRAR IMÓVEL
                    </button>
                    <button onClick={() => {
                        let csv = "ID,Nome,Localização,Valor,Status\n";
                        data.properties.forEach((p:any) => { 
                           csv += `${p.id},"${p.nome}","${p.localizacao || ''}",${p.valor},"${p.status}"\n`; 
                        });
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = "imoveis.csv";
                        link.click();
                    }} className="flex items-center text-gray-600 text-[10px] font-bold hover:text-blue-600 transition-colors uppercase">
                      <Download size={14} className="mr-1" /> CSV
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.properties
                    .filter((p:any) => propertyFilterStatus === 'TODOS' || p.status === propertyFilterStatus)
                    .filter((p:any) => propertySearchText === '' || p.nome.toLowerCase().includes(propertySearchText.toLowerCase()) || (p.localizacao || '').toLowerCase().includes(propertySearchText.toLowerCase()))
                    .map((p: any) => (
                    <div key={p.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
                      <div>
                        <div className="-mx-6 -mt-6 mb-4 relative">
                          <PropertyGallery images={p.images} status={p.status} />
                          <div className="absolute top-4 left-4">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-sm ${
                              p.status === 'DISPONÍVEL' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 backdrop-blur-sm'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-800 mb-1">{p.nome}</h3>
                        <p className="text-gray-400 text-[10px] uppercase font-bold mb-2 flex items-center">
                          <MapPin size={10} className="mr-1 text-blue-500" />
                          {p.localizacao || 'Localização não informada'}
                        </p>
                        <p className="text-xl font-black text-gray-900">R$ {(p.valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        {p.descricao && (
                          <p className="mt-3 text-[10px] text-gray-500 line-clamp-2 italic leading-relaxed">
                            "{p.descricao}"
                          </p>
                        )}
                      </div>
                      <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px]">
                        <span className="font-bold text-gray-400 uppercase">#{p.id}</span>
                        <button 
                           onClick={() => {
                              setPropertyForm({ id: p.id, nome: p.nome, valor: p.valor, localizacao: p.localizacao, descricao: p.descricao });
                              setShowPropertyModal(true);
                           }}
                           className="text-blue-600 font-bold hover:underline"
                        >EDITAR</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {view === 'contracts' && (
              <motion.div 
                key="contracts"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Creation Form */}
                  <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h2 className="font-bold text-gray-800 mb-6 flex items-center"><TrendingDown size={18} className="mr-2 text-blue-600"/> Registrar Contrato a Pagar</h2>
                    <form onSubmit={handleCreateContract} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tipo de Contrato</label>
                        <select 
                          required
                          className="w-full px-3 py-2 border rounded-md text-sm bg-white font-bold"
                          value={contractForm.tipoContrato}
                          onChange={e => setContractForm({...contractForm, tipoContrato: e.target.value})}
                        >
                          <option value="Lote">Lote</option>
                          <option value="Aluguel">Aluguel</option>
                          <option value="Programa Minha Casa Minha Vida (MCMV)">Programa Minha Casa Minha Vida (MCMV)</option>
                          <option value="Imóvel de Terceiros">Imóvel de Terceiros</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Status Financeiro (Inicial)</label>
                        <select 
                          required
                          className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                          value={contractForm.statusFinanceiro}
                          onChange={e => setContractForm({...contractForm, statusFinanceiro: e.target.value})}
                        >
                          <option value="Em Pagamento">Em Pagamento</option>
                          <option value="Financiado">Financiado</option>
                          <option value="Atrasado">Atrasado</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Corretor (Vínculo)</label>
                        <select 
                          required
                          className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                          value={contractForm.corretorMatricula}
                          onChange={e => setContractForm({...contractForm, corretorMatricula: e.target.value})}
                        >
                          <option value="">Selecione o corretor</option>
                          {data.staff.filter((s:any) => s.role !== 'CLIENTE').map((s: any) => <option key={s.id} value={s.matricula}>{s.nome} ({s.matricula})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Cliente</label>
                        <select 
                          required
                          className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                          value={contractForm.clientId}
                          onChange={e => setContractForm({...contractForm, clientId: e.target.value})}
                        >
                          <option value="">Selecione o cliente</option>
                          {data.clients.map((cl: any) => <option key={cl.id} value={cl.id}>{cl.nome}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Imóvel</label>
                        <select 
                          required
                          className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                          value={contractForm.propertyId}
                          onChange={e => {
                            const prop = data.properties.find((p:any) => p.id === Number(e.target.value));
                            setContractForm({...contractForm, propertyId: e.target.value, valorImovel: prop?.valor || 0});
                          }}
                        >
                          <option value="">Selecione o imóvel</option>
                          {data.properties.filter((p: any) => p.status === 'DISPONÍVEL').map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Valor Total</label>
                          <input 
                            type="number"
                            required
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            value={contractForm.valorImovel}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setContractForm({...contractForm, valorImovel: val});
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Valor Entrada</label>
                          <input 
                            type="number"
                            required
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            value={contractForm.valorEntrada}
                            onChange={e => setContractForm({...contractForm, valorEntrada: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                           <div className="bg-blue-50 p-2 rounded text-[10px] font-bold text-blue-700 flex justify-between uppercase">
                             <span>Valor a Financiar:</span>
                             <span>R$ {(contractForm.valorImovel - contractForm.valorEntrada).toLocaleString()}</span>
                           </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Taxa (% AM)</label>
                          <input 
                            type="number"
                            step="0.01"
                            required
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            value={contractForm.taxaJuros}
                            onChange={e => setContractForm({...contractForm, taxaJuros: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Parcelas</label>
                          <input 
                            type="number"
                            required
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            value={contractForm.numParcelas}
                            onChange={e => setContractForm({...contractForm, numParcelas: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Sistema</label>
                          <select 
                            className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                            value={contractForm.tipoAmortizacao}
                            onChange={e => setContractForm({...contractForm, tipoAmortizacao: e.target.value as AmortizationType})}
                          >
                            <option value={AmortizationType.SAC}>SAC</option>
                            <option value={AmortizationType.PRICE}>PRICE</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Data Início</label>
                          <input 
                            type="date"
                            required
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            value={contractForm.dataInicio}
                            onChange={e => setContractForm({...contractForm, dataInicio: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Anexar Contratos PDF (Opcional)</label>
                        <input
                           type="file"
                           multiple
                           accept="application/pdf"
                           onChange={(e) => setContractFiles(e.target.files)}
                           className="w-full text-xs"
                        />
                      </div>
                      <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-md text-sm hover:bg-green-700 shadow-md uppercase tracking-widest">REGISTRAR VENDA</button>
                    </form>
                  </div>

                  {/* List */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-2 items-center justify-between">
                       <div className="flex flex-wrap gap-2">
                         <button 
                           onClick={() => setContractFilter('TODOS')}
                           className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${contractFilter === 'TODOS' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                         >
                           Todos
                         </button>
                         <button 
                           onClick={() => setContractFilter('ATIVO')}
                           className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${contractFilter === 'ATIVO' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                         >
                           Ativos
                         </button>
                         <button 
                           onClick={() => setContractFilter('ATRASO')}
                           className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${contractFilter === 'ATRASO' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                         >
                           Em Atraso
                         </button>
                         <button 
                           onClick={() => setContractFilter('DISTRATADO')}
                           className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${contractFilter === 'DISTRATADO' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                         >
                           Distratados
                         </button>
                       </div>
                       <button onClick={() => {
                          let csv = "ID,Cliente,Propriedade,Valor,Corretor,Status\n";
                          data.contracts.forEach((c:any) => { 
                             const client = data.clients.find((cl:any) => cl.id === c.clientId)?.nome || 'N/A';
                             const prop = data.properties.find((p:any) => p.id === c.propertyId)?.nome || 'N/A';
                             csv += `${c.id},"${client}","${prop}",${c.valorFinanciado},"${c.corretorMatricula || ''}","${c.status}"\n`; 
                          });
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement("a");
                          link.href = URL.createObjectURL(blob);
                          link.download = "contratos.csv";
                          link.click();
                       }} className="flex items-center text-gray-600 text-xs font-bold hover:text-blue-600 transition-colors ml-auto">
                         <Download size={14} className="mr-1" /> Exportar CSV
                       </button>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                       <div className="p-4 bg-gray-50 font-bold text-xs uppercase tracking-widest text-gray-500 border-b flex justify-between items-center">
                         <span>Contratos</span>
                         <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px]">{filteredContracts.length} Itens</span>
                       </div>
                       <div className="overflow-y-auto max-h-[800px]">
                          {filteredContracts.map((c: any) => (
                             <div key={c.id} className="p-6 border-b border-gray-100">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-blue-700">{data.clients.find((cl:any) => cl.id === c.clientId)?.nome}</h4>
                                  <p className="text-xs text-gray-500">{data.properties.find((p:any) => p.id === c.propertyId)?.nome}</p>
                                  <div className="mt-2 space-y-1">
                                    <span className="inline-block bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 mr-2">{c.tipoContrato || 'Lote'}</span>
                                    {data.comissoes?.find((com:any) => com.contrato_id === c.id) && (
                                      <span className="inline-block bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-100">Corretor: {data.comissoes.find((com:any) => com.contrato_id === c.id).corretor_matricula}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center space-x-2 justify-end mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.statusFinanceiro === 'Atrasado' ? 'bg-red-100 text-red-700 border-red-200' : c.statusFinanceiro === 'Financiado' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{c.statusFinanceiro || 'Em Pagamento'}</span>
                                    {c.status === 'DISTRATADO' ? (
                                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200">DISTRATADO</span>
                                    ) : getContractStatus(c) === 'ATRASO' ? (
                                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200">EM ATRASO</span>
                                    ) : (
                                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200">ATIVO</span>
                                    )}
                                  </div>
                                  <span className="block text-xs font-bold text-gray-700">{c.tipoAmortizacao}</span>
                                  <span className="block text-[10px] text-gray-400 capitalize">{c.numParcelas} Meses</span>
                                </div>
                             </div>

                             {isOverdueByMonths(c.installments, 3) && c.status !== 'DISTRATADO' && (
                               <div className="mb-4 p-3 bg-red-600 text-white rounded-lg flex items-center space-x-2 animate-pulse">
                                 <AlertCircle size={20} />
                                 <span className="text-xs font-black uppercase tracking-widest">Entrar em contato com urgência!</span>
                               </div>
                             )}

                             {c.status === 'DISTRATADO' && c.distrato && (
                               <div className="mb-4 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Resumo do Distrato</p>
                                  <div className="flex justify-between items-center text-xs">
                                     <span className="text-gray-600">Valor a Devolver:</span>
                                     <span className="font-bold text-red-600">R$ {c.distrato.valorReembolso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs mt-1">
                                     <span className="text-gray-600">Data Cancelamento:</span>
                                     <span className="font-bold">{c.distrato.data}</span>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                     <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Cronograma de Reembolso</p>
                                     <div className="space-y-1">
                                        {c.distrato.cronogramaDevolucao.map((rd: any) => (
                                          <div key={rd.parcela} className="flex justify-between text-[10px]">
                                            <span className="text-gray-500">Parc. {rd.parcela} ({rd.vencimento})</span>
                                            <span className="font-bold text-gray-700">R$ {rd.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                          </div>
                                        ))}
                                     </div>
                                  </div>
                               </div>
                             )}
                             <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-gray-400 mb-2 px-2 uppercase tracking-tighter">
                                    <span>Nº</span>
                                    <span>Vencimento</span>
                                    <span>Valor Tot.</span>
                                    <span>Saldo</span>
                                </div>
                                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {c.installments.map((p: any) => (
                                        <div key={p.numero} className="grid grid-cols-4 gap-2 text-[11px] py-1 px-2 hover:bg-white rounded transition-colors group items-center">
                                            <span className="font-bold text-gray-400">{String(p.numero).padStart(3, '0')}</span>
                                            <span className="text-gray-600">{p.vencimento}</span>
                                            <span className="font-bold text-blue-600">
                                              R$ {(p.valorTotal ?? 0).toLocaleString()}
                                              {p.pago && <CheckCircle2 size={12} className="inline ml-1 text-green-500" />}
                                            </span>
                                            <div className="flex justify-between items-center">
                                              <span className="text-gray-400">R$ {(p.saldoDevedor ?? 0).toLocaleString()}</span>
                                              {!p.pago && (
                                                <button 
                                                  onClick={() => handlePayInstallment(c.id, p.numero)}
                                                  className="opacity-0 group-hover:opacity-100 bg-green-500 text-white p-0.5 rounded-full transition-opacity"
                                                  title="Marcar como Pago"
                                                >
                                                  <Plus size={10} />
                                                </button>
                                              )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                           </div>
                        ))}
                     </div>
                  </div>
                </div>
              </div>
              </motion.div>
            )}

            {view === 'staff' && (
              <motion.div 
                key="staff"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                 <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><UserPlus size={24} className="mr-2 text-blue-600"/> Gestão de Equipe</h2>
                    <form onSubmit={handleCreateStaff} className="space-y-4 mb-10">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">Nome do Funcionário</label>
                            <input 
                                type="text"
                                required
                                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                value={staffForm.nome}
                                onChange={e => setStaffForm({...staffForm, nome: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">E-mail</label>
                                <input 
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={staffForm.email}
                                    onChange={e => setStaffForm({...staffForm, email: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Matrícula</label>
                                <input 
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={staffForm.matricula}
                                    onChange={e => setStaffForm({...staffForm, matricula: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Nível de Acesso</label>
                                <select 
                                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                                    value={staffForm.role}
                                    onChange={e => setStaffForm({...staffForm, role: e.target.value})}
                                >
                                    <option value="ADMINISTRATIVO">Administrativo</option>
                                    <option value="ALMOXARIFADO">Almoxarifado</option>
                                    <option value="FINANCEIRO_ATENDIMENTO">Financeiro / Atendimento</option>
                                    <option value="CORRETOR_ATENDIMENTO">Corretor / Atendimento</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Senha de Acesso</label>
                                <input 
                                    type="password"
                                    required
                                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={staffForm.senha}
                                    onChange={e => setStaffForm({...staffForm, senha: e.target.value})}
                                />
                            </div>
                        </div>
                        <button className="w-full bg-blue-700 text-white font-bold py-3 rounded-md shadow-lg shadow-blue-100 hover:bg-blue-800 transition-all uppercase tracking-widest text-xs">
                            CADASTRAR FUNCIONÁRIO
                        </button>
                    </form>

                    <div className="border-t pt-6">
                        <h3 className="font-bold text-gray-700 text-sm mb-4 uppercase tracking-wider">Funcionários Ativos</h3>
                        <div className="space-y-3">
                            {data.staff.map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center">
                                         <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-100 mr-3">
                                            {s.nome[0]}
                                         </div>
                                         <div>
                                            <p className="text-sm font-bold text-gray-800">{s.nome}</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Matrícula: {s.matricula} • {s.role.replace('_', ' ')}</p>
                                         </div>
                                    </div>
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">FUNCIONÁRIO</span>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {view === 'admin-comissoes' && (
              <motion.div key="admin-comissoes" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <AdminComissoesPanel data={data} onRefresh={loadApplicationData} />
              </motion.div>
            )}

            {view === 'simulador-mcmv' && (
              <motion.div key="simulador-mcmv" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <SimuladorMCMV />
              </motion.div>
            )}

            {view === 'minhas-comissoes' && (
              <motion.div key="minhas-comissoes" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="font-bold text-gray-800 mb-6 flex items-center"><Activity size={18} className="mr-2 text-blue-600"/> Minhas Comissões Ganhas</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {data.comissoes?.filter((com:any) => com.corretor_matricula === user.matricula).map((com: any) => {
                       const contract = data.contracts.find((c:any) => c.id === com.contrato_id);
                       const prop = contract ? data.properties.find((p:any) => p.id === contract.propertyId) : null;
                       return (
                         <div key={com.id} className="p-4 border rounded-lg shadow-sm bg-gray-50 flex justify-between items-center">
                            <div>
                               <h4 className="font-bold text-gray-800">{prop?.nome || 'Imóvel Vínculado'}</h4>
                               <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">ID Contrato: #{contract?.id} • {contract?.tipoContrato}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Valor a Receber</p>
                               <p className="font-black text-xl text-green-600">R$ {(com.valor_personalizado || com.valor_calculado || 0).toLocaleString()}</p>
                            </div>
                         </div>
                       );
                    })}
                    {(!data.comissoes || data.comissoes.filter((com:any) => com.corretor_matricula === user.matricula).length === 0) && (
                      <div className="text-center text-gray-500 py-10 italic text-sm">
                        Você ainda não possui comissões registradas.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'estoque' && (
              <motion.div key="estoque" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <EstoqueAdmin data={data} onRefresh={loadApplicationData} />
              </motion.div>
            )}

            {view === 'admin-settings' && (
              <motion.div
                key="admin-settings"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6 max-w-4xl mx-auto"
              >
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                      <TrendingDown size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Atualização de Juros em Massa</h2>
                      <p className="text-sm text-gray-500">Configure a nova taxa para todos os contratos ativos na Tabela PRICE.</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-8 flex items-start space-x-3">
                    <AlertCircle className="text-amber-600 mt-0.5" size={20} />
                    <div className="text-sm text-amber-800">
                      <p className="font-bold">Aviso Crítico:</p>
                      <p>Esta ação é irreversível e afetará <strong>todos</strong> os contratos ativos que utilizam amortização PRICE. Apenas parcelas pendentes serão recalculadas com base no saldo devedor atual.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Nova Taxa de Juros Global (% AM)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all text-lg font-bold"
                          placeholder="0.00"
                          value={massUpdateTaxa}
                          onChange={e => setMassUpdateTaxa(Number(e.target.value))}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowUpdateModal(true)}
                      className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-blue-100 uppercase tracking-widest text-xs"
                    >
                      Aplicar Atualização Global (PRICE)
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-700 text-xs uppercase tracking-widest">Histórico de Alterações Globais</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 border-b">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Data/Hora</th>
                          <th className="px-6 py-3 font-semibold">Admin</th>
                          <th className="px-6 py-3 font-semibold">Taxa Antiga</th>
                          <th className="px-6 py-3 font-semibold">Nova Taxa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.updateLogs && data.updateLogs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">Nenhum registro encontrado</td>
                          </tr>
                        ) : (
                          [...data.updateLogs].reverse().map((log: any) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">{new Date(log.data).toLocaleString('pt-BR')}</td>
                              <td className="px-6 py-4 font-medium">{log.admin}</td>
                              <td className="px-6 py-4">{log.taxaAntiga}%</td>
                              <td className="px-6 py-4 text-blue-600 font-bold">{log.taxaNova}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}


          </AnimatePresence>

          {/* Double Confirmation Modal */}
          <AnimatePresence>
            {showUpdateModal && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !isUpdating && setShowUpdateModal(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-[151] overflow-hidden"
                >
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Confirmação de Segurança</h3>
                    <p className="text-gray-600 text-sm mb-6">
                      Você está prestes a atualizar a taxa de juros de <strong>todos</strong> os contratos PRICE ativos para <strong>{massUpdateTaxa}% AM</strong>.
                      <br /><br />
                      Tem certeza que deseja prosseguir com esta operação em massa?
                    </p>
                    
                    <div className="space-y-3">
                      <button 
                        onClick={handleMassUpdate}
                        disabled={isUpdating}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
                      >
                        {isUpdating ? 'PROCESSANDO...' : 'SIM, APLICAR AGORA'}
                      </button>
                      <button 
                        onClick={() => setShowUpdateModal(false)}
                        disabled={isUpdating}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-lg transition-all"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Distrato Modal */}
          <AnimatePresence>
            {showDistratoModal && distratoContract && distratoSummary && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
                  onClick={() => !isProcessingDistrato && setShowDistratoModal(false)}
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-[201] overflow-hidden"
                >
                  <div className="bg-red-600 p-6 text-white text-center">
                    <AlertCircle size={48} className="mx-auto mb-2" />
                    <h2 className="text-xl font-bold uppercase">Distrato de Financiamento</h2>
                    <p className="text-xs opacity-80 uppercase tracking-widest">Procedimento Irreversível</p>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Já Pago pelo Cliente</p>
                      <p className="text-2xl font-black text-gray-800">R$ {distratoSummary.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-tighter">Selecione a Opção de Devolução:</p>
                      
                      <button 
                        onClick={() => setDistratoOption('80')}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${distratoOption === '80' ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-white'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-black text-sm uppercase">Opção 1: 80% Parcelado</span>
                          {distratoOption === '80' && <CheckCircle2 size={16} className="text-blue-600" />}
                        </div>
                        <p className="text-xs text-gray-500">Valor total a devolver: <span className="font-bold text-gray-700">R$ {distratoSummary.option80.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                        
                        {distratoOption === '80' && (
                          <div className="mt-3 pt-3 border-t border-blue-100">
                            <label className="text-[10px] font-black text-blue-600 uppercase mb-1 block">Número de Parcelas da Devolução:</label>
                            <input 
                              type="number"
                              className="w-full bg-white border border-blue-200 rounded px-3 py-1 text-sm font-bold text-blue-800 outline-none focus:ring-1 ring-blue-400"
                              value={distratoInstallments}
                              onChange={e => setDistratoInstallments(Number(e.target.value))}
                              min="1" max="60"
                            />
                          </div>
                        )}
                      </button>

                      <button 
                        onClick={() => setDistratoOption('50')}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${distratoOption === '50' ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-white'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-black text-sm uppercase">Opção 2: 50% à Vista</span>
                          {distratoOption === '50' && <CheckCircle2 size={16} className="text-blue-600" />}
                        </div>
                        <p className="text-xs text-gray-500">Valor total a devolver: <span className="font-bold text-gray-700">R$ {distratoSummary.option50.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                      </button>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg flex items-start space-x-3 text-red-800">
                      <AlertCircle size={20} className="flex-shrink-0" />
                      <p className="text-[10px] font-medium leading-tight">Ao confirmar, o contrato será cancelado e o cronograma de devolução será gerado automaticamente. Esta ação é definitiva.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t flex space-x-3">
                    <button 
                      onClick={() => setShowDistratoModal(false)}
                      disabled={isProcessingDistrato}
                      className="flex-1 py-3 bg-white border rounded-xl font-bold text-gray-500 text-xs uppercase tracking-widest hover:bg-gray-100 disabled:opacity-50"
                    >
                      CANCELAR
                    </button>
                    <button 
                      disabled={isProcessingDistrato}
                      onClick={async () => {
                        setIsProcessingDistrato(true);
                        const res = await fetch(`/api/contracts/${distratoContract.id}/cancel`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            option: distratoOption, 
                            numInstallments: distratoInstallments 
                          })
                        });
                        if (res.ok) {
                          toast.success('Distrato efetuado com sucesso!');
                          setShowDistratoModal(false);
                          loadApplicationData();
                          setSelectedClient(null);
                        } else {
                          toast.error('Erro ao processar distrato.');
                        }
                        setIsProcessingDistrato(false);
                      }}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-100 disabled:opacity-50"
                    >
                      {isProcessingDistrato ? 'PROCESSANDO...' : 'CONFIRMAR DISTRATO'}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Property Modal */}
          <AnimatePresence>
            {showPropertyModal && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
                  onClick={() => setShowPropertyModal(false)}
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-[201] overflow-hidden"
                >
                  <div className="bg-blue-600 p-6 text-white">
                    <h2 className="text-xl font-bold uppercase tracking-tight">{propertyForm.id ? `Editar Imóvel #${propertyForm.id}` : 'Novo Imóvel'}</h2>
                    <p className="text-xs opacity-80 uppercase tracking-widest">{propertyForm.id ? 'Atualização de Ativo Imobiliário' : 'Cadastro de Ativo Imobiliário'}</p>
                  </div>

                  <form className="p-6 space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as any;
                    const formData = new FormData();
                    formData.append('nome', propertyForm.nome);
                    formData.append('valor', String(propertyForm.valor));
                    formData.append('localizacao', propertyForm.localizacao);
                    formData.append('descricao', propertyForm.descricao);
                          
                    if (form.images.files && form.images.files.length > 0) {
                      for (let i = 0; i < form.images.files.length; i++) {
                        formData.append('images', form.images.files[i]);
                      }
                    }
                          
                    const url = propertyForm.id ? `/api/properties/${propertyForm.id}` : '/api/properties';
                    const method = propertyForm.id ? 'PUT' : 'POST';
                    const res = await fetch(url, {
                      method,
                      body: formData
                    });
                    if (res.ok) {
                      toast.success(propertyForm.id ? 'Imóvel atualizado com sucesso!' : 'Imóvel cadastrado com sucesso!');
                      setShowPropertyModal(false);
                      setPropertyForm({ id: null, nome: '', valor: 0, localizacao: '', descricao: '' });
                      loadApplicationData();
                    } else {
                      const err = await res.json();
                      toast.error(`Erro: ${err.error || 'Erro ao processar'}`);
                    }
                  }}>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Nome/Identificação do Imóvel</label>
                      <input 
                        required
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                        placeholder="Ex: Edifício Central - Apto 101"
                        value={propertyForm.nome}
                        onChange={e => setPropertyForm({...propertyForm, nome: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Valor Sugerido para Venda</label>
                      <input 
                        type="number"
                        required
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500 text-lg font-bold"
                        placeholder="0,00"
                        value={propertyForm.valor}
                        onChange={e => setPropertyForm({...propertyForm, valor: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Localização</label>
                      <input 
                        required
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                        placeholder="Ex: Boa Viagem, Recife - PE"
                        value={propertyForm.localizacao}
                        onChange={e => setPropertyForm({...propertyForm, localizacao: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Descrição Detalhada</label>
                      <textarea 
                        required
                        rows={3}
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500 text-sm"
                        placeholder="Descreva as características do imóvel..."
                        value={propertyForm.descricao}
                        onChange={e => setPropertyForm({...propertyForm, descricao: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Fotos do Imóvel</label>
                      <input type="file" name="images" multiple accept="image/*" className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50" />
                    </div>

                    <div className="flex space-x-3 mt-6">
                      <button 
                        type="button"
                        onClick={() => setShowPropertyModal(false)}
                        className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl text-xs uppercase"
                      >
                        CANCELAR
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-xs uppercase shadow-lg shadow-blue-100"
                      >
                        {propertyForm.id ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Client Details Modal */}
          <AnimatePresence>
            {selectedClient && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedClient(null)}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white rounded-xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]"
                >
                  <div className="bg-[#1d2d3d] p-6 text-white flex justify-between items-center">
                    <div>
                      {isEditingClient ? (
                        <h2 className="text-xl font-bold uppercase tracking-tight text-blue-300">Editando Cadastro</h2>
                      ) : (
                        <>
                          <h2 className="text-xl font-bold uppercase tracking-tight">{selectedClient.nome}</h2>
                          <p className="text-xs text-blue-300 font-bold">Matrícula: {selectedClient.matricula} • {selectedClient.telefone}{selectedClient.email ? ` • ${selectedClient.email}` : ''}</p>
                        </>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedClient(null);
                        setIsEditingClient(false);
                      }}
                      className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors font-bold text-sm"
                    >
                      X
                    </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-6">
                    {isEditingClient ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Nome Completo</label>
                          <input 
                            className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            value={clientEditForm.nome}
                            onChange={e => setClientEditForm({...clientEditForm, nome: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">E-mail</label>
                          <input 
                            type="email"
                            className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            value={clientEditForm.email}
                            onChange={e => setClientEditForm({...clientEditForm, email: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Telefone</label>
                          <input 
                            className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            value={clientEditForm.telefone}
                            onChange={e => setClientEditForm({...clientEditForm, telefone: e.target.value})}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 border-b pb-2">Contratos e Imóveis</h3>
                        {data.contracts.filter((c: any) => c.clientId === selectedClient.id).length === 0 ? (
                          <p className="text-sm text-gray-400 italic py-4">Este cliente não possui contratos ativos.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {data.contracts.filter((c: any) => c.clientId === selectedClient.id).map((c: any) => {
                              const property = data.properties.find((p: any) => p.id === c.propertyId);
                              const paidInstallments = c.installments?.filter((i: any) => i.pago).length || 0;
                              const totalInstallments = c.numParcelas || c.installments?.length || 1;
                              const progressPercent = Math.round((paidInstallments / totalInstallments) * 100);
                              
                              return (
                                <div key={c.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-blue-800">{property?.nome || 'Imóvel não encontrado'}</h4>
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200">ATIVO</span>
                                  </div>
                                  <div className="space-y-1 text-xs">
                                    <p className="flex justify-between">
                                      <span className="text-gray-500">Valor Financiado:</span>
                                      <span className="font-mono font-bold">R$ {(c.valorFinanciado || 0).toLocaleString()}</span>
                                    </p>
                                    <p className="flex justify-between">
                                      <span className="text-gray-500">Amortização:</span>
                                      <span className="font-bold">{c.tipoAmortizacao}</span>
                                    </p>
                                    <p className="flex justify-between">
                                      <span className="text-gray-500">Prazo:</span>
                                      <span className="font-bold">{c.numParcelas} meses</span>
                                    </p>
                                  </div>
                                  
                                  <div className="mt-4 pt-3 border-t border-gray-200">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Status Financeiro</p>
                                    <div className="flex items-center space-x-2">
                                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progressPercent}%` }} />
                                      </div>
                                      <span className="text-[10px] font-bold text-gray-600">{progressPercent}% PAGO</span>
                                    </div>
                                  </div>

                                  {c.status !== 'DISTRATADO' && (
                                    <button 
                                      onClick={async () => {
                                        const res = await fetch(`/api/contracts/${c.id}/cancellation-summary`);
                                        if (res.ok) {
                                          const summary = await res.json();
                                          setDistratoSummary(summary);
                                          setDistratoContract(c);
                                          setShowDistratoModal(true);
                                        }
                                      }}
                                      className="mt-4 w-full py-2 bg-red-50 text-red-600 border border-red-100 rounded text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                    >
                                      EFETUAR DISTRATO
                                    </button>
                                  )}

                                  {c.status === 'DISTRATADO' && (
                                    <div className="mt-4 p-2 bg-gray-100 rounded text-center">
                                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">CONTRATO DISTRATADO</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-gray-50 border-t flex justify-end space-x-3">
                    <button 
                      onClick={() => {
                        if (isEditingClient) {
                          setIsEditingClient(false);
                        } else {
                          setSelectedClient(null);
                        }
                      }}
                      className="px-4 py-2 border rounded-md text-sm font-bold text-gray-600 hover:bg-white transition-colors uppercase tracking-widest text-[10px]"
                    >
                      {isEditingClient ? 'Cancelar' : 'Fechar'}
                    </button>
                    {isEditingClient ? (
                      <button 
                        onClick={async () => {
                          const res = await fetch(`/api/clients/${selectedClient.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(clientEditForm)
                          });
                          if (res.ok) {
                            toast.success('Cadastro atualizado com sucesso!');
                            setIsEditingClient(false);
                            loadApplicationData();
                            setSelectedClient(null);
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-bold hover:bg-green-700 transition-colors shadow-md uppercase tracking-widest text-[10px]"
                      >
                        SALVAR ALTERAÇÕES
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setClientEditForm({ nome: selectedClient.nome, telefone: selectedClient.telefone, email: selectedClient.email || '' });
                          setIsEditingClient(true);
                        }}
                        className="px-4 py-2 bg-blue-700 text-white rounded-md text-sm font-bold hover:bg-blue-800 transition-colors shadow-md shadow-blue-100 uppercase tracking-widest text-[10px]"
                      >
                        EDITAR CADASTRO
                      </button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
