import { Module } from "@nestjs/common";
import { PuppeterService } from "./puppeter.service";
import { PuppeterController } from "./puppeter.controller";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "src/users/users.module";
import { MailModule } from "src/mail/mail.module";

@Module({
  controllers: [PuppeterController],
  providers: [PuppeterService],
  imports: [ScheduleModule.forRoot(), UsersModule, MailModule],
})
export class PuppeterModule {}
