import { describe, it, expect } from 'vitest';
import { parseReply } from './promptBuilder';

describe('parseReply — validates Claude tool output into a PartnerResponse', () => {
  it('accepts a well-formed reply', () => {
    const r = parseReply({
      say: '  Try a jump!  ',
      celebrate: false,
      introduceConcept: 'exactly-what-you-say',
      scaffold: { kind: 'offer-action', action: 'JUMP' },
    });
    expect(r).toEqual({
      say: 'Try a jump!',
      celebrate: false,
      introduceConcept: 'exactly-what-you-say',
      scaffold: { kind: 'offer-action', action: 'JUMP' },
    });
  });

  it('rejects a reply with no spoken line', () => {
    expect(parseReply({ say: '   ', celebrate: true, scaffold: { kind: 'none' } })).toBeNull();
    expect(parseReply({ celebrate: true, scaffold: { kind: 'none' } })).toBeNull();
    expect(parseReply(null)).toBeNull();
  });

  it('coerces a non-boolean celebrate to false', () => {
    expect(parseReply({ say: 'Hi', celebrate: 'yes', scaffold: { kind: 'none' } })?.celebrate).toBe(false);
  });

  it('drops an unknown introduceConcept', () => {
    const r = parseReply({ say: 'Hi', celebrate: false, introduceConcept: 'made-up', scaffold: { kind: 'none' } });
    expect(r?.introduceConcept).toBeUndefined();
  });

  it('falls a malformed scaffold back to none', () => {
    expect(parseReply({ say: 'Hi', celebrate: false, scaffold: { kind: 'offer-action', action: 'FLY' } })?.scaffold).toEqual({
      kind: 'none',
    });
    expect(parseReply({ say: 'Hi', celebrate: false, scaffold: { kind: 'highlight-step' } })?.scaffold).toEqual({
      kind: 'none',
    });
    expect(parseReply({ say: 'Hi', celebrate: false, scaffold: { kind: 'wat' } })?.scaffold).toEqual({ kind: 'none' });
  });

  it('keeps a valid highlight-step and offer-repeat', () => {
    expect(parseReply({ say: 'Hi', celebrate: false, scaffold: { kind: 'highlight-step', stepIndex: 2 } })?.scaffold).toEqual({
      kind: 'highlight-step',
      stepIndex: 2,
    });
    expect(parseReply({ say: 'Hi', celebrate: false, scaffold: { kind: 'offer-repeat' } })?.scaffold).toEqual({
      kind: 'offer-repeat',
    });
  });
});
