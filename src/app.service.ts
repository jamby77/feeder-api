import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { FeedDto, feedSchema } from "./dtos/feed.dto";
import { FeedItemDto, feedItemSchema } from "./dtos/feed-item.dto";
import { FEED_ITEM_EXPIRE_TIME_IN_MS, fetchArticle, getFeedDetails, getFeedItems, safeId } from "./utils/feeds";
import { RedisClient } from "./redis-client/redis-client";
import { makeKey } from "./utils/keys";

interface SectionData {
  [key: string]: string;
}

export interface InfoResult {
  [section: string]: SectionData;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly KEY_ALL = "all";
  private readonly KEY_FEED_ITEMS = "feedItems";
  private readonly KEY_READ = "read";
  private readonly KEY_UNREAD = "unread";
  private readonly KEY_FEEDS = "feeds";

  constructor(private readonly client: RedisClient) {}

  /**
   * Retrieves information about the Redis database.
   *
   * The output of the Redis `INFO` command is parsed and returned as an object.
   * The object is a mapping of section names to objects where the keys are the
   * keys from the info output and the values are the values from the info output.
   * The possible section names are:
   * - `other`: The default section name.
   * - `Server`: The version of Redis and the OS it is running on.
   * - `Clients`: The number of connected clients.
   * - `Memory`: The memory usage of Redis.
   * - `Persistence`: The number of keys that are being persisted.
   * - `Stats`: The number of commands processed, keys accessed, etc.
   * - `Replication`: The status of replication.
   * - `CPU`: The CPU usage of Redis.
   * - `Cluster`: The status of the Redis Cluster.
   * - `Keyspace`: The number of keys in each database.
   * @returns The parsed info.
   */
  async getDbInfo() {
    const client = await this.client.getClient();
    const info = await client.info();
    return this.parseInfo(info);
  }

  async getHello(): Promise<string | null> {
    const client = await this.client.getClient();
    await client.SET("hello", "world");
    return await client.GET("hello");
  }

  async getFeed(feedId: string, user?: string): Promise<FeedDto | null> {
    const key = this.getKeyFeeds(user);
    const client = await this.client.getClient();
    const path = `$.${safeId(feedId)}`;
    const data = await client.json.get(key, {
      path: path,
    });

    if (Array.isArray(data) && data.length === 0) {
      return null;
    }
    return data ? feedSchema.parse(data[0]) : null;
  }

  async addFeed(feed: FeedDto, user?: string) {
    const key = this.getKeyFeeds(user);
    const client = await this.client.getClient();
    const hasFeeds = await client.json.objLen(key);
    if (!hasFeeds) {
      await client.json.set(key, "$", { [safeId(feed.xmlUrl)]: feed });
    } else {
      await client.json.set(key, `$.${safeId(feed.xmlUrl)}`, feed);
    }
    return feed;
  }

  async updateFeed(feed: FeedDto, user?: string) {
    // return db.feeds.put(feed, feed.id);
    const key = this.getKeyFeeds(user);
    const client = await this.client.getClient();
    await client.json.set(key, `$.${safeId(feed.xmlUrl)}`, feed);
    return this.getFeed(feed.xmlUrl, user);
  }

  async deleteFeed(feedId: string, user?: string) {
    // return db.feeds.delete(feedId);
    const key = this.getKeyFeeds(user);
    const client = await this.client.getClient();
    return await client.json.del(key, `$.${safeId(feedId)}`);
  }

  async getAllFeeds(user?: string): Promise<Record<string, FeedDto>> {
    // const feeds = await db.feeds.toArray();
    const client = await this.client.getClient();
    const key = this.getKeyFeeds(user);
    const data = await client.json.get(key);

    return z.record(z.string(), feedSchema).parse(data);
  }

  /**
   * Store a single feed item in the database.
   *
   * @param item the item to store
   * @param user
   * @remarks
   * This method will store the item in a JSON object with the given key,
   * and set an expiry time of 30 days. It will also add the item to a sorted set
   * of all items for the feed, with a score of the current time plus 30 days.
   * This allows us to easily retrieve all items for a feed, sorted by expiration time.
   */
  async addFeedItem(item: FeedItemDto, user?: string) {
    const feedItemKey = this.getKeyFeedItem(item.feedId, item.id, user);
    const feedItemsKey = this.getKeyAllFeedItems(item.feedId, user);
    const client = await this.client.getClient();
    // store item
    await client.json.set(feedItemKey, "$", item, { NX: true });
    let article: string | null;
    [article] = (await client.json.get(feedItemKey, { path: "$.article" })) as string[];

    if ((!article || article?.length === 0) && item.link) {
      this.logger.debug("Fetching and storing article content");
      article = await fetchArticle(item.link);
      this.logger.debug({ article });
      await client.json.set(feedItemKey, "$.article", article);
    }
    // set expire time, 30 days
    await client.expire(feedItemKey, FEED_ITEM_EXPIRE_TIME_IN_MS / 1000, "LT");
    await client.zAdd(feedItemsKey, [{ value: item.id, score: Date.now() }], { NX: true });
  }

  /**
   * Clear all feed items older than 30 days
   * @param feedId
   * @param user
   */
  async clearFeedItems(feedId: string, user?: string) {
    const allFeedItemsKey = this.getKeyAllFeedItems(feedId, user);
    const readFeedItemsKey = this.getKeyReadFeedItems(feedId, user);
    const expiryTime = Date.now() - FEED_ITEM_EXPIRE_TIME_IN_MS;
    const client = await this.client.getClient();
    this.logger.debug("clearFeedItems", { expiryTime, allFeedItemsKey, readFeedItemsKey });

    const all = await Promise.all([
      client.zRangeByScore(allFeedItemsKey, 0, expiryTime),
      client.zRangeByScore(readFeedItemsKey, 0, expiryTime),
    ]);
    this.logger.debug("all for clearing", all);
    // return all;
    return Promise.all([
      client.zRemRangeByScore(allFeedItemsKey, 0, expiryTime),
      client.zRemRangeByScore(readFeedItemsKey, 0, expiryTime),
    ]);
  }

  /*
   *  - fetch feed items,
   *  - store them in object like structure
   *  - set expire time with LT flag - LT -- Set expiry only when the new expiry is less than current one
   *  - expire time is 30 days
   *  - create 2 sorted sets per feed, one for all items, another for read items
   * zAdd <key> NX <score> <member> - NX -- Don't create if the member already exists
   * to get read items count
   * */
  async storeFeedItems(items: FeedItemDto[]) {
    return Promise.all(items.map(item => this.addFeedItem(item)));
  }

  async refreshFeeds(user?: string) {
    const feeds = await this.getAllFeeds(user);
    return Promise.all(Object.values(feeds).map(feed => this.refreshFeed(feed.xmlUrl, user)));
  }

  async refreshFeed(url: string, user?: string) {
    const feedItems = await getFeedItems(url);
    // update last updated for feed
    const client = await this.client.getClient();
    const key = this.getKeyFeeds(user);
    const path = `$.${safeId(url)}.lastUpdated`;
    await client.json.set(key, path, new Date().toISOString());

    if (!feedItems || !feedItems.length) {
      return [];
    }
    void this.storeFeedItems(feedItems);
    return this.clearFeedItems(url, user);
  }

  async getFeedDetails(url: string, user?: string) {
    const { feed: feedDetails, feedItems } = await getFeedDetails(url);
    if (!feedDetails) {
      return null;
    }
    if (feedItems) {
      void this.storeFeedItems(feedItems);
    }
    const existing = await this.getFeed(feedDetails.xmlUrl, user);
    if (existing) {
      feedDetails.lastUpdated = new Date().toISOString();
      await this.updateFeed(feedDetails, user);
    } else {
      await this.addFeed(feedDetails, user);
    }
    return feedDetails;
  }

  async getFeedItems(feedId: string, unreadOnly: boolean, limit: number, user?: string) {
    const allFeedKeys = this.getKeyAllFeedItems(feedId, user);
    const readFeedKeys = this.getKeyReadFeedItems(feedId, user);
    const client = await this.client.getClient();
    let feedItemIds: string[];
    if (unreadOnly) {
      const unreadFeedKeys = this.getKeyUnreadFeedItems(feedId, user);
      await client.zDiffStore(unreadFeedKeys, [allFeedKeys, readFeedKeys]);
      feedItemIds = await client.zRange(unreadFeedKeys, "-inf", "+inf", {
        LIMIT: { offset: 0, count: limit },
        BY: "SCORE",
      });
      await client.del(unreadFeedKeys);
    } else {
      feedItemIds = await client.zRange(allFeedKeys, "-inf", "+inf", {
        LIMIT: { offset: 0, count: limit },
        BY: "SCORE",
      });
    }
    const data = await Promise.all(
      feedItemIds.map(async id => {
        return client.json.get(this.getKeyFeedItem(feedId, id, user));
      }),
    );
    return z.array(feedItemSchema).parse(data);
  }

  async markFeedItemAsRead(feedId: string, feedItemId: string, user?: string) {
    const client = await this.client.getClient();
    const readFeedKeys = this.getKeyReadFeedItems(feedId, user);
    const itemKey = this.getKeyFeedItem(feedId, feedItemId, user);
    const item = await client.json.get(itemKey);
    if (!item) {
      return;
    }
    await client.json.set(itemKey, "$.isRead", true);
    return client.zAdd(readFeedKeys, [{ value: feedItemId, score: Date.now() }], { NX: true });
  }

  async markAllFeedItemAsRead(feedId: string, user?: string) {
    const client = await this.client.getClient();
    const readFeedKeys = this.getKeyReadFeedItems(feedId, user);
    const score = Date.now();
    const allFeedKeys = this.getKeyAllFeedItems(feedId, user);
    const feedItemIds = await client.zRange(allFeedKeys, 0, -1);
    return Promise.all(
      feedItemIds.flatMap(id => {
        return [
          client.json.set(this.getKeyFeedItem(feedId, id, user), "$.isRead", true),
          client.zAdd(
            readFeedKeys,
            [
              {
                value: id,
                score,
              },
            ],
            { NX: true },
          ),
        ];
      }),
    );
  }

  async markAllFeedItemAsUnRead(feedId: string, user?: string) {
    const client = await this.client.getClient();
    const readFeedKeys = this.getKeyReadFeedItems(feedId, user);
    return client.zRemRangeByScore(readFeedKeys, "-inf", "+inf");
  }

  async markFeedItemAsUnRead(feedId: string, feedItemId: string, user?: string) {
    const client = await this.client.getClient();
    const readFeedKeys = this.getKeyReadFeedItems(feedId, user);
    return client.zRem(readFeedKeys, feedItemId);
  }

  async getFeedCount(feedId: string, unreadOnly?: boolean, user?: string) {
    const client = await this.client.getClient();
    if (unreadOnly) {
      const unreadFeedKeys = await this.generateUnread(feedId, user);
      const count = await client.zCard(unreadFeedKeys);
      await client.del(unreadFeedKeys);
      return count;
    }
    const allFeedKeys = this.getKeyAllFeedItems(feedId, user);
    return client.zCard(allFeedKeys);
  }

  async getTotalFeedCount(unreadOnly: boolean) {
    // get all feeds and iterate over them to get total count
    const feeds = await this.getAllFeeds();
    const result: Record<string, any> = {
      total: 0,
    };
    for (const feed of Object.values(feeds)) {
      result[feed.xmlUrl] = await this.getFeedCount(feed.xmlUrl, unreadOnly);
      result.total += result[feed.xmlUrl];
    }

    return result;
  }

  async disconnect() {
    return this.client.disconnect();
  }

  /**
   * Parses the output of the Redis `INFO` command.
   *
   * The output is split into lines and each line is split into key-value pairs.
   * If a line starts with `#`, it is considered a section header and the name
   * of the section is used as the key for the values that follow. The
   * resulting object is a mapping of section names to objects where the keys
   * are the keys from the info output and the values are the values from the
   * info output.
   * @param info The output of the `INFO` command.
   * @returns An object with the parsed info.
   */
  private parseInfo(info: string) {
    let section = "other";
    return info.split("\n").reduce((res: InfoResult, line) => {
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

  private async generateUnread(feedId: string, user?: string) {
    const unreadFeedKeys = this.getKeyUnreadFeedItems(feedId, user);
    const allFeedKeys = this.getKeyAllFeedItems(feedId, user);
    const readFeedKeys = this.getKeyReadFeedItems(feedId, user);
    const client = await this.client.getClient();
    await client.zDiffStore(unreadFeedKeys, [allFeedKeys, readFeedKeys]);
    return unreadFeedKeys;
  }

  private getKeyUnreadFeedItems(feedId: string, user: string | undefined) {
    return makeKey([this.KEY_FEED_ITEMS, this.KEY_UNREAD, feedId], user);
  }

  private getKeyReadFeedItems(feedId: string, user: string | undefined) {
    return makeKey([this.KEY_FEED_ITEMS, this.KEY_READ, feedId], user);
  }

  private getKeyAllFeedItems(feedId: string, user: string | undefined) {
    return makeKey([this.KEY_FEED_ITEMS, this.KEY_ALL, feedId], user);
  }

  private getKeyFeeds(user: string | undefined) {
    return makeKey([this.KEY_FEEDS], user);
  }

  private getKeyFeedItem(feedId: string, itemId: string, user: string | undefined) {
    return makeKey([this.KEY_FEED_ITEMS, feedId, itemId], user);
  }
}
