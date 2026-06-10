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
  ThumbsUp,
  MessageCircle,
  Facebook,
  Instagram,
  Trash2,
  UserCheck,
  Eye,
  EyeOff,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import DashboardCliente from './components/DashboardCliente';
import EstoqueAdmin from './components/EstoqueAdmin';
import AlmoxarifadoView from './components/AlmoxarifadoView';
import AdminComissoesPanel from './components/AdminComissoesPanel';
import SimuladorMCMV from './components/SimuladorMCMV';
import ImoveisInteressados from './components/ImoveisInteressados';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import TermsOfUseModal from './components/TermsOfUseModal';
import AtendimentoPlatform from './components/atendimento/AtendimentoPlatform';

import ControleClientes from './components/ControleClientes';

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
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [images, currentIndex]);

  let imageList: string[] = [];
  if (images) {
    if (Array.isArray(images)) {
      imageList = images;
    } else if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        if (Array.isArray(parsed)) {
          imageList = parsed;
        } else if (parsed) {
          imageList = [parsed];
        }
      } catch (e) {
        const str = (images as string).trim();
        if (str.startsWith('{') && str.endsWith('}')) {
          imageList = str.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
        } else if (str) {
          imageList = [str];
        }
      }
    }
  }
  
  imageList = imageList.map(img => {
      if (img && !img.includes('/') && !img.startsWith('http')) {
          return `/assets/imoveis/${img}`;
      }
      return img;
  });

  if (imageList.length === 0 || hasError) {
    return (
      <div className="w-full h-48 bg-gray-50 flex flex-col items-center justify-center text-gray-400 rounded-t-lg border-b border-gray-100 relative overflow-hidden">
        <img src="/banner.png" alt="Sem imagens" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur-[1px]">Sem Imagens</span>
        </div>
      </div>
    );
  }

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % imageList.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  return (
    <div className="relative w-full h-48 bg-slate-100/50 overflow-hidden rounded-t-lg group flex items-center justify-center border-b border-gray-100">
      <img 
        src={imageList[currentIndex]} 
        id="property-gallery-app-image"
        alt="imóvel" 
        onError={() => setHasError(true)}
        className={`max-w-full max-h-full object-contain transition-transform duration-500 ${status !== 'DISPONÍVEL' ? 'grayscale opacity-80' : ''}`} 
      />
      
      {imageList.length > 1 && (
        <>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 pointer-events-none" />
          <button 
            type="button"
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-black/80 hover:scale-110 transition-all z-10 focus:outline-none shadow-md"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            type="button"
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-black/80 hover:scale-110 transition-all z-10 focus:outline-none shadow-md"
          >
            <ChevronRight size={16} />
          </button>
          
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10 pointer-events-none bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {imageList.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-white scale-125' : 'bg-white/40'}`} 
              />
            ))}
          </div>
          
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded-full pointer-events-none shadow-sm backdrop-blur-sm">
            {currentIndex + 1} / {imageList.length}
          </div>
        </>
      )}
    </div>
  );
};

import PublicProperties from './components/PublicProperties';
import BlogPublicList from './components/BlogPublicList';
import BlogPublicPost from './components/BlogPublicPost';
import AdminBlogPanel from './components/AdminBlogPanel';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  useEffect(() => {
     const onLocationChange = () => setCurrentPath(window.location.pathname);
     window.addEventListener('popstate', onLocationChange);
     return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [view, setView] = useState('dashboard');
  const [data, setData] = useState<any>({ clients: [], properties: [], contracts: [], staff: [], updateLogs: [] });
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
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
  const [showPwdLogin, setShowPwdLogin] = useState(false);
  const [showPwdRegister, setShowPwdRegister] = useState(false);
  const [showPwdRecovery, setShowPwdRecovery] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [agreedLGPD, setAgreedLGPD] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
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
  
  // Login Form State
  const [loginForm, setLoginForm] = useState({ matricula: '', senha: '' });
  const [loginError, setLoginError] = useState('');

  // Property Form State
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [propertyForm, setPropertyForm] = useState({ id: null as number | null, nome: '', valor: 0, localizacao: '', descricao: '', images: [] as string[], tipo: 'Lote', status: 'DISPONÍVEL', detalhes: { quartos: 0, salas: 0, banheiros: 0, area: '', mobiliado: false, corretor_matricula: '' } });
  const [selectedImageStr, setSelectedImageStr] = useState<string>('');
  
  useEffect(() => {
    if (showPropertyModal) {
      fetch('/api/imagens-disponiveis')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.json();
        })
        .then(data => setAvailableImages(data || []))
        .catch(err => {
          console.error("Error fetching available images:", err);
          setAvailableImages([]);
        });
        
      if (propertyForm.images && propertyForm.images.length > 0) {
        setSelectedImageStr(propertyForm.images[0]);
      } else {
        setSelectedImageStr('');
      }
    }
  }, [showPropertyModal, propertyForm.images]);
  const [isConfirmingDeleteProperty, setIsConfirmingDeleteProperty] = useState(false);

  // Contract Filter State
  const [contractFilter, setContractFilter] = useState<'TODOS' | 'ATIVO' | 'ATRASO' | 'DISTRATADO'>('TODOS');
  const [contractSearchText, setContractSearchText] = useState('');
  const [confirmingCancelId, setConfirmingCancelId] = useState<number | null>(null);
  const [showDistratoModal, setShowDistratoModal] = useState(false);
  const [distratoContract, setDistratoContract] = useState<any>(null);
  const [distratoSummary, setDistratoSummary] = useState<any>(null);

  // Property Filter State
  const [propertyFilterStatus, setPropertyFilterStatus] = useState('TODOS');
  const [propertySearchText, setPropertySearchText] = useState('');

  // Contract Form State
  const [contractForm, setContractForm] = useState({
    clientId: '',
    propertyId: '',
    valorImovel: 0,
    corretorMatricula: '',
    tipoContrato: 'Lote',
  });

  const [staffForm, setStaffForm] = useState({ nome: '', email: '', matricula: '', senha: '', role: 'CORRETOR_ATENDIMENTO' });

  const loadApplicationData = async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        console.error('Error in /api/data:', json.error);
        toast.error('Erro ao carregar dados do servidor.');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Problema de conexão com o servidor.');
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
      formData.append('valorImovel', String(contractForm.valorImovel));
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
          corretorMatricula: '',
          tipoContrato: 'Lote'
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

  if (currentPath === '/blog') {
     return <BlogPublicList />;
  }
  
  if (currentPath.startsWith('/blog/')) {
     const slug = currentPath.replace('/blog/', '');
     return <BlogPublicPost slug={slug} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
        <main className="flex-1">
          {/* HERO & LOGIN SECTION */}
          <section className="relative min-h-screen md:min-h-[85vh] flex flex-col items-center justify-center p-4 text-white">
            <img 
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1920&h=1080" 
              alt="Frente da Imobiliária São Severino" 
              className="absolute inset-0 z-0 w-full h-full object-cover pointer-events-none select-none"
              referrerPolicy="no-referrer"
            />
            
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
                    <img src="/logo-ss-imoveis.webp" alt="Imobiliária São Severino" className="rounded-full" />
                </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">IMOBILIÁRIA SÃO SEVERINO</h1>
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
                  if (isVerifyingEmail) {
                     handleRegister(e);
                  } else {
                     if (!agreedLGPD) {
                        e.preventDefault();
                        setLoginError('Você deve concordar com a Política de Privacidade e os Termos de Uso em conformidade com a LGPD.');
                        toast.error('Por favor, aceite os Termos de Uso e Política de Privacidade para cadastrar.');
                        return;
                     }
                     handleRequestCode(e);
                  }
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
                       <div className="relative">
                         <input 
                           type={showPwdRecovery ? "text" : "password"} required
                           className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md outline-none text-sm"
                           value={recoveryData.newPassword} onChange={e => setRecoveryData({...recoveryData, newPassword: e.target.value})}
                         />
                         <button
                           type="button"
                           onClick={() => setShowPwdRecovery(!showPwdRecovery)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 transition-colors focus:outline-none"
                         >
                           {showPwdRecovery ? <EyeOff size={18} /> : <Eye size={18} />}
                         </button>
                       </div>
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
                  <div className="relative">
                    <input 
                      type={showPwdLogin ? "text" : "password"} 
                      required
                      className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="••••••••"
                      value={loginForm.senha}
                      onChange={e => setLoginForm({...loginForm, senha: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwdLogin(!showPwdLogin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    >
                      {showPwdLogin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
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
                  <div className="relative">
                    <input 
                      type={showPwdRegister ? "text" : "password"} required
                      className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                      value={registerForm.senha} onChange={e => setRegisterForm({...registerForm, senha: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwdRegister(!showPwdRegister)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    >
                      {showPwdRegister ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="lgpd-checkbox" 
                    required 
                    checked={agreedLGPD}
                    onChange={e => setAgreedLGPD(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="lgpd-checkbox" className="text-xs text-gray-600 leading-snug cursor-pointer select-none">
                    Eu li e concordo com a <button type="button" onClick={() => setShowPrivacyModal(true)} className="font-semibold hover:underline" style={{ color: '#ff6900' }}>Política de privacidade</button> e os <button type="button" onClick={() => setShowTermsModal(true)} className="font-semibold hover:underline" style={{ color: '#ff6900' }}>Termos de uso</button> em conformidade com a LGPD (Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/2018).
                  </label>
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
                    {isRegistering ? 'Já tem uma conta? Fazer Login' : 'Não tem uma conta? Cadastre-se aqui'}
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
              <ArrowDown className="w-6 h-6 text-blue-200" />
            </div>
          </section>

          {/* SEÇÃO INTRODUTÓRIA DO BLOG */}
          <section className="py-16 px-6 bg-slate-50 border-b border-gray-200">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-2xl text-left">
                <span className="inline-block px-3 py-1 rounded-full bg-[#4c79f5] text-white text-xs font-black uppercase tracking-widest">
                  Notícias & Novidades
                </span>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#1d2d3d] uppercase">
                  Acompanhe nosso Blog
                </h2>
                <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                  Fique por dentro das últimas tendências do mercado imobiliário, dicas essenciais para compra e venda de imóveis, e todas as novidades da Imobiliária São Severino para ajudar você no seu próximo passo.
                </p>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto flex justify-start md:justify-end">
                <button 
                  onClick={() => window.location.href = '/blog'} 
                  className="w-full md:w-auto flex items-center justify-center gap-3 bg-[#1447e6] hover:bg-[#0f3bb2] text-white px-8 py-3.5 rounded-full font-black transition-all shadow-md hover:scale-105 text-sm tracking-wider uppercase"
                >
                  <FileText size={20} /> Acessar o Blog
                </button>
              </div>
            </div>
          </section>

          <PublicProperties />

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
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#2a3c5a] mb-4">PORQUE ESCOLHER A IMOBILIÁRIA SÃO SEVERINO?</h2>
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
          <footer className="w-full mt-20 relative">
            <div className="w-full overflow-hidden leading-none block relative z-10 -mb-[1px]">
               <svg className="relative block w-full h-[60px] md:h-[100px] lg:h-[150px]" preserveAspectRatio="none" viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg">
                  <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0c5.38,1.44,11.23,3.31,17.2,5.29C104.22,34.2,216.5,70.62,321.39,56.44Z" className="fill-[#1d2d3d]"></path>
               </svg>
            </div>
            <div className="bg-[#1d2d3d] pt-8 md:pt-12 pb-6 px-6 lg:px-20 text-white relative z-20">
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 font-sans px-4">
                {/* Column 1 */}
                <div className="flex flex-col gap-4">
                  <p className="font-bold text-lg max-w-[280px] leading-snug">Mais de 17 anos de experiência no mercado imobiliário do RN.</p>
                  <div className="flex gap-3 mt-4">
                    <a href="https://www.facebook.com/ssimoveisnc" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded bg-[#678ded] flex items-center justify-center hover:bg-[#5b80f1] transition-colors shadow-sm">
                      <Facebook size={20} className="text-white fill-current" />
                    </a>
                    <a href="https://www.instagram.com/imobiliariasaoseverino" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded bg-[#e84f9b] flex items-center justify-center hover:bg-[#d6418b] transition-colors shadow-sm">
                      <Instagram size={20} className="text-white" />
                    </a>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-3">
                  <h4 className="font-bold text-[17px] mb-3">Informações</h4>
                  <p className="text-[14px] font-semibold leading-relaxed text-blue-50">Avenida Assis Chateaubriand 872, São Sebastião, Nova Cruz - RN, 59215-000</p>
                  <p className="text-[14px] font-semibold text-blue-50 mt-1">CNPJ: 10.970.117/0001-51</p>
                  <p className="text-[14px] font-semibold text-blue-50 mt-1">imobiliariasaoseverino@hotmail.com</p>
                  <p className="text-[14px] font-semibold text-blue-50 mt-1">84 99451.1030</p>
                </div>

                {/* Column 3 */}
                <div className="flex flex-col gap-3">
                  <h4 className="font-bold text-[17px] mb-3">Novidades</h4>
                  <p className="text-[14px] font-semibold mb-2 text-blue-50">Receba nossas novidades por email.</p>
                  <div className="flex w-full max-w-sm mt-1">
                    <input type="email" placeholder="Digite seu Email" className="bg-[#fc7c52] text-white placeholder-white/80 px-4 py-2.5 flex-1 text-sm rounded-l-md border-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <button className="bg-[#fc7c52] hover:bg-[#e86a42] px-4 py-2.5 rounded-r-md transition-colors flex items-center justify-center">
                      <ChevronRight size={20} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Copyright */}
              <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-[#1d2d3d] text-center text-[11px] font-medium opacity-80 pb-2 px-4">
                2026 Imobiliária São Severino Brasil - Criação S-AlvesDev. Todos os direitos reservados.
              </div>
            </div>
          </footer>

          {/* Botão de Suporte FAB no Login */}
          <a
            href="https://wa.me/5584994511030"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 transition-all z-[999] active:scale-95 flex items-center justify-center"
            style={{ boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)' }}
            title="Falar com Especialista"
          >
            <MessageCircle size={28} />
          </a>

          {/* Privacy Policy and Terms of Use Modals under LGPD */}
          <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
          <TermsOfUseModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
        </main>
      </div>
    );
  }

  const handleNavClick = (v: string) => {
    setView(v);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const Sidebar = () => (
    <aside className={`bg-[#1d2d3d] text-gray-300 w-64 md:w-64 fixed h-full flex flex-col overflow-y-auto transition-transform duration-300 z-50 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="p-6 border-b border-gray-700 flex flex-col items-center shrink-0">
        <div className="w-16 h-16 bg-white rounded-full mb-3 flex items-center justify-center overflow-hidden border-2 border-blue-400">
           <img src="/logo-ss-imoveis.webp" alt="Imobiliária São Severino" />
        </div>
        <h2 className="text-white font-bold tracking-wider">IMOBILIÁRIA SÃO SEVERINO</h2>
        <span className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mt-1">Gestão Inteligente</span>
      </div>
      
      <nav className="mt-4 px-2 space-y-1 mb-8">
        <button onClick={() => handleNavClick('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'dashboard' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
          <span className="mr-3">{ICONS.dashboard}</span>
          <span className="text-sm font-medium">Dashboard</span>
        </button>
        
        {user.role !== 'CLIENTE' && (
          <>
            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR' || user.role === 'CORRETOR_ATENDIMENTO') && (
              <button onClick={() => handleNavClick('clients')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'clients' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                <span className="mr-3">{ICONS.clients}</span>
                <span className="text-sm font-medium">Clientes</span>
              </button>
            )}
            
            <button onClick={() => handleNavClick('properties')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'properties' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
              <span className="mr-3">{ICONS.properties}</span>
              <span className="text-sm font-medium">Imóveis</span>
            </button>
            
            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR' || user.role === 'FINANCEIRO_ATENDIMENTO' || user.role === 'CORRETOR_ATENDIMENTO') && (
              <button onClick={() => handleNavClick('contracts')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'contracts' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                <span className="mr-3">{ICONS.contracts}</span>
                <span className="text-sm font-medium">Vendas / Contratos</span>
              </button>
            )}

            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR' || user.role === 'CORRETOR_ATENDIMENTO') && (
              <button onClick={() => handleNavClick('imoveis-interessados')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'imoveis-interessados' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                <span className="mr-3"><UserCheck size={20} /></span>
                <span className="text-sm font-medium">Imóveis Interessados</span>
              </button>
            )}

            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR') && (
              <>
                <button onClick={() => handleNavClick('estoque')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'estoque' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                  <span className="mr-3"><PackageSearch size={20} /></span>
                  <span className="text-sm font-medium">Controle de Estoque</span>
                </button>
                <button onClick={() => handleNavClick('controle-clientes')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'controle-clientes' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                  <span className="mr-3"><MapPin size={20} /></span>
                  <span className="text-sm font-medium">Controle da Supervisão</span>
                </button>
              </>
            )}

            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR' || user.role === 'CORRETOR_ATENDIMENTO') && (
               <button onClick={() => handleNavClick('atendimento')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'atendimento' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                  <span className="mr-3"><MessageSquare size={20} /></span>
                  <span className="text-sm font-medium">Central de Atendimento</span>
               </button>
            )}

            {user.role === 'CORRETOR_ATENDIMENTO' && (
               <button onClick={() => handleNavClick('minhas-comissoes')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'minhas-comissoes' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                  <span className="mr-3"><Activity size={20} /></span>
                  <span className="text-sm font-medium">Minhas Comissões</span>
               </button>
            )}

            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR' || user.role === 'CORRETOR_ATENDIMENTO') && (
               <button onClick={() => handleNavClick('simulador-mcmv')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'simulador-mcmv' ? 'bg-orange-500 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                  <span className="mr-3"><Calculator size={20} /></span>
                  <span className="text-sm font-medium">Simulador MCMV</span>
               </button>
            )}

            {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR' || user.role === 'FINANCEIRO_ATENDIMENTO') && (
               <button onClick={() => handleNavClick('admin-comissoes')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'admin-comissoes' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
                  <span className="mr-3"><Activity size={20} /></span>
                  <span className="text-sm font-medium">Painel de Comissões</span>
               </button>
            )}
          </>
        )}
        
        {(user.role === 'ADMINISTRATIVO' || user.role === 'ADMINISTRADOR') && (
          <>
            <button onClick={() => handleNavClick('staff')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'staff' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
              <span className="mr-3">{ICONS.staff}</span>
              <span className="text-sm font-medium">Gestão de Equipe</span>
            </button>
            <button onClick={() => handleNavClick('blog')} className={`w-full flex items-center px-4 py-3 rounded-md transition-all ${view === 'blog' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-800'}`}>
              <span className="mr-3"><FileText size={20} /></span>
              <span className="text-sm font-medium">Blog</span>
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

  const getContractStatus = (contract: any) => {
    return contract.status || 'ATIVO';
  };

  const filteredContracts = data.contracts.filter((c: any) => {
    let statusMatch = true;
    if (contractFilter === 'DISTRATADO') statusMatch = c.status === 'DISTRATADO';
    else if (contractFilter === 'ATIVO') statusMatch = (c.status !== 'DISTRATADO');
    
    if (!statusMatch) return false;

    if (contractSearchText.trim() !== '') {
      const searchLower = contractSearchText.toLowerCase();
      const client = data.clients.find((cl: any) => cl.id === c.clientId);
      const property = data.properties.find((p: any) => p.id === c.propertyId);
      
      const clientName = client ? client.nome.toLowerCase() : '';
      const propertyName = property ? property.nome.toLowerCase() : '';
      
      return clientName.includes(searchLower) || propertyName.includes(searchLower);
    }

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
        vendedores={data.staff}
        user={user}
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
               <img src="/logo-ss-imoveis.webp" alt="Imobiliária São Severino" className="h-8 object-contain" />
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
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
         <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar />
      
      <main className="flex-1 transition-all duration-300 ml-0 md:ml-64">
        {/* Topbar */}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden text-gray-500">
            {ICONS.menu}
          </button>
          <div className="flex items-center space-x-2">
             <div className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:block">Imobiliária São Severino</div>
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
            {view === 'blog' && (
              <motion.div key="blog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AdminBlogPanel />
              </motion.div>
            )}
            
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatCard title="Contratos Ativos" value={data.contracts.filter((c:any) => c.status === 'ATIVO').length} color="#2563eb" icon={<FileText />} />
                  <StatCard title="Contratos Distratados" value={data.contracts.filter((c:any) => c.status === 'DISTRATADO').length} color="#64748b" icon={<TrendingDown />} />
                  <StatCard title="Total de Clientes" value={data.clients.length} color="#10b981" icon={<Users />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                     <h3 className="font-bold text-gray-800 text-sm uppercase tracking-tight mb-4">Status dos Contratos</h3>
                     <div className="h-64" style={{ minWidth: 0, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height={240}>
                           <BarChart data={[
                              { name: 'Ativos', total: data.contracts.filter((c:any) => c.status === 'ATIVO').length, fill: '#10b981' },
                              { name: 'Distratados', total: data.contracts.filter((c:any) => c.status === 'DISTRATADO').length, fill: '#64748b' },
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
                        <ResponsiveContainer width="100%" height={210}>
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
                          <th className="px-6 py-3 font-semibold">Data da Atividade</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.contracts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">Nenhum contrato registrado recentemente</td>
                          </tr>
                        ) : data.contracts.map((c: any) => {
                          const status = c.status || 'ATIVO';
                          return (
                            <tr key={c.id} className="hover:bg-blue-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-800">{data.clients.find((cl:any) => cl.id === c.clientId)?.nome}</td>
                              <td className="px-6 py-4 text-gray-600">{data.properties.find((p:any) => p.id === c.propertyId)?.nome}</td>
                              <td className="px-6 py-4 font-mono text-blue-600 font-bold text-xs">
                                {c.dataContrato ? new Date(c.dataContrato).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Não informada'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {status === 'DISTRATADO' ? (
                                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-200">DISTRATADO</span>
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
                    {/* Search block for name or email */}
                    <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                          type="text"
                          placeholder="Pesquisar por nome ou e-mail..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none text-gray-800"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap bg-gray-200/50 px-2 py-0.5 rounded">
                        {(data.clients || []).filter((cl: any) => {
                          const q = clientSearchQuery.toLowerCase();
                          return (cl.nome || '').toLowerCase().includes(q) || (cl.email || '').toLowerCase().includes(q);
                        }).length} de {(data.clients || []).length}
                      </span>
                    </div>

                    <div className="overflow-y-auto max-h-[400px]">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-gray-100 font-bold border-b text-gray-500 z-10">
                                <tr>
                                    <th className="px-4 py-2 text-xs">ID</th>
                                    <th className="px-4 py-2 text-xs">Nome / E-mail</th>
                                    <th className="px-4 py-2 text-right text-xs">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(data.clients || [])
                                  .filter((cl: any) => {
                                    const q = clientSearchQuery.toLowerCase();
                                    return (cl.nome || '').toLowerCase().includes(q) || (cl.email || '').toLowerCase().includes(q);
                                  })
                                  .map((cl: any) => (
                                    <tr key={cl.id} className="hover:bg-blue-50/40 transition-colors">
                                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{cl.id}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-800 text-xs">{cl.nome}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">{cl.email || 'Sem e-mail'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5">
                                              <button 
                                                onClick={() => setSelectedClient(cl)}
                                                className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-all"
                                              >
                                                DETALHAR
                                              </button>
                                              <button 
                                                onClick={() => {
                                                   setContractForm(prev => ({...prev, clientId: String(cl.id)}));
                                                   setView('contracts');
                                                }}
                                                className="text-green-600 bg-green-50 px-2 py-1 rounded text-[10px] font-bold border border-green-100 hover:bg-green-100 transition-all"
                                              >
                                                VINCULAR IMÓVEL
                                              </button>
                                              {/* Show DELETE action ONLY if user is administrativel role */}
                                              {(user?.role === 'ADMINISTRATIVO' || user?.role === 'ADMINISTRADOR') && (
                                                <button 
                                                  onClick={async () => {
                                                    if (window.confirm(`Tem certeza que deseja remover o cliente "${cl.nome}" do sistema de forma permanente? Esta ação removerá também todos os seus registros vinculados.`)) {
                                                      try {
                                                        const res = await fetch(`/api/clients/${cl.id}`, { method: 'DELETE' });
                                                        if (res.ok) {
                                                          toast.success('Cliente removido com sucesso!');
                                                          loadApplicationData();
                                                        } else {
                                                          const errBody = await res.json();
                                                          toast.error('Erro ao remover: ' + (errBody.error || errBody.details || 'Erro desconhecido'));
                                                        }
                                                      } catch (e) {
                                                        toast.error('Erro de conexão com o servidor.');
                                                      }
                                                    }
                                                  }}
                                                  className="text-red-650 bg-red-50 px-2 py-1 rounded text-[10px] font-bold border border-red-100 hover:bg-red-100 transition-all"
                                                  title="Excluir Cliente"
                                                >
                                                  APAGAR
                                                </button>
                                              )}
                                            </div>
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
                      <option value="OCULTO">Ocultos</option>
                    </select>
                    <button onClick={() => {
                      setPropertyForm({ id: null, nome: '', valor: 0, localizacao: '', descricao: '', images: [], tipo: 'Lote', status: 'DISPONÍVEL', detalhes: { quartos: 0, salas: 0, banheiros: 0, area: '', mobiliado: false } });
                      setIsConfirmingDeleteProperty(false);
                      setShowPropertyModal(true);
                    }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center">
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
                    .map((p: any) => {
                      const firstImg = p.images && p.images.length > 0 ? p.images[0] : '';
                      const resolvedSrc = firstImg && !firstImg.includes('/') && !firstImg.startsWith('http') 
                        ? `/assets/imoveis/${firstImg}` 
                        : firstImg;
                      
                      return (
                        <div key={p.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 flex flex-col justify-between transition-all group">
                          <div>
                            {/* Image Frame */}
                            <div className="relative h-48 w-full bg-slate-100 overflow-hidden group">
                              {resolvedSrc ? (
                                <img src={resolvedSrc} alt={p.nome} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                  <Home size={40} />
                                </div>
                              )}
                              
                              {/* Overlay fade for contrast */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              
                              <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm text-white ${
                                  p.status === 'DISPONÍVEL' ? 'bg-emerald-500/90' : p.status === 'OCULTO' ? 'bg-gray-500/90' : 'bg-rose-500/90'
                                }`}>
                                  {p.status}
                                </span>
                                {p.tipo && (
                                  <span className="bg-[#0F1E2E]/80 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                                    {p.tipo}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Meta */}
                            <div className="p-5 space-y-2">
                              <h4 className="font-extrabold text-slate-950 text-base leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">{p.nome}</h4>
                              <div className="flex items-start text-xs text-slate-400 leading-normal line-clamp-2">
                                <MapPin size={12} className="mr-1.5 mt-0.5 text-blue-500 flex-shrink-0" />
                                <span>{p.localizacao || 'Localização não informada'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Card Footer Price & Action */}
                          <div className="px-5 pb-5 pt-3 border-t border-slate-50 flex items-center justify-between">
                            <div>
                              <span className="text-[9px] font-bold text-slate-450 uppercase block tracking-widest leading-none mb-1">VALOR DE VENDA</span>
                              <span className="text-base font-extrabold text-blue-600 leading-snug inline-block">
                                R$ {(p.valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <button 
                               onClick={() => {
                                  setPropertyForm({ id: p.id, nome: p.nome, valor: p.valor, localizacao: p.localizacao, descricao: p.descricao, images: p.images || [], tipo: p.tipo || 'Lote', status: p.status || 'DISPONÍVEL', detalhes: { quartos: p.detalhes?.quartos || 0, salas: p.detalhes?.salas || 0, banheiros: p.detalhes?.banheiros || 0, area: p.detalhes?.area || '', mobiliado: p.detalhes?.mobiliado || false, corretor_matricula: p.detalhes?.corretor_matricula || '' } });
                                  setIsConfirmingDeleteProperty(false);
                                  setShowPropertyModal(true);
                               }}
                               className="bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-bold px-4 py-2.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors uppercase tracking-widest shadow-sm"
                            >
                               EDITAR
                            </button>
                          </div>
                          
                          {/* Admin ID hint (small details for admin only) */}
                          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-slate-500 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-sm">
                            #{p.id}
                          </div>
                        </div>
                      );
                    })}
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
                    <h2 className="font-bold text-gray-800 mb-6 flex items-center"><TrendingDown size={18} className="mr-2 text-blue-600"/> Registrar Contrato</h2>
                    <form onSubmit={handleCreateContract} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tipo do Imóvel / Lote</label>
                        <select 
                          required
                          className="w-full px-3 py-2 border rounded-md text-sm bg-white font-bold"
                          value={contractForm.tipoContrato}
                          onChange={e => setContractForm({...contractForm, tipoContrato: e.target.value})}
                        >
                          <option value="Lote">Lote</option>
                          <option value="Casa">Casa</option>
                          <option value="Apartamento">Apartamento</option>
                          <option value="Programa Minha Casa Minha Vida (MCMV)">Programa Minha Casa Minha Vida (MCMV)</option>
                          <option value="Imóvel de Terceiros">Imóvel de Terceiros</option>
                          <option value="Aluguel">Aluguel</option>
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
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
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
                           onClick={() => setContractFilter('DISTRATADO')}
                           className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${contractFilter === 'DISTRATADO' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                         >
                           Distratados
                         </button>
                       </div>

                       <div className="relative w-full md:w-64">
                         <input 
                           type="text"
                           placeholder="Buscar por cliente ou imóvel..."
                           value={contractSearchText}
                           onChange={e => setContractSearchText(e.target.value)}
                           className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                         />
                         <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                       </div>

                       <button onClick={() => {
                          let csv = "ID,Cliente,Propriedade,Valor,Corretor,Status\n";
                          data.contracts.forEach((c:any) => { 
                             const client = data.clients.find((cl:any) => cl.id === c.clientId)?.nome || 'N/A';
                             const prop = data.properties.find((p:any) => p.id === c.propertyId)?.nome || 'N/A';
                             const val = c.valor_imovel ?? c.valorFinanciado ?? 0;
                             csv += `${c.id},"${client}","${prop}",${val},"${c.corretorMatricula || ''}","${c.status}"\n`; 
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
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.statusFinanceiro === 'Atrasado' ? 'bg-red-100 text-red-700 border-red-200' : c.statusFinanceiro === 'Financiado' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{c.statusFinanceiro || 'ATIVO'}</span>
                                    {c.status === 'DISTRATADO' ? (
                                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200">DISTRATADO</span>
                                    ) : (
                                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200">ATIVO</span>
                                    )}
                                  </div>
                                </div>
                             </div>

                             {c.status !== 'DISTRATADO' && (
                               <div className="mt-4 pt-4 border-t border-gray-50 flex space-x-2">
                                 {confirmingCancelId === c.id ? (
                                   <div className="flex-1 flex space-x-2">
                                     <button
                                        onClick={async () => {
                                            const loadId = toast.loading('Cancelando contrato...');
                                            try {
                                              const res = await fetch(`/api/contracts/${c.id}/cancel`, {
                                                  method: 'POST',
                                                  headers: {'Content-Type': 'application/json'},
                                              });
                                              toast.dismiss(loadId);
                                              if (res.ok) {
                                                 toast.success('Distrato concluído.');
                                                 setConfirmingCancelId(null);
                                                 loadApplicationData();
                                              } else {
                                                 toast.error('Ocorreu um erro no distrato.');
                                              }
                                            } catch(e) {
                                              toast.dismiss(loadId);
                                              toast.error('Erro de conexão ao cancelar contrato.');
                                            }
                                        }}
                                        className="flex-1 bg-red-600 text-white hover:bg-red-700 font-bold uppercase tracking-widest text-[10px] py-2 rounded transition-all animate-pulse"
                                     >
                                       SIM, DISTRATAR!
                                     </button>
                                     <button
                                        onClick={() => setConfirmingCancelId(null)}
                                        className="px-3 bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold uppercase tracking-widest text-[10px] py-2 rounded transition-all"
                                     >
                                       NÃO
                                     </button>
                                   </div>
                                 ) : (
                                   <button
                                      onClick={() => setConfirmingCancelId(c.id)}
                                      className="flex-1 bg-gray-50 text-gray-600 hover:text-white hover:bg-gray-600 border border-gray-200 font-bold uppercase tracking-widest text-[10px] py-2 rounded transition-all"
                                   >
                                     CANCELAR CONTRATO (DISTRATO)
                                   </button>
                                 )}
                               </div>
                             )}

                             {c.status === 'DISTRATADO' && c.distrato && (
                               <div className="mb-4 mt-4 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Resumo do Distrato</p>
                                  <div className="flex justify-between items-center text-xs mt-1">
                                     <span className="text-gray-600">Data Cancelamento:</span>
                                     <span className="font-bold">{c.distrato.data}</span>
                                  </div>
                               </div>
                             )}
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

            {view === 'controle-clientes' && (
              <motion.div key="controle-clientes" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <ControleClientes />
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
                               <p className="font-black text-xl text-green-600">R$ {(com.valor_personalizado || com.valor_calculado || com.valor_comissao || 0).toLocaleString()}</p>
                               <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                                 com.status === 'PAGO' 
                                   ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                   : 'bg-amber-50 text-amber-700 border-amber-200'
                               }`}>
                                 {com.status || 'PENDENTE'}
                               </span>
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

            {view === 'imoveis-interessados' && (
              <motion.div key="imoveis-interessados" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <ImoveisInteressados />
              </motion.div>
            )}

            {view === 'atendimento' && (
              <motion.div key="atendimento" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                <AtendimentoPlatform user={user} />
              </motion.div>
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
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-white rounded-2xl shadow-2xl z-[201] overflow-hidden max-h-[90vh] flex flex-col"
                >
                  <div className="bg-blue-600 p-6 text-white shrink-0">
                    <h2 className="text-xl font-bold uppercase tracking-tight">{propertyForm.id ? `Editar Imóvel #${propertyForm.id}` : 'Novo Imóvel'}</h2>
                    <p className="text-xs opacity-80 uppercase tracking-widest">{propertyForm.id ? 'Atualização de Ativo Imobiliário' : 'Cadastro de Ativo Imobiliário'}</p>
                  </div>

                  <form className="p-6 space-y-4 overflow-y-auto flex-1 focus:outline-none" onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const form = e.target as any;
                      const formData = new FormData();
                      formData.append('nome', propertyForm.nome);
                      formData.append('valor', String(propertyForm.valor));
                      formData.append('localizacao', propertyForm.localizacao);
                      formData.append('descricao', propertyForm.descricao);
                      formData.append('tipo', propertyForm.tipo || 'Lote');
                      if (propertyForm.status) {
                         formData.append('status', propertyForm.status);
                      }
                      formData.append('images', JSON.stringify(propertyForm.images));
                      if (propertyForm.detalhes) {
                         formData.append('detalhes', JSON.stringify(propertyForm.detalhes));
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
                        setPropertyForm({ id: null, nome: '', valor: 0, localizacao: '', descricao: '', images: [], tipo: 'Lote', status: 'DISPONÍVEL', detalhes: { quartos: 0, salas: 0, banheiros: 0, area: '', mobiliado: false, corretor_matricula: '' } });
                        loadApplicationData();
                      } else {
                        let errMsg = 'Erro ao processar';
                        try { const err = await res.json(); errMsg = err.error || errMsg; } catch(e) {}
                        toast.error(`Erro: ${errMsg}`);
                      }
                    } catch(err: any) {
                      console.error('[Save Property Error]', err);
                      toast.error(`Problema de conexão com o servidor ao salvar imóvel: ${err?.message || err}`);
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
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Tipo do Imóvel</label>
                      <select 
                        required
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500 bg-white font-sans text-sm font-semibold"
                        value={propertyForm.tipo}
                        onChange={e => setPropertyForm({...propertyForm, tipo: e.target.value})}
                      >
                        <option value="Lote">Lote</option>
                        <option value="Casa">Casa</option>
                        <option value="Apartamento">Apartamento</option>
                        <option value="Programa Minha Casa Minha Vida (MCMV)">Programa Minha Casa Minha Vida (MCMV)</option>
                        <option value="Imóvel de Terceiros">Imóvel de Terceiros</option>
                        <option value="Aluguel">Aluguel</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Status do Imóvel</label>
                      <select 
                        required
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500 bg-white font-sans text-sm font-semibold"
                        value={propertyForm.status}
                        onChange={e => setPropertyForm({...propertyForm, status: e.target.value})}
                      >
                        <option value="DISPONÍVEL">Disponível (Visível)</option>
                        <option value="VENDIDO">Vendido</option>
                        <option value="OCULTO">Oculto (Não exibido no site)</option>
                      </select>
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
                    {/* DETAILS */}
                    <div className="p-4 bg-gray-50 border rounded-xl space-y-4">
                       <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Detalhes Adicionais</h4>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Quartos</label>
                            <input type="number" className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-blue-500"
                              value={propertyForm.detalhes?.quartos || 0}
                              onChange={e => setPropertyForm({...propertyForm, detalhes: {...propertyForm.detalhes, quartos: Number(e.target.value)}})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Salas</label>
                            <input type="number" className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-blue-500"
                              value={propertyForm.detalhes?.salas || 0}
                              onChange={e => setPropertyForm({...propertyForm, detalhes: {...propertyForm.detalhes, salas: Number(e.target.value)}})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Banheiros</label>
                            <input type="number" className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-blue-500"
                              value={propertyForm.detalhes?.banheiros || 0}
                              onChange={e => setPropertyForm({...propertyForm, detalhes: {...propertyForm.detalhes, banheiros: Number(e.target.value)}})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Área (m²)</label>
                            <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-blue-500"
                              value={propertyForm.detalhes?.area || ''}
                              onChange={e => setPropertyForm({...propertyForm, detalhes: {...propertyForm.detalhes, area: e.target.value}})}
                            />
                          </div>
                       </div>
                       <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 mt-2 cursor-pointer">
                         <input type="checkbox" className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"
                           checked={propertyForm.detalhes?.mobiliado || false}
                           onChange={e => setPropertyForm({...propertyForm, detalhes: {...propertyForm.detalhes, mobiliado: e.target.checked}})}
                         />
                         <span>Imóvel Mobiliado</span>
                       </label>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Corretor Vinculado (Opcional)</label>
                      <select 
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500 bg-white font-sans text-sm font-semibold mb-3 text-slate-800"
                        value={propertyForm.detalhes?.corretor_matricula || ''}
                        onChange={e => setPropertyForm({...propertyForm, detalhes: { ...(propertyForm.detalhes || {}), corretor_matricula: e.target.value }})}
                      >
                        <option value="">Nenhum (Sem corretor selecionado)</option>
                        {data.staff.filter((s:any) => s.role !== 'CLIENTE').map((s: any) => (
                          <option key={s.id} value={s.matricula}>{s.nome} ({s.matricula})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Capa e Múltiplas Imagens do Imóvel</label>
                      <p className="text-xs text-gray-500 mb-2">Clique para selecionar ou remover. A primeira imagem será a capa no portal principal e demais serão visualizadas na página de detalhes.</p>
                      <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto p-2 bg-gray-50 border rounded-lg">
                        {availableImages.length === 0 ? (
                          <div className="col-span-3 text-xs text-gray-400 text-center py-4">
                            Nenhuma imagem encontrada na pasta do servidor.
                          </div>
                        ) : (
                          availableImages.map((imgPath, idx) => {
                            const isSelected = propertyForm.images.includes(`/assets/imoveis/${imgPath}`);
                            return (
                              <div key={idx} className="relative group">
                                <img
                                  src={`/assets/imoveis/${imgPath}`}
                                  alt={`Imagem ${idx}`}
                                  className={`w-full h-20 object-cover rounded cursor-pointer transition-all ${isSelected ? 'ring-4 ring-blue-500 shadow-md scale-105 z-10 opacity-100' : 'hover:opacity-80 border border-gray-200 opacity-60'}`}
                                  onClick={() => {
                                      const fullPath = `/assets/imoveis/${imgPath}`;
                                      if (isSelected) {
                                          setPropertyForm({...propertyForm, images: propertyForm.images.filter(x => x !== fullPath)});
                                      } else {
                                          setPropertyForm({...propertyForm, images: [...propertyForm.images, fullPath]});
                                      }
                                  }}
                                />
                                {isSelected && (
                                  <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow-md z-20 pointer-events-none">
                                    {propertyForm.images.indexOf(`/assets/imoveis/${imgPath}`) + 1}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
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

                    {propertyForm.id && (
                      <div className="border-t border-gray-100 mt-4 pt-4">
                        {isConfirmingDeleteProperty ? (
                          <div className="bg-red-50 p-3 rounded-xl space-y-2 border border-red-100 flex flex-col">
                            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider text-center">Tem certeza que deseja excluir permanentemente este imóvel?</p>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => setIsConfirmingDeleteProperty(false)}
                                className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-[10px] font-bold uppercase rounded-lg hover:bg-gray-300 transition-all border border-gray-300"
                              >
                                Não, Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const loadId = toast.loading('Excluindo imóvel...');
                                    const res = await fetch(`/api/properties/${propertyForm.id}`, { method: 'DELETE' });
                                    toast.dismiss(loadId);
                                    if (res.ok) {
                                      toast.success('Imóvel excluído com sucesso!');
                                      setShowPropertyModal(false);
                                      setIsConfirmingDeleteProperty(false);
                                      setPropertyForm({ id: null, nome: '', valor: 0, localizacao: '', descricao: '', images: [], tipo: 'Lote', status: 'DISPONÍVEL', detalhes: { quartos: 0, salas: 0, banheiros: 0, area: '', mobiliado: false, corretor_matricula: '' } });
                                      await loadApplicationData();
                                    } else {
                                      const body = await res.json();
                                      toast.error(`Erro ao excluir imóvel: ${body.error || 'Erro desconhecido'}`);
                                    }
                                  } catch (err) {
                                    toast.error('Erro de conexão ao excluir imóvel.');
                                  }
                                }}
                                className="flex-1 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-red-700 transition-all shadow-md animate-pulse"
                              >
                                Sim, Excluir!
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDeleteProperty(true)}
                            className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-200 rounded-xl text-xs uppercase transition-all flex items-center justify-center space-x-1"
                          >
                            <Trash2 size={14} className="mr-1" />
                            <span>EXCLUIR IMÓVEL</span>
                          </button>
                        )}
                      </div>
                    )}
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
                              
                              return (
                                <div key={c.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-blue-800">{property?.nome || 'Imóvel não encontrado'}</h4>
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200">ATIVO</span>
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

            {showDistratoModal && distratoContract && (
              <>
                <div key="distrato-overlay" className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm transition-all animate-fade-in" />
                <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
                  <motion.div 
                    key="distrato-modal"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 font-sans"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-base font-bold text-gray-800 uppercase tracking-tight">Simulação de Distrato</h3>
                      <button onClick={() => setShowDistratoModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">×</button>
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Resumo da Simulação</p>
                      
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Valor Total Pago:</span>
                          <span className="font-bold text-gray-800">R$ {distratoSummary?.totalPaid?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Restituição (Multa 50% - Lei do Distrato):</span>
                          <span className="font-bold text-red-600">R$ {distratoSummary?.option50?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Restituição (Multa 20%):</span>
                          <span className="font-bold text-green-600">R$ {distratoSummary?.option80?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex space-x-3">
                      <button 
                        onClick={() => setShowDistratoModal(false)}
                        className="flex-1 py-2 px-4 border rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Voltar
                      </button>
                      <button 
                        onClick={async () => {
                          const loadId = toast.loading('Processando distrato...');
                          try {
                            const res = await fetch(`/api/contracts/${distratoContract.id}/cancel`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                            });
                            toast.dismiss(loadId);
                            if (res.ok) {
                              toast.success('Distrato concluído com sucesso!');
                              setShowDistratoModal(false);
                              setSelectedClient(null);
                              loadApplicationData();
                            } else {
                              toast.error('Erro ao efetuar distrato.');
                            }
                          } catch (e) {
                            toast.dismiss(loadId);
                            toast.error('Erro de conexão ao processar.');
                          }
                        }}
                        className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors shadow-md shadow-red-100"
                      >
                        Confirmar Distrato
                      </button>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Privacy Policy and Terms of Use Modals under LGPD */}
          <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
          <TermsOfUseModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
        </div>
      </main>
    </div>
  );
}
