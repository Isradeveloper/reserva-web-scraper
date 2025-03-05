import { Module } from "@nestjs/common";
import { ResendService } from "./resend.service";
import { ConfigModule } from "@nestjs/config";

@Module({
  providers: [ResendService],
  exports: [ResendService],
  imports: [ConfigModule],
})
export class ResendModule {}
