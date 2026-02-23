import { supabase } from '@/integrations/supabase/client';

// Configurações padrão de email
export const emailConfig = {
  from: 'Sistema Start <noreply@sistemastart.com>',
  fromName: 'Sistema Start',
  supportEmail: 'suporte@sistemastart.com',
  adminEmail: 'admin@sistemastart.com' // Altere para o seu email real
};

// Templates de email
export const emailTemplates = {
  welcome: {
    subject: 'Bem-vindo ao Sistema Start! 🚀',
    getText: (userName: string) => `Olá ${userName}! É um prazer ter você conosco! Comece agora em: https://sistemastart.com`,
    getHtml: (userName: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px; text-align: center;">
          <h1 style="color: white; font-size: 28px; margin: 0;">Bem-vindo ao Sistema Start!</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #333; font-size: 20px;">Olá, ${userName}! 👋</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            É um prazer ter você conosco! Agora você tem acesso à Nathi, sua mentora IA especializada em marketing digital.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://sistemastart.com" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Começar Agora
            </a>
          </div>
        </div>
      </div>
    `
  },

  passwordReset: {
    subject: 'Recuperação de Senha - Sistema Start',
    getText: (resetLink: string, userName: string) => `Olá ${userName}! Recupere sua senha no link: ${resetLink}`,
    getHtml: (resetLink: string, userName: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background: #c9a84c; padding: 40px; text-align: center;">
          <h1 style="color: white; font-size: 28px; margin: 0;">Recuperação de Senha</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #333; font-size: 20px;">Olá, ${userName}!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: #c9a84c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Redefinir Senha
            </a>
          </div>
        </div>
      </div>
    `
  },

  adminNotification: {
    subject: '🚨 Notificação Admin - Sistema Start',
    getHtml: (message: string, details: any) => `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #333;">${message}</h2>
        <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; font-size: 13px;">${JSON.stringify(details, null, 2)}</pre>
      </div>
    `
  }
};

// Funções de envio de email via Edge Function
export const sendWelcomeEmail = async (to: string, userName: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject: emailTemplates.welcome.subject,
        html: emailTemplates.welcome.getHtml(userName),
        text: emailTemplates.welcome.getText(userName)
      }
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    return { success: false, error };
  }
};

export const sendPasswordResetEmail = async (to: string, resetLink: string, userName: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject: emailTemplates.passwordReset.subject,
        html: emailTemplates.passwordReset.getHtml(resetLink, userName),
        text: emailTemplates.passwordReset.getText(resetLink, userName)
      }
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar email de recuperação:', error);
    return { success: false, error };
  }
};

export const sendAdminNotification = async (message: string, details: any) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: emailConfig.adminEmail,
        subject: emailTemplates.adminNotification.subject,
        html: emailTemplates.adminNotification.getHtml(message, details)
      }
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar notificação admin:', error);
    return { success: false, error };
  }
};
