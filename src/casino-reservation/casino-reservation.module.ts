import { Module } from "@nestjs/common";
import { CasinoReservationService } from "./casino-reservation.service";
import { ScheduleModule } from "@nestjs/schedule";
import { UsersModule } from "src/users/users.module";
import { MailModule } from "src/mail/mail.module";

@Module({
  providers: [CasinoReservationService],
  imports: [ScheduleModule.forRoot(), UsersModule, MailModule],
})
export class CasinoReservationModule {}
