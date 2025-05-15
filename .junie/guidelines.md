# Feeder API Development Guidelines

This document provides essential information for developers working on the Feeder API project.

## Build and Configuration

### Prerequisites
- Node.js (version compatible with NestJS 11)
- pnpm package manager

### Installation
```bash
# Install dependencies
pnpm install
```

### Environment Configuration
The application uses environment variables for configuration:
- `.env` - Default environment variables
- `.env.local` - Local overrides (not committed to version control)

### Build Commands
```bash
# Build the application
pnpm build

# Development mode with hot-reload
pnpm dev

# Debug mode
pnpm debug

# Production mode
pnpm start:prod
```

## Testing

### Test Configuration
- Unit tests are located alongside the source files with the `.spec.ts` suffix
- E2E tests are in the `test` directory with the `.e2e-spec.ts` suffix
- Jest is used as the testing framework

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests with watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run tests in debug mode
pnpm test:debug

# Run E2E tests
pnpm test:e2e
```

### Writing Tests

#### Unit Tests
Unit tests should be placed in the same directory as the file being tested, with the `.spec.ts` suffix.

Example of a simple unit test:

```typescript
import { truncateString } from "./string-utils";

describe("truncateString", () => {
  it("should return the original string if it's shorter than maxLength", () => {
    const result = truncateString("Hello", 10);
    expect(result).toBe("Hello");
  });

  it("should truncate the string and add ellipsis if longer than maxLength", () => {
    const result = truncateString("Hello World", 5);
    expect(result).toBe("Hello...");
  });
});
```

#### Testing NestJS Components
When testing NestJS components that have dependencies, you need to properly mock those dependencies:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';
import { DependencyService } from './dependency.service';

// Create a mock of the dependency
const mockDependencyService = {
  someMethod: jest.fn().mockReturnValue('mocked value'),
};

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        // Provide the mock instead of the real dependency
        { provide: DependencyService, useValue: mockDependencyService },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

#### E2E Tests
E2E tests should be placed in the `test` directory with the `.e2e-spec.ts` suffix.

## Code Style and Linting

### Code Style
The project uses Prettier for code formatting with the following key settings:
- Tab width: 2 spaces
- Double quotes for strings
- Semicolons required
- Maximum line length: 120 characters
- Import sorting using `@ianvs/prettier-plugin-sort-imports`

### Linting
ESLint is configured with TypeScript support and integration with Prettier.

Key ESLint rules:
- TypeScript strict mode with some exceptions
- Allows `any` type and some unsafe operations
- Warns about floating promises
- Unused variables with underscore prefix are ignored

### Commands
```bash
# Format code
pnpm format

# Lint code
pnpm lint
```

## Redis Integration

The project uses Redis for caching and data storage. The `RedisClient` class in `src/redis-client/redis-client.ts` provides the interface to Redis.

When testing components that depend on Redis, make sure to mock the `RedisClient` to avoid actual Redis connections during tests.

## Project Structure

- `src/` - Source code
  - `models/` - Data models
  - `dtos/` - Data Transfer Objects
  - `schema/` - Schema definitions
  - `redis-client/` - Redis client implementation
  - `settings/` - Settings-related modules
  - `utils/` - Utility functions
- `test/` - E2E tests
- `dist/` - Compiled output
