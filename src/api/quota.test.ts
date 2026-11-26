import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// api/partner.ts and api/tts.ts are deliberately self-contained (the serverless runtime does not
// resolve shared imports), so the budget / classroom-code block is a copy in each. This pins the
// two copies to each other: a fix that lands in one file and not the other fails here.
function budgetBlock(file: string): string {
  const src = readFileSync(new URL(`../../api/${file}`, import.meta.url), 'utf8');
  const start = src.indexOf('// ---- Daily budgets and classroom codes');
  const end = src.indexOf('// ---- end budgets');
  expect(start, `${file} has the budget block`).toBeGreaterThan(-1);
  expect(end, `${file} closes the budget block`).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('api/ budget block', () => {
  it('is the same code in partner.ts and tts.ts', () => {
    expect(budgetBlock('tts.ts')).toBe(budgetBlock('partner.ts'));
  });
});
