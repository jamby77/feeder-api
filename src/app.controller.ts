import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common';
import { AppService } from './app.service';
import { AppConfigDto, appConfigSchema } from './schema/app-config.schema';
import { ZodValidationPipe } from './zod.pipe';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Get('/info')
  getInfo() {
    return this.appService.getDbInfo();
  }

  @Get('/config')
  getConfig() {
    return this.appService.getConfig();
  }

  @Post('/config')
  @UsePipes(new ZodValidationPipe(appConfigSchema))
  setConfig(@Body() createConfigDto: AppConfigDto) {
    return this.appService.createConfig(createConfigDto);
  }
}
