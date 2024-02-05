import {
  createParamDecorator,
  ExecutionContext,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { Request } from 'express';

export const FileUpload = createParamDecorator(
  async (data: never, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();
    const file = await new ParseFilePipe({
      validators: [
        new FileTypeValidator({ fileType: 'image' }),
        new MaxFileSizeValidator({ maxSize: 1024 * 1000 * 2 }),
      ],
      fileIsRequired: true,
    }).transform(request.file);
    return file;
  },
);
