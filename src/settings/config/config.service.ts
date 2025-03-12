import { Injectable, Logger } from "@nestjs/common";
import { AppConfigDto, appConfigSchema } from "../../schema/app-config.schema";
import { RedisClient } from "../../redis-client/redis-client";
import { makeKey } from "../../utils/keys";
import { DEFAULT_USER } from "../../utils/env";

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);
  private readonly user = DEFAULT_USER;
  private readonly KEY_CONFIG = "config";
  constructor(private readonly client: RedisClient) {}

  async create(createConfigDto: AppConfigDto) {
    const client = await this.client.getClient();
    const configKey = this.getKeyConfig();
    // await client.hSet(configKey, config);
    await client.json.set(configKey, "$", createConfigDto);
    return createConfigDto;
  }
  private getKeyConfig() {
    return makeKey(this.KEY_CONFIG, this.user);
  }

  async findAll(): Promise<AppConfigDto> {
    const client = await this.client.getClient();
    const configKey = this.getKeyConfig();
    this.logger.debug({ configKey });
    const data = await client.json.get(configKey);
    return appConfigSchema.parse(data);
  }

  async findOne(key: string) {
    const config = await this.findAll();

    const configElement = config[key];
    if (!configElement) {
      return null;
    }
    return configElement;
  }

  async remove(key: string) {
    const config = await this.findAll();
    if (!config[key]) {
      return null;
    }
    const newConfig = { ...config };
    delete newConfig[key];
    const client = await this.client.getClient();
    const configKey = this.getKeyConfig();
    await client.json.set(configKey, "$", newConfig);
    return newConfig;
  }
}
