import { Resend } from 'resend';

// Configuração do Resend
const resendApiKey = 're_PwMwDDDC_C9YrML54mRfzX2rSRALYfW8w';

export const resend = new Resend(resendApiKey);

// Configurações padrão de email
export const emailConfig = {
  from: 'Start Chat <noreply@startchat.com.br>',
  fromName: 'Start Chat',
  supportEmail: 'suporte@startchat.com.br',
  adminEmail: 'admin@startchat.com.br'
};

// Templates de email
export const emailTemplates = {
  welcome: {
    subject: 'Bem-vindo ao Start Chat! 🚀',
    getHtml: (userName: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #20B2AA, #1E90FF, #0066CC); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; font-size: 28px; margin: 0;">Bem-vindo ao Start Chat!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; font-size: 20px;">Olá, ${userName}! 👋</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            É um prazer ter você conosco! Agora você tem acesso à Nathi, sua mentora IA especializada em marketing digital.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1E90FF; font-size: 18px;">O que você pode fazer:</h3>
            <ul style="color: #666; line-height: 1.6;">
              <li>📚 Criar e-books profissionais</li>
              <li>🎓 Desenvolver cursos online completos</li>
              <li>💼 Estruturar mentorias de sucesso</li>
              <li>📈 Criar estratégias de marketing digital</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sistemastart.com'}" 
               style="background: linear-gradient(135deg, #1E90FF, #0066CC); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              Começar Agora
            </a>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Precisa de ajuda? Responda este email ou entre em contato conosco.
          </p>
        </div>
      </div>
    `
  },
  
  passwordReset: {
    subject: 'Recuperação de Senha - Start Chat',
    getHtml: (resetLink: string, userName: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #20B2AA, #1E90FF, #0066CC); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; font-size: 28px; margin: 0;">Recuperação de Senha</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; font-size: 20px;">Olá, ${userName}!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: linear-gradient(135deg, #1E90FF, #0066CC); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              Redefinir Senha
            </a>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center;">
            Este link expira em 24 horas. Se você não solicitou a recuperação, ignore este email.
          </p>
        </div>
      </div>
    `
  },

  adminNotification: {
    subject: 'Nova Atividade Admin - Start Chat',
    getHtml: (message: string, details: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #20B2AA, #1E90FF, #0066CC); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; font-size: 24px; margin: 0;">🚨 Notificação Admin</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; font-size: 18px;">${message}</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <pre style="color: #666; font-size: 14px; white-space: pre-wrap;">${JSON.stringify(details, null, 2)}</pre>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Start Chat - Sistema de Monitoramento
          </p>
        </div>
      </div>
    `
  }
};

// Funções de envio de email
export const sendWelcomeEmail = async (to: string, userName: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to: [to],
      subject: emailTemplates.welcome.subject,
      html: emailTemplates.welcome.getHtml(userName)
    });

    if (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
      return { success: false, error };
    }

    console.log('Email de boas-vindas enviado:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    return { success: false, error };
  }
};

export const sendPasswordResetEmail = async (to: string, resetLink: string, userName: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to: [to],
      subject: emailTemplates.passwordReset.subject,
      html: emailTemplates.passwordReset.getHtml(resetLink, userName)
    });

    if (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      return { success: false, error };
    }

    console.log('Email de recuperação enviado:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar email de recuperação:', error);
    return { success: false, error };
  }
};

export const sendAdminNotification = async (message: string, details: any) => {
  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to: [emailConfig.adminEmail],
      subject: emailTemplates.adminNotification.subject,
      html: emailTemplates.adminNotification.getHtml(message, details)
    });

    if (error) {
      console.error('Erro ao enviar notificação admin:', error);
      return { success: false, error };
    }

    console.log('Notificação admin enviada:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar notificação admin:', error);
    return { success: false, error };
  }
}; 