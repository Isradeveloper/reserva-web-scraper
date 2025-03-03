import { Module } from "@nestjs/common";
import { MailerSendService } from "./mailer-send.service";
import { ConfigModule } from "@nestjs/config";

@Module({
  providers: [MailerSendService],
  imports: [ConfigModule],
  exports: [MailerSendService],
})
export class MailerSendModule {}
