import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ArgumentsHost, Catch, ConsoleLogger, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { ZodError } from "zod";
import { env, IS_DEVELOPMENT, IS_PRODUCTION } from "./utils/env";

@Catch(ZodError)
class ZodFilter<T extends ZodError> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = HttpStatus.BAD_REQUEST;
    response.status(status).json({
      errors: exception.errors,
      message: exception.message,
      statusCode: status,
      stack: exception.stack,
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: IS_DEVELOPMENT,
    logger: new ConsoleLogger({
      prefix: "Feeder-Api",
      timestamp: true,
      breakLength: 200,
      colors: IS_DEVELOPMENT,
      json: IS_PRODUCTION, //process.env.NODE_ENV !== "development",
    }),
  });
  const port = env.PORT;
  const allowedOrigins = env.ALLOWED_ORIGINS.split("|");
  app.enableCors({
    origin: function (origin: string, callback: (...args: unknown[]) => void) {
      // console.log({ origin, allowedOrigins });
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
    credentials: true,
    allowedHeaders:
      "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe, x-vercel-protection-bypass, x-vercel-set-bypass-cookie",
  });
  app.useGlobalFilters(new ZodFilter());
  await app.listen(port);
  return port;
}

void bootstrap().then(port => {
  if (IS_PRODUCTION) {
    return;
  }
  console.log(`http://localhost:${port}`);
});
