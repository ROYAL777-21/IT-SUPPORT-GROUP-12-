import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Exercise the CommonJS entry point used by Expo Router, including its decoder.
const queryString = createRequire(import.meta.url)('query-string') as typeof import('query-string');

describe('route query decoding', () => {
  it('preserves encoded Unicode, spaces and repeated parameters', () => {
    expect({ ...queryString.parse('name=Thandi%20Mokoena&campus=Midrand&label=%E2%9C%93&tag=wifi&tag=campus') })
      .toEqual({ name:'Thandi Mokoena',campus:'Midrand',label:'✓',tag:['wifi','campus'] });
  });
  it('round trips ticket references and reserved URL characters', () => {
    const values = { ticket:'EDU-1234', subject:'Wi-Fi & printing / support', empty:'' };
    expect({ ...queryString.parse(queryString.stringify(values)) }).toEqual(values);
  });
  it('handles a long malformed escape sequence without exponential decoding', () => {
    const started = performance.now();
    const result = queryString.parse(`query=${'%C0%AF'.repeat(10000)}`);
    expect(typeof result.query).toBe('string');
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
