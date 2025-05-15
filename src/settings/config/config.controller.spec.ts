import { Test, TestingModule } from '@nestjs/testing';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { RedisClient } from '../../redis-client/redis-client';

describe('ConfigController', () => {
  let controller: ConfigController;

  // Create a mock Redis client
  const mockRedisClient = {
    getClient: jest.fn().mockReturnValue({
      json: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue('OK')
      }
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [
        ConfigService,
        {
          provide: RedisClient,
          useValue: mockRedisClient
        }
      ],
    }).compile();

    controller = module.get<ConfigController>(ConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
