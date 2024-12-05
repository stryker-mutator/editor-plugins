import { Injector } from "typed-inject";
import { commonTokens } from "../di/tokens";
import { Logger } from "./logger";

export function provideLogger(injector: Injector) {
  return injector.provideValue(commonTokens.logger, new Logger('Mutation Testing'));
}

provideLogger.inject = [commonTokens.injector] as const;
export type LoggerProvider = ReturnType<typeof provideLogger>;
