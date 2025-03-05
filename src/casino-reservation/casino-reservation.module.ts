import { Module } from "@nestjs/common";
import { CasinoReservationService } from "./casino-reservation.service";
import { ScheduleModule } from "@nestjs/schedule";
import { UsersModule } from "src/users/users.module";
import { ResendModule } from "src/resend/resend.module";
import { CasinoReservationController } from "./casino-reservation.controller";

@Module({
  providers: [CasinoReservationService],
  imports: [ScheduleModule.forRoot(), UsersModule, ResendModule],
  controllers: [CasinoReservationController],
})
export class CasinoReservationModule {}
