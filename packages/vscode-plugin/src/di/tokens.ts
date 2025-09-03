const injector: import('typed-inject').InjectorToken = '$injector';

/**
 * Common tokens used for dependency injection (see typed-inject readme for more information)
 */
export const commonTokens = Object.freeze({
  context: 'context',
  injector,
  logger: 'logger',
  loggerContext: 'loggerContext',
  contextualLogger: 'contextualLogger',
  workspaceFolder: 'workspaceFolder',
  process: 'process',
  serverLocation: 'serverLocation',
  mutationServer: 'mutationServer',
  testExplorer: 'testExplorer',
  testController: 'testController',
  testRunner: 'testRunner',
});

/**
 * Helper method to create string literal tuple type.
 * @example
 * ```ts
 * const inject = tokens('foo', 'bar');
 * const inject2: ['foo', 'bar'] = ['foo', 'bar'];
 * ```
 * @param tokens The tokens as args
 */
export function tokens<TS extends string[]>(...tokensList: TS): TS {
  return tokensList;
}
