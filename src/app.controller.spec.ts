import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisClient } from './redis-client/redis-client';

describe('AppController', () => {
  let appController: AppController;

  // Create a mock Redis client
  const mockRedisClient = {
    getClient: jest.fn().mockResolvedValue({
      SET: jest.fn().mockResolvedValue('OK'),
      GET: jest.fn().mockResolvedValue('Hello World!'),
      json: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue('OK'),
        objLen: jest.fn().mockResolvedValue(0),
        del: jest.fn().mockResolvedValue(1)
      },
      expire: jest.fn().mockResolvedValue(1),
      zAdd: jest.fn().mockResolvedValue(1),
      zRange: jest.fn().mockResolvedValue([]),
      zRangeByScore: jest.fn().mockResolvedValue([]),
      zRemRangeByScore: jest.fn().mockResolvedValue(1),
      zDiffStore: jest.fn().mockResolvedValue(1),
      zCard: jest.fn().mockResolvedValue(0),
      zRem: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      info: jest.fn().mockResolvedValue('')
    }),
    disconnect: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: RedisClient,
          useValue: mockRedisClient
        }
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', async () => {
      const result = await appController.getHello();
      expect(result).toBe('Hello World!');
    });
  });
});
