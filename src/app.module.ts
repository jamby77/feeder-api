import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SettingsModule } from "./settings/settings.module";
import { RedisClient } from './redis-client/redis-client';

@Module({
  imports: [SettingsModule],
  controllers: [AppController],
  providers: [AppService, RedisClient],
})
export class AppModule {}
