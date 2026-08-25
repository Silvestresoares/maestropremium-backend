import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../../errors/AppError';

export function errorHandler(
  error: Error,
  request: Request,
  response: Response,
  next: NextFunction
) {
  // 1. Captura de erros operacionais previstos na regra de negócio
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      status: 'error',
      message: error.message
    });
  }

  // 2. Captura automatizada de erros de validação do Zod
  if (error instanceof ZodError) {
    return response.status(400).json({
      status: 'validation_error',
      message: 'Falha na validação dos dados de entrada.',
      errors: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
  }

  // 3. Captura de falhas críticas ou desconhecidas (Bug / Infraestrutura)
  console.error('❌ [Internal Server Error]:', error);

  return response.status(500).json({
    status: 'error',
    message: 'Erro interno do servidor. Tente novamente mais tarde.'
  });
}