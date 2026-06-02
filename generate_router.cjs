const fs = require('fs');

const fileContent = `import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { GoogleGenAI } from '@google/genai';
import { supabaseServer as supabase } from './supabaseServer.js';

const router = express.Router();
let ioInstance = null;

export const setSocketIo = (io) => {
    ioInstance = io;
};

// --- Debounce Logic ---
const aiDebounceMap = new Map();

const triggerAIProcessing = async (conversationId) => {
    try {
        const { data: conv } = await supabase.from('chat_conversations').select('*').eq('id', conversationId).maybeSingle();
        
        if (!conv || !conv.ai_enabled) return;

        const { data: messages } = await supabase.from('chat_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(50);
        const { data: agent } = await supabase.from('chat_agent_sessions').select('*').eq('is_default', true).eq('active', true).maybeSingle();
        
        if (!agent) {
             console.log('[Atendimento] Nenhum agente IA configurado.');
             return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        let historyStr = (messages || []).map((m) => \`\${m.direction === 'incoming' ? 'Cliente' : 'Agente IA'}: \${m.content}\`).join('\\n');
        const prompt = \`\${agent.system_prompt}\\n\\nHistórico:\\n\${historyStr}\\n\\nAgente IA (responda de forma concisa e amigável):\`;

        const modelToUse = agent.model === 'gemini-2.5-pro' ? 'gemini-2.5-flash' : (agent.model || 'gemini-2.5-flash');

        try {
            let lastErr = null;
            let replyText = 'Desculpe, não entendi.';
            
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const response = await ai.models.generateContent({
                        model: modelToUse,
                        contents: prompt
                    });
                    replyText = response.text || 'Desculpe, não entendi.';
                    lastErr = null;
                    break;
                } catch (err) {
                    lastErr = err;
                    console.warn(\`[Atendimento] Tentativa \${attempt} falhou no Gemini. Esperando antes de tentar novamente...\`);
                    if (attempt < 3) {
                        await new Promise(res => setTimeout(res, 2000 * attempt));
                    }
                }
            }

            if (lastErr) throw lastErr;

            const messageId = uuidv4();
            const now = new Date().toISOString();

            await supabase.from('chat_messages').insert({ id: messageId, conversation_id: conversationId, direction: 'outgoing', content: replyText, created_at: now });
            
            await supabase.from('chat_conversations').update({ updated_at: now }).eq('id', conversationId);

            // Enviar de volta pela Evolution API se configurada
            if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE) {
                const { data: ct } = await supabase.from('chat_contacts').select('phone').eq('id', conv.contact_id).maybeSingle();
                if (ct) {
                    try {
                        const baseUrl = process.env.EVOLUTION_API_URL.replace(/\\/$/, '');
                        const purePhone = ct.phone.replace(/\\D/g, '');
                        const resp = await fetch(\`\${baseUrl}/message/sendText/\${process.env.EVOLUTION_INSTANCE}\`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': process.env.EVOLUTION_API_KEY,
                                'Authorization': \`Bearer \${process.env.EVOLUTION_API_KEY}\`
                            },
                            body: JSON.stringify({
                                number: purePhone,
                                options: { delay: 1200, presence: 'composing' },
                                textMessage: { text: replyText },
                                text: replyText
                            })
                        });
                        if (!resp.ok) {
                            const errTxt = await resp.text();
                            console.error('[Atendimento] Erro disparando Evolution na IA:', resp.status, errTxt);
                        }
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
        } catch (genErr) {
            console.error('[Atendimento] Erro na requisição do Gemini:', genErr);
            
            let errorMessage = \`[Sistema] Erro no Agente IA: \${genErr.message || 'Falha ao processar.'}\`;
            let fallbackBotMessage = "";

            if (genErr?.status === 429 || String(genErr?.message).includes('429')) {
                errorMessage = \`[Sistema] Limite de IA atingido (Quota 429). Ativando modo bot estático.\`;
                
                const lastMsg = (messages && messages.length > 0) ? messages[messages.length - 1].content.trim() : '';
                
                 if (lastMsg === '1') {
                     fallbackBotMessage = "Perfeito! Transferi seu atendimento para a fila de *Corretores*. Um especialista já vai te atender! 🏡";
                     await supabase.from('chat_conversations').update({ queue: 'Corretores', ai_enabled: false }).eq('id', conversationId);
                     if (ioInstance) ioInstance.emit('atendimento_conversation_update', { conversationId, queue: 'Corretores', aiEnabled: 0 });
                 } else if (lastMsg === '2') {
                     fallbackBotMessage = "Muito bem, transferi você para o *Financeiro*! 💵 Em instantes alguém falará com você.";
                     await supabase.from('chat_conversations').update({ queue: 'Financeiro', ai_enabled: false }).eq('id', conversationId);
                     if (ioInstance) ioInstance.emit('atendimento_conversation_update', { conversationId, queue: 'Financeiro', aiEnabled: 0 });
                 } else if (lastMsg === '3') {
                     fallbackBotMessage = "Certo! O setor *Administrativo* já foi notificado. 📂 Aguarde um instante...";
                     await supabase.from('chat_conversations').update({ queue: 'Administrativo', ai_enabled: false }).eq('id', conversationId);
                     if (ioInstance) ioInstance.emit('atendimento_conversation_update', { conversationId, queue: 'Administrativo', aiEnabled: 0 });
                 } else {
                     fallbackBotMessage = "Olá! Ocorreu um limite no serviço de IA.\\n\\nQual departamento você deseja falar?\\n\\n1️⃣ - Corretores\\n2️⃣ - Financeiro\\n3️⃣ - Administrativo\\n\\n*Digite o número:*";
                 }
            } else {
                await supabase.from('chat_conversations').update({ ai_enabled: false }).eq('id', conversationId);
                if (ioInstance) ioInstance.emit('atendimento_conversation_update', { conversationId, aiEnabled: 0 });
            }

            const messageId = uuidv4();
            const now = new Date().toISOString();

            await supabase.from('chat_messages').insert({ id: messageId, conversation_id: conversationId, direction: 'internal_note', content: errorMessage, created_at: now });
            
            if (ioInstance) {
                ioInstance.emit('atendimento_new_message', {
                    conversationId,
                    message: { id: messageId, direction: 'internal_note', content: errorMessage, createdAt: now }
                });
            }

            if (fallbackBotMessage) {
                const replyId = uuidv4();
                await supabase.from('chat_messages').insert({ id: replyId, conversation_id: conversationId, direction: 'outgoing', content: fallbackBotMessage, created_at: new Date().toISOString() });
                
                if (ioInstance) {
                    ioInstance.emit('atendimento_new_message', { conversationId, message: { id: replyId, direction: 'outgoing', content: fallbackBotMessage, createdAt: new Date().toISOString() }});
                }
                
                if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE) {
                    const { data: conv } = await supabase.from('chat_conversations').select('contact_id').eq('id', conversationId).maybeSingle();
                    if (conv) {
                        const { data: ct } = await supabase.from('chat_contacts').select('phone').eq('id', conv.contact_id).maybeSingle();
                        if (ct) {
                            try {
                                const baseUrl = process.env.EVOLUTION_API_URL.replace(/\\/$/, '');
                                const purePhone = ct.phone.replace(/\\D/g, '');
                                fetch(\`\${baseUrl}/message/sendText/\${process.env.EVOLUTION_INSTANCE}\`, {
                                    method: 'POST',
                                    headers: { 
                                        'Content-Type': 'application/json', 
                                        'apikey': process.env.EVOLUTION_API_KEY,
                                        'Authorization': \`Bearer \${process.env.EVOLUTION_API_KEY}\`
                                    },
                                    body: JSON.stringify({ 
                                        number: purePhone, 
                                        options: { delay: 1000, presence: 'composing' }, 
                                        textMessage: { text: fallbackBotMessage },
                                        text: fallbackBotMessage 
                                    })
                                });
                            } catch (e) {}
                        }
                    }
                }
            }
        }
        
    } catch(err) {
        console.error('[Atendimento] Erro Geral IA Processing:', err);
    }
};

const handleCustomerMessage = (conversationId) => {
    if (aiDebounceMap.has(conversationId)) {
        clearTimeout(aiDebounceMap.get(conversationId));
    }
    const timer = setTimeout(() => {
        aiDebounceMap.delete(conversationId);
        triggerAIProcessing(conversationId);
    }, 5000);
    aiDebounceMap.set(conversationId, timer);
};

// --- Webhook Logs Telemetry ---
export const webhookLogs = [];

const addWebhookLog = (log) => {
    webhookLogs.unshift(log);
    if (webhookLogs.length > 50) webhookLogs.pop();
    if (ioInstance) ioInstance.emit('atendimento_webhook_log_new', log);
};

router.get('/webhook-logs', (req, res) => res.json(webhookLogs));
router.post('/webhook-logs/clear', (req, res) => { webhookLogs.length = 0; res.json({ success: true }); });
router.get('/status-env', (req, res) => {
    res.json({
        EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || '',
        EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY ? 'Configurado (apikey)' : 'Ausente/Não configurado',
        EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE || '',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Configurado' : 'Ausente/Não configurado',
        serverTime: new Date().toISOString()
    });
});

router.post('/webhook', async (req, res) => {
    let rawPayload = req.body;
    if (Array.isArray(rawPayload) && rawPayload.length > 0) rawPayload = rawPayload[0];
    
    let eventName = rawPayload?.event || rawPayload?.event_type || 'message';
    let contactPhone = '';
    let contactName = '';
    let content = '';
    let isOutgoing = false;

    try {
        console.log('[Atendimento] /webhook CHAMADO! Evento:', eventName);
        let channel = 'whatsapp';

        addWebhookLog({
            timestamp: new Date().toISOString(),
            event: eventName || (rawPayload?.event ? String(rawPayload.event) : 'webhook_recebido'),
            sender: rawPayload?.data?.key?.remoteJid?.split('@')[0] || rawPayload?.data?.remoteJid?.split('@')[0] || rawPayload?.sender || rawPayload?.phone || 'Verificando...',
            content: 'Chegou um webhook (clique "Ver Payload JSON" no log)',
            direction: 'incoming',
            success: true,
            payload: rawPayload
        });

        const lowerEvent = eventName?.toLowerCase() || '';
        if (lowerEvent && lowerEvent !== 'messages.upsert' && lowerEvent !== 'mock' && lowerEvent !== 'webhook_recebido' && lowerEvent !== 'message') {
             addWebhookLog({ timestamp: new Date().toISOString(), event: eventName, sender: 'Sistema', content: \`Ignorado: Evento de status (\${eventName})\`, direction: 'incoming', success: true, payload: rawPayload });
             return res.status(200).json({ success: true, message: 'Evento ignorado pois não é uma nova mensagem.' });
        }

        let mainMsgObj = rawPayload?.data?.message || rawPayload?.data?.messages?.[0] || rawPayload?.Message || rawPayload?.message || rawPayload?.data || rawPayload;

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

        let isGroupMsg = false;
        let groupJid = '';
        for (let p of potentialPhones) {
            if (p && typeof p === 'string' && (p.includes('@g.us') || p.includes('@broadcast') || p.includes('status@broadcast'))) {
                isGroupMsg = true; groupJid = p; break;
            }
        }
        
        if (isGroupMsg) {
            addWebhookLog({ timestamp: new Date().toISOString(), event: eventName, sender: String(groupJid).split('@')[0], content: 'Ignorado: Evento de grupo ou status', direction: 'incoming', success: true, payload: rawPayload });
            return res.status(200).json({ success: true, message: 'Ignorado (grupo/broadcast).' });
        }

        for (let p of potentialPhones) {
            if (p && typeof p === 'string' && p.includes('@s.whatsapp.net') && !p.includes(':')) {
                contactPhone = p.split('@')[0]; break;
            }
        }
        if (!contactPhone) {
             for (let p of potentialPhones) {
                if (p && typeof p === 'string' && p.includes('@s.whatsapp.net')) {
                    contactPhone = p.split('@')[0].split(':')[0]; break;
                }
            }
        }
        if (!contactPhone) {
            const strPayload = typeof rawPayload === 'object' ? JSON.stringify(rawPayload) : String(rawPayload);
            const match = strPayload.match(/["']?([^"'\\s]+@s\\.whatsapp\\.net)["']?/);
            if (match && match[1]) {
                contactPhone = match[1].split('@')[0].split(':')[0];
            } else {
                const matchLid = strPayload.match(/["']?([^"'\\s]+@lid)["']?/);
                if (matchLid && matchLid[1]) contactPhone = matchLid[1].split('@')[0].split(':')[0];
            }
        }
        if (!contactPhone) {
            for (let p of potentialPhones) {
                if (p && typeof p === 'string') {
                    let clean = p.split('@')[0].replace(/[^0-9]/g, '');
                    if (clean.length > 5) { contactPhone = clean; break; }
                }
            }
        }

        if (contactPhone) contactPhone = '+' + contactPhone.replace(/[^0-9]/g, '');

        contactName = mainMsgObj?.pushName || rawPayload?.data?.pushName || rawPayload?.pushName || rawPayload?.PushName || rawPayload?.contactName || rawPayload?.name || rawPayload?.senderName || contactPhone || 'Desconhecido';

        isOutgoing = !!(
            mainMsgObj?.key?.fromMe || 
            mainMsgObj?.IsFromMe || 
            mainMsgObj?.fromMe || 
            mainMsgObj?.FromMe || 
            rawPayload?.data?.key?.fromMe || 
            rawPayload?.fromMe || 
            rawPayload?.FromMe || 
            rawPayload?.direction === 'outgoing' || 
            rawPayload?.data?.IsFromMe ||
            (rawPayload?.data?.key?.id && String(rawPayload.data.key.id).startsWith('BAE5')) ||
            (mainMsgObj?.key?.id && String(mainMsgObj.key.id).startsWith('BAE5'))
        );

        const msg = mainMsgObj?.message || mainMsgObj?.Message || mainMsgObj;
        if (msg) {
             if (msg.conversation) content = msg.conversation;
             else if (msg.extendedTextMessage?.text) content = msg.extendedTextMessage.text;
             else if (msg.imageMessage) content = msg.imageMessage.caption || '[Imagem]';
             else if (msg.videoMessage) content = msg.videoMessage.caption || '[Vídeo]';
             else if (msg.documentMessage) content = msg.documentMessage.caption || msg.documentMessage.fileName || '[Documento]';
             else if (msg.audioMessage || msg.pttMessage) content = '[Áudio]';
             else if (msg.stickerMessage) content = '[Figurinha]';
             else if (msg.locationMessage) content = '[Localização]';
             else if (msg.contactMessage) content = '[Contato]';
             else if (msg.reactionMessage) content = \`[Reação: \${msg.reactionMessage?.text || msg.reactionMessage?.reaction || '👍'}]\`;
             else if (msg.buttonsResponseMessage?.selectedDisplayText) content = msg.buttonsResponseMessage.selectedDisplayText;
             else if (msg.listResponseMessage?.title || msg.listResponseMessage?.singleSelectReply?.selectedRowId) content = msg.listResponseMessage?.title || '[Item de Lista]';
             else if (msg.templateButtonReplyMessage?.selectedId) content = msg.templateButtonReplyMessage.selectedId;
             else if (typeof msg === 'string') content = msg;
             else if (msg.text) content = msg.text;
             else if (msg.caption) content = msg.caption;
             else if (msg.body) content = msg.body;
        } 
        
        if (!content) {
             if (rawPayload?.text || rawPayload?.body || rawPayload?.Body) content = rawPayload.text || rawPayload.body || rawPayload.Body;
             else if (rawPayload?.content) content = rawPayload.content;
             else if (rawPayload?.data?.text || rawPayload?.data?.body) content = rawPayload.data.text || rawPayload.data.body;
        }
        
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

        if (!content) {
             const strPayload = typeof rawPayload === 'object' ? JSON.stringify(rawPayload) : String(rawPayload);
             const convMatch = strPayload.match(/"conversation"\\s*:\\s*"([^"]+)"/i) || strPayload.match(/"text"\\s*:\\s*"([^"]+)"/i) || strPayload.match(/"body"\\s*:\\s*"([^"]+)"/i);
             if (convMatch && convMatch[1]) content = convMatch[1];
             else if (strPayload.match(/"imageMessage"/i)) content = '[Imagem]';
             else if (strPayload.match(/"videoMessage"/i)) content = '[Vídeo]';
             else if (strPayload.match(/"audioMessage"/i)) content = '[Áudio]';
             else if (strPayload.match(/"stickerMessage"/i)) content = '[Figurinha]';
        }

        if (!contactPhone || !content) {
            addWebhookLog({ timestamp: new Date().toISOString(), event: eventName, sender: contactPhone || 'Sistema/Status', content: 'Ignorado: Evento de status ou sem metadados suficientes', direction: isOutgoing ? 'outgoing' : 'incoming', success: true, payload: rawPayload });
            return res.status(200).json({ success: true, message: 'Evento ignorado sem mensagem de chat clara.' });
        }

        let { data: contact } = await supabase.from('chat_contacts').select('*').eq('phone', contactPhone).maybeSingle();
        
        const now = new Date().toISOString();
        if (!contact) {
            const contactId = uuidv4();
            await supabase.from('chat_contacts').insert({ id: contactId, name: contactName, phone: contactPhone, created_at: now });
            contact = { id: contactId, name: contactName, phone: contactPhone };
            if (ioInstance) ioInstance.emit('atendimento_new_contact', contact);
        } else {
            if (contactName && contactName !== 'Desconhecido' && !contactName.startsWith('+') && 
               (!contact.name || contact.name === 'Desconhecido' || contact.name.startsWith('+'))) {
                await supabase.from('chat_contacts').update({ name: contactName }).eq('id', contact.id);
                contact.name = contactName;
                if (ioInstance) ioInstance.emit('atendimento_contact_update', contact);
            }
        }

        let { data: conv } = await supabase.from('chat_conversations')
            .select('*')
            .eq('contact_id', contact.id)
            .in('status', ['open', 'pending', 'waiting_customer'])
            .maybeSingle();
            
        // Se retornar array por algum motivo de bug, pega o primeiro
        if (Array.isArray(conv) && conv.length > 0) conv = conv[0];
        
        if (!conv) {
            const convId = uuidv4();
            await supabase.from('chat_conversations').insert({
                id: convId, contact_id: contact.id, channel: channel, status: 'open', ai_enabled: true, created_at: now, updated_at: now
            });
            conv = { id: convId, contact_id: contact.id, channel: channel };
            if (ioInstance) ioInstance.emit('atendimento_new_conversation', conv);
        } else {
            await supabase.from('chat_conversations').update({ updated_at: now }).eq('id', conv.id);
        }

        const messageId = uuidv4();
        let directionToSave = isOutgoing ? 'outgoing' : 'incoming';
        
        let insertMsg = true;
        
        const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
        const { data: recent } = await supabase.from('chat_messages')
            .select('id')
            .eq('conversation_id', conv.id)
            .eq('direction', 'outgoing')
            .eq('content', content)
            .gt('created_at', thirtySecsAgo)
            .maybeSingle();

        if (recent) {
            insertMsg = false;
        }

        if (insertMsg) {
            await supabase.from('chat_messages').insert({
                id: messageId, conversation_id: conv.id, direction: directionToSave, content: content, created_at: now
            });

            if (ioInstance) {
                // Return to frontend with createdAt and conversationId logic
                ioInstance.emit('atendimento_new_message', {
                    conversationId: conv.id,
                    message: { id: messageId, direction: directionToSave, content, createdAt: now } // note createdAt camelCase for frontend support!
                });
                ioInstance.emit('atendimento_conversation_update', { conversationId: conv.id, updatedAt: now });
            }
        }

        if (!isOutgoing) {
            handleCustomerMessage(conv.id);
        }

        addWebhookLog({ timestamp: now, event: eventName, sender: \`\${contactName} (\${contactPhone})\`, content: content, direction: directionToSave, success: true, payload: rawPayload });
        res.json({ success: true });
    } catch(err) {
        console.error('[Atendimento] Webhook Error:', err);
        addWebhookLog({ timestamp: new Date().toISOString(), event: eventName, sender: contactPhone || 'Erro', content: content || 'Erro', direction: 'incoming', success: false, error: err.message || 'Erro interno no processamento', payload: rawPayload });
        res.status(500).json({ error: err.message });
    }
});

// --- API Geral ---

router.get('/conversations', async (req, res) => {
    try {
        const { data: convs, error } = await supabase
            .from('chat_conversations')
            .select(\`*, chat_contacts (*)\`)
            .order('updated_at', { ascending: false });
            
        if (error) throw error;
        
        const mapped = (convs || []).map((c) => ({
             ...c,
             contactName: c.chat_contacts?.name,
             contactPhone: c.chat_contacts?.phone,
             contactCity: c.chat_contacts?.city,
             contactTags: c.chat_contacts?.tags,
             aiEnabled: c.ai_enabled, // mapping for frontend compatibility
             updatedAt: c.updated_at,
             createdAt: c.created_at,
             contactId: c.contact_id
        }));
        
        res.json(mapped);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const { data: messages, error } = await supabase.from('chat_messages').select('*').eq('conversation_id', req.params.id).order('created_at', { ascending: true });
        if (error) throw error;
        
        // Map back to camelCase for frontend
        const mapped = (messages || []).map(m => ({
            ...m,
            conversationId: m.conversation_id,
            createdAt: m.created_at
        }));
        
        res.json(mapped);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/conversations/:id/messages', async (req, res) => {
    try {
        const { content } = req.body;
        const convId = req.params.id;
        
        const now = new Date().toISOString();
        await supabase.from('chat_conversations').update({ ai_enabled: false, updated_at: now }).eq('id', convId);
        
        const messageId = uuidv4();
        await supabase.from('chat_messages').insert({ id: messageId, conversation_id: convId, direction: 'outgoing', content: content, created_at: now });

        if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE) {
            const { data: conv } = await supabase.from('chat_conversations').select('contact_id').eq('id', convId).maybeSingle();
            if (conv) {
                const { data: ct } = await supabase.from('chat_contacts').select('phone').eq('id', conv.contact_id).maybeSingle();
                if (ct) {
                    try {
                        const baseUrl = process.env.EVOLUTION_API_URL.replace(/\\/$/, '');
                        const purePhone = ct.phone.replace(/\\D/g, '');
                        const resp = await fetch(\`\${baseUrl}/message/sendText/\${process.env.EVOLUTION_INSTANCE}\`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': process.env.EVOLUTION_API_KEY,
                                'Authorization': \`Bearer \${process.env.EVOLUTION_API_KEY}\`
                            },
                            body: JSON.stringify({
                                number: purePhone,
                                options: { delay: 1200, presence: 'composing' },
                                textMessage: { text: content },
                                text: content
                            })
                        });
                        if (!resp.ok) {
                            console.error('[Atendimento] Erro disparando Evolution:', resp.status, await resp.text());
                        }
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
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/conversations/:id', async (req, res) => {
    try {
        const { aiEnabled, status, queue } = req.body;
        const convId = req.params.id;
        
        let updates = {};
        if (aiEnabled !== undefined) updates.ai_enabled = aiEnabled;
        if (status !== undefined) updates.status = status;
        if (queue !== undefined) updates.queue = queue;
        
        if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date().toISOString();
            await supabase.from('chat_conversations').update(updates).eq('id', convId);
            
            if (ioInstance) {
                ioInstance.emit('atendimento_conversation_update', { conversationId: convId, aiEnabled, status, queue, updatedAt: updates.updated_at });
            }
        }
        
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/agents', async (req, res) => {
    try {
        const { data: agents, error } = await supabase.from('chat_agent_sessions').select('*').order('is_default', { ascending: false });
        if (error) throw error;
        
        const mapped = (agents || []).map(a => ({
            ...a,
            systemPrompt: a.system_prompt,
            isDefault: a.is_default
        }));
        res.json(mapped);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/agents/:id', async (req, res) => {
    try {
        const { systemPrompt, model, name, active, isDefault } = req.body;
        const agentId = req.params.id;
        
        let updates = {};
        if (systemPrompt !== undefined) updates.system_prompt = systemPrompt;
        if (model !== undefined) updates.model = model;
        if (name !== undefined) updates.name = name;
        if (active !== undefined) updates.active = active;
        if (isDefault !== undefined) updates.is_default = isDefault;
        
        if (Object.keys(updates).length > 0) {
            await supabase.from('chat_agent_sessions').update(updates).eq('id', agentId);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
`;

fs.writeFileSync('src/lib/atendimento-router.ts', fileContent);
