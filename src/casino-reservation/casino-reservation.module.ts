import { Module } from "@nestjs/common";
import { CasinoReservationService } from "./casino-reservation.service";
import { ScheduleModule } from "@nestjs/schedule";
import { UsersModule } from "src/users/users.module";
import { MailerSendModule } from "src/mailer-send/mailer-send.module";

@Module({
  providers: [CasinoReservationService],
  imports: [ScheduleModule.forRoot(), UsersModule, MailerSendModule],
})
export class CasinoReservationModule {}
