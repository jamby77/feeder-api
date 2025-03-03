import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Logger,
  ParseBoolPipe,
  Post,
  Put,
  Query,
  UsePipes,
} from "@nestjs/common";
import { AppService } from "./app.service";
import { AppConfigDto, appConfigSchema } from "./schema/app-config.schema";
import { ZodValidationPipe } from "./zod.pipe";
import { FeedDto } from "./dtos/feed.dto";

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  constructor(private readonly appService: AppService) {}

  /**
   * A simple "Hello World" endpoint to test if the app is working.
   * @returns a string "Hello World!"
   */
  @Get()
  getHello() {
    this.logger.debug("getHello");
    return this.appService.getHello();
  }

  /**
   * Get information about the Redis database.
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
  @Get("/info")
  getInfo() {
    this.logger.debug("getInfo");
    return this.appService.getDbInfo();
  }

  /**
   * Retrieves the current app configuration.
   *
   * @returns The current app configuration as a JSON object.
   */
  @Get("/config")
  getConfig() {
    this.logger.debug("getConfig");
    return this.appService.getConfig();
  }

  /**
   * Sets the application configuration.
   *
   * This endpoint accepts a configuration object and updates the application
   * settings accordingly. The configuration is validated using a Zod schema.
   *
   * @param createConfigDto - The configuration data transfer object containing the new settings.
   * @returns The updated configuration.
   */
  @Post("/config")
  @UsePipes(new ZodValidationPipe(appConfigSchema))
  setConfig(@Body() createConfigDto: AppConfigDto) {
    this.logger.debug("setConfig", { createConfigDto });
    return this.appService.createConfig(createConfigDto);
  }

  /**
   * Retrieves all feeds.
   *
   * This endpoint returns an object containing all feeds where the key is the
   * feed ID and the value is the feed data.
   *
   * @returns An object containing all feeds.
   */
  @Get("/feeds")
  getFeeds() {
    this.logger.debug("getFeeds");
    return this.appService.getAllFeeds();
  }

  /**
   * Creates a new feed.
   *
   * This endpoint accepts a feed data transfer object and creates a new feed
   * entry in the database.
   *
   * @param dto - The feed data transfer object containing the feed data.
   * @returns The newly created feed.
   */
  @Post("/feeds")
  @UsePipes(new ZodValidationPipe(appConfigSchema))
  createFeed(@Body() dto: FeedDto) {
    this.logger.debug("createFeed", { dto });
    return this.appService.addFeed(dto);
  }

  /**
   * Updates a feed.
   *
   * This endpoint accepts a feed data transfer object and updates the existing
   * feed entry in the database.
   *
   * @param dto - The feed data transfer object containing the feed data.
   * @returns The updated feed.
   */
  @Put("/feeds")
  @UsePipes(new ZodValidationPipe(appConfigSchema))
  updateFeed(@Body() dto: FeedDto) {
    this.logger.debug("updateFeed", { dto });
    return this.appService.updateFeed(dto);
  }

  /**
   * Deletes a feed.
   *
   * This endpoint accepts a feed URL and deletes the feed
   * entry in the database.
   *
   * @param url - The URL of the feed to delete.
   */
  @Delete("/feeds")
  @UsePipes(new ZodValidationPipe(appConfigSchema))
  deleteFeed(@Query("feed") url: string) {
    this.logger.debug("deleteFeed", { url });
    if (!url) {
      throw new BadRequestException("No url provided");
    }
    return this.appService.deleteFeed(url);
  }

  /**
   * Retrieves the details of a feed.
   *
   * This endpoint accepts a feed URL as a query parameter and returns the
   * details of the feed.
   *
   * @param url - The URL of the feed to retrieve.
   * @returns The details of the specified feed.
   */
  @Get("/feed/details")
  async feedDetails(@Query("feed") url: string) {
    this.logger.debug("feedDetails", { url });
    if (!url) {
      throw new BadRequestException("No url provided");
    }
    return await this.appService.getFeedDetails(url);
  }

  /**
   * Retrieves the count of feed items.
   *
   * This endpoint returns the total number of feed items for a given feed URL.
   * If no URL is provided, it returns the total count of all feeds.
   * The count can be filtered to include only unread items if specified.
   *
   * @param url - The URL of the feed to retrieve the count for.
   * @param unreadOnly - A boolean indicating whether to count only unread items.
   * @returns The count of feed items.
   */
  @Get("/feed/details/count")
  async feedCount(
    @Query("feed") url: string,
    @Query("unread", new DefaultValuePipe(false), new ParseBoolPipe()) unreadOnly: boolean,
  ) {
    this.logger.debug("feedCount", { url, unreadOnly });
    if (!url) {
      return await this.appService.getTotalFeedCount(unreadOnly);
    }
    return await this.appService.getFeedCount(url, unreadOnly);
  }

  /**
   * Retrieves feed items.
   *
   * This endpoint accepts a feed URL and returns a list of feed items
   * from the specified feed. The items can be filtered to include only
   * unread items and limited to a specified number.
   *
   * @param url - The URL of the feed from which to retrieve items.
   * @param unreadOnly - A boolean indicating whether to include only unread items.
   * @param limit - The maximum number of items to retrieve.
   * @returns A list of feed items.
   * @throws BadRequestException if no URL is provided.
   */
  @Get("/feed/items")
  async feedItems(
    @Query("feed") url: string,
    @Query("unread", new DefaultValuePipe(false)) unreadOnly: boolean,
    @Query("limit", new DefaultValuePipe(100)) limit: number,
  ) {
    this.logger.debug("feedItems", { url, unreadOnly, limit });
    if (!url) {
      throw new BadRequestException("No url provided");
    }
    await this.appService.refreshFeed(url);
    return await this.appService.getFeedItems(url, unreadOnly, limit);
  }

  /**
   * Marks a specific feed item as read.
   *
   * This endpoint marks a feed item as read for a given feed URL and item ID.
   *
   * @param url - The URL of the feed containing the item to be marked as read.
   * @param id - The ID of the feed item to mark as read.
   * @throws BadRequestException if no URL or item ID is provided.
   * @returns A promise that resolves when the feed item is successfully marked as read.
   */
  @Put("/feed/items/read")
  async markFeedItemAsRead(@Query("feed") url: string, @Query("feedItem") id: string) {
    this.logger.debug("markFeedItemAsRead", { url, id });
    if (!url) {
      throw new BadRequestException("No url provided");
    }
    if (!id) {
      return await this.appService.markAllFeedItemAsRead(url);
    }
    return await this.appService.markFeedItemAsRead(url, id);
  }

  @Put("/feed/items/un-read")
  async markFeedItemAsUnRead(@Query("feed") url: string, @Query("feedItem") id: string) {
    this.logger.debug("markFeedItemAsUnRead", { url, id });
    if (!url) {
      throw new BadRequestException("No url provided");
    }
    if (!id) {
      return await this.appService.markAllFeedItemAsUnRead(url);
    }
    return await this.appService.markFeedItemAsUnRead(url, id);
  }

  @Get("/refresh")
  async refresh(@Query("feed") url: string) {
    this.logger.debug("refresh", { url });
    if (url) {
      return await this.appService.refreshFeed(url);
    }
    return await this.appService.refreshFeeds();
  }
}
