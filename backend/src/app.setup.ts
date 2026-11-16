import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

const LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

/** Shared by main.ts and e2e tests. App must be created with { bodyParser: false }. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const clientUrl = config.getOrThrow<string>('CLIENT_BASE_URL').replace(/\/$/, '');

  if (config.get<boolean>('TRUST_PROXY')) app.set('trust proxy', 1);
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useBodyParser('json', { limit: '100kb' });
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    credentials: true,
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || origin === clientUrl || (!isProd && LAN_ORIGIN.test(origin))) return cb(null, true);
      return cb(null, false);
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(isProd));
}
