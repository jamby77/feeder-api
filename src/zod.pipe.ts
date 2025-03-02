import { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

export class ZodValidationPipe<T extends z.ZodTypeAny>
  implements PipeTransform
{
  constructor(private readonly schema: T) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    this.schema.parse(value);
    return value;
  }
}
