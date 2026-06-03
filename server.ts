import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';

// Configuração para permitir certificados autoassinados da Evolution API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import http from 'http';
import fs from 'fs';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import multer from 'multer';
import sharp from 'sharp';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { handleSimulacaoMCMV } from './src/lib/simuladorMCMV.ts';
import atendimentoRouter, { setSocketIo } from './src/lib/atendimento-router.ts';

let transporter: nodemailer.Transporter | null = null;
async function getTransporter() {

  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 2525, // <-- Mudança principal aqui
      secure: false, // O false é importante para a porta 2525 (usa STARTTLS)
      auth: {
          user: process.env.BREVO_SMTP_LOGIN, // Seu e-mail de login do Brevo
          pass: process.env.BREVO_SMTP_KEY    // A chave SMTP que você gerou
      }
  });
  
  console.log(`[Configuração SMTP] Conectando ao host configurado.`);
  return transporter;
}

import { supabaseServer } from './src/lib/supabaseServer.ts';

// Fix for fetch redefinition error in some environments
const dom = new JSDOM('', { url: 'http://localhost' });
const window = dom.window;
const DOMPurify = createDOMPurify(window as any);
const JWT_SECRET = process.env.JWT_SECRET || 'afefde38-f16e-44de-ab2f-4fb4d50af7b1';

function sanitizeProperty(p: any) {
  if (!p) return p;
  let originalDesc = p.descricao || '';
  let actualDesc = originalDesc;
  let images: string[] = [];
  let tipo = 'Lote'; // default value

  // 1. Parse Image URLs
  if (p.images) {
      if (Array.isArray(p.images)) {
          images = p.images;
      } else if (typeof p.images === 'string') {
          try {
              const parsed = JSON.parse(p.images);
              if (Array.isArray(parsed)) {
                  images = parsed;
              } else if (parsed) {
                  images = [parsed];
              }
          } catch (e) {
              const str = p.images.trim();
              if (str.startsWith('{') && str.endsWith('}')) {
                  images = str.slice(1, -1).split(',').map((s: any) => s.trim().replace(/^['"]|['"]$/g, ''));
              } else if (str) {
                  images = [str];
              }
          }
      }
  }

  // If images empty, try parsing from the raw description
  if (images.length === 0 && typeof originalDesc === 'string' && originalDesc.includes('|||IMAGES:')) {
      const parts = originalDesc.split('|||IMAGES:');
      try {
          const parsed = JSON.parse(parts[1]);
          if (Array.isArray(parsed)) {
              images = parsed;
          }
      } catch (e) {}
  }

  // 2. Parse Type (TIPO) and clean description
  if (typeof originalDesc === 'string') {
      let baseText = originalDesc.split('|||IMAGES:')[0];
      if (baseText.includes('|||TIPO:')) {
          const parts = baseText.split('|||TIPO:');
          actualDesc = parts[0];
          tipo = parts[1] ? parts[1].trim() : 'Lote';
      } else {
          actualDesc = baseText;
          const searchStr = (p.nome + ' ' + actualDesc).toLowerCase();
          if (searchStr.includes('apartamento') || searchStr.includes('apto') || searchStr.includes('edifício')) {
              tipo = 'Apartamento';
          } else if (searchStr.includes('casa') || searchStr.includes('duplex') || searchStr.includes('mansão')) {
              tipo = 'Casa';
          } else if (searchStr.includes('terreno') || searchStr.includes('lote')) {
              tipo = 'Lote';
          } else if (searchStr.includes('galpão') || searchStr.includes('comercial') || searchStr.includes('loja')) {
              tipo = 'Comercial';
          } else if (searchStr.includes('mcmv') || searchStr.includes('minha vida')) {
              tipo = 'Programa Minha Casa Minha Vida (MCMV)';
          }
      }
  }

  return {
    ...p,
    descricao: actualDesc,
    images: images.filter(Boolean),
    tipo: tipo || 'Lote'
  };
}

// Setup Multer Storage (Memory storage to allow sharp compression)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function startServer() {
  console.log('[Imobiliária São Severino] Iniciando servidor...');
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  // Serve media static files explicitly
  app.use('/media', express.static(path.join(process.cwd(), 'public', 'media')));

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false // Allow media loading
  }));
  
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }));

  app.use(express.json());
  
  app.use('/api/atendimento', atendimentoRouter);

  // Socket.io Setup
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    maxHttpBufferSize: 5e7 // 50MB
  });
  
  setSocketIo(io);




  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      if (typeof token === 'string') token = token.trim();
      
      console.log(`[Socket.io] Tentativa de conexão. Token: ${token ? 'Presente' : 'Ausente'}`);
      
      if (!token) {
        return next(new Error('Auth error: Token não fornecido'));
      }

      jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (err) {
          console.error('[Socket.io] Erro na verificação do JWT:', err.message);
          return next(new Error('Auth error: Token inválido ou expirado'));
        }
        
        console.log(`[Socket.io] Autenticado com sucesso: ${decoded.nome} (${decoded.role})`);
        (socket as any).user = decoded;
        next();
      });
    } catch (e) {
      console.error('[Socket.io] Erro crítico no middleware de auth:', e);
      next(new Error('Internal server error during authentication'));
    }
  });

  // Suporte a múltiplas conexões de atendentes
  const onlineStaff = new Set<string>();

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    const userRole = user?.role;
    const userName = user?.nome;
    const userId = user?.id || socket.id;

    onlineStaff.add(`${userName || 'User'}-${userId}`);
    io.emit('monitor_update', { onlineStaffCount: onlineStaff.size, onlineStaff: Array.from(onlineStaff) });
    
    socket.on('disconnect', () => {
      onlineStaff.delete(`${userName || 'User'}-${userId}`);
      io.emit('monitor_update', { onlineStaffCount: onlineStaff.size, onlineStaff: Array.from(onlineStaff) });
    });
  });

  const OFFICIAL_PIX_KEY = "10.970.117/0001-51";

  // Auto-seed admin removed as per request

  try {
    const { count: propertyCount, error: propCountError } = await supabaseServer.from('properties').select('*', { count: 'exact', head: true });
    if (propCountError) {
      console.error('[Supabase] Erro ao verificar tabela properties:', propCountError.message);
    } else if (propertyCount === 0) {
      console.log('[Supabase] Tabela properties vazia. Criando imóveis padrão...');
      const { error: propInsertError } = await supabaseServer.from('properties').insert([
        { id: 1, nome: 'Edifício Solaris - Apto 402', valor: 250000, status: 'DISPONÍVEL', localizacao: 'Boa Viagem, Recife - PE', descricao: 'Apartamento com 2 quartos, sendo 1 suíte.' },
        { id: 2, nome: 'Residencial Aurora - Casa 12', valor: 380000, status: 'DISPONÍVEL', localizacao: 'Aldeia, Camaragibe - PE', descricao: 'Casa duplex com 3 suítes.' }
      ]);
      if (propInsertError) {
        console.error('[Supabase] Erro ao criar imóveis padrão:', propInsertError.message);
      }
    }
  } catch (err: any) {
    console.error('[Supabase Properties Seed Error]', err);
  }

  const mapContract = (c: any) => ({
    ...c,
    clientId: c.client_id,
    propertyId: c.property_id,
    valorImovel: c.valor_imovel,
    valorEntrada: c.valor_entrada,
    valorFinanciado: c.valor_financiado,
    taxaJuros: c.taxa_juros,
    numParcelas: c.num_parcelas,
    tipoAmortizacao: c.tipo_amortizacao,
    dataInicio: c.data_inicio,
    dataContrato: c.data_contrato
  });

  const mapLog = (l: any) => ({
    ...l,
    taxaAntiga: l.taxa_antiga,
    taxaNova: l.taxa_nova,
    contratoId: l.contrato_id
  });

  // API Routes
  app.post('/api/simulacao-mcmv', handleSimulacaoMCMV);

  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      const { jid, text } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const mediaUrl = `/media/${file.filename}`;
      
      res.json({ success: true, url: mediaUrl });
    } catch (e) {
      console.error('[Upload API]', e);
      res.status(500).json({ error: 'Erro ao processar mídia' });
    }
  });

  app.get('/api/pix-code/:contractId/:installmentNum', async (req, res) => {
    const { contractId, installmentNum } = req.params;
    const { data: contractRaw, error } = await supabaseServer.from('contracts').select('*').eq('id', Number(contractId)).maybeSingle();
    
    if (error || !contractRaw) return res.status(404).json({ error: "Contrato não encontrado" });
    const contract = mapContract(contractRaw);

    const installment = contract.installments.find((i: any) => i.numero === Number(installmentNum));
    if (!installment) return res.status(404).json({ error: "Parcela não encontrada" });

    const amount = (installment.valorTotal || 0).toFixed(2);
    const key = OFFICIAL_PIX_KEY.replace(/\D/g, ''); // 10970117000151 (14 digits)
    
    // Static PIX Payload segments
    const gui = "0014br.gov.bcb.pix";
    const pixKey = `0114${key}`;
    const merchantInfo = `26${(gui.length + pixKey.length).toString().padStart(2, '0')}${gui}${pixKey}`;
    const amountField = `54${amount.length.toString().padStart(2, '0')}${amount}`;
    
    // Payload construction
    // 000201 (version)
    // 26... (merchant)
    // 52040000 (MCC)
    // 5303986 (Currency BRL)
    // 54... (Amount)
    // 5802BR (Country)
    // 5910SS_IMOVEIS (Name)
    // 6006RECIFE (City)
    // 62070503*** (Transaction ID)
    // 6304 (CRC16 start)
    const basePayload = `000201${merchantInfo}520400005303986${amountField}5802BR5910SS_IMOVEIS6006RECIFE62070503***6304`;
    
    // CRC16-CCITT (0x1021)
    function crc16(data: string) {
        let crc = 0xFFFF;
        for (let i = 0; i < data.length; i++) {
            crc ^= data.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if ((crc & 0x8000) !== 0) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc <<= 1;
                }
            }
        }
        return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    }

    const pixCode = `${basePayload}${crc16(basePayload)}`; 
    
    res.json({ pixCode });
  });

  const verificationCodes = new Map<string, { code: string, expiry: number }>();

  const passwordResetCodes = new Map<string, { code: string, expiry: number }>();

  app.post('/api/auth/reset-password-request', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });
    
    const message = `Caso exista uma conta com e-mail ${email} você receberá um e-mail para recuperar sua senha.`;

    // check if it's client or user
    const { data: client } = await supabaseServer.from('clients').select('id, email').eq('email', email).maybeSingle();
    const { data: user } = await supabaseServer.from('users').select('id, email').or(`email.eq.${email},matricula.eq.${email}`).maybeSingle();

    const targetEmail = client?.email || user?.email;

    if (!targetEmail) {
      return res.json({ message });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    passwordResetCodes.set(email, { code, expiry: Date.now() + 15 * 60 * 1000 });

    try {
      const tp = await getTransporter();
      await tp.sendMail({
          from: { name: 'Imobiliária São Severino', address: process.env.SMTP_FROM_EMAIL || 'alvesluizsamuel@gmail.com' },
          to: targetEmail,
          subject: 'Recuperação de Senha',
          html: `<p>Seu código para recuperar a senha é: <strong>${code}</strong></p><p>Ele expira em 15 minutos.</p>`
      });
      
      res.json({ 
        message, 
        devCode: (!process.env.BREVO_SMTP_LOGIN && process.env.NODE_ENV !== 'production') ? code : undefined 
      });
    } catch(e: any) {
      console.error('[Mail Error]', e);
      res.status(500).json({ error: 'Erro ao enviar e-mail de recuperação: ' + e.message });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    let { email, code, newPassword } = req.body;
    email = email?.trim();
    newPassword = newPassword?.trim();
    code = code?.trim();
    const entry = passwordResetCodes.get(email);
    if (!entry || entry.code !== code || Date.now() > entry.expiry) {
       return res.status(400).json({ error: 'Código inválido ou expirado.' });
    }
    
    // check client
    const { data: client } = await supabaseServer.from('clients').select('id').or(`email.eq.${email},matricula.eq.${email}`).maybeSingle();
    let updated = false;
    if (client) {
       const { error: err1 } = await supabaseServer.from('clients').update({ senha: newPassword }).eq('id', client.id);
       if (!err1) updated = true;
    }
    
    // check user
    const { data: user } = await supabaseServer.from('users').select('id').or(`email.eq.${email},matricula.eq.${email}`).maybeSingle();
    if (user) {
       const { error: err2 } = await supabaseServer.from('users').update({ senha: newPassword }).eq('id', user.id);
       if (!err2) updated = true;
    }

    if (updated) {
       passwordResetCodes.delete(email);
       res.json({ success: true, message: 'Senha atualizada com sucesso.' });
    } else {
       res.status(404).json({ error: 'Usuário não encontrado ou erro ao atualizar senha no banco de dados.' });
    }
  });

  app.post('/api/auth/send-code', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });
    
    try {
      const { data: existing } = await supabaseServer.from('clients').select('id').eq('email', email).maybeSingle();
      if (existing) return res.status(400).json({ error: 'E-mail já vinculado a outra conta.' });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      verificationCodes.set(email, { code, expiry: Date.now() + 10 * 60 * 1000 });
      
      try {
        const mailTransporter = await getTransporter();
        await mailTransporter.sendMail({
          from: { name: 'Imobiliária São Severino', address: process.env.SMTP_FROM_EMAIL || 'alvesluizsamuel@gmail.com' },
          to: email,
          subject: 'Seu código de verificação - Imobiliária São Severino',
          text: `Olá!\n\nSeu código de verificação é: ${code}\n\nEste código é válido por 10 minutos.`,
          html: `<div style="font-family: sans-serif; text-align: center; padding: 40px 20px; color: #333; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto;">
                   <h1 style="color: #1d4ed8; font-size: 24px; margin-bottom: 8px; margin-top: 0;">Imobiliária São Severino</h1>
                   <h2 style="font-size: 20px; margin-bottom: 24px; font-weight: normal; margin-top: 0;">Código de Verificação</h2>
                   <p style="margin-bottom: 12px; font-size: 16px;">Utilize o código abaixo para continuar seu cadastro:</p>
                   <div style="background-color: #ffffff; padding: 24px 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #0f172a; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                     ${code}
                   </div>
                   <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">Este código expira em 10 minutos.</p>
                 </div>`
        });
      } catch (emailErr: any) {
        console.error('[Email Setup Erro]', emailErr);
        return res.status(500).json({ error: 'Erro ao enviar e-mail de código: ' + emailErr.message });
      }
      
      res.json({ 
        message: 'Código enviado com sucesso! Verifique sua caixa de entrada.',
        // Apenas exibe o devCode se não houver SMTP configurado para facilitar os testes, ou remova isso totalmente se for estrito
        devCode: (!process.env.BREVO_SMTP_LOGIN && process.env.NODE_ENV !== 'production') ? code : undefined 
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao enviar código de verificação.' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    const { nome, email, telefone, senha, code } = req.body;
    try {
      if (!code) return res.status(400).json({ error: 'Código de verificação obrigatório.' });
      
      const verification = verificationCodes.get(email);
      if (!verification || verification.code !== code || verification.expiry < Date.now()) {
        return res.status(400).json({ error: 'Código de verificação inválido ou expirado.' });
      }

      // Consome o código
      verificationCodes.delete(email);

      const { data: existing } = await supabaseServer.from('clients').select('id').eq('email', email).maybeSingle();
      if (existing) return res.status(400).json({ error: 'E-mail já vinculado a outra conta.' });

      const year = new Date().getFullYear();
      const { count } = await supabaseServer.from('clients').select('*', { count: 'exact', head: true });
      const nextIdNum = (count || 0) + 1;
      const matricula = `C${year}${String(nextIdNum).padStart(4, '0')}`;
      
      const { data: newClient, error: clientError } = await supabaseServer.from('clients').insert({
          nome, email, telefone, matricula, senha
      }).select().maybeSingle();

      if (clientError) return res.status(500).json({ error: clientError.message });
      
      const { error: userError } = await supabaseServer.from('users').insert({
          nome, email, matricula, role: 'CLIENTE', senha
      });
      if (userError) return res.status(500).json({ error: userError.message });
      
      res.json(newClient);
    } catch (err: any) {
      res.status(500).json({ error: 'Erro no auto-cadastro: ' + err.message });
    }
  });

  app.post('/api/login', async (req, res) => {
    let { matricula, senha } = req.body;
    matricula = matricula?.trim();
    senha = senha?.trim();
    try {
      if (matricula && matricula.includes('@')) {
          const { data: client } = await supabaseServer
              .from('clients')
              .select('matricula')
              .eq('email', matricula)
              .maybeSingle();
              
          if (client && client.matricula) {
              matricula = client.matricula;
          } else {
              // Verifica se é um usuário/staff
              const { data: userByEmail } = await supabaseServer
                  .from('users')
                  .select('matricula')
                  .eq('email', matricula)
                  .maybeSingle();
              
              if (userByEmail && userByEmail.matricula) {
                  matricula = userByEmail.matricula;
              } else {
                  return res.status(401).json({ error: 'E-mail não encontrado ou credenciais inválidas' });
              }
          }
      }

      const { data: user, error } = await supabaseServer
          .from('users')
          .select('*')
          .eq('matricula', matricula)
          .eq('senha', senha)
          .maybeSingle();
      
      if (error) {
        console.error('[Login Error] Supabase query error:', error.message);
        return res.status(401).json({ error: 'Erro na autenticação ou tabela não encontrada', details: error.message });
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign({ id: user.id, nome: user.nome, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ user, token });
    } catch (err: any) {
      console.error('[Login Error] Crash:', err);
      res.status(500).json({ error: 'Erro interno no servidor de login', details: err.message });
    }
  });

  app.post('/api/staff', async (req, res) => {
    const { nome, email, matricula, senha, role } = req.body;
    console.log(`[Staff API] Cadastrando: ${nome}, Role: ${role}`);
    
    // Ensure matricula is provided
    if (!matricula) {
        return res.status(400).json({ error: 'Matrícula é obrigatória.' });
    }
    
    const { data: newUser, error } = await supabaseServer.from('users').insert({
        nome,
        email,
        matricula,
        role: role || 'CORRETOR_ATENDIMENTO',
        senha
    }).select().maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!newUser) return res.status(500).json({ error: 'Erro ao criar usuário: nenhum dado retornado.' });
    res.json(newUser);
  });

  app.post('/api/clients', async (req, res) => {
    const { nome, email, telefone, senha } = req.body;
    console.log('[API] Cadastrando cliente:', { nome, email, telefone });
    const year = new Date().getFullYear();
    
    try {
      if (email) {
          const { data: existing } = await supabaseServer.from('clients').select('id').eq('email', email).maybeSingle();
          if (existing) return res.status(400).json({ error: 'E-mail já vinculado a outra conta.' });
      }

      const { count } = await supabaseServer.from('clients').select('*', { count: 'exact', head: true });
      const nextIdNum = (count || 0) + 1;
      const matricula = `C${year}${String(nextIdNum).padStart(4, '0')}`;
      
      const { data: newClient, error: clientError } = await supabaseServer.from('clients').insert({
          nome,
          email,
          telefone,
          matricula,
          senha
      }).select().maybeSingle();

      if (clientError) {
        console.error('[Supabase Client Error]', clientError);
        return res.status(500).json({ error: clientError.message });
      }
      if (!newClient) return res.status(500).json({ error: 'Erro ao criar cliente: nenhum dado retornado.' });
      
      // Also add to users for login
      await supabaseServer.from('users').insert({
          nome,
          email,
          matricula,
          role: 'CLIENTE',
          senha
      });
      
      res.json(newClient);
    } catch (err: any) {
      console.error('[Client API Crash]', err);
      res.status(500).json({ error: 'Erro interno ao cadastrar cliente: ' + err.message });
    }
  });

  app.put('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, telefone, email } = req.body;
    
    const { data: client, error: updateError } = await supabaseServer
        .from('clients')
        .update({ nome, telefone, email })
        .eq('id', Number(id))
        .select()
        .maybeSingle();
        
    if (updateError || !client) return res.status(404).json({ error: 'Cliente não encontrado ou erro no update' });
    
    // Sync with users table
    await supabaseServer.from('users').update({ nome, email }).eq('matricula', client.matricula);
    
    res.json(client);
  });

  app.delete('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    try {
      // Find the client to get their matricula
      const { data: client, error: findError } = await supabaseServer
        .from('clients')
        .select('matricula')
        .eq('id', Number(id))
        .maybeSingle();

      if (findError) {
        return res.status(500).json({ error: 'Erro ao localizar cliente para exclusão' });
      }

      // If they have a matricula, delete from users
      if (client?.matricula) {
        await supabaseServer.from('users').delete().eq('matricula', client.matricula);
      }

      const { error: deleteError } = await supabaseServer
        .from('clients')
        .delete()
        .eq('id', Number(id));

      if (deleteError) {
        return res.status(500).json({ error: 'Erro ao excluir o cliente da tabela clients: ' + deleteError.message });
      }

      res.json({ success: true, message: 'Cliente e credenciais removidos' });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro interno ao excluir cliente: ' + err.message });
    }
  });

  app.get('/api/contracts/:id/cancellation-summary', async (req, res) => {
    const { id } = req.params;
    const { data: contractRaw, error } = await supabaseServer.from('contracts').select('*').eq('id', Number(id)).maybeSingle();
    
    if (error || !contractRaw) return res.status(404).json({ error: 'Contrato não encontrado' });
    const contract = mapContract(contractRaw);

    res.json({
      totalPaid: 0,
      option50: 0,
      option80: 0,
    });
  });

  app.post('/api/contracts/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const { data: contractRaw, error } = await supabaseServer.from('contracts').select('*').eq('id', Number(id)).maybeSingle();
    
    if (error || !contractRaw) return res.status(404).json({ error: 'Contrato não encontrado' });
    const contract = mapContract(contractRaw);
    if (contract.status === 'DISTRATADO') return res.status(400).json({ error: 'Contrato já distratado' });

    const updatedDistrato = {
      data: new Date().toISOString().split('T')[0],
      pdfs: contract.distrato?.pdfs || []
    };

    await supabaseServer.from('contracts').update({
        status: 'DISTRATADO',
        distrato: updatedDistrato
    }).eq('id', Number(id));

    // Liberar imóvel novamente
    await supabaseServer.from('properties').update({ status: 'DISPONÍVEL' }).eq('id', contract.property_id);

    await supabaseServer.from('update_logs').insert({
      tipo: 'DISTRATO',
      descricao: `Contrato ${id} cancelado via distrato simples.`
    });

    res.json({ ...contract, status: 'DISTRATADO', distrato: updatedDistrato });
  });

  // Helper for storing interest leads locally as a fallback
  const getLocalInteresses = (): any[] => {
    const filePath = path.join(process.cwd(), 'public', 'media', 'interesses.json');
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('[Interesse] Erro ao ler interesses.json local', e);
    }
    return [];
  };

  const saveLocalInteresses = (interesses: any[]) => {
    const dir = path.join(process.cwd(), 'public', 'media');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'interesses.json');
    try {
      fs.writeFileSync(filePath, JSON.stringify(interesses, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Interesse] Erro ao salvar interesses.json local', e);
    }
  };

  app.get('/api/interesse', async (req, res) => {
    try {
      // Try to read from Supabase
      const { data, error } = await supabaseServer.from('imoveis_interessados').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        // Map to standard layout names
        const mapped = data.map((item: any) => ({
          id: item.id,
          imovelId: item.imovel_id,
          imovelNome: item.imovel_nome,
          imovelValor: item.imovel_valor,
          imovelLocalizacao: item.imovel_localizacao,
          nome: item.nome,
          telefone: item.telefone,
          email: item.email,
          created_at: item.created_at
        }));
        return res.json(mapped);
      }
    } catch (sbErr) {
      console.log('[Supabase] Erro ao ler de imoveis_interessados table, reverting to local interesses.json', sbErr);
    }

    // Fallback: Read from local storage
    const local = getLocalInteresses().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(local);
  });

  app.delete('/api/interesse/:id', async (req, res) => {
    const id = Number(req.params.id);
    try {
      // Remove from local file
      const local = getLocalInteresses();
      const updated = local.filter((item: any) => Number(item.id) !== id);
      saveLocalInteresses(updated);

      // Try to delete from Supabase
      try {
        await supabaseServer.from('imoveis_interessados').delete().eq('id', id);
      } catch (sbErr) {
        console.log('[Supabase] Erro ao apagar lead no Supabase', sbErr);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error('[API] Erro ao deletar interessado', err);
      res.status(500).json({ error: 'Erro ao deletar interessado' });
    }
  });

  app.post('/api/interesse', async (req, res) => {
    const { imovelId, imovelNome, imovelValor, imovelLocalizacao, nome, telefone, email } = req.body;
    try {
       // Save locally
       const interesses = getLocalInteresses();
       const newId = Date.now();
       const newLead = {
         id: newId,
         imovelId: imovelId ? Number(imovelId) : null,
         imovelNome,
         imovelValor: imovelValor ? Number(imovelValor) : null,
         imovelLocalizacao,
         nome,
         telefone,
         email,
         created_at: new Date().toISOString()
       };
       interesses.push(newLead);
       saveLocalInteresses(interesses);

       // Try to save to Supabase
       try {
         await supabaseServer.from('imoveis_interessados').insert({
           id: newId,
           imovel_id: imovelId ? Number(imovelId) : null,
           imovel_nome: imovelNome,
           imovel_valor: imovelValor ? Number(imovelValor) : null,
           imovel_localizacao: imovelLocalizacao,
           nome,
           telefone,
           email,
           created_at: new Date().toISOString()
         });
       } catch (sbErr) {
         console.log('[Supabase] imoveis_interessados table not available or error:', sbErr);
       }

       const tp = await getTransporter();
       
       // Alert admin
       await tp.sendMail({
           from: { name: 'Imobiliária São Severino', address: process.env.SMTP_FROM_EMAIL || 'alvesluizsamuel@gmail.com' },
           to: process.env.ADMIN_EMAIL || 'admin@ssimoveis.com',
           subject: 'Novo Lead Recebido!',
           html: `<h2>Novo Interesse em Imóvel</h2>
                  <p><strong>Cliente:</strong> ${nome}</p>
                  <p><strong>Telefone:</strong> ${telefone}</p>
                  <p><strong>E-mail:</strong> ${email || 'Não informado'}</p>
                  <p><strong>Imóvel:</strong> ${imovelNome} (ID: ${imovelId})</p>`
       }).catch(e => console.log('[SMTP] Error sending admin alert', e));

       // Send technical sheet to client if email is provided
       if (email) {
           await tp.sendMail({
               from: { name: 'Imobiliária São Severino', address: process.env.SMTP_FROM_EMAIL || 'alvesluizsamuel@gmail.com' },
               to: email,
               subject: `Detalhes do Imóvel: ${imovelNome}`,
               html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2>Olá, ${nome}!</h2>
                        <p>Obrigado pelo seu interesse no imóvel <strong>${imovelNome}</strong>.</p>
                        <hr style="border: 1px solid #eee; margin: 20px 0;" />
                        <h3>Ficha Técnica</h3>
                        <p><strong>Nome:</strong> ${imovelNome}</p>
                        <p><strong>Localização:</strong> ${imovelLocalizacao || 'Não informada'}</p>
                        <p><strong>Valor Estimado:</strong> R$ ${Number(imovelValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <hr style="border: 1px solid #eee; margin: 20px 0;" />
                        <p>Nossa equipe entrará em contato com você em breve através do telefone ${telefone} para agendar uma visita e tirar suas dúvidas.</p>
                        <p>Atenciosamente,</p>
                        <p><strong>Equipe Imobiliária São Severino</strong></p>
                      </div>`
           }).catch(e => console.log('[SMTP] Error sending client interest detail', e));
       }

       res.json({ success: true, data: newLead });
    } catch(err: any) {
       console.error('[Email] Erro ao registrar interesse', err);
       res.status(500).json({ error: 'Erro ao registrar interesse e notificar' });
    }
  });

  app.get('/api/imagens-disponiveis', async (req, res) => {
    try {
      const dirPath = path.join(process.cwd(), 'public', 'assets', 'imoveis');
      if (!fs.existsSync(dirPath)) {
        // Return empty if it doesn't exist yet
        return res.json([]);
      }
      const files = fs.readdirSync(dirPath);
      // Filter out hidden files or non-images if necessary
      const imageFiles = files
        .filter(f => !f.startsWith('.') && /\.(png|jpe?g|gif|webp)$/i.test(f));
      res.json(imageFiles);
    } catch (err: any) {
      console.error('[Imagens] Erro ao listar imagens', err);
      res.status(500).json({ error: 'Erro ao listar imagens' });
    }
  });

  app.post('/api/properties', upload.any(), async (req, res) => {
    try {
      const { nome, valor, localizacao, descricao, tipo, imagemSelecionada } = req.body;
      
      const imageUrls: string[] = [];
      if (imagemSelecionada) {
         imageUrls.push(imagemSelecionada);
      }
      
      let finalDesc = (descricao || 'Sem descrição detalhada');
      if (tipo) {
         finalDesc += '|||TIPO:' + tipo;
      }
      if (imageUrls.length > 0) {
         finalDesc += '|||IMAGES:' + JSON.stringify(imageUrls);
      }
      
      const { data: newProperty, error } = await supabaseServer.from('properties').insert({ 
        nome, 
        valor: Number(valor),
        localizacao: localizacao || 'Não informada',
        descricao: finalDesc,
        status: 'DISPONÍVEL',
        images: imageUrls
      }).select().maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      if (!newProperty) return res.status(500).json({ error: 'Erro ao criar imóvel: nenhum dado retornado.' });
      
      res.json(sanitizeProperty(newProperty));
    } catch (err: any) {
      console.error('[Properties POST Error]', err);
      res.status(500).json({ error: 'Erro no servidor: ' + err.message });
    }
  });

  app.put('/api/properties/:id', upload.any(), async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, valor, localizacao, descricao, tipo, imagemSelecionada } = req.body;
      
      let imageUrls: string[] = [];
      if (imagemSelecionada) {
         imageUrls.push(imagemSelecionada);
      }
      
      let finalDesc = descricao || '';
      if (tipo) {
         finalDesc += '|||TIPO:' + tipo;
      }
      if (imageUrls.length > 0) {
         finalDesc += '|||IMAGES:' + JSON.stringify(imageUrls);
      }

      const { data: updatedProperty, error } = await supabaseServer.from('properties').update({
         nome, 
         valor: Number(valor), 
         localizacao, 
         descricao: finalDesc,
         images: imageUrls
      }).eq('id', Number(id)).select().maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      if (!updatedProperty) return res.status(404).json({ error: 'Imóvel não encontrado.' });
      
      res.json(sanitizeProperty(updatedProperty));
    } catch (err: any) {
      console.error('[Properties PUT Error]', err);
      res.status(500).json({ error: 'Erro no servidor: ' + err.message });
    }
  });

  app.delete('/api/properties/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabaseServer.from('properties').delete().eq('id', Number(id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete('/api/staff/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabaseServer.from('users').delete().eq('id', Number(id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });


  let inMemoryMaterials: any[] = [];
  let inMemoryMovements: any[] = [];
  let materialIdCounter = 1;
  let movementIdCounter = 1;



  app.get('/api/public-properties', async (req, res) => {
    try {
      const { data: properties, error } = await supabaseServer.from('properties')
        .select('*')
        .eq('status', 'DISPONÍVEL');
      if (error) {
        throw error;
      }
      const mapped = (properties || []).map(p => sanitizeProperty(p));
      res.json(mapped);
    } catch (e: any) {
      console.error('[Public Properties Error]:', e);
      res.status(500).json({ error: e.message || 'Erro ao carregar imóveis' });
    }
  });

  app.get('/api/data', async (req, res) => {
    try {
      const { data: clients, error: errClients } = await supabaseServer.from('clients').select('*');
      if (errClients) throw errClients;
      const { data: properties, error: errProp } = await supabaseServer.from('properties').select('*');
      if (errProp) throw errProp;
      const sanitizedProperties = (properties || []).map(p => sanitizeProperty(p));
      const { data: contracts, error: errCont } = await supabaseServer.from('contracts').select('*');
      if (errCont) throw errCont;
      const { data: staff, error: errStaff } = await supabaseServer.from('users').select('*').neq('role', 'CLIENTE');
      if (errStaff) throw errStaff;
      const { data: updateLogs, error: errLogs } = await supabaseServer.from('update_logs').select('*');
      if (errLogs) throw errLogs;
      const { data: comissoes, error: errCom } = await supabaseServer.from('comissoes').select('*').order('data_criacao', { ascending: false });
      if (errCom) console.warn("Comissoes table error (ignoring):", errCom.message);
      
      // Attempt to select materials, if it fails gracefully fallback to inMemory arrays
      let materials = [];
      let materialMovements = [];
      try {
          const { data: mats, error: errMats } = await supabaseServer.from('materials').select('*');
          const { data: movs, error: errMovs } = await supabaseServer.from('material_movements').select('*, materials(nome)');
          if (!errMats && typeof errMats !== 'undefined') materials = mats || [];
          else throw new Error("materials table missing");
          if (!errMovs && typeof errMovs !== 'undefined') materialMovements = movs || [];
          else throw new Error("material_movements table missing");
      } catch (e: any) {
          console.warn("Materials table missed (using fallback):", e.message);
          materials = inMemoryMaterials;
          materialMovements = inMemoryMovements;
      }

      const mapContract = (c: any) => ({
        ...c,
        clientId: c.client_id,
        propertyId: c.property_id,
        valorImovel: c.valor_imovel,
        valorEntrada: c.valor_entrada,
        taxaJuros: c.taxa_juros,
        numParcelas: c.num_parcelas,
        tipoAmortizacao: c.tipo_amortizacao,
        valorFinanciado: c.valor_financiado,
        dataContrato: c.data_contrato,
        dataInicioPagamento: c.data_inicio_pagamento,
        tipoContrato: c.tipo_contrato,
        statusFinanceiro: c.status_financeiro,
      });
    
    const mapLog = (l: any) => ({
      ...l,
      dataAtualizacao: l.data_atualizacao,
      taxaAnterior: l.taxa_anterior,
      taxaNova: l.taxa_nova,
      contratoId: l.contrato_id
    });
    
    const mappedProperties = (properties || []).map(p => sanitizeProperty(p));

    res.json({
        clients: clients || [],
        properties: mappedProperties,
        contracts: (contracts || []).map(mapContract),
        staff: staff || [],
        materials: materials,
        materialMovements: materialMovements,
        updateLogs: (updateLogs || []).map(mapLog),
        comissoes: comissoes || []
    });
    } catch (e: any) {
        console.error("ERRO FATAL EM /api/data:", e);
        res.status(500).json({ error: e.message || "Erro interno no servidor" });
    }
  });

  app.get('/api/supabase-test', async (req, res) => {
    try {
      const { data, error } = await supabaseServer.from('clients').select('count', { count: 'exact', head: true });
      if (error) throw error;
      res.json({ success: true, message: 'Conectado ao Supabase!', data });
    } catch (err: any) {
      console.error('[Supabase Test Error]', err);
      res.status(500).json({ success: false, error: err.message, hint: 'Certifique-se de que a tabela "clients" existe e as chaves estão corretas.' });
    }
  });



  app.post('/api/contracts', upload.array('files', 5), async (req, res) => {
    console.log('[API] Registrando contrato:', req.body);
    const { clientId, propertyId, valorImovel, corretorMatricula, tipoContrato } = req.body;
    
    const files = req.files as Express.Multer.File[];
    const pdfUrls: string[] = [];
    if (files && files.length > 0) {
       const dir = path.join(process.cwd(), 'public', 'media');
       if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
       for (const file of files) {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.pdf';
          const outPath = path.join(dir, uniqueSuffix);
          fs.writeFileSync(outPath, file.buffer);
          pdfUrls.push(`/media/${uniqueSuffix}`);
       }
    }

    if (!clientId || !propertyId || !corretorMatricula) {
      return res.status(400).json({ error: 'Cliente, Imóvel e Corretor são obrigatórios' });
    }

    const finalTipoContrato = tipoContrato || 'VENDA';

    const insertData: any = {
      client_id: Number(clientId),
      property_id: Number(propertyId),
      corretor_matricula: corretorMatricula,
      valor_imovel: Number(valorImovel) || 0,
      status: 'ATIVO',
      data_contrato: new Date().toISOString(),
      tipo_contrato: finalTipoContrato,
      status_financeiro: 'ATIVO'
    };

    if (pdfUrls.length > 0) {
       insertData.distrato = { pdfs: pdfUrls }; // Temporary use of 'distrato' column to skip db schema changes
    }

    const { data: newContract, error } = await supabaseServer.from('contracts').insert(insertData).select().maybeSingle();

    if (error) {
      console.error('[Supabase Contract Insert Error] Full Error:', JSON.stringify(error, null, 2));
      return res.status(500).json({ 
        error: 'Erro no banco de dados ao criar contrato: ' + error.message, 
        details: error.details,
      });
    }
    
    if (!newContract) {
      return res.status(500).json({ error: 'Falha ao criar contrato: Nenhum dado retornado do banco.' });
    }

    // Gerar Comissão Automatizada
    let regraAplicada = 'Manual';
    let valorComissao = 0;

    if (finalTipoContrato === 'Lote') {
        regraAplicada = 'Lote (Valor Fixo)';
        valorComissao = 250.00;
    } else if (finalTipoContrato === 'Aluguel') {
        regraAplicada = 'Aluguel (15%)';
        valorComissao = Number(valorImovel) * 0.15;
    } else if (finalTipoContrato.includes('Minha Casa Minha Vida') || finalTipoContrato.includes('MCMV')) {
        regraAplicada = 'MCMV (0,5%)';
        valorComissao = Number(valorImovel) * 0.005;
    } else if (finalTipoContrato.includes('Terceiros')) {
        regraAplicada = 'Imóvel de Terceiros (Definir Valor)';
        valorComissao = 0;
    } else {
        regraAplicada = `${finalTipoContrato} (1%)`;
        valorComissao = Number(valorImovel) * 0.01;
    }

    const { error: comissaoError } = await supabaseServer.from('comissoes').insert({
        contrato_id: newContract.id,
        cliente_id: Number(clientId),
        imovel_id: Number(propertyId),
        corretor_matricula: corretorMatricula,
        regra_aplicada: regraAplicada,
        valor_comissao: valorComissao,
        valor_calculado: valorComissao,
        valor_personalizado: valorComissao > 0 ? valorComissao : null,
        status: 'PENDENTE'
    });

    if (comissaoError) {
        console.error('[Commission Alert] Não foi possível salvar comissão autom.', comissaoError);
    }

    // Marcar imóvel como vendido
    const { error: propError } = await supabaseServer.from('properties').update({ status: 'VENDIDO' }).eq('id', Number(propertyId));
    if (propError) {
      console.warn('[Supabase Property Update Warning]', propError.message);
    }

    res.json(mapContract(newContract));
  });

  // Materials APIs
  app.post('/api/materials', async (req, res) => {
      const { nome, unidade_medida, qtd_volumes, fator_multiplicador, estoque_minimo, categoria } = req.body;
      const saldo_unidades = Number(qtd_volumes) * Number(fator_multiplicador);
      
      try {
          const { data: newMat, error } = await supabaseServer.from('materials').insert({
             nome, unidade_medida, qtd_volumes: Number(qtd_volumes), fator_multiplicador: Number(fator_multiplicador), saldo_unidades, estoque_minimo: Number(estoque_minimo), categoria
          }).select().maybeSingle();
          
          if (error) throw error;
          
          await supabaseServer.from('material_movements').insert({
              material_id: newMat.id,
              tipo_operacao: 'ENTRADA',
              quantidade: saldo_unidades,
              funcionario_matricula: 'ADMIN',
              justificativa: 'Cadastro inicial de material'
          });
          res.json(newMat);
      } catch (err: any) {
          // Fallback in memory
          const mat = { id: materialIdCounter++, nome, unidade_medida, qtd_volumes: Number(qtd_volumes), fator_multiplicador: Number(fator_multiplicador), saldo_unidades, estoque_minimo: Number(estoque_minimo), categoria, created_at: new Date().toISOString() };
          inMemoryMaterials.push(mat);
          const mov = { id: movementIdCounter++, material_id: mat.id, tipo_operacao: 'ENTRADA', quantidade: saldo_unidades, funcionario_matricula: 'ADMIN', justificativa: 'Cadastro inicial de material', created_at: new Date().toISOString(), materials: { nome } };
          inMemoryMovements.unshift(mov);
          res.json(mat);
      }
  });

  app.put('/api/materials/:id', async (req, res) => {
      const { id } = req.params;
      const { nome, categoria } = req.body;
      try {
          // Apenas atualizando informações básicas, saldo é movimentação!
          await supabaseServer.from('materials').update({ nome, categoria, updated_at: new Date().toISOString() }).eq('id', Number(id));
          
          const memIndex = inMemoryMaterials.findIndex(m => m.id === Number(id));
          if (memIndex !== -1) {
              inMemoryMaterials[memIndex] = { ...inMemoryMaterials[memIndex], nome, categoria, updated_at: new Date().toISOString() };
          }
          res.json({ success: true });
      } catch (e: any) {
          const memIndex = inMemoryMaterials.findIndex(m => m.id === Number(id));
          if (memIndex !== -1) {
              inMemoryMaterials[memIndex] = { ...inMemoryMaterials[memIndex], nome, categoria, updated_at: new Date().toISOString() };
              res.json({ success: true });
          } else {
              res.status(500).json({ error: e.message });
          }
      }
  });

  app.delete('/api/materials/:id', async (req, res) => {
      const { id } = req.params;
      try {
          // 1. Obter informações do material antes da exclusão
          const { data: mat } = await supabaseServer.from('materials').select('*').eq('id', Number(id)).maybeSingle();
          const memMat = inMemoryMaterials.find(m => m.id === Number(id));
          const nomeMaterial = mat?.nome || memMat?.nome || 'Material Desconhecido';
          const saldo = mat?.saldo_unidades ?? memMat?.saldo_unidades ?? 0;
          const uMedida = mat?.unidade_medida ?? memMat?.unidade_medida ?? 'UN';

          // 2. Tentar atualizar as movimentações antigas com o nome do material na justificativa para desvincular do material_id sem perder os dados de auditoria
          try {
              const { data: existingMovs } = await supabaseServer.from('material_movements').select('*').eq('material_id', Number(id));
              if (existingMovs && existingMovs.length > 0) {
                  for (const m of existingMovs) {
                      const novaJustificativa = `[${nomeMaterial}] ${m.justificativa || ''}`;
                      await supabaseServer.from('material_movements').update({ 
                          material_id: null,
                          justificativa: novaJustificativa 
                      }).eq('id', m.id);
                  }
              }
          } catch (errMov: any) {
              console.warn("Não foi possível atualizar as movimentações antigas para null, caindo no fallback delete:", errMov.message);
              // Caso haja restrição NOT NULL ou similar, deletamos as antigas para a deleção do material prosseguir normalmente
              await supabaseServer.from('material_movements').delete().eq('material_id', Number(id));
          }

          // 3. Registrar a ação de exclusão do material na auditoria de movimentações generalizadas
          const auditJustificativa = `EXCLUSÃO DO MATERIAL: O material '${nomeMaterial}' (Saldo em estoque era de ${saldo} ${uMedida}) foi excluído do sistema permanentemente pelo Administrador.`;
          try {
              await supabaseServer.from('material_movements').insert({
                  material_id: null,
                  tipo_operacao: 'EXCLUSÃO',
                  quantidade: Number(saldo),
                  funcionario_matricula: 'ADMIN',
                  justificativa: auditJustificativa
              });
          } catch (errIns: any) {
              console.warn("Erro ao registrar auditoria de exclusão do material no Supabase:", errIns.message);
          }

          // 4. Deletar o material fisicamente da tabela materials
          await supabaseServer.from('materials').delete().eq('id', Number(id));
          
          // 5. Atualizar registros em memória (para o fallback de banco offline de auditorias)
          inMemoryMovements = inMemoryMovements.map(mov => {
              if (mov.material_id === Number(id)) {
                  return {
                      ...mov,
                      material_id: null,
                      justificativa: `[${nomeMaterial}] ${mov.justificativa || ''}`
                  };
              }
              return mov;
          });

          // Adicionar o evento de exclusão ao início do log em memória
          inMemoryMovements.unshift({
              id: Date.now(),
              material_id: null,
              tipo_operacao: 'EXCLUSÃO',
              quantidade: Number(saldo),
              funcionario_matricula: 'ADMIN',
              justificativa: auditJustificativa,
              created_at: new Date().toISOString()
          });

          inMemoryMaterials = inMemoryMaterials.filter(m => m.id !== Number(id));
          
          res.json({ success: true });
      } catch (e: any) {
          inMemoryMaterials = inMemoryMaterials.filter(m => m.id !== Number(id));
          res.json({ success: true });
      }
  });

  app.post('/api/materials/:id/movement', async (req, res) => {
      const { id } = req.params;
      const { tipo_operacao, quantidade, funcionario_matricula, justificativa } = req.body;
      
      try {
          const { data: mat, error: fetchErr } = await supabaseServer.from('materials').select('*').eq('id', Number(id)).maybeSingle();
          if (fetchErr || !mat) throw new Error("not found db");
          
          let novocSaldo = mat.saldo_unidades;
          if (tipo_operacao === 'SAIDA') {
              if (quantidade > mat.saldo_unidades) {
                  return res.status(400).json({ error: 'Saldo insuficiente para a saída solicitada. Saldo: ' + mat.saldo_unidades });
              }
              novocSaldo -= Number(quantidade);
          } else if (tipo_operacao === 'DEVOLUCAO' || tipo_operacao === 'ENTRADA' || tipo_operacao === 'AJUSTE MANUAL') {
              novocSaldo += Number(quantidade);
          } else {
              return res.status(400).json({ error: 'Operação inválida.' });
          }

          await supabaseServer.from('materials').update({ saldo_unidades: novocSaldo, updated_at: new Date().toISOString() }).eq('id', Number(id));
          
          const { data: mov, error: movErr } = await supabaseServer.from('material_movements').insert({
              material_id: Number(id), tipo_operacao, quantidade: Number(quantidade), funcionario_matricula, justificativa
          }).select().maybeSingle();

          if (movErr) throw movErr;

          // Alert low stock
          if (tipo_operacao === 'SAIDA' && novocSaldo < mat.estoque_minimo) {
            try {
                const tp = await getTransporter();
                await tp.sendMail({
                    from: { name: 'Imobiliária São Severino', address: process.env.SMTP_FROM_EMAIL || 'alvesluizsamuel@gmail.com' },
                    to: process.env.ADMIN_EMAIL || 'admin@ssimoveis.com',
                    subject: `Alerta de Estoque: ${mat.nome}`,
                    html: `<h3>Alerta de Estoque Mínimo Atingido</h3>
                           <p>O material <strong>${mat.nome}</strong> atingiu um nível abaixo do mínimo configurado.</p>
                           <ul>
                             <li><strong>Saldo Atual:</strong> ${novocSaldo} ${mat.unidade_medida}s</li>
                             <li><strong>Estoque Mínimo:</strong> ${mat.estoque_minimo} ${mat.unidade_medida}s</li>
                             <li><strong>Última Retirada:</strong> ${quantidade} ${mat.unidade_medida}s (por ${funcionario_matricula})</li>
                           </ul>`
                });
            } catch(e) {
                console.error('[Email] Falha ao enviar alerta de estoque:', e);
            }
          }

          res.json({ success: true, material_id: id, novoSaldo: novocSaldo });
      } catch (err: any) {
          // Fallback
          const memIndex = inMemoryMaterials.findIndex(m => m.id === Number(id));
          if (memIndex === -1) return res.status(404).json({ error: 'Material não encontrado (em memória).' });
          
          let mat = inMemoryMaterials[memIndex];
          let novocSaldo = mat.saldo_unidades;
          if (tipo_operacao === 'SAIDA') {
              if (quantidade > mat.saldo_unidades) {
                  return res.status(400).json({ error: 'Saldo insuficiente para a saída solicitada.' });
              }
              novocSaldo -= Number(quantidade);
          } else if (tipo_operacao === 'DEVOLUCAO' || tipo_operacao === 'ENTRADA') {
              novocSaldo += Number(quantidade);
          } else {
              return res.status(400).json({ error: 'Operação inválida.' });
          }
          
          inMemoryMaterials[memIndex] = { ...mat, saldo_unidades: novocSaldo, updated_at: new Date().toISOString() };
          
          const mov = { id: movementIdCounter++, material_id: Number(id), tipo_operacao, quantidade: Number(quantidade), funcionario_matricula, justificativa, created_at: new Date().toISOString(), materials: { nome: mat.nome } };
          inMemoryMovements.unshift(mov);
          
          res.json({ success: true, material_id: id, novoSaldo: novocSaldo });
      }
  });

  app.put('/api/contracts/:id/admin-status', async (req, res) => {
    const { id } = req.params;
    const { statusFinanceiro } = req.body;
    const { data, error } = await supabaseServer.from('contracts').update({ status_financeiro: statusFinanceiro }).eq('id', Number(id)).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.put('/api/comissoes/:id', async (req, res) => {
    const { id } = req.params;
    const { valor_comissao, valor_personalizado, status } = req.body;
    
    const updateObj: any = {};
    if (valor_personalizado !== undefined || valor_comissao !== undefined) {
      const val = valor_personalizado !== undefined ? Number(valor_personalizado) : Number(valor_comissao);
      updateObj.valor_comissao = val;
      updateObj.valor_calculado = val;
      updateObj.valor_personalizado = val;
      updateObj.regra_aplicada = 'Ajuste Manual';
    }
    if (status !== undefined) {
      updateObj.status = status;
    }

    const { data: comissao, error } = await supabaseServer.from('comissoes').update(updateObj).eq('id', Number(id)).select().maybeSingle();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(comissao);
  });

  app.delete('/api/comissoes/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabaseServer.from('comissoes').delete().eq('id', Number(id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // ==============================================
  // MÓDULO: CONTROLE DE CLIENTES
  // ==============================================

  app.get('/api/controle-clientes', async (req, res) => {
    const { data, error } = await supabaseServer.from('controle_processos_clientes').select('*').order('data_cadastro_sistema', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post('/api/controle-clientes', async (req, res) => {
    const payload = req.body;
    
    // Inserir registro principal
    const { data, error } = await supabaseServer.from('controle_processos_clientes').insert(payload).select().maybeSingle();
    
    if (error) return res.status(500).json({ error: error.message });

    // Criar Log (Auditoria)
    if (data) {
      await supabaseServer.from('logs_controle_clientes').insert({
        processo_id: data.id,
        acao: 'CRIADO',
        detalhes_alteracao: { registro_inicial: payload }
      });
    }

    res.json(data);
  });

  app.put('/api/controle-clientes/:id', async (req, res) => {
    const { id } = req.params;
    const payload = req.body;

    // Buscar estado anterior para o log
    const { data: oldData } = await supabaseServer.from('controle_processos_clientes').select('*').eq('id', id).maybeSingle();

    if (!oldData) return res.status(404).json({ error: 'Processo não encontrado.' });

    const { data, error } = await supabaseServer.from('controle_processos_clientes').update(payload).eq('id', id).select().maybeSingle();
    
    if (error) return res.status(500).json({ error: error.message });

    // Descobrir o que mudou
    const changes: any = {};
    for (const key in payload) {
      if (oldData[key] !== payload[key]) {
        changes[key] = { de: oldData[key], para: payload[key] };
      }
    }

    // Criar Log (Auditoria)
    if (Object.keys(changes).length > 0) {
       await supabaseServer.from('logs_controle_clientes').insert({
        processo_id: id,
        acao: 'ALTERADO',
        detalhes_alteracao: changes
      });
    }

    res.json(data);
  });

  app.delete('/api/controle-clientes/:id', async (req, res) => {
    const { id } = req.params;

    // Buscar infomações antes de deletar (se possível)
    const { data: oldData } = await supabaseServer.from('controle_processos_clientes').select('*').eq('id', id).maybeSingle();

    if (!oldData) return res.status(404).json({ error: 'Processo não encontrado.' });

    // Opcional: registrar log antes de deletar (só será mantido se o cascade for desabilitado no FK, 
    // mas de acordo com o script, tem ON DELETE CASCADE, então os logs sumiriam. 
    // Se quiser manter os logs do processo deletado, tire o CASCADE ou faça apenas soft delete.
    // Provisoriamente, deletamos direto e o log apaga junto.
    
    const { error } = await supabaseServer.from('controle_processos_clientes').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, message: 'Processo deletado com sucesso.' });
  });

  app.get('/api/controle-clientes/:id/logs', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabaseServer.from('logs_controle_clientes').select('*').eq('processo_id', id).order('data_hora_alteracao', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const gracefulShutdown = async () => {
    console.log('\n[Server] Recebido sinal de desligamento. Encerrando conexões...');
    server.close(() => {
      console.log('[Server] Servidor encerrado com sucesso.');
      process.exit(0);
    });
    
    // Fallback if it hangs
    setTimeout(() => {
        console.error('[Server] Shutdown demorou muito, forçando saída...');
        process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Imobiliária São Severino Server running on port ${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${PORT} is already in use. Please kill the process using this port.`);
    } else {
      console.error('[Server] Critical error:', err);
    }
  });
}

startServer();
