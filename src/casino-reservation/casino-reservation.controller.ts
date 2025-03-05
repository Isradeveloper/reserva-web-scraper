import { Controller, Get } from "@nestjs/common";
import { CasinoReservationService } from "./casino-reservation.service";

@Controller("casino-reservation")
export class CasinoReservationController {
  constructor(
    private readonly casinoReservationService: CasinoReservationService,
  ) {}

  @Get("reservar-usuarios")
  async reservarUsuarios() {
    return this.casinoReservationService.reservarUsuarios();
  }
}
