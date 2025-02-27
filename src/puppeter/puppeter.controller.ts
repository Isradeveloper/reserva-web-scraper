import { Controller, Get } from "@nestjs/common";
import { PuppeterService } from "./puppeter.service";

@Controller("puppeter")
export class PuppeterController {
  constructor(private readonly puppeterService: PuppeterService) {}
}
