import { Body, Controller, Delete, Get, Logger, Param, Post, UsePipes } from "@nestjs/common";
import { ConfigService } from "./config.service";
import { AppConfigDto, appConfigSchema } from "../../schema/app-config.schema";
import { ZodValidationPipe } from "../../zod.pipe";

@Controller("settings/config")
export class ConfigController {
  private readonly logger = new Logger(ConfigController.name);
  constructor(private readonly configService: ConfigService) {}

  /**
   * Sets the application configuration.
   *
   * This endpoint accepts a configuration object and updates the application
   * settings accordingly. The configuration is validated using a Zod schema.
   *
   * @param createConfigDto - The configuration data transfer object containing the new settings.
   * @returns The updated configuration.
   */
  @Post()
  @UsePipes(new ZodValidationPipe(appConfigSchema))
  create(@Body() createConfigDto: AppConfigDto) {
    this.logger.debug("create", { createConfigDto });
    return this.configService.create(createConfigDto);
  }

  @Get()
  findAll() {
    this.logger.debug("getConfig");
    return this.configService.findAll();
  }

  @Get(":key")
  findOne(@Param("key") key: string) {
    return this.configService.findOne(key);
  }

  @Delete(":key")
  remove(@Param("key") key: string) {
    return this.configService.remove(key);
  }
}
