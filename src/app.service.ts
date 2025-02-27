import { Injectable, Req } from '@nestjs/common';
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
    await this.client.connect();
    return this.client;
  }

  async getDbInfo() {
    const client = await this.getClient();
    const info = await client.info();
    return info;
  }

  async getHello(): Promise<string | null> {
    const client = await this.getClient();
    await client.SET('hello', 'world');
    return client.GET('hello');
  }
}
