import express from 'express';
import { getDB } from './atendimento-db.js';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();
let ioInstance: Server | null = null;

export const setSocketIo = (io: Server) => {
    ioInstance = io;
};

// --- Debounce Logic ---
const aiDebounceMap = new Map<string, NodeJS.Timeout>();

const triggerAIProcessing = async (conversationId: string) => {
    try {
        const db = await getDB();
        const conv = await db.get('SELECT * FROM Conversations WHERE id = ?', [conversationId]);
        
        if (!conv || !conv.aiEnabled) return;

        const messages = await db.all('SELECT * FROM Messages WHERE conversationId = ? ORDER BY createdAt ASC LIMIT 50', [conversationId]);
        const agent = await db.get('SELECT * FROM AgentSessions WHERE isDefault = 1 AND active = 1');
        
        if (!agent) {
             console.log('[Atendimento] Nenhum agente IA configurado.');
             return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        let historyStr = messages.map((m: any) => `${m.direction === 'incoming' ? 'Cliente' : 'Agente IA'}: ${m.content}`).join('\n');
        const prompt = `${agent.systemPrompt}\n\nHistórico:\n${historyStr}\n\nAgente IA (responda de forma concisa e amigável):`;

        const modelToUse = agent.model === 'gemini-2.5-pro' ? 'gemini-2.5-flash' : (agent.model || 'gemini-2.5-flash');

        try {
            let lastErr: any = null;
            let replyText = 'Desculpe, não entendi.';
            
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const response = await ai.models.generateContent({
                        model: modelToUse,
                        contents: prompt
                    });
                    replyText = response.text || 'Desculpe, não entendi.';
                    lastErr = null;
                    break; // Sucesso
                } catch (err: any) {
                    lastErr = err;
                    console.warn(`[Atendimento] Tentativa ${attempt} falhou no Gemini. Esperando antes de tentar novamente...`);
                    if (attempt < 3) {
                        await new Promise(res => setTimeout(res, 2000 * attempt)); // Exponential-ish backoff
                    }
                }
            }

            if (lastErr) {
                throw lastErr;
            }

            const messageId = uuidv4();
            const now = new Date().toISOString();

            await db.run(
                'INSERT INTO Messages (id, conversationId, direction, content, createdAt) VALUES (?, ?, ?, ?, ?)',
                [messageId, conversationId, 'outgoing', replyText, now]
            );
            
            await db.run('UPDATE Conversations SET updatedAt = ? WHERE id = ?', [now, conversationId]);

            // Enviar de volta pela Evolution API se configurada
            if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE) {
                const ct = await db.get('SELECT phone FROM Contacts WHERE id = ?', [conv.contactId]);
                if (ct) {
                    try {
                        await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': process.env.EVOLUTION_API_KEY
                            },
                            body: JSON.stringify({
                                number: ct.phone,
                                text: replyText
                            })
                        });
                    } catch (evoErr) {
                        console.error('[Atendimento] Erro ao enviar para Evolution:', evoErr);
                    }
                }
            }

            if (ioInstance) {
                ioInstance.emit('atendimento_new_message', {
                    conversationId,
                    message: { id: messageId, direction: 'outgoing', content: replyText, createdAt: now }
                });
                ioInstance.emit('atendimento_conversation_update', { conversationId, updatedAt: now });
            }
        } catch (genErr: any) {
            console.error('[Atendimento] Erro na requisição do Gemini:', genErr);
            
            const errorMessage = `[Sistema] Erro no Agente IA: ${genErr.message || 'Falha ao processar.'}`;
            const messageId = uuidv4();
            const now = new Date().toISOString();

            await db.run(
                'INSERT INTO Messages (id, conversationId, direction, content, createdAt) VALUES (?, ?, ?, ?, ?)',
                [messageId, conversationId, 'internal_note', errorMessage, now]
            );
            
            if (ioInstance) {
                ioInstance.emit('atendimento_new_message', {
                    conversationId,
                    message: { id: messageId, direction: 'internal_note', content: errorMessage, createdAt: now }
                });
            }
        }
        
    } catch(err) {
        console.error('[Atendimento] Erro Geral IA Processing:', err);
    }
};

const handleCustomerMessage = (conversationId: string) => {
    if (aiDebounceMap.has(conversationId)) {
        clearTimeout(aiDebounceMap.get(conversationId)!);
    }
    const timer = setTimeout(() => {
        aiDebounceMap.delete(conversationId);
        triggerAIProcessing(conversationId);
    }, 5000);
    aiDebounceMap.set(conversationId, timer);
};

// --- Webhook Logs Telemetry ---
export interface WebhookLog {
    timestamp: string;
    event: string;
    sender: string;
    content: string;
    direction: string;
    success: boolean;
    error?: string;
    payload?: any;
}

export const webhookLogs: WebhookLog[] = [];

const addWebhookLog = (log: WebhookLog) => {
    webhookLogs.unshift(log);
    if (webhookLogs.length > 50) {
        webhookLogs.pop();
    }
    if (ioInstance) {
        ioInstance.emit('atendimento_webhook_log_new', log);
    }
};

// --- Webhook Telemetry Routes ---
router.get('/webhook-logs', (req, res) => {
    res.json(webhookLogs);
});

router.post('/webhook-logs/clear', (req, res) => {
    webhookLogs.length = 0;
    res.json({ success: true });
});

router.get('/status-env', (req, res) => {
    res.json({
        EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || '',
        EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY ? 'Configurado (apikey)' : 'Ausente/Não configurado',
        EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE || '',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Configurado' : 'Ausente/Não configurado',
        serverTime: new Date().toISOString()
    });
});

// --- Webhook (Suporta MOCK e EVOLUTION API) ---
router.post('/webhook', async (req, res) => {
    const rawPayload = req.body;
    let eventName = rawPayload?.event || 'mock';
    let contactPhone = '';
    let contactName = '';
    let content = '';
    let isOutgoing = false;

    try {
        console.log('[Atendimento] /webhook CHAMADO! Evento:', eventName);
        console.log('[Atendimento] Payload completo:', JSON.stringify(rawPayload, null, 2));
        let channel = 'whatsapp';

        // 1. Sempre logar o recebimento inicial completo no painel do FrontEnd
        addWebhookLog({
            timestamp: new Date().toISOString(),
            event: eventName || (rawPayload?.event ? String(rawPayload.event) : 'webhook_recebido'),
            sender: rawPayload?.data?.key?.remoteJid?.split('@')[0] || rawPayload?.data?.remoteJid?.split('@')[0] || rawPayload?.sender || rawPayload?.phone || 'Verificando...',
            content: 'Chegou um webhook (clique "Ver Payload JSON" no log)',
            direction: 'incoming',
            success: true,
            payload: rawPayload
        });

        // Só processar mensagens novas
        const lowerEvent = eventName?.toLowerCase() || '';
        if (lowerEvent && lowerEvent !== 'messages.upsert' && lowerEvent !== 'mock' && lowerEvent !== 'webhook_recebido' && lowerEvent !== 'message') {
             addWebhookLog({
                 timestamp: new Date().toISOString(),
                 event: eventName,
                 sender: rawPayload?.data?.key?.remoteJid?.split('@')[0] || rawPayload?.data?.remoteJid?.split('@')[0] || rawPayload?.sender || 'Sistema/Status',
                 content: `Ignorado: Evento de status (${eventName})`,
                 direction: isOutgoing ? 'outgoing' : 'incoming',
                 success: true,
                 payload: rawPayload
             });
             return res.status(200).json({ success: true, message: 'Evento ignorado pois não é uma nova mensagem.' });
        }

        // Pega a mensagem base ( Evolution API v1 ou v2 ou array )
        let mainMsgObj = rawPayload?.data?.message || rawPayload?.data?.messages?.[0] || rawPayload?.data || rawPayload;

        // Tenta capturar o número do remetente (contactPhone) priorizando @s.whatsapp.net
        let potentialPhones = [
            mainMsgObj?.key?.remoteJid,
            mainMsgObj?.remoteJid,
            rawPayload?.data?.key?.remoteJid,
            rawPayload?.data?.Sender,
            rawPayload?.Sender,
            rawPayload?.sender,
            rawPayload?.phone,
            rawPayload?.contactPhone
        ];

        // Ignora mensagens de grupo ou broadcast estritamente
        let isGroupMsg = false;
        let groupJid = '';
        for (let p of potentialPhones) {
            if (p && typeof p === 'string' && (p.includes('@g.us') || p.includes('@broadcast') || p.includes('status@broadcast'))) {
                isGroupMsg = true;
                groupJid = p;
                break;
            }
        }
        
        if (isGroupMsg) {
            addWebhookLog({
                timestamp: new Date().toISOString(),
                event: eventName,
                sender: String(groupJid).split('@')[0],
                content: 'Ignorado: Evento de grupo ou status',
                direction: 'incoming',
                success: true,
                payload: rawPayload
            });
            return res.status(200).json({ success: true, message: 'Ignorado (grupo/broadcast).' });
        }

        for (let p of potentialPhones) {
            if (p && typeof p === 'string' && p.includes('@s.whatsapp.net') && !p.includes(':')) {
                contactPhone = p.split('@')[0];
                break;
            }
        }
        
        if (!contactPhone) {
            // Tenta pegar com : e limpar
             for (let p of potentialPhones) {
                if (p && typeof p === 'string' && p.includes('@s.whatsapp.net')) {
                    contactPhone = p.split('@')[0].split(':')[0];
                    break;
                }
            }
        }

        if (!contactPhone) {
            // Em ultimo caso pega qualquer coisa
            for (let p of potentialPhones) {
                if (p && typeof p === 'string') {
                    let clean = p.split('@')[0].replace(/[^0-9]/g, '');
                    if (clean.length > 5) {
                        contactPhone = clean;
                        break;
                    }
                }
            }
        }

        // Normalização E.164: remove caracteres não numéricos e garante o "+" no início
        if (contactPhone) {
            contactPhone = '+' + contactPhone.replace(/[^0-9]/g, '');
        }

        // Tenta extrair o nome
        contactName = mainMsgObj?.pushName || rawPayload?.data?.pushName || rawPayload?.pushName || rawPayload?.PushName || rawPayload?.contactName || rawPayload?.name || rawPayload?.senderName || contactPhone || 'Desconhecido';

        // Verifica se foi nós que enviamos (isOutgoing)
        isOutgoing = !!(mainMsgObj?.key?.fromMe || rawPayload?.data?.key?.fromMe || rawPayload?.fromMe || rawPayload?.direction === 'outgoing' || rawPayload?.data?.IsFromMe);

        // Tenta extrair a mensagem de texto
        const msg = mainMsgObj?.message || mainMsgObj;
        
        if (msg) {
             // Evolution messages
             if (msg.conversation) {
                  content = msg.conversation;
             } else if (msg.extendedTextMessage?.text) {
                  content = msg.extendedTextMessage.text;
             } else if (msg.imageMessage) {
                  content = msg.imageMessage.caption || '[Imagem]';
             } else if (msg.videoMessage) {
                  content = msg.videoMessage.caption || '[Vídeo]';
             } else if (msg.documentMessage) {
                  content = msg.documentMessage.caption || msg.documentMessage.fileName || '[Documento]';
             } else if (msg.audioMessage || msg.pttMessage) {
                  content = '[Áudio]';
             } else if (msg.stickerMessage) {
                  content = '[Figurinha]';
             } else if (msg.locationMessage) {
                  content = '[Localização]';
             } else if (msg.contactMessage) {
                  content = '[Contato]';
             } else if (msg.reactionMessage) {
                  content = `[Reação: ${msg.reactionMessage?.text || msg.reactionMessage?.reaction || '👍'}]`;
             } else if (msg.buttonsResponseMessage?.selectedDisplayText) {
                  content = msg.buttonsResponseMessage.selectedDisplayText;
             } else if (msg.listResponseMessage?.title || msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
                  content = msg.listResponseMessage?.title || '[Item de Lista]';
             } else if (msg.templateButtonReplyMessage?.selectedId) {
                  content = msg.templateButtonReplyMessage.selectedId;
             } else if (typeof msg === 'string') {
                  content = msg;
             } else if (msg.text) {
                  content = msg.text;
             } else if (msg.caption) {
                  content = msg.caption;
             } else if (msg.body) {
                  content = msg.body;
             }
        } 
        
        if (!content) {
             if (rawPayload?.text || rawPayload?.body || rawPayload?.Body) {
                 content = rawPayload.text || rawPayload.body || rawPayload.Body;
             } else if (rawPayload?.content) {
                 content = rawPayload.content;
             } else if (rawPayload?.data?.text || rawPayload?.data?.body) {
                 content = rawPayload.data.text || rawPayload.data.body;
             }
        }
        
        // Verifica event type vindo customizado para fallback (Evolution wrapper ou Chatwoot wrapper)
        const messageType = mainMsgObj?.messageType || rawPayload?.data?.messageType || rawPayload?.Type || rawPayload?.type;
        if (!content && messageType) {
            const mt = messageType.toLowerCase();
            if (mt.includes('image')) content = '[Imagem]';
            else if (mt.includes('video')) content = '[Vídeo]';
            else if (mt.includes('audio')) content = '[Áudio]';
            else if (mt.includes('sticker')) content = '[Figurinha]';
            else if (mt.includes('document')) content = '[Documento]';
            else if (mt.includes('location')) content = '[Localização]';
            else if (mt.includes('contact')) content = '[Contato]';
            else if (mt === 'media') content = '[Mídia]';
        }

        // Se não achou telefone ou a mensagem não tem conteúdo decifrável textual
        if (!contactPhone || !content || content === '[Objeto Mídia]') {
            addWebhookLog({
                timestamp: new Date().toISOString(),
                event: eventName,
                sender: contactPhone || 'Sistema/Status',
                content: 'Ignorado: Evento de status ou sem metadados suficientes',
                direction: isOutgoing ? 'outgoing' : 'incoming',
                success: true,
                payload: rawPayload
            });
            return res.status(200).json({ success: true, message: 'Evento ignorado sem mensagem de chat clara.' });
        }

        const db = await getDB();
        
        let contact = await db.get('SELECT * FROM Contacts WHERE phone = ?', [contactPhone]);
        
        const now = new Date().toISOString();
        if (!contact) {
            const contactId = uuidv4();
            await db.run('INSERT INTO Contacts (id, name, phone, createdAt) VALUES (?, ?, ?, ?)', 
                [contactId, contactName, contactPhone, now]);
            contact = { id: contactId, name: contactName, phone: contactPhone };
            if (ioInstance) ioInstance.emit('atendimento_new_contact', contact);
        }

        let conv = await db.get(`SELECT * FROM Conversations WHERE contactId = ? AND status IN ('open', 'pending', 'waiting_customer')`, [contact.id]);
        
        if (!conv) {
            const convId = uuidv4();
            await db.run(
                'INSERT INTO Conversations (id, contactId, channel, status, aiEnabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                [convId, contact.id, channel, 'open', 1, now, now]
            );
            conv = { id: convId, contactId: contact.id, channel: channel };
            if (ioInstance) ioInstance.emit('atendimento_new_conversation', conv);
        } else {
            await db.run('UPDATE Conversations SET updatedAt = ? WHERE id = ?', [now, conv.id]);
        }

        const messageId = uuidv4();
        const directionToSave = isOutgoing ? 'outgoing' : 'incoming';
        
        await db.run(
            'INSERT INTO Messages (id, conversationId, direction, content, createdAt) VALUES (?, ?, ?, ?, ?)',
            [messageId, conv.id, directionToSave, content, now]
        );

        if (ioInstance) {
            ioInstance.emit('atendimento_new_message', {
                conversationId: conv.id,
                message: { id: messageId, direction: directionToSave, content, createdAt: now }
            });
            ioInstance.emit('atendimento_conversation_update', { conversationId: conv.id, updatedAt: now });
        }

        // Apenas processa inteligência artificial (Gemini) se a mensagem for de vinda do cliente (não é outgoing)
        if (!isOutgoing) {
            handleCustomerMessage(conv.id);
        }

        addWebhookLog({
            timestamp: now,
            event: eventName,
            sender: `${contactName} (${contactPhone})`,
            content: content,
            direction: directionToSave,
            success: true,
            payload: rawPayload
        });

        res.json({ success: true });
    } catch(err: any) {
        console.error('[Atendimento] Webhook Error:', err);
        addWebhookLog({
            timestamp: new Date().toISOString(),
            event: eventName,
            sender: contactPhone || 'Erro',
            content: content || 'Erro',
            direction: 'incoming',
            success: false,
            error: err.message || 'Erro interno no processamento',
            payload: rawPayload
        });
        res.status(500).json({ error: err.message });
    }
});

// --- API Geral ---

// Obter Conversas Ativas
router.get('/conversations', async (req, res) => {
    try {
        const db = await getDB();
        const convs = await db.all(`
            SELECT c.*, ct.name as contactName, ct.phone as contactPhone, ct.city as contactCity, ct.tags as contactTags 
            FROM Conversations c 
            JOIN Contacts ct ON c.contactId = ct.id 
            ORDER BY c.updatedAt DESC
        `);
        res.json(convs);
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Obter Mensagens de uma Conversa
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const db = await getDB();
        const messages = await db.all('SELECT * FROM Messages WHERE conversationId = ? ORDER BY createdAt ASC', [req.params.id]);
        res.json(messages);
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Enviar Mensagem (Humano)
router.post('/conversations/:id/messages', async (req, res) => {
    try {
        const { content } = req.body;
        const convId = req.params.id;
        const db = await getDB();
        
        // Se humano responde, desativa a IA (Human Handoff)
        await db.run('UPDATE Conversations SET aiEnabled = 0, updatedAt = ? WHERE id = ?', [new Date().toISOString(), convId]);
        
        const messageId = uuidv4();
        const now = new Date().toISOString();
        await db.run(
            'INSERT INTO Messages (id, conversationId, direction, content, createdAt) VALUES (?, ?, ?, ?, ?)',
            [messageId, convId, 'outgoing', content, now]
        );

        // Enviar para a Evolution API
        if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE) {
            const conv = await db.get('SELECT contactId FROM Conversations WHERE id = ?', [convId]);
            if (conv) {
                const ct = await db.get('SELECT phone FROM Contacts WHERE id = ?', [conv.contactId]);
                if (ct) {
                    try {
                        await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': process.env.EVOLUTION_API_KEY
                            },
                            body: JSON.stringify({
                                number: ct.phone,
                                text: content
                            })
                        });
                    } catch (evoErr) {
                        console.error('[Atendimento] Erro ao enviar para Evolution (Humano):', evoErr);
                    }
                }
            }
        }

        if (ioInstance) {
            ioInstance.emit('atendimento_new_message', {
                conversationId: convId,
                message: { id: messageId, direction: 'outgoing', content, createdAt: now }
            });
            ioInstance.emit('atendimento_conversation_update', { conversationId: convId, updatedAt: now, aiEnabled: 0 });
        }

        res.json({ success: true, messageId });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Atualizar Conversa (Ex: Transferência, Ativar IA)
router.patch('/conversations/:id', async (req, res) => {
    try {
        const { aiEnabled, status, queue } = req.body;
        const convId = req.params.id;
        const db = await getDB();
        
        let updates = [];
        let values = [];
        if (aiEnabled !== undefined) {
             updates.push('aiEnabled = ?'); values.push(aiEnabled);
        }
        if (status !== undefined) {
             updates.push('status = ?'); values.push(status);
        }
        if (queue !== undefined) {
             updates.push('queue = ?'); values.push(queue);
        }
        
        if (updates.length > 0) {
            updates.push('updatedAt = ?'); values.push(new Date().toISOString());
            values.push(convId);
            await db.run(`UPDATE Conversations SET ${updates.join(', ')} WHERE id = ?`, values);
            
            if (ioInstance) {
                ioInstance.emit('atendimento_conversation_update', { conversationId: convId, aiEnabled, status, queue, updatedAt: new Date().toISOString() });
            }
        }
        
        res.json({ success: true });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Obter Agentes
router.get('/agents', async (req, res) => {
    try {
        const db = await getDB();
        const agents = await db.all('SELECT * FROM AgentSessions ORDER BY isDefault DESC');
        res.json(agents);
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Atualizar Agente
router.put('/agents/:id', async (req, res) => {
    try {
        const { systemPrompt, model, name, active, isDefault } = req.body;
        const agentId = req.params.id;
        const db = await getDB();
        
        let updates = [];
        let values = [];
        if (systemPrompt !== undefined) { updates.push('systemPrompt = ?'); values.push(systemPrompt); }
        if (model !== undefined) { updates.push('model = ?'); values.push(model); }
        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (active !== undefined) { updates.push('active = ?'); values.push(active); }
        if (isDefault !== undefined) { updates.push('isDefault = ?'); values.push(isDefault); }
        
        if (updates.length > 0) {
            values.push(agentId);
            await db.run(`UPDATE AgentSessions SET ${updates.join(', ')} WHERE id = ?`, values);
        }
        
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;