/**
 * Define a string literal.
 * @param value Token literal
 */
function stringLiteral<T extends string>(value: T): T {
  return value;
}

const injector: import('typed-inject').InjectorToken = '$injector';

/**
 * Common tokens used for dependency injection (see typed-inject readme for more information)
 */
export const commonTokens = Object.freeze({
  context: stringLiteral('context'),
  injector,
  logger: stringLiteral('logger'),
  loggerContext: stringLiteral('loggerContext'),
  workspaceFolder: stringLiteral('workspaceFolder'),
  serverLocation: stringLiteral('serverLocation')
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
