import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { ZodError } from "zod";
import * as process from "node:process";

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
  const app = await NestFactory.create(AppModule);
  const port = parseInt(process.env.PORT || "3000", 10);
  const origin = process.env.ALLOWED_ORIGINS?.split("|") || ["http://localhost:3000"];
  console.log({ origin });
  app.enableCors({
    origin,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  });
  app.useGlobalFilters(new ZodFilter());
  await app.listen(port);
  return port;
}
void bootstrap().then(port => {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  console.log(`http://localhost:${port}`);
});
