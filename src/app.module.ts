import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PuppeterModule } from "./puppeter/puppeter.module";
import { UsersModule } from "./users/users.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./users/entities/user.entity";
import { MailModule } from "./mail/mail.module";
import { ConfigModule } from "@nestjs/config";
import { envConfig } from "./config/env.config";
import { envSchema } from "./config/joi.validation";

@Module({
  imports: [
    PuppeterModule,
    UsersModule,
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: "data/database.sqlite",
      synchronize: true,
      entities: [User],
    }),
    MailModule,
    ConfigModule.forRoot({
      load: [envConfig],
      validationSchema: envSchema,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
