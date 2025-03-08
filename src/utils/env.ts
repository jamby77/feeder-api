import * as process from "node:process";
import { z, ZodError } from "zod";
import { ConfigModule } from "@nestjs/config";

void ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [".env", ".env.local"],
});
const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().min(1025).max(65535).optional().default(3000),
  REDIS_USER: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number().min(1025).max(65535).optional().default(6379),
  ALLOWED_ORIGINS: z.string().optional().default("http://localhost:3000"),
});

export type Env = z.infer<typeof configSchema>;

let env: Env;
try {
  env = configSchema.parse(process.env);
} catch (error) {
  if (error instanceof ZodError) console.error(error.errors);

  process.exit(1);
}

const IS_PRODUCTION = env.NODE_ENV === "production";
const IS_DEVELOPMENT = env.NODE_ENV === "development";

export { env, IS_PRODUCTION, IS_DEVELOPMENT };
