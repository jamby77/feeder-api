import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { log } from "console";
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { ZodError } from "zod";

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
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ["http://localhost", /.*\.vercel\.app/],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  });
  app.useGlobalFilters(new ZodFilter());
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  return port;
}
void bootstrap().then(port => log(`http://localhost:${port}`));
