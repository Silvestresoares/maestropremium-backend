import nodemailer from 'nodemailer';

interface SendMailData {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}

class MailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER || 'silvestresoares.educ@gmail.com',
        pass: process.env.SMTP_PASS || 'kivapaxbhqxcvjri',
      },
    });
  }

  async sendMail({ to, subject, body, fromName }: SendMailData): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${fromName || 'Tom & Ordem'}" <${process.env.SMTP_USER || 'silvestresoares.educ@gmail.com'}>`,
        to,
        subject,
        html: body,
      });
      console.log(`✉️ E-mail enviado com sucesso para ${to}`);
    } catch (error) {
      console.error('❌ Erro ao enviar e-mail:', error);
      throw new Error('Falha ao enviar e-mail de recuperação.');
    }
  }
}

export const mailProvider = new MailProvider();
