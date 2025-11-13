// src/utils/mailer.ts
import nodemailer from "nodemailer";
import { ENV } from "../config/env";

const transporter = nodemailer.createTransport({
  host: ENV.MAIL_HOST,
  port: Number(ENV.MAIL_PORT) || 465,
  secure: ENV.MAIL_SECURE ?? true, // true for 465, false for TLS
  auth: {
    user: ENV.MAIL_USER,
    pass: ENV.MAIL_PASSWORD,
  },
});

export async function sendMail(to: string, subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: ENV.MAIL_FROM || `"CodeCollab" <${ENV.MAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📩 Mail sent successfully to ${to} (${info.messageId})`);
    return info;
  } catch (err) {
    console.error("❌ Failed to send mail:", err);
    throw err;
  }
}
