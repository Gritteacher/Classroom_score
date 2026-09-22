import envelope from '../../data/scores.enc.json' with { type: 'json' };
import { decrypt } from '../../lib/data.mjs';
import { createHandler } from '../../lib/lookup.mjs';

let records;
export default createHandler(() => records ??= decrypt(envelope, process.env.SCORE_DATA_KEY));
export const config = {
  path: '/api/score',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'], action: 'rate_limit' }
};
