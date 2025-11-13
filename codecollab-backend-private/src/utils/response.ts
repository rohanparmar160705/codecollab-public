import { Response } from 'express';

export const success = (
  res: any,
  message: string,
  data: any = null,
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};


export function error(res: Response, message = 'Something went wrong', code = 500, details?: any) {
  return res.status(code).json({
    status: 'error',
    message,
    ...(details ? { details } : {}),
  });
}
