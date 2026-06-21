import type { Outcome, Token } from '../engine/types';
import type { AttemptRecord } from './types';

export interface RecordInput {
  levelId: string;
  plan: Token[];
  outcome: Outcome;
  redundantSteps: number;
}

export interface Recorder {
  record(input: RecordInput): AttemptRecord;
  attemptsFor(levelId: string): number;
  outcomesFor(levelId: string): Outcome[];
  all(): AttemptRecord[];
}

/**
 * In-memory attempt log for n=1 testing. Deliberately stores no time data.
 * Feeds the partner's context (attempts + recent outcomes) and, later, the
 * four capability signals and the grown-ups dashboard.
 */
export function createRecorder(): Recorder {
  const records: AttemptRecord[] = [];

  return {
    record({ levelId, plan, outcome, redundantSteps }) {
      const attemptNumber = records.filter((r) => r.levelId === levelId).length + 1;
      const record: AttemptRecord = { levelId, plan, outcome, redundantSteps, attemptNumber };
      records.push(record);
      return record;
    },
    attemptsFor(levelId) {
      return records.filter((r) => r.levelId === levelId).length;
    },
    outcomesFor(levelId) {
      return records.filter((r) => r.levelId === levelId).map((r) => r.outcome);
    },
    all() {
      return [...records];
    },
  };
}
