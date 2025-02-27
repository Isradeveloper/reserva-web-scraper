import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PuppeterModule } from "./puppeter/puppeter.module";
import { UsersModule } from "./users/users.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./users/entities/user.entity";
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    PuppeterModule,
    UsersModule,
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: "database.sqlite",
      synchronize: true,
      entities: [User],
    }),
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
