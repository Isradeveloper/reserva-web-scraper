import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CasinoReservationModule } from "./casino-reservation/casino-reservation.module";
import { UsersModule } from "./users/users.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./users/entities/user.entity";
import { MailModule } from "./mail/mail.module";
import { ConfigModule } from "@nestjs/config";
import { envConfig } from "./config/env.config";
import { envSchema } from "./config/joi.validation";
import { MailerSendModule } from './mailer-send/mailer-send.module';

@Module({
  imports: [
    CasinoReservationModule,
    UsersModule,
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL,
      ssl: true,
      synchronize: true,
      entities: [User],
    }),
    MailModule,
    ConfigModule.forRoot({
      load: [envConfig],
      validationSchema: envSchema,
    }),
    MailerSendModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}