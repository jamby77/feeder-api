import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { RedisClient } from '../../redis-client/redis-client';

describe('ConfigService', () => {
  let service: ConfigService;

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
      providers: [
        ConfigService,
        {
          provide: RedisClient,
          useValue: mockRedisClient
        }
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
