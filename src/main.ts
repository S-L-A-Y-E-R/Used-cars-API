import { NestFactory } from '@nestjs/core';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import * as morgan from 'morgan';
import 'dotenv/config';
import helmet from 'helmet';
import compression from 'compression';
import { ValidationPipe } from '@nestjs/common';
import { UsersModule } from './users/users.module';

async function bootstrap() {
  //create nest application
  const app = await NestFactory.create(UsersModule);

  //Use validation pipe
  app.useGlobalPipes(new ValidationPipe());

  //Enable Logging
  app.use(morgan('dev'));

  //Set security http headers
  app.use(helmet());

  //Enable cors for all domains
  const corsOptions: CorsOptions = {
    origin: '*',
    credentials: true,
  };
  app.enableCors(corsOptions);

  //Compress all text sent in the response to the client
  if (process.env.NODE_ENV === 'production') {
    app.use(compression());
  }

  //Listen on port
  await app.listen(process.env.PORT || 4001).then(() => {
    console.log(`Server is running on port ${process.env.PORT || 4001}`);
  });
}

bootstrap();
