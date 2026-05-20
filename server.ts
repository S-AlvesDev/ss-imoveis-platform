import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import fs from 'fs';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { calculateSAC, calculatePrice, AmortizationType } from './src/lib/finance.ts';

let transporter: nodemailer.Transporter | null = null;
async function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
          },
      });
      return transporter;
  }
  
  throw new Error("Credenciais SMTP não configuradas. Adicione SMTP_USER e SMTP_PASS nas variáveis de ambiente.");
}

import { supabaseServer } from './src/lib/supabaseServer.ts';

// Fix for fetch redefinition error in some environments
const dom = new JSDOM('', { url: 'http://localhost' });
const window = dom.window;
const DOMPurify = createDOMPurify(window as any);
const JWT_SECRET = process.env.JWT_SECRET || 'afefde38-f16e-44de-ab2f-4fb4d50af7b1';

import sharp from 'sharp';

// Setup Multer Storage (Memory storage to allow sharp compression)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function startServer() {
  console.log('[SS Imóveis] Iniciando servidor...');
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

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

  // Socket.io Setup
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    maxHttpBufferSize: 5e7 // 50MB
  });




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
    
    // check if it's client or user
    const { data: client } = await supabaseServer.from('clients').select('id').eq('email', email).maybeSingle();
    const { data: user } = await supabaseServer.from('users').select('id').eq('matricula', email).maybeSingle(); // For employees email is normally matricula or we don't have it? Wait, users have matricula, but maybe no email.

    if (!client && !user) {
      return res.status(404).json({ error: 'Conta não encontrada.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    passwordResetCodes.set(email, { code, expiry: Date.now() + 15 * 60 * 1000 });

    try {
      const tp = await getTransporter();
      await tp.sendMail({
          from: '"SS Imóveis" <no-reply@ssimoveis.com>',
          to: email,
          subject: 'Recuperação de Senha',
          html: `<p>Seu código para recuperar a senha é: <strong>${code}</strong></p><p>Ele expira em 15 minutos.</p>`
      });
      res.json({ message: 'Código enviado por e-mail.' });
    } catch(e) {
      res.status(500).json({ error: 'Erro ao enviar e-mail de recuperação.' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    const entry = passwordResetCodes.get(email);
    if (!entry || entry.code !== code || Date.now() > entry.expiry) {
       return res.status(400).json({ error: 'Código inválido ou expirado.' });
    }
    
    // check client
    const { data: client } = await supabaseServer.from('clients').select('id').eq('email', email).maybeSingle();
    let updated = false;
    if (client) {
       await supabaseServer.from('clients').update({ password: newPassword }).eq('id', client.id);
       updated = true;
    } else {
       const { data: user } = await supabaseServer.from('users').select('id').eq('matricula', email).maybeSingle();
       if (user) {
         await supabaseServer.from('users').update({ password: newPassword }).eq('id', user.id);
         updated = true;
       }
    }

    if (updated) {
       passwordResetCodes.delete(email);
       res.json({ success: true, message: 'Senha atualizada com sucesso.' });
    } else {
       res.status(404).json({ error: 'Usuário não encontrado.' });
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
        const info = await mailTransporter.sendMail({
          from: '"SS Imóveis" <' + (process.env.SMTP_FROM_EMAIL || 'nao-responda@ssimoveis.com') + '>',
          to: email,
          subject: 'Seu código de verificação - SS Imóveis',
          text: `Olá!\n\nSeu código de verificação é: ${code}\n\nEste código é válido por 10 minutos.`,
          html: `<div style="font-family: sans-serif; text-align: center; padding: 40px 20px; color: #333; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto;">
                   <h1 style="color: #1d4ed8; font-size: 24px; margin-bottom: 8px; margin-top: 0;">SS Imóveis</h1>
                   <h2 style="font-size: 20px; margin-bottom: 24px; font-weight: normal; margin-top: 0;">Código de Verificação</h2>
                   <p style="margin-bottom: 12px; font-size: 16px;">Utilize o código abaixo para continuar seu cadastro:</p>
                   <div style="background-color: #ffffff; padding: 24px 32px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #0f172a; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                     ${code}
                   </div>
                   <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">Este código expira em 10 minutos.</p>
                 </div>`
        });
        console.log(`[Email] Mensagem enviada para ${email}: ${info.messageId}`);
        const testUrl = nodemailer.getTestMessageUrl(info);
        if (testUrl) {
          console.log(`[Email] URL de visualização (Teste Ethereal): ${testUrl}`);
        }
      } catch (emailErr: any) {
        console.error('[Email Erro] Falha ao enviar email:', emailErr);
        return res.status(500).json({ error: `Erro ao enviar email: ${emailErr.message}` });
      }
      
      res.json({ 
        message: 'Código enviado com sucesso! Verifique sua caixa de entrada.',
        // Apenas exibe o devCode se não houver SMTP configurado para facilitar os testes, ou remova isso totalmente se for estrito
        devCode: (!process.env.SMTP_USER && process.env.NODE_ENV !== 'production') ? code : undefined 
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
              return res.status(401).json({ error: 'E-mail não encontrado ou credenciais inválidas' });
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
    await supabaseServer.from('users').update({ nome }).eq('matricula', client.matricula);
    
    res.json(client);
  });

  app.get('/api/contracts/:id/cancellation-summary', async (req, res) => {
    const { id } = req.params;
    const { data: contractRaw, error } = await supabaseServer.from('contracts').select('*').eq('id', Number(id)).maybeSingle();
    
    if (error || !contractRaw) return res.status(404).json({ error: 'Contrato não encontrado' });
    const contract = mapContract(contractRaw);

    const totalPaid = (contract.installments || [])
      .filter((i: any) => i.pago)
      .reduce((acc: number, cur: any) => acc + (cur.valorTotal || 0), 0);

    res.json({
      totalPaid,
      option50: totalPaid * 0.5,
      option80: totalPaid * 0.8,
    });
  });

  app.post('/api/contracts/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const { option, numInstallments } = req.body; // option: '50' or '80'
    const { data: contractRaw, error } = await supabaseServer.from('contracts').select('*').eq('id', Number(id)).maybeSingle();
    
    if (error || !contractRaw) return res.status(404).json({ error: 'Contrato não encontrado' });
    const contract = mapContract(contractRaw);
    if (contract.status === 'DISTRATADO') return res.status(400).json({ error: 'Contrato já distratado' });

    const totalPaid = (contract.installments || [])
      .filter((i: any) => i.pago)
      .reduce((acc: number, cur: any) => acc + (cur.valorTotal || 0), 0);

    let refundTotal = 0;
    let schedule = [];
    const today = new Date();

    if (option === '50') {
      refundTotal = totalPaid * 0.5;
      schedule.push({
        parcela: 1,
        valor: refundTotal,
        vencimento: new Date(today.setMonth(today.getMonth() + 1)).toISOString().split('T')[0],
        status: 'PROGRAMADO'
      });
    } else if (option === '80') {
      refundTotal = totalPaid * 0.8;
      const valPerInstallment = refundTotal / numInstallments;
      for (let i = 1; i <= numInstallments; i++) {
        const dueDate = new Date(today.getFullYear(), today.getMonth() + i, today.getDate());
        schedule.push({
          parcela: i,
          valor: valPerInstallment,
          vencimento: dueDate.toISOString().split('T')[0],
          status: 'PROGRAMADO'
        });
      }
    }

    const updatedDistrato = {
      data: new Date().toISOString().split('T')[0],
      opcaoEscolhida: option,
      valorTotalPago: totalPaid,
      valorReembolso: refundTotal,
      cronogramaDevolucao: schedule
    };

    await supabaseServer.from('contracts').update({
        status: 'DISTRATADO',
        distrato: updatedDistrato
    }).eq('id', Number(id));

    // Liberar imóvel novamente
    await supabaseServer.from('properties').update({ status: 'DISPONÍVEL' }).eq('id', contract.property_id);

    await supabaseServer.from('update_logs').insert({
      tipo: 'DISTRATO',
      descricao: `Contrato ${id} cancelado via distrato. Opção ${option}%.`
    });

    res.json({ ...contract, status: 'DISTRATADO', distrato: updatedDistrato });
  });

  app.post('/api/interesse', async (req, res) => {
    const { imovelId, imovelNome, imovelValor, imovelLocalizacao, nome, telefone, email } = req.body;
    try {
       const tp = await getTransporter();
       
       // Alert admin
       await tp.sendMail({
           from: '"SS Imóveis" <no-reply@ssimoveis.com>',
           to: process.env.ADMIN_EMAIL || 'admin@ssimoveis.com',
           subject: 'Novo Lead Recebido!',
           html: `<h2>Novo Interesse em Imóvel</h2>
                  <p><strong>Cliente:</strong> ${nome}</p>
                  <p><strong>Telefone:</strong> ${telefone}</p>
                  <p><strong>E-mail:</strong> ${email || 'Não informado'}</p>
                  <p><strong>Imóvel:</strong> ${imovelNome} (ID: ${imovelId})</p>`
       });

       // Send technical sheet to client if email is provided
       if (email) {
           await tp.sendMail({
               from: '"SS Imóveis" <no-reply@ssimoveis.com>',
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
                        <p><strong>Equipe SS Imóveis</strong></p>
                      </div>`
           });
       }

       res.json({ success: true });
    } catch(err: any) {
       console.error('[Email] Erro ao enviar email de lead', err);
       res.status(500).json({ error: 'Erro ao notificar' });
    }
  });

  app.post('/api/properties', upload.array('images', 10), async (req, res) => {
    const { nome, valor, localizacao, descricao } = req.body;
    const files = req.files as Express.Multer.File[];
    
    // Process and compress images
    const dir = path.join(process.cwd(), 'public', 'media');
    if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
    
    const imageUrls: string[] = [];
    if (files && files.length > 0) {
       for (const file of files) {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webp';
          const outPath = path.join(dir, uniqueSuffix);
          await sharp(file.buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outPath);
          imageUrls.push(`/media/${uniqueSuffix}`);
       }
    }
    
    let finalDesc = (descricao || 'Sem descrição detalhada');
    if (imageUrls.length > 0) {
       finalDesc += '|||IMAGES:' + JSON.stringify(imageUrls);
    }
    
    const { data: newProperty, error } = await supabaseServer.from('properties').insert({ 
      nome, 
      valor: Number(valor),
      localizacao: localizacao || 'Não informada',
      descricao: finalDesc,
      status: 'DISPONÍVEL'
    }).select().maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!newProperty) return res.status(500).json({ error: 'Erro ao criar imóvel: nenhum dado retornado.' });
    
    let actualDesc = newProperty.descricao;
    let images = [];
    if (typeof actualDesc === 'string' && actualDesc.includes('|||IMAGES:')) {
        const parts = actualDesc.split('|||IMAGES:');
        actualDesc = parts[0];
        try { images = JSON.parse(parts[1]); } catch(e) {}
    } else if (newProperty.images) {
        images = newProperty.images;
    }
    newProperty.descricao = actualDesc;
    newProperty.images = images;
    
    res.json(newProperty);
  });

  app.put('/api/properties/:id', upload.array('images', 10), async (req, res) => {
    const { id } = req.params;
    const { nome, valor, localizacao, descricao, existingImages } = req.body;
    let imageUrls: string[] = [];
    
    if (existingImages) {
        const parsedExisting = JSON.parse(existingImages);
        imageUrls = Array.isArray(parsedExisting) ? parsedExisting : [parsedExisting];
    }
    
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
        imageUrls = [...imageUrls, ...files.map(file => `/media/${file.filename}`)];
    }

    let finalDesc = descricao || '';
    if (imageUrls.length > 0) {
       finalDesc += '|||IMAGES:' + JSON.stringify(imageUrls);
    }

    const { data: updatedProperty, error } = await supabaseServer.from('properties').update({
       nome, 
       valor: Number(valor), 
       localizacao, 
       descricao: finalDesc
    }).eq('id', Number(id)).select().maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!updatedProperty) return res.status(404).json({ error: 'Imóvel não encontrado.' });
    
    let actualDesc = updatedProperty.descricao;
    let images = [];
    if (typeof actualDesc === 'string' && actualDesc.includes('|||IMAGES:')) {
        const parts = actualDesc.split('|||IMAGES:');
        actualDesc = parts[0];
        try { images = JSON.parse(parts[1]); } catch(e) {}
    } else if (updatedProperty.images) {
        images = updatedProperty.images;
    }
    updatedProperty.descricao = actualDesc;
    updatedProperty.images = images;
    
    res.json(updatedProperty);
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



  app.get('/api/data', async (req, res) => {
    const { data: clients } = await supabaseServer.from('clients').select('*');
    const { data: properties } = await supabaseServer.from('properties').select('*');
    const { data: contracts } = await supabaseServer.from('contracts').select('*');
    const { data: staff } = await supabaseServer.from('users').select('*').neq('role', 'CLIENTE');
    const { data: updateLogs } = await supabaseServer.from('update_logs').select('*');
    const { data: comissoes } = await supabaseServer.from('comissoes').select('*').order('data_criacao', { ascending: false });
    
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
    } catch {
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
    
    const mappedProperties = (properties || []).map(p => {
        let actualDesc = p.descricao;
        let images = [];
        if (typeof p.descricao === 'string' && p.descricao.includes('|||IMAGES:')) {
            const parts = p.descricao.split('|||IMAGES:');
            actualDesc = parts[0];
            try { images = JSON.parse(parts[1]); } catch(e) {}
        } else if (p.images) {
            images = p.images;
        }
        return {
            ...p,
            descricao: actualDesc,
            images
        };
    });

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

  app.post('/api/contracts/pay/:contractId/:installmentNum', async (req, res) => {
    const { contractId, installmentNum } = req.params;
    const { data: contractRaw, error } = await supabaseServer.from('contracts').select('*').eq('id', Number(contractId)).maybeSingle();
    
    if (error || !contractRaw) return res.status(404).json({ error: 'Contrato não encontrado' });
    const contract = mapContract(contractRaw);

    const installmentIdx = contract.installments.findIndex((i: any) => i.numero === Number(installmentNum));
    if (installmentIdx === -1) return res.status(404).json({ error: 'Parcela não encontrada' });

    contract.installments[installmentIdx].pago = true;
    
    await supabaseServer.from('contracts').update({ installments: contract.installments }).eq('id', Number(contractId));
    
    res.json({ success: true });
  });

  app.post('/api/contracts/update-interest-rate', async (req, res) => {
    const { novaTaxa, adminId } = req.body;
    
    const { data: affectedContracts } = await supabaseServer
        .from('contracts')
        .select('*')
        .eq('status', 'ATIVO')
        .eq('tipo_amortizacao', AmortizationType.PRICE);
    
    if (!affectedContracts) return res.json({ success: true, count: 0 });

    for (const contract of affectedContracts) {
        const paidInstallments = contract.installments.filter((i: any) => i.pago);
        const pendingInstallments = contract.installments.filter((i: any) => !i.pago);
        
        if (pendingInstallments.length === 0) continue;

        let currentBalance = contract.valor_financiado;
        if (paidInstallments.length > 0) {
            const lastPaid = paidInstallments.sort((a: any, b: any) => b.numero - a.numero)[0];
            currentBalance = lastPaid.saldoDevedor;
        }

        const remainingPeriods = pendingInstallments.length;
        const taxa = novaTaxa / 100;

        const pmt = currentBalance * (taxa * Math.pow(1 + taxa, remainingPeriods)) / (Math.pow(1 + taxa, remainingPeriods) - 1);
        const valorParcelaFixa = Number(pmt.toFixed(2));

        let runningBalance = currentBalance;
        
        pendingInstallments.forEach((inst: any, idx: number) => {
            const juros = Number((runningBalance * taxa).toFixed(2));
            let amortizacao = Number((valorParcelaFixa - juros).toFixed(2));
            if (idx === pendingInstallments.length - 1) amortizacao = runningBalance;
            runningBalance = Number((runningBalance - amortizacao).toFixed(2));
            inst.juros = juros;
            inst.amortizacao = amortizacao;
            inst.valorTotal = Number((amortizacao + juros).toFixed(2));
            inst.saldoDevedor = Math.max(0, runningBalance);
        });

        await supabaseServer.from('contracts').update({
            taxa_juros: novaTaxa,
            installments: contract.installments
        }).eq('id', contract.id);

        await supabaseServer.from('update_logs').insert({
            tipo: 'ATUALIZACAO_TAXA',
            descricao: `Taxa do contrato ${contract.id} alterada para ${novaTaxa}%`,
            contrato_id: contract.id
        });
    }

    res.json({ success: true, count: affectedContracts.length });
  });

  app.post('/api/contracts', upload.array('files', 5), async (req, res) => {
    console.log('[API] Registrando contrato:', req.body);
    const { clientId, propertyId, valorImovel, valorEntrada, taxaJuros, numParcelas, tipoAmortizacao, dataInicio, corretorMatricula, tipoContrato } = req.body;
    
    const files = req.files as Express.Multer.File[];
    const pdfUrls: string[] = [];
    if (files && files.length > 0) {
       const dir = path.join(process.cwd(), 'public', 'media');
       if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
       for (const file of files) {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.pdf';
          const outPath = path.join(dir, uniqueSuffix);
          require('fs').writeFileSync(outPath, file.buffer);
          pdfUrls.push(`/media/${uniqueSuffix}`);
       }
    }

    if (!clientId || !propertyId || !corretorMatricula) {
      return res.status(400).json({ error: 'Cliente, Imóvel e Corretor são obrigatórios' });
    }

    const financedAmount = Number(valorImovel) - Number(valorEntrada);
    
    let installments = [];
    try {
      if (tipoAmortizacao === AmortizationType.SAC) {
        installments = calculateSAC(financedAmount, Number(taxaJuros), Number(numParcelas), dataInicio);
      } else {
        installments = calculatePrice(financedAmount, Number(taxaJuros), Number(numParcelas), dataInicio);
      }
    } catch (calcErr: any) {
      console.error('[Amortization Error]', calcErr);
      return res.status(400).json({ error: 'Erro ao calcular parcelas: ' + calcErr.message });
    }

    const statusFinanceiro = 'Em Pagamento';
    const finalTipoContrato = tipoContrato || 'VENDA';

    const insertData: any = {
      client_id: Number(clientId),
      property_id: Number(propertyId),
      valor_imovel: Number(valorImovel),
      valor_entrada: Number(valorEntrada),
      valor_financiado: financedAmount,
      taxa_juros: Number(taxaJuros),
      num_parcelas: Number(numParcelas),
      tipo_amortizacao: tipoAmortizacao,
      data_inicio: dataInicio,
      installments,
      status: 'ATIVO',
      data_contrato: new Date().toISOString(),
      tipo_contrato: finalTipoContrato,
      status_financeiro: statusFinanceiro
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
    } else if (finalTipoContrato === 'Minha Casa Minha Vida') {
        regraAplicada = 'MCMV (0,5%)';
        valorComissao = Number(valorImovel) * 0.005;
    } else if (finalTipoContrato === 'De Terceiros') {
        regraAplicada = 'Imóvel de Terceiros (Definir Valor)';
        valorComissao = 0;
    }

    const { error: comissaoError } = await supabaseServer.from('comissoes').insert({
        contrato_id: newContract.id,
        cliente_id: Number(clientId),
        imovel_id: Number(propertyId),
        corretor_matricula: corretorMatricula,
        regra_aplicada: regraAplicada,
        valor_comissao: valorComissao,
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
          res.json({ success: true });
      } catch (e: any) {
          res.status(500).json({ error: e.message });
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
                    from: '"SS Imóveis" <no-reply@ssimoveis.com>',
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
    const { valor_comissao } = req.body;
    const { data: comissao, error } = await supabaseServer.from('comissoes').update({
        valor_comissao: Number(valor_comissao),
        regra_aplicada: 'Imóvel de Terceiros (Valor Definido)',
        status: 'PENDENTE'
    }).eq('id', Number(id)).select().maybeSingle();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(comissao);
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
    console.log(`SS Imóveis Server running on port ${PORT}`);
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
