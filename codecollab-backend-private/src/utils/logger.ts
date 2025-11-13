import pino from 'pino';
import { ENV } from '../config/env';

const isDev = ENV.NODE_ENV === 'development';

let destination: pino.DestinationStream | undefined;
if (!isDev) {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filePath = `logs/app-${date}.log`;
  // @ts-ignore pino destination has mkdir option in runtime
  destination = pino.destination({ dest: filePath, minLength: 4096, sync: false, mkdir: true });
}

export const logger = pino(
  {
    transport: isDev ? { target: 'pino-pretty' } : undefined,
    level: ENV.LOG_LEVEL || 'info',
  },
  destination
);
