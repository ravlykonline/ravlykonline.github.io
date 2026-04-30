import { analyzeRoute } from './route.js';

export function simulateLevel({ level, arrows = {}, config = {} }) {
  const result = analyzeRoute({ level, arrows, config });
  return {
    path: result.path,
    reason: result.reason,
    success: result.success
  };
}
