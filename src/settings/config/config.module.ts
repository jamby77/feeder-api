import { Module } from "@nestjs/common";
import { ConfigService } from "./config.service";
import { ConfigController } from "./config.controller";
import { RedisClient } from "../../redis-client/redis-client";

@Module({
  controllers: [ConfigController],
  providers: [RedisClient, ConfigService],
})
export class ConfigModule {}
