import { Injector } from "typed-inject";
import { commonTokens } from "../di/index";
import { Logger } from "./index";

export function provideLogger(injector: Injector) {
  return injector.provideValue(commonTokens.logger, new Logger('Mutation Testing'));
}

provideLogger.inject = [commonTokens.injector] as const;
export type LoggerProvider = ReturnType<typeof provideLogger>;
