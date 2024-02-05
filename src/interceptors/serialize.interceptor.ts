import {
  UseInterceptors,
  ExecutionContext,
  CallHandler,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';
import { Observable } from 'rxjs';
import { plainToInstance } from 'class-transformer';

interface ClassConstructor {
  new (...args: any[]): {};
}

export function Serialize(dto: ClassConstructor) {
  return UseInterceptors(new SerializeInterceptor(dto));
}

export class SerializeInterceptor implements NestInterceptor {
  constructor(private dto: ClassConstructor) {}

  intercept(
    ctx: ExecutionContext,
    next: CallHandler<any>, // Provide a type argument for CallHandler
  ): Observable<any> | Promise<Observable<any>> {
    // Run something before a request is handled by the request handler

    return next.handle().pipe(
      map((data) => {
        // Run something before the response is sent out
        return plainToInstance(this.dto, data, {
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}
