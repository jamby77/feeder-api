import { Injectable } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import redisConfig from './config/redis';

@Injectable()
export class AppService {
  client: RedisClientType;
  constructor() {
    const config = redisConfig();
    this.client = createClient(config);
    this.client.on('error', (err) => console.log('Redis Client Error', err));
  }
  private async getClient() {
    if (!this.client.isReady) {
      await this.client.connect();
    }
    return this.client;
  }

  async getDbInfo() {
    const client = await this.getClient();
    return await client.info();
  }

  async getHello(): Promise<string | null> {
    const client = await this.getClient();
    await client.SET('hello', 'world');
    return client.GET('hello');
  }
}
