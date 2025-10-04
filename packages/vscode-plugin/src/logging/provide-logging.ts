import type { Injector } from 'typed-inject';
import { commonTokens } from '../di/index.ts';
import { Logger } from './index.ts';

export function provideLogger(injector: Injector) {
  return injector.provideValue(
    commonTokens.logger,
    new Logger('Stryker Mutator'),
  );
}

provideLogger.inject = [commonTokens.injector] as const;
export type LoggerProvider = ReturnType<typeof provideLogger>;
