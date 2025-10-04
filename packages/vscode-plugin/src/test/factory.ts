import { DiscoveredMutant } from 'mutation-server-protocol';

export function createDiscoveredMutant(
  overrides?: Partial<DiscoveredMutant>,
): DiscoveredMutant {
  return {
    id: 'mutant-1',
    mutatorName: 'ConditionalExpression',
    location: {
      start: { line: 3, column: 5 },
      end: { line: 3, column: 15 },
    },
    replacement: 'true',
  };
}
