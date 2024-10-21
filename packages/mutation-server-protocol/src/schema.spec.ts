import { ConfigureParams } from './schema.js';
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
  
});
