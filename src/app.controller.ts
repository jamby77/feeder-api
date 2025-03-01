import { BadRequestException, Body, Controller, Get, Post, Query, UsePipes } from "@nestjs/common";
import { AppService } from "./app.service";
import { AppConfigDto, appConfigSchema } from "./schema/app-config.schema";
import { ZodValidationPipe } from "./zod.pipe";
import { FeedDto } from "./dtos/feed.dto";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Get("/info")
  getInfo() {
    return this.appService.getDbInfo();
  }

  @Get("/config")
  getConfig() {
    return this.appService.getConfig();
  }

  @Post("/config")
  @UsePipes(new ZodValidationPipe(appConfigSchema))
  setConfig(@Body() createConfigDto: AppConfigDto) {
    return this.appService.createConfig(createConfigDto);
  }

  @Get("/feeds")
  getFeeds() {
    return this.appService.getFeeds();
  }

  @Post("/feeds")
  @UsePipes(new ZodValidationPipe(appConfigSchema))
  createFeed(@Body() dto: FeedDto) {
    return this.appService.addFeed(dto);
  }

  @Get("/feed-details")
  async feedDetails(@Query("url") url: string) {
    if (!url) {
      throw new BadRequestException("No url provided");
    }
    return await this.appService.getFeedDetails(url);
  }
}
