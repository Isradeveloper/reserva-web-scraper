import { Controller, Get } from "@nestjs/common";
import { MailerSendService } from "./mailer-send.service";

@Controller("mailer-send")
export class MailerSendController {
  constructor(private readonly mailerSendService: MailerSendService) {}

  @Get()
  async test() {
    await this.mailerSendService.sendMail({
      to: "theisratruji@gmail.com",
      subject: "Test",
      htmlContent: "<h1>Test</h1>",
      recipientName: "Isra",
      attachments: [
        {
          filename: "hola.txt",
          path: "reservas/1007118795/hola.txt",
        },
      ],
    });
  }
}
