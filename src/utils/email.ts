import * as nodemailer from 'nodemailer';
import { convert } from 'html-to-text';
import { User } from 'src/users/users.entity';
import * as fs from 'fs';

interface EmailOptions {
  from: string;
  to: string;
  subject?: string;
  html?: string;
  text?: string;
}

class Email implements EmailOptions {
  from: string;
  to: string;
  fullName: string;
  constructor(
    public user: User,
    public url: string,
  ) {
    this.to = user.email;
    this.fullName = user.name;
    this.url = url;
    this.from = `Used Cars App <${process.env.GMAIL_USERNAME}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USERNAME,
          pass: process.env.GMAIL_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: Number(process.env.MAILTRAP_PORT),
      auth: {
        user: process.env.MAILTRAP_USERNAME,
        pass: process.env.MAILTRAP_PASSWORD,
      },
    });
  }

  async send(html: string, subject: string) {
    const emailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html),
    };

    await this.newTransport().sendMail(emailOptions);
  }

  async sendPasswordReset() {
    const template = await fs.promises.readFile(
      `${__dirname}/email.html`,
      'utf-8',
    );

    const html = template
      .replace('{{link}}', this.url)
      .replace('{{emailHeader}}', 'Forgot your password?')
      .replace('{{emailBody}}', 'Click this link to reset the password:');
    await this.send(html, 'Your password reset URL (valid for 10 minutes)');
  }

  async sendVerification() {
    const template = await fs.promises.readFile(
      `${__dirname}/email.html`,
      'utf-8',
    );

    const html = template
      .replace('{{link}}', this.url)
      .replace('{{emailHeader}}', 'Verify your email')
      .replace('{{emailBody}}', 'Click this link to verify your email:');
    await this.send(html, 'Your email verification URL (valid for 10 minutes)');
  }
}

export default Email;
