import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Menu, MessageSquare, Search, Send, User, Clock, Settings, UserCheck, Bot, Info, X, CheckCircle, AlertTriangle, RefreshCw, FileText, Terminal, ExternalLink, Globe, Key, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AtendimentoPlatform({ user }: { user: any }) {
    const [conversations, setConversations] = useState<any[]>([]);
    const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
    const [envStatus, setEnvStatus] = useState<any>({
        EVOLUTION_API_URL: '',
        EVOLUTION_API_KEY: '',
        EVOLUTION_INSTANCE: '',
        GEMINI_API_KEY: '',
        serverTime: ''
    });
    const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);
    const [isLoadingEnv, setIsLoadingEnv] = useState(false);

    const loadWebhookLogs = async () => {
        try {
            const res = await fetch('/api/atendimento/webhook-logs');
            if (res.ok) {
                const logs = await res.json();
                setWebhookLogs(logs);
            }
        } catch (err) {
            console.error('Error loading webhook logs', err);
        }
    };

    const loadEnvStatus = async () => {
        setIsLoadingEnv(true);
        try {
            const res = await fetch('/api/atendimento/status-env');
            if (res.ok) {
                const data = await res.json();
                setEnvStatus(data);
            }
        } catch (err) {
            console.error('Error loading env status', err);
        } finally {
            setIsLoadingEnv(false);
        }
    };

    const clearWebhookLogs = async () => {
        try {
            const res = await fetch('/api/atendimento/webhook-logs/clear', { method: 'POST' });
            if (res.ok) {
                setWebhookLogs([]);
                toast.success('Histórico de Webhooks limpo!');
            }
        } catch (err: any) {
            toast.error(err.message);
        }
    };
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [msgInput, setMsgInput] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [showCustomerInfo, setShowCustomerInfo] = useState(false);
    const [currentTab, setCurrentTab] = useState<'chat' | 'config'>('chat');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [agents, setAgents] = useState<any[]>([]);
    const [editingAgent, setEditingAgent] = useState<any>(null);
    const [queueFilter, setQueueFilter] = useState<string>('all');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }, []);

    const playNotification = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Audio autoplay blocked', e));
        }
    };

    const loadConversations = async () => {
        try {
            const res = await fetch('/api/atendimento/conversations');
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch(err) {
            console.error(err);
        }
    };

    const loadMessages = async (id: string, forceScroll = false) => {
        try {
            const res = await fetch(`/api/atendimento/conversations/${id}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(prev => {
                    const hasNewMessage = prev.length !== data.length;
                    if (hasNewMessage || forceScroll) {
                        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }
                    return data;
                });
            }
        } catch(err) {
            console.error(err);
        }
    };

    const loadAgents = async () => {
        try {
            const res = await fetch('/api/atendimento/agents');
            if (res.ok) {
                const data = await res.json();
                setAgents(data);
            }
        } catch(err) {
            console.error(err);
        }
    };

    const saveAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAgent) return;
        
        try {
            const res = await fetch(`/api/atendimento/agents/${editingAgent.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemPrompt: editingAgent.systemPrompt,
                    model: editingAgent.model
                })
            });
            if (res.ok) {
                toast.success('Agente atualizado com sucesso!');
                loadAgents();
                setEditingAgent(null);
            } else {
                throw new Error('Erro ao salvar agente');
            }
        } catch(err: any) {
            toast.error(err.message);
        }
    };

    const selectedConvIdRef = useRef<string | null>(null);

    useEffect(() => {
        selectedConvIdRef.current = selectedConvId;
    }, [selectedConvId]);

    useEffect(() => {
        loadConversations();
        loadAgents();
        loadEnvStatus();
        loadWebhookLogs();

        const token = localStorage.getItem('token');
        const newSocket = io({ auth: { token } });
        
        newSocket.on('atendimento_new_message', (payload) => {
            const { conversationId, message } = payload;
            
            if (message.direction === 'incoming') {
                playNotification();
            }

            // Push message to active chat
            setMessages(prev => {
                // If it's for current active chat
                if (selectedConvIdRef.current === conversationId) {
                    if (!prev.find(m => m.id === message.id)) {
                        const updated = [...prev, message];
                        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        return updated;
                    }
                }
                return prev;
            });
            
            loadConversations();
        });

        newSocket.on('atendimento_conversation_update', () => {
            loadConversations();
        });

        newSocket.on('atendimento_webhook_log_new', (log) => {
            setWebhookLogs(prev => [log, ...prev].slice(0, 50));
        });

        setSocket(newSocket);
        
        return () => {
             newSocket.disconnect();
        };
    }, []);

    // Polling fallback of conversations every 8 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            loadConversations();
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    // Fetch messages on active chat selection or every 4 seconds as a robust fallback
    useEffect(() => {
        if (selectedConvId) {
             loadMessages(selectedConvId, true);
             const interval = setInterval(() => {
                 loadMessages(selectedConvId, false);
             }, 4000);
             return () => clearInterval(interval);
        }
    }, [selectedConvId]);

    const activeConv = conversations.find(c => c.id === selectedConvId);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!msgInput.trim() || !selectedConvId) return;

        const tmpMsg = msgInput;
        setMsgInput('');

        try {
            const res = await fetch(`/api/atendimento/conversations/${selectedConvId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: tmpMsg })
            });

            if (!res.ok) throw new Error('Falha ao enviar mensagem');
            
            setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, aiEnabled: 0 } : c));
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const toggleAI = async (enabled: boolean) => {
        if (!selectedConvId) return;
        try {
             await fetch(`/api/atendimento/conversations/${selectedConvId}`, {
                 method: 'PATCH',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ aiEnabled: enabled ? 1 : 0 })
             });
             setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, aiEnabled: enabled ? 1 : 0 } : c));
        } catch(err: any) {
             toast.error(err.message);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-50 mt-[-16px] -mx-4 sm:-mx-6 rounded-t-lg">
            {/* Header / Tabs */}
            <div className="h-14 bg-white border-b border-gray-200 shadow-sm flex items-center px-4 shrink-0 justify-between gap-4">
                 <div className="flex items-center gap-6 text-sm font-semibold h-full">
                      <button 
                          onClick={() => setCurrentTab('chat')} 
                          className={`h-full flex items-center relative ${currentTab === 'chat' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                      >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Conversas
                          {currentTab === 'chat' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-md" />}
                      </button>
                      <button 
                          onClick={() => setCurrentTab('config')} 
                          className={`h-full flex items-center relative ${currentTab === 'config' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                      >
                          <Settings className="w-4 h-4 mr-2" />
                          Configurações
                          {currentTab === 'config' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-md" />}
                      </button>
                 </div>
                 
                 <div className="text-xs text-gray-400 hidden sm:block">
                      Sistema de Atendimento Omnichannel
                 </div>
            </div>

            {currentTab === 'chat' ? (
                <div className="flex flex-1 overflow-hidden bg-white relative">
                    {/* Lista de Conversas - Column 1 */}
                    <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                     <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input type="text" placeholder="Buscar conversas..." className="w-full pl-9 pr-4 py-2 border border-gray-300 bg-white rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                     </div>
                     <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                         {['all', 'Corretores', 'Financeiro', 'Administrativo'].map(q => (
                             <button
                                 key={q}
                                 onClick={() => setQueueFilter(q)}
                                 className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${queueFilter === q ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                             >
                                 {q === 'all' ? 'Todas' : q}
                             </button>
                         ))}
                     </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.filter(c => queueFilter === 'all' || c.queue === queueFilter).length === 0 ? (
                        <div className="text-center p-8 text-gray-400">
                             <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                             <p className="text-sm">Nenhuma conversa encontrada nesta fila.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                           {conversations.filter(c => queueFilter === 'all' || c.queue === queueFilter).map(c => (
                               <div 
                                  key={c.id} 
                                  onClick={() => setSelectedConvId(c.id)}
                                  className={`p-4 cursor-pointer hover:bg-white transition-colors flex gap-3 ${selectedConvId === c.id ? 'bg-white border-l-4 border-blue-600 shadow-sm' : 'border-l-4 border-transparent'}`}
                               >
                                   <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 flex-shrink-0 relative">
                                        {c.contactName ? c.contactName[0].toUpperCase() : '?'}
                                        {c.aiEnabled === 1 && <span className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5"><Bot size={10} /></span>}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-baseline mb-1">
                                            <h4 className="font-semibold text-sm text-gray-900 truncate">{c.contactName || c.contactPhone}</h4>
                                            <span className="text-[10px] text-gray-500 font-medium">
                                                {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                       </div>
                                       <p className="text-xs text-gray-500 truncate mt-0.5">
                                           Status: {c.status}
                                       </p>
                                   </div>
                               </div>
                           ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area - Column 2 */}
            <div className={`flex-1 flex flex-col min-w-0 bg-white relative ${!selectedConvId ? 'hidden md:flex' : 'flex'}`}>
                {selectedConvId ? (
                    <>
                        <div className="h-16 px-4 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
                             <div className="flex items-center gap-3">
                                  <button onClick={() => setSelectedConvId(null)} className="md:hidden p-1 mr-1 text-gray-500">
                                       <X className="w-6 h-6" />
                                  </button>
                                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                                       {activeConv?.contactName?.[0]?.toUpperCase() || '?'}
                                  </div>
                                  <div>
                                       <h3 className="font-bold text-gray-900 leading-tight">{activeConv?.contactName || activeConv?.contactPhone}</h3>
                                       <span className="text-xs text-gray-500 font-medium">{activeConv?.contactPhone}</span>
                                  </div>
                             </div>
                             <div className="flex items-center gap-2">
                                  <button 
                                      onClick={() => toggleAI(!activeConv?.aiEnabled)}
                                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 min-w-max ${activeConv?.aiEnabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                  >
                                      <Bot className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">{activeConv?.aiEnabled ? 'IA ATIVA' : 'IA PAUSADA'}</span>
                                  </button>

                                  <button onClick={() => setShowCustomerInfo(!showCustomerInfo)} className="p-2 text-gray-500 lg:hidden hover:bg-gray-100 rounded-md">
                                       <Info className="w-5 h-5" />
                                  </button>
                             </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-[#e5e5f7]" style={{ backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                             <div className="max-w-3xl mx-auto flex flex-col gap-3 pb-4">
                                {messages.map((m, idx) => {
                                    const isIncoming = m.direction === 'incoming';
                                    const isInternal = m.direction === 'internal_note';
                                    return (
                                        <div key={idx} className={`flex ${isInternal ? 'justify-center' : isIncoming ? 'justify-start' : 'justify-end'}`}>
                                             <div className={`max-w-[75%] md:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${isInternal ? 'bg-red-50 text-red-600 border border-red-200 text-xs w-full text-center my-2' : isIncoming ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                                                 <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                                                 <div className={`text-[9px] mt-1 ${isInternal ? 'text-center' : 'text-right'} font-medium opacity-70`}>
                                                     {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                 </div>
                                             </div>
                                        </div>
                                    )
                                })}
                                <div ref={messagesEndRef} />
                             </div>
                        </div>

                        <div className="bg-white border-t border-gray-200 shrink-0 p-3 pb-safe-bottom">
                            <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-2 p-1 bg-gray-50 rounded-xl border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                                <input 
                                    type="text" 
                                    value={msgInput}
                                    onChange={e => setMsgInput(e.target.value)}
                                    placeholder={activeConv?.aiEnabled ? "Ao responder, a IA será pausada automaticamente (Handoff)..." : "Digite sua mensagem..."}
                                    className="flex-1 px-4 py-2 bg-transparent outline-none text-sm"
                                />
                                <button type="submit" disabled={!msgInput.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-lg transition-colors flex items-center justify-center">
                                     <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-10 h-10 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Nenhuma conversa selecionada</h2>
                        <p className="text-sm text-gray-500 mt-2">Selecione uma conversa na lista para continuar o atendimento.</p>
                    </div>
                )}
            </div>

            {/* Painel do Cliente (Desktop Right Column & Mobile Drawer) - Column 3 */}
            <div className={`w-full lg:w-80 bg-gray-50 border-l border-gray-200 shrink-0 flex-col overflow-y-auto ${showCustomerInfo ? 'flex absolute inset-0 z-30 lg:relative lg:inset-auto' : 'hidden lg:flex lg:relative'} ${!selectedConvId && 'hidden lg:hidden'}`}>
                {showCustomerInfo && (
                    <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center lg:hidden sticky top-0">
                        <h3 className="font-bold text-gray-800">Informações do Cliente</h3>
                        <button onClick={() => setShowCustomerInfo(false)} className="p-1 text-gray-500">
                             <X className="w-6 h-6" />
                        </button>
                    </div>
                )}
                
                {activeConv ? (
                    <div className="p-6">
                        <div className="flex flex-col items-center text-center mb-8">
                             <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center font-bold text-2xl text-blue-700 mb-3 shadow-sm border border-blue-200">
                                  {activeConv.contactName?.[0]?.toUpperCase() || '?'}
                             </div>
                             <h2 className="text-xl font-bold text-gray-900">{activeConv.contactName || 'Desconhecido'}</h2>
                             <p className="text-sm text-gray-500 mt-1">{activeConv.contactPhone}</p>
                        </div>

                        <div className="space-y-6">
                             <div>
                                 <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detalhes</h4>
                                 <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100">
                                     <div className="p-3 flex justify-between items-center">
                                         <span className="text-sm text-gray-500">Cidade</span>
                                         <span className="text-sm font-medium text-gray-900">{activeConv.contactCity || '-'}</span>
                                     </div>
                                     <div className="p-3 flex justify-between items-center">
                                         <span className="text-sm text-gray-500">Canal</span>
                                         <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                            {activeConv.channel === 'whatsapp' && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                                            {activeConv.channel}
                                         </span>
                                     </div>
                                 </div>
                             </div>

                             <div>
                                 <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tags</h4>
                                 <div className="flex flex-wrap gap-2">
                                     {activeConv.contactTags ? activeConv.contactTags.split(',').map((t: string) => (
                                         <span key={t} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded font-medium">{t.trim()}</span>
                                     )) : (
                                         <span className="text-xs text-gray-400 italic">Nenhuma tag...</span>
                                     )}
                                 </div>
                             </div>

                             <div>
                                 <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Atendimento</h4>
                                 <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
                                      <div>
                                          <label className="text-xs font-semibold text-gray-500 mb-1 block">Setor (Fila)</label>
                                          <select 
                                              value={activeConv.queue || ''} 
                                              onChange={async e => {
                                                  const val = e.target.value;
                                                  try {
                                                      await fetch(`/api/atendimento/conversations/${activeConv.id}`, {
                                                          method: 'PATCH',
                                                          headers: { 'Content-Type': 'application/json' },
                                                          body: JSON.stringify({ queue: val })
                                                      });
                                                      setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, queue: val } : c));
                                                  } catch(err: any) {
                                                      toast.error(err.message);
                                                  }
                                              }}
                                              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block px-2.5 py-1.5 outline-none"
                                          >
                                              <option value="">Sem setor definido</option>
                                              <option value="Corretores">Corretores</option>
                                              <option value="Financeiro">Financeiro</option>
                                              <option value="Administrativo">Administrativo</option>
                                          </select>
                                      </div>

                                      <div>
                                          <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
                                          <select 
                                              value={activeConv.status || 'open'} 
                                              onChange={async e => {
                                                  const val = e.target.value;
                                                  try {
                                                      await fetch(`/api/atendimento/conversations/${activeConv.id}`, {
                                                          method: 'PATCH',
                                                          headers: { 'Content-Type': 'application/json' },
                                                          body: JSON.stringify({ status: val })
                                                      });
                                                      setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, status: val } : c));
                                                  } catch(err: any) {
                                                      toast.error(err.message);
                                                  }
                                              }}
                                              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block px-2.5 py-1.5 outline-none"
                                          >
                                              <option value="open">Aberto</option>
                                              <option value="pending">Pendente</option>
                                              <option value="waiting_customer">Aguardando Cliente</option>
                                              <option value="resolved">Resolvido</option>
                                              <option value="closed">Fechado</option>
                                          </select>
                                      </div>

                                      <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100">
                                           <Clock className="w-4 h-4 text-blue-600" />
                                           <span className="text-xs text-gray-500 font-medium">Criado: {new Date(activeConv.createdAt).toLocaleDateString()}</span>
                                      </div>
                                 </div>
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                        Selecione uma conversa
                    </div>
                )}
            </div>
            </div>
            ) : (
                <div className="flex-1 bg-slate-50 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto space-y-8">
                         
                         {/* Seção Superior de Cabeçalho */}
                         <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                             <div>
                                 <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                     <Settings className="w-6 h-6 text-blue-600" />
                                     Painel de Integração & Ajustes
                                 </h2>
                                 <p className="text-sm text-gray-500 mt-1 font-medium">
                                     Gerencie seus agentes de inteligência artificial e configure a conexão com o WhatsApp via Evolution API para o domínio <span className="font-semibold text-blue-600">ssimoveisbrasil.app</span>.
                                 </p>
                             </div>
                             <div className="flex items-center gap-2">
                                 <button
                                     type="button"
                                     onClick={() => {
                                         loadEnvStatus();
                                         loadWebhookLogs();
                                         toast.success('Diagnóstico de rede atualizado!');
                                     }}
                                     className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100 transition"
                                 >
                                     <RefreshCw className={`w-4 h-4 ${isLoadingEnv ? 'animate-spin' : ''}`} />
                                     Forçar Diagnóstico
                                 </button>
                             </div>
                         </div>

                         {/* Grid Principal Dual Column */}
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                             
                             {/* Coluna da Esquerda: Agentes IA & Simulador */}
                             <div className="space-y-6">
                                 <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                                     <div className="flex items-center justify-between mb-4">
                                         <div>
                                             <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                 <Bot className="w-5 h-5 text-purple-600" />
                                                 Agentes de Inteligência Artificial
                                             </h3>
                                             <p className="text-xs text-gray-500 mt-0.5">Defina o comportamento e o modelo preditivo padrão no atendimento humano ou automatizado.</p>
                                         </div>
                                     </div>

                                     <div className="space-y-4">
                                  {agents.map(agent => (
                                      <div key={agent.id} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center hover:bg-gray-50">
                                          <div>
                                              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                  {agent.name}
                                                  {agent.isDefault === 1 && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Padrão</span>}
                                              </h3>
                                              <p className="text-sm text-gray-500 mt-1">Modelo: <span className="font-medium text-gray-700">{agent.model}</span></p>
                                          </div>
                                          <button 
                                              onClick={() => setEditingAgent(agent)}
                                              className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md text-sm font-semibold transition"
                                          >
                                              Editar
                                          </button>
                                      </div>
                                  ))}
                             </div>

                             {editingAgent && (
                                 <form onSubmit={saveAgent} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                                     <h3 className="text-lg font-bold text-gray-900 mb-4">Editando: {editingAgent.name}</h3>
                                     
                                     <div className="space-y-4">
                                         <div>
                                             <label className="block text-sm font-semibold text-gray-700 mb-1">Modelo de IA</label>
                                             <select 
                                                value={editingAgent.model}
                                                onChange={e => setEditingAgent({...editingAgent, model: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                             >
                                                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                                                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                                             </select>
                                         </div>

                                         <div>
                                             <label className="block text-sm font-semibold text-gray-700 mb-1">System Prompt</label>
                                             <textarea 
                                                value={editingAgent.systemPrompt}
                                                onChange={e => setEditingAgent({...editingAgent, systemPrompt: e.target.value})}
                                                rows={8}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                placeholder="Instruções para o comportamento do agente..."
                                             />
                                         </div>
                                     </div>

                                     <div className="mt-6 flex justify-end gap-3">
                                         <button 
                                             type="button" 
                                             onClick={() => setEditingAgent(null)}
                                             className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition"
                                         >
                                             Cancelar
                                         </button>
                                         <button 
                                             type="submit" 
                                             className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                                         >
                                             Salvar Alterações
                                         </button>
                                     </div>
                                 </form>
                             )}
                         </div>

                             </div>

                             {/* Coluna da Direita: WhatsApp e Evolution Webhook Central */}
                             <div className="space-y-6">
                                 
                                 {/* Caixa 1: Endereço de Apontamento de Webhook */}
                                 <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                                     <div className="flex items-center gap-2 mb-2">
                                         <Globe className="w-5 h-5 text-blue-600" />
                                         <h3 className="text-lg font-bold text-gray-900 animate-fade-in">Endereço Oficial de Webhook</h3>
                                     </div>
                                     <p className="text-xs text-gray-500 mb-4">
                                         Para que as mensagens do WhatsApp cheguem nesta central, a sua Evolution API precisa disparar eventos para esta URL exata:
                                     </p>

                                     {/* Widget da URL do Webhook */}
                                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
                                         <div className="font-mono text-xs text-blue-900 select-all font-semibold overflow-x-auto w-full break-all">
                                             {typeof window !== 'undefined' ? `${window.location.origin}/api/atendimento/webhook` : 'https://ssimoveisbrasil.app/api/atendimento/webhook'}
                                         </div>
                                         <button
                                             type="button"
                                             onClick={() => {
                                                 const url = typeof window !== 'undefined' ? `${window.location.origin}/api/atendimento/webhook` : 'https://ssimoveisbrasil.app/api/atendimento/webhook';
                                                 navigator.clipboard.writeText(url);
                                                 toast.success('Link do Webhook copiado!');
                                             }}
                                             className="flex items-center gap-1 text-[11px] font-bold bg-white text-blue-700 border border-blue-300 px-2.5 py-1.5 rounded-md hover:bg-blue-50 transition shrink-0"
                                         >
                                             <Copy className="w-3.5 h-3.5" />
                                             Copiar URL
                                         </button>
                                     </div>

                                     {/* Requisito de Evento na Evolution */}
                                     <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                                         <div className="font-bold flex items-center gap-1.5 text-amber-805">
                                             <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                             Ativar Evento na API:
                                         </div>
                                         <p className="text-xs">
                                             No painel do Evo GO ou Evolution, em **Webhooks**, preencha a URL acima e ligue o evento de recepção de mensagens <span className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-955 font-bold">MESSAGE</span> (ou <span className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-955 font-bold">MESSAGES_UPSERT</span> em algumas versões).
                                         </p>
                                     </div>
                                 </div>

                                 {/* Caixa 2: Credenciais e diagnóstico de Servidor */}
                                 <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                                     <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                         <Key className="w-5 h-5 text-emerald-600" />
                                         Variáveis de Ambiente (Render Dashboard)
                                     </h3>
                                     <p className="text-xs text-gray-555 mb-4">Estas variáveis precisam estar configuradas no painel do Render:</p>

                                     <div className="space-y-2.5 bg-transparent">
                                         <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs border border-gray-100">
                                              <span className="font-mono text-gray-650 font-semibold text-left">EVOLUTION_API_URL</span>
                                              {envStatus.EVOLUTION_API_URL ? (
                                                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded font-mono text-[11px] font-bold truncate max-w-[210px]" title={envStatus.EVOLUTION_API_URL}>
                                                      {envStatus.EVOLUTION_API_URL}
                                                  </span>
                                              ) : (
                                                  <span className="text-amber-605 font-bold flex items-center gap-1">
                                                      <AlertTriangle className="w-3.5 h-3.5" /> Ausente
                                                  </span>
                                              )}
                                         </div>

                                         <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs border border-gray-100">
                                              <span className="font-mono text-gray-655 font-semibold text-left">
                                                  EVOLUTION_API_KEY
                                                  <span className="block text-[8px] text-gray-400 font-sans font-normal mt-0.5">Token de Instância ou Token Global</span>
                                              </span>
                                              {envStatus.EVOLUTION_API_KEY === 'Ausente/Não configurado' ? (
                                                  <span className="text-amber-605 font-bold flex items-center gap-1">
                                                      <AlertTriangle className="w-3.5 h-3.5" /> Ausente
                                                  </span>
                                              ) : (
                                                  <span className="bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded font-mono text-[11px] font-bold">
                                                      Configurado ✓
                                                  </span>
                                              )}
                                         </div>

                                         <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs border border-gray-100">
                                              <span className="font-mono text-gray-655 font-semibold text-left">EVOLUTION_INSTANCE</span>
                                              {envStatus.EVOLUTION_INSTANCE ? (
                                                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded font-mono text-[11px] font-bold">
                                                      {envStatus.EVOLUTION_INSTANCE}
                                                  </span>
                                              ) : (
                                                  <span className="text-amber-605 font-bold flex items-center gap-1">
                                                      <AlertTriangle className="w-3.5 h-3.5" /> Ausente
                                                  </span>
                                              )}
                                         </div>

                                         <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs border border-gray-100">
                                              <span className="font-mono text-gray-655 font-semibold text-left">GEMINI_API_KEY</span>
                                              {envStatus.GEMINI_API_KEY === 'Ausente/Não configurado' ? (
                                                  <span className="text-amber-650 font-bold flex items-center gap-1">
                                                      <AlertTriangle className="w-3.5 h-3.5" /> Ausente
                                                  </span>
                                              ) : (
                                                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded font-mono text-[11px] font-bold">
                                                      Configurado ✓
                                                  </span>
                                              )}
                                         </div>
                                     </div>

                                     {/* Dica da sua dúvida */}
                                     <div className="mt-4 p-3 bg-blue-50 border border-blue-150 rounded-lg text-xs leading-relaxed text-blue-955">
                                         <p className="font-bold text-blue-900 flex items-center gap-1.5 font-sans">
                                             <Info className="w-4 h-4 text-blue-600 shrink-0" />
                                             Dica Importante sobre o Token da Instância:
                                         </p>
                                         <p className="mt-1 text-gray-700 font-sans leading-relaxed">
                                             Sim! O campo <span className="font-mono text-slate-1000 font-bold bg-white px-1 py-0.5 rounded border border-blue-100">EVOLUTION_API_KEY</span> recebe perfeitamente o seu **Token de Instância** da Evolution API caso você não use o token global de administrador. Isso garante autenticação segura exclusiva para enviar mensagens desta conta!
                                         </p>
                                     </div>
                                 </div>

                                 {/* Caixa 3: Passo a passo de Configuração no Render */}
                                 <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                                     <h3 className="text-sm font-bold text-gray-850 mb-3 flex items-center gap-1.5">
                                         <ExternalLink className="w-4.5 h-4.5 text-blue-600" />
                                         Guia Passo-a-Passo no Render
                                     </h3>
                                     <div className="space-y-3.5 text-xs text-gray-650 leading-relaxed">
                                         <div className="flex gap-2.5">
                                             <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5">1</span>
                                             <p>Acesse o painel web em **https://dashboard.render.com** e faça login na sua conta.</p>
                                         </div>
                                         <div className="flex gap-2.5">
                                             <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5">2</span>
                                             <p>Clique no Web Service que você criou para o seu site (<span className="font-semibold text-gray-800">ssimoveisbrasil.app</span>).</p>
                                         </div>
                                         <div className="flex gap-2.5">
                                             <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5">3</span>
                                             <p>No menu lateral esquerdo, clique na aba **Environment** (Configurações de ambiente).</p>
                                         </div>
                                         <div className="flex gap-2.5">
                                             <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5">4</span>
                                             <p>Clique em **Add Environment Variable** e insira as chaves acima um por uma.</p>
                                         </div>
                                         <div className="flex gap-2.5">
                                             <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5">5</span>
                                             <p>Clique no botão azul **Save Changes**. O Render iniciará automaticamente uma nova compilação e atualizará seu sistema em segundos!</p>
                                         </div>
                                     </div>
                                 </div>

                                 {/* Caixa 4: Telemetria de Webhook em Tempo Real (Live Tracer) */}
                                 <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                                     <div className="flex items-center justify-between mb-3">
                                         <div>
                                             <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                                                 <Terminal className="w-5 h-5 text-slate-800" />
                                                 Rastreador de Webhooks em Tempo Real
                                             </h3>
                                             <p className="text-[11px] text-gray-500">Veja instantaneamente cada mensagem que a Evolution API envia para o site.</p>
                                         </div>
                                         {webhookLogs.length > 0 && (
                                             <button 
                                                 type="button"
                                                 onClick={clearWebhookLogs}
                                                 className="text-gray-400 hover:text-red-500 text-xs font-semibold transition bg-transparent border-0 outline-none cursor-pointer"
                                             >
                                                 Limpar Logs
                                             </button>
                                         )}
                                     </div>

                                     <div className="bg-slate-900 text-slate-100 font-mono text-xs rounded-lg overflow-hidden border border-slate-800 animate-fade-in">
                                         <div className="bg-slate-850 px-4 py-2 flex items-center justify-between text-slate-400 border-b border-slate-800 text-[10px]">
                                             <span>ESCUTADOR DE WEBHOOK INTEGRADOR</span>
                                             <span className="flex items-center gap-1">
                                                 <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block" />
                                                 MONITORANDO
                                             </span>
                                         </div>

                                         <div className="max-h-72 overflow-y-auto p-3 space-y-2">
                                             {webhookLogs.length === 0 ? (
                                                 <div className="text-center py-8 text-slate-500 space-y-2">
                                                     <p className="animate-pulse text-blue-400 font-sans">◯ Aguardando nova atividade de webhook no site...</p>
                                                     <p className="text-[10px] font-sans text-slate-600 px-4">
                                                         Dica: Envie uma mensagem no seu WhatsApp conectado. Se os logs de rede do seu Evolution estiverem corretos, a mensagem aparecerá neste painel de tempo real perfeitamente!
                                                     </p>
                                                 </div>
                                             ) : (
                                                 webhookLogs.map((log, index) => {
                                                     const isExpanded = expandedLogIndex === index;
                                                     return (
                                                         <div key={index} className="p-2 border border-slate-800 rounded bg-slate-950/45 hover:bg-slate-950 transition">
                                                             <div className="flex items-center justify-between text-[11px] cursor-pointer" onClick={() => setExpandedLogIndex(isExpanded ? null : index)}>
                                                                 <div className="flex items-center gap-1.5 truncate">
                                                                     {log.success ? (
                                                                         <span className="text-emerald-400 font-bold">✓ [SUCESSO]</span>
                                                                     ) : (
                                                                         <span className="text-rose-400 font-bold">✗ [FALHA]</span>
                                                                     )}
                                                                     <span className="text-slate-400 uppercase font-semibold text-[10px]">{log.event}</span>
                                                                     <span className="text-slate-605">|</span>
                                                                     <span className="text-blue-300 truncate font-semibold" title={log.sender}>{log.sender}</span>
                                                                 </div>
                                                                 <div className="flex items-center gap-2 shrink-0">
                                                                     <span className="text-slate-555 text-[9px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                                     <span className="text-blue-500 font-bold text-[10px] whitespace-nowrap">{isExpanded ? 'Ocultar' : 'Ver JSON'}</span>
                                                                 </div>
                                                             </div>
                                                             
                                                             <div className="mt-1.5 pl-4 text-slate-300 font-sans text-xs break-words font-medium">
                                                                 {log.content}
                                                             </div>

                                                             {log.error && (
                                                                 <div className="mt-1 pl-4 text-rose-450 text-[11px] font-sans">
                                                                     Erro: {log.error}
                                                                 </div>
                                                             )}

                                                             {isExpanded && (
                                                                 <div className="mt-3 border-t border-slate-800 pt-2 text-[10px] text-slate-400 space-y-1">
                                                                     <p className="font-bold text-blue-400">[DATA PAYLOAD COMPLETA]:</p>
                                                                     <pre className="p-2 bg-slate-900 rounded overflow-x-auto text-[10.5px] max-h-48 text-slate-300 font-mono leading-relaxed font-normal">
                                                                         {JSON.stringify(log.payload, null, 2)}
                                                                     </pre>
                                                                 </div>
                                                             )}
                                                         </div>
                                                     );
                                                 })
                                             )}
                                         </div>
                                     </div>
                                 </div>

                                 {/* Simulador compactado integrado */}
                                 <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs">
                                     <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-sans">Simulador Local (Controle rápido)</h4>
                                      <button
                                onClick={async () => {
                                   try {
                                       await fetch('/api/atendimento/webhook', {
                                           method: 'POST',
                                           headers: {'Content-Type': 'application/json'},
                                           body: JSON.stringify({
                                                contactName: 'João Cliente Top',
                                                contactPhone: '5584999999999',
                                                channel: 'whatsapp',
                                                content: 'Oi, tenho interesse em um imóvel em Nova Cruz!'
                                           })
                                       });
                                       toast.success('Mensagem simulada enviada com sucesso!');
                                   } catch(err: any) {
                                       toast.error(err.message);
                                   }
                                }}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition"
                             >
                                Simular Mensagem do João
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
        </div>
    );
}