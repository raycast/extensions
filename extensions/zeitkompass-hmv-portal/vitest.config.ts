import {defineConfig} from 'vitest/config';

// Only the pure link builders are tested here. The command components are
// Raycast views that need the host runtime; their logic lives in `portal.ts`
// precisely so it can be tested without it.
export default defineConfig({
  test: {environment: 'node', include: ['src/**/*.test.ts']},
});
