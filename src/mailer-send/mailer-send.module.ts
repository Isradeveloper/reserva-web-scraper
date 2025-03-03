import { Module } from "@nestjs/common";
import { MailerSendService } from "./mailer-send.service";
import { ConfigModule } from "@nestjs/config";
import { MailerSendController } from './mailer-send.controller';

@Module({
  providers: [MailerSendService],
  imports: [ConfigModule],
  controllers: [MailerSendController],
})
export class MailerSendModule {}
