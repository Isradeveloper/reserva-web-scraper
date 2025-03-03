import { Controller, Get } from "@nestjs/common";
import { MailerSendService } from "./mailer-send.service";
import * as fs from "fs";
import * as path from "path";

@Controller("mailer-send")
export class MailerSendController {
  constructor(private readonly mailerSendService: MailerSendService) {}

  @Get()
  async test() {
    const filePath = path.join("reservas/1007118795/hola.txt");
    const fileContent = "Hello, this is a test file.";

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, fileContent);

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
