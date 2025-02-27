import { Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import redisConfig from './config/redis';
import { z, ZodError } from 'zod';
import { ZodFormattedError } from 'zod/lib/ZodError';
import { CreateConfigDto } from './dtos/config.dto';

interface SectionData {
  [key: string]: string;
}

export interface InfoResult {
  [section: string]: SectionData;
}

export const commands = {
  next: 'Next Item',
  prev: 'Previous Item',
  nextUnread: 'Next Unread Item',
  prevUnread: 'Previous Unread Item',
  toggleNewOnTop: 'Toggle New On Top',
  toggleHideRead: 'Toggle Hide Read',
  toggleHideEmptyCategories: 'Toggle Hide Empty Categories',
  toggleHideEmptyFeeds: 'Toggle Hide Empty Feeds',
  refresh: 'Refresh',
  visitSite: 'Visit Site',
};

export type Command = keyof typeof commands;

const DEFAULT_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export const appConfigSchema = z.object({
  title: z.string(),
  refreshInterval: z.number().default(DEFAULT_REFRESH_INTERVAL),
  lastRefresh: z.string().date().optional(),
  newOnTop: z.boolean().default(false),
  hideRead: z.boolean().default(false),
  hideEmptyCategories: z.boolean().default(false),
  hideEmptyFeeds: z.boolean().default(false),
  enableShortcuts: z.boolean().default(false),
  shortcuts: z
    .array(
      z.object({
        key: z.string(),
        title: z.string().optional(),
        altKey: z.boolean().optional(),
        ctrlKey: z.boolean().optional(),
        metaKey: z.boolean().optional(),
        shiftKey: z.boolean().optional(),
        command: z.enum(Object.keys(commands) as [Command]),
      }),
    )
    .optional(),
});
export type AppConfig = z.infer<typeof appConfigSchema>;

const DEFAULT_USER = 'default';

const makeKey = (key: string[] | string, user = DEFAULT_USER) => {
  return `${user}:${Array.isArray(key) ? key.join(':') : key}`;
};

@Injectable()
export class AppService {
  client: RedisClientType;
  private readonly logger = new Logger(AppService.name);

  constructor() {
    const config = redisConfig();
    this.client = createClient(config);
    this.client.on('error', (err) =>
      this.logger.error('Redis Client Error', err),
    );
  }

  private async getClient() {
    if (!this.client.isReady) {
      await this.client.connect();
    }
    return this.client;
  }

  async getConfig(
    user?: string,
  ): Promise<AppConfig | ZodFormattedError<AppConfig>> {
    try {
      const client = await this.getClient();
      const configKey = makeKey('config', user);
      this.logger.debug({ configKey });
      const data = await client.json.get(configKey);
      return appConfigSchema.parse(data);
    } catch (e) {
      if (e instanceof ZodError) {
        return e.format();
      }
      throw e;
    }
  }

  async setConfig(config: AppConfig, user?: string) {
    const client = await this.getClient();
    const configKey = makeKey('config', user);
    // await client.hSet(configKey, config);
    await client.json.set(configKey, '$', config);
  }

  private parseInfo(info: string) {
    let section = 'other';
    return info.split('\n').reduce((res: InfoResult, line) => {
      console.log({ line });
      if (line.startsWith('#')) {
        section = line.slice(2).trim();
        res[section] = { ...(res[section] ?? {}) };
        return res;
      }
      const [key, value] = line.split(':');
      if (!key || !value) {
        return res;
      }
      res[section][key] = value.trim();
      return res;
    }, {});
  }

  async getDbInfo() {
    const client = await this.getClient();
    const info = await client.info();
    return this.parseInfo(info);
  }

  async getHello(): Promise<string | null> {
    const client = await this.getClient();
    await client.SET('hello', 'world');
    return client.GET('hello');
  }

  async createConfig(createConfigDto: CreateConfigDto) {
    await this.setConfig(appConfigSchema.parse(createConfigDto));

    return this.getConfig();
  }
}
