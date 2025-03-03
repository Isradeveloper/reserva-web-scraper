import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Attachment,
  EmailParams,
  MailerSend,
  Recipient,
  Sender,
} from "mailersend";
import {
  Attachment as AttachmentInterface,
  SendMail,
} from "./interfaces/send-mail.interface";
import fs from "fs";

@Injectable()
export class MailerSendService {
  private readonly mailerSend: MailerSend;
  private readonly sentFrom: Sender;
  private readonly logger = new Logger(MailerSendService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("MAILERSEND_API_KEY");
    const senderEmail = this.configService.get<string>("MAILER_SENDER");

    if (!apiKey || !senderEmail) {
      throw new Error(
        "MAILERSEND_API_KEY and MAILER_SENDER must be configured",
      );
    }

    this.mailerSend = new MailerSend({ apiKey });
    this.sentFrom = new Sender(senderEmail, "Israel Trujillo");
  }
  private createEmailParams(
    to: string,
    subject: string,
    recipientName: string = "",
    htmlContent?: string,
    textContent?: string,
    attachments?: AttachmentInterface[],
  ): EmailParams {
    const attachmentsToSend =
      attachments?.map(
        (attachment) =>
          new Attachment(
            fs.readFileSync(attachment.path, { encoding: "base64" }),
            attachment.filename,
            "attachment",
          ),
      ) || [];

    const recipient = new Recipient(to, recipientName);
    const emailParams = new EmailParams()
      .setFrom(this.sentFrom)
      .setTo([recipient])
      .setSubject(subject);

    if (htmlContent) {
      emailParams.setHtml(htmlContent);
    }

    if (textContent) {
      emailParams.setText(textContent);
    }

    if (attachmentsToSend.length > 0) {
      emailParams.setAttachments(attachmentsToSend);
    }

    return emailParams;
  }

  async sendMail({
    to,
    recipientName,
    subject,
    htmlContent,
    textContent,
    attachments
  }: SendMail): Promise<boolean> {
    const emailParams = this.createEmailParams(
      to,
      subject,
      recipientName,
      htmlContent,
      textContent,
      attachments,
    );

    try {
      await this.mailerSend.email.send(emailParams);
      return true;
    } catch (error) {
      this.logger.error("Error sending email:", error);
      return false;
    }
  }
}
