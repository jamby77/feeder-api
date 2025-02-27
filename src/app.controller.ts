import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateConfigDto } from './dtos/config.dto';

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
  setConfig(@Body() createConfigDto: CreateConfigDto) {
    return this.appService.createConfig(createConfigDto);
  }
}
