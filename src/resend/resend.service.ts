import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import { SendMail } from "./interfaces/send-mail.interface";
import { ConfigService } from "@nestjs/config";
@Injectable()
export class ResendService {
  constructor(private readonly configService: ConfigService) {}

  private readonly resend = new Resend(
    this.configService.get("RESEND_API_KEY"),
  );

  async sendMail({
    to,
    subject,
    htmlContent,
    textContent,
    attachments,
  }: SendMail) {
    const { data, error } = await this.resend.emails.send({
      from: "info@isradeveloper.com",
      to,
      subject,
      html: htmlContent || "",
      text: textContent || "",
      attachments: attachments || [],
    });

    if (error) {
      console.log(error);
      return false;
    }

    return true;
  }
}
