import { expect } from 'chai';
import { tokens } from '../../../di/tokens';

describe('tokens function', () => {
  it('should return the same array of tokens passed as arguments', () => {
    const result = tokens('foo', 'bar', 'baz');
    
    expect(result).to.deep.equal(['foo', 'bar', 'baz']);
  });

  it('should handle empty token list', () => {
    const result = tokens();
    
    expect(result).to.deep.equal([]);
  });
});
