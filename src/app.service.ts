import { Injectable, Logger } from "@nestjs/common";
import { createClient, RedisClientType } from "redis";
import redisConfig from "./config/redis";
import { z, ZodError } from "zod";
import { ZodFormattedError } from "zod/lib/ZodError";
import { AppConfigDto, appConfigSchema } from "./schema/app-config.schema";
import { FeedDto, feedSchema } from "./dtos/feed.dto";
import { FeedItemDto } from "./dtos/feed-item.dto";
import { getFeedDetails } from "./utils/feeds";

interface SectionData {
  [key: string]: string;
}

export interface InfoResult {
  [section: string]: SectionData;
}

const DEFAULT_USER = "default";

const makeKey = (key: string[] | string, user = DEFAULT_USER) => {
  return `${user}:${Array.isArray(key) ? key.join(":") : key}`;
};

@Injectable()
export class AppService {
  client: RedisClientType;
  private readonly logger = new Logger(AppService.name);

  constructor() {
    const config = redisConfig();
    this.client = createClient(config);
    this.client.on("error", err => this.logger.error("Redis Client Error", err));
  }

  private async getClient() {
    if (!this.client.isReady) {
      await this.client.connect();
    }
    return this.client;
  }

  async getConfig(user?: string): Promise<AppConfigDto | ZodFormattedError<AppConfigDto>> {
    try {
      const client = await this.getClient();
      const configKey = makeKey("config", user);
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

  async setConfig(config: AppConfigDto, user?: string) {
    const client = await this.getClient();
    const configKey = makeKey("config", user);
    // await client.hSet(configKey, config);
    await client.json.set(configKey, "$", config);
  }

  private parseInfo(info: string) {
    let section = "other";
    return info.split("\n").reduce((res: InfoResult, line) => {
      console.log({ line });
      if (line.startsWith("#")) {
        section = line.slice(2).trim();
        res[section] = { ...(res[section] ?? {}) };
        return res;
      }
      const [key, value] = line.split(":");
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
    await client.SET("hello", "world");
    return client.GET("hello");
  }

  async createConfig(createConfigDto: AppConfigDto) {
    await this.setConfig(appConfigSchema.parse(createConfigDto));

    return this.getConfig();
  }

  async addFeed(feed: FeedDto) {
    const key = makeKey(["feeds"]);
    const client = await this.getClient();
    await client.json.set(key, "$", { [feed.xmlUrl]: feed });
  }

  async updatedFeed(feed: FeedDto) {
    // return db.feeds.put(feed, feed.id);
    const key = makeKey(["feeds", feed.xmlUrl]);
    const client = await this.getClient();
    await client.json.set(key, "$", feed);
  }

  async deleteFeed(feedId: string) {
    // return db.feeds.delete(feedId);
    const key = makeKey(["feeds", feedId]);
    const client = await this.getClient();
    await client.json.del(key);
  }

  async getFeeds() {
    // const feeds = await db.feeds.toArray();
    const client = await this.getClient();
    const key = makeKey("feeds");
    const data = await client.json.get(key);

    const feeds = z.record(z.string(), feedSchema).parse(data);
    console.log({ feeds });
    // Attach resolved properties "feed items" to each feed
    // using parallel queries:
    await Promise.all(
      Object.keys(feeds).map(async feedId => {
        //     feed.items = await db.feedItems
        //       .where('feedId')
        //       .equals(feed.xmlUrl)
        //       .filter((item) => !item.isRead)
        //       .toArray();
        // const items = await client.json.get(makeKey(["feedItems", feedId]));
        // feeds[feedId].items = z.array(feedItemSchema).parse(items);
      }),
    );
    return feeds;
  }

  async addFeedItem(item: FeedItemDto) {
    const key = makeKey(["feedItems", item.feedId]);
    const client = await this.getClient();
    await client.json.set(key, "$", item);
  }

  async getFeedDetails(url: string) {
    const feedDetails = await getFeedDetails(url);
    if (!feedDetails) {
      return null;
    }
    return feedDetails;
  }
}
