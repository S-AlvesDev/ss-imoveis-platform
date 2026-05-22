import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525, // <-- Mudança principal aqui
  secure: false, // O false é importante para a porta 2525 (usa STARTTLS)
  auth: {
    user: process.env.BREVO_SMTP_LOGIN, // Seu e-mail de login do Brevo
    pass: process.env.BREVO_SMTP_KEY    // A chave SMTP que você gerou
  }
});

// Exemplo de função de envio
async function enviarEmail() {
  try {
    const info = await transporter.sendMail({
      from: '"Seu Nome" <seu-email-verificado@dominio.com>',
      to: 'destino@email.com',
      subject: 'Testando porta 2525 no Render',
      text: 'Se você recebeu isso, a porta 2525 funcionou!',
      html: '<b>Se você recebeu isso, a porta 2525 funcionou!</b>'
    });

    console.log('Mensagem enviada: %s', info.messageId);
  } catch (error) {
    console.error('Erro ao enviar:', error);
  }
}

enviarEmail();
