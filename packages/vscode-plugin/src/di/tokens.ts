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
