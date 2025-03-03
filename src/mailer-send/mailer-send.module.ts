import { Module } from "@nestjs/common";
import { MailerSendService } from "./mailer-send.service";
import { ConfigModule } from "@nestjs/config";

@Module({
  providers: [MailerSendService],
  imports: [ConfigModule],
})
export class MailerSendModule {}
