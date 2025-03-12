import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { FeedsModule } from "./feeds/feeds.module";

@Module({
  imports: [ConfigModule, FeedsModule],
})
export class SettingsModule {}
