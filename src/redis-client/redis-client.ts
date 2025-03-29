import { Injectable, Logger } from "@nestjs/common";
import { createClient, RedisClientType } from "redis";
import redisConfig from "../config/redis";

@Injectable()
export class RedisClient {
  client: RedisClientType;
  private readonly logger = new Logger(RedisClient.name);
  constructor() {
    const config = redisConfig();
    this.client = createClient(config);
    this.client.on("error", err => {
      this.logger.error("Redis Client Error", err);
      return this.client.disconnect();
    });
  }

  async getClient() {
    if (!this.client.isReady && !this.client.isOpen) {
      await this.client.connect();
    }
    return this.client;
  }
}
