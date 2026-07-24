import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export type EmailJob = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get('SMTP_HOST', 'localhost');
    const port = parseInt(this.config.get('SMTP_PORT', '1025'), 10);
    this.from = this.config.get('SMTP_FROM', 'noreply@acompanhante.local');

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        ignoreTLS: true,
      });
      this.logger.log(`SMTP configured (${host}:${port})`);
    } catch (err) {
      this.logger.warn(`SMTP unavailable: ${err}`);
    }
  }

  async send(job: EmailJob) {
    if (!this.transporter) {
      this.logger.warn(`Email skipped (no SMTP): ${job.subject} → ${job.to}`);
      return { sent: false };
    }

    await this.transporter.sendMail({
      from: this.from,
      to: job.to,
      subject: job.subject,
      html: job.html,
      text: job.text ?? job.html.replace(/<[^>]+>/g, ''),
    });

    this.logger.log(`Email sent: ${job.subject} → ${job.to}`);
    return { sent: true };
  }
}
