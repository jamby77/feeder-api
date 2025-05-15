import { Injectable, Logger } from "@nestjs/common";
import { createClient, RedisClientType } from "redis";
import redisConfig from "../config/redis";

@Injectable()
export class RedisClient {
  client: RedisClientType;
  private readonly logger = new Logger(RedisClient.name);
  private readonly config = redisConfig();
  constructor() {
    this.#connect();
  }
  #connect() {
    this.client = createClient(this.config);
    this.client.on("error", this.handleError.bind(this));
  }

  handleError(err: any) {
    this.logger.error("Redis Client Error", err);
    this.#connect();
  }

  async getClient() {
    if (!this.client.isReady && !this.client.isOpen) {
      await this.client.connect();
    }
    return this.client;
  }

  disconnect() {
    return this.client.disconnect();
  }
}
