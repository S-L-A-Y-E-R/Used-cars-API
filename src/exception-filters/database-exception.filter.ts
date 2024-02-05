import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  QueryFailedError,
  EntityNotFoundError,
  CannotCreateEntityIdMapError,
  EntityManager,
  QueryRunnerProviderAlreadyReleasedError,
} from 'typeorm';

@Catch(
  QueryFailedError,
  EntityNotFoundError,
  CannotCreateEntityIdMapError,
  EntityManager,
  QueryRunnerProviderAlreadyReleasedError,
)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof QueryFailedError) {
      if (
        exception.message.includes(
          'duplicate key value violates unique constraint',
        )
      ) {
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'Email already exists.',
        });
      } else {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error occurred.',
        });
      }
    } else if (exception instanceof EntityNotFoundError) {
      response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found.',
      });
    } else if (exception instanceof CannotCreateEntityIdMapError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Cannot create entity ID map.',
      });
    } else if (exception instanceof EntityManager) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Entity manager provider already set.',
      });
    } else if (exception instanceof QueryRunnerProviderAlreadyReleasedError) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Query runner provider already released.',
      });
    } else if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({
        statusCode: exception.getStatus(),
        message: exception.message,
      });
    } else if (exception instanceof Error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
      });
    } else {
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
