import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { sendMailOptions } from "./interfaces/send-mail-options.interface";

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "theisratruji@gmail.com",
        pass: "",
      },
    });
  }

  async sendEmail(options: sendMailOptions): Promise<boolean> {
    const { to, subject, htmlBody, attachments = [] } = options;

    try {
      const sentInformation = await this.transporter.sendMail({
        to,
        subject,
        html: htmlBody,
        attachments,
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
