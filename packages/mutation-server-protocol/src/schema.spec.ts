import {
  ConfigureParams,
  DiscoveredMutant,
  DiscoverParams,
  DiscoverResult,
  MutantResult,
  MutationTestParams,
  MutationTestResult,
} from './schema.js';
import { expect } from 'chai';

describe('Schema', () => {
  describe('ConfigureParams', () => {
    it('should have a configFilePath field', () => {
      ConfigureParams.parse({ configFilePath: 'stryker.config.js' });
    });
    it('should throw if configFilePath is not a string', () => {
      expect(() => ConfigureParams.parse({ configFilePath: 42 })).throws();
    });
    it('should allow configFilePath to be undefined', () => {
      ConfigureParams.parse({});
    });
  });

  for (const [name, type] of [
    ['DiscoverParams', DiscoverParams],
    ['MutationTestParams', MutationTestParams],
  ] as const) {
    describe(name, () => {
      it('should have a files field', () => {
        type.parse({ files: ['src/index.ts'] });
      });
      it('should throw if files is not an array of strings', () => {
        expect(() => type.parse({ files: [42] })).throws();
      });
      it('should allow files to be undefined', () => {
        type.parse({});
      });
    });
  }

  describe('DiscoverResult', () => {
    it('should have a mutants field', () => {
      DiscoverResult.parse({ mutants: [] });
    });
    it('should allow an array of DiscoveredMutants', () => {
      DiscoverResult.parse({
        mutants: [
          {
            id: '1',
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 1 },
            },
            mutatorName: 'foo',
          },
        ],
      });
    });
    it('should throw if the mutants array is missing', () => {
      expect(() => DiscoverResult.parse({})).throws();
    });
    it('should throw if mutants is not an array', () => {
      expect(() => DiscoverResult.parse({ mutants: 42 })).throws();
    });
  });

  describe('DiscoveredMutant', () => {
    it('should parse a minimal set of data', () => {
      DiscoveredMutant.parse({
        id: 'str',
        location: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 1 },
        },
        mutatorName: 'foo',
      });
    });
    it('should parse fully filled DiscoveredMutant', () => {
      DiscoveredMutant.parse({
        id: 'str',
        location: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 1 },
        },
        mutatorName: 'foo',
        description: 'Test',
        replacement: 'bar',
      });
    });
    it('should throw if id is missing', () => {
      expect(() =>
        DiscoveredMutant.parse({
          location: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 1 },
          },
          mutatorName: 'foo',
        })
      ).throws();
    });
    it('should throw if location is missing', () => {
      expect(() =>
        DiscoveredMutant.parse({
          id: 'str',
          mutatorName: 'foo',
        })
      ).throws();
    });
    it('should throw if mutatorName is missing', () => {
      expect(() =>
        DiscoveredMutant.parse({
          id: 'str',
          location: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 1 },
          },
        })
      ).throws();
    });
  });
  describe('MutantResult', () => {
    it('should parse a minimal set of data', () => {
      MutantResult.parse(validMinimalMutantResult());
    });
    it('should parse fully filled MutantResult', () => {
      MutantResult.parse({
        ...validMinimalMutantResult(),
        coveredBy: ['test-1', 'test-2'],
        duration: 42,
        killedBy: ['test-1'],
        static: true,
        statusReason: 'expected foo to be bar',
        testsCompleted: 2,
        mutatorName: 'foo',
        description: 'Test',
        replacement: 'bar',
      });
    });
    it('should throw if id is missing', () => {
      const invalidMutantResult = validMinimalMutantResult();
      delete invalidMutantResult.id;
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if location is missing', () => {
      const invalidMutantResult = validMinimalMutantResult();
      delete invalidMutantResult.location;
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if mutatorName is missing', () => {
      const invalidMutantResult = validMinimalMutantResult();
      delete invalidMutantResult.mutatorName;
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if status is missing', () => {
      const invalidMutantResult = validMinimalMutantResult();
      delete invalidMutantResult.status;
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if status is not a valid MutantStatus', () => {
      const invalidMutantResult = validMinimalMutantResult();
      (invalidMutantResult.status as any) = 'foo';
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if coveredBy is not an array of strings', () => {
      const invalidMutantResult = validMinimalMutantResult();
      (invalidMutantResult.coveredBy as any) = [42];
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if duration is not a number', () => {
      const invalidMutantResult = validMinimalMutantResult();
      (invalidMutantResult.duration as any) = '42';
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if killedBy is not an array of strings', () => {
      const invalidMutantResult = validMinimalMutantResult();
      (invalidMutantResult.killedBy as any) = [42];
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if static is not a boolean', () => {
      const invalidMutantResult = validMinimalMutantResult();
      (invalidMutantResult.static as any) = 'true';
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if statusReason is not a string', () => {
      const invalidMutantResult = validMinimalMutantResult();
      (invalidMutantResult.statusReason as any) = 42;
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if testsCompleted is not a number', () => {
      const invalidMutantResult = validMinimalMutantResult();
      (invalidMutantResult.testsCompleted as any) = '42';
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if description is not a string', () => {
      const invalidMutantResult = validMinimalMutantResult();
      (invalidMutantResult.description as any) = 42;
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
    it('should throw if replacement is not a string', () => {
      const invalidMutantResult = validMinimalMutantResult();
      (invalidMutantResult.replacement as any) = 42;
      expect(() => MutantResult.parse(invalidMutantResult)).throws();
    });
  });
  describe('MutationTestResult', () => {
    it('should parse an empty array', () => {
      MutationTestResult.parse({ mutants: [] });
    });
    it('should parse an array of MutantResults', () => {
      MutationTestResult.parse({
        mutants: [validMinimalMutantResult()],
      });
    });
    it('should throw if mutants is missing', () => {
      expect(() => MutationTestResult.parse({})).throws();
    });
    it('should throw if mutants is not an array', () => {
      expect(() => MutationTestResult.parse({ mutants: 42 })).throws();
    });
  });
});
function validMinimalMutantResult(): Partial<MutantResult> {
  return {
    id: 'str',
    location: {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 },
    },
    mutatorName: 'foo',
    status: 'Killed',
  };
}
