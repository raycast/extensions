# Dependency Update Notes

## Current Status (2025-10-24)

### Successfully Updated
- ✅ **@raycast/api**: `1.102.7` → `1.103.4` (core runtime dependency)
  - Tests pass
  - Build works
  - Extension functions correctly

### Cannot Update (Breaking Changes)

#### ESLint & Related Packages
- ❌ **eslint**: Stuck at `9.35.0` (latest: `9.38.0`)
- ❌ **@raycast/eslint-config**: Stuck at `2.0.4` (latest: `2.1.1`)

**Reason**: The current ESLint configuration is broken due to an incomplete migration from ESLint 8 to 9. The config file references `@raycast/eslint-config/flat` which doesn't exist in any version.

**Current State**:
- `eslint.config.mjs` imports from `@raycast/eslint-config/flat` (doesn't exist)
- `npm run lint` fails with module not found error
- `npm run build` works fine (TypeScript compilation is separate)
- Tests work fine

**To Fix** (future task):
1. Create proper ESLint 9 flat config
2. Either:
   - Wait for @raycast/eslint-config to add `/flat` export, OR
   - Manually configure flat config using createRequire, OR
   - Downgrade to ESLint 8.x

#### Test Framework (Not Critical)
- ⚠️ **vitest**: Stuck at `1.6.1` (latest: `4.0.2`) - major version jump
- ⚠️ **jsdom**: Stuck at `24.1.3` (latest: `27.0.1`) - major version jump
- ⚠️ **@types/node**: Stuck at `20.8.10` (latest: `24.9.1`) - major version jump

**Reason**: Major version updates in test dependencies could introduce breaking changes. Since tests currently pass, these updates are low priority.

**Risk Level**: Low - dev dependencies only, current tests work fine

### Safe to Update (Minor/Patch)
These can be updated when needed:
- @types/react (types only, safe)
- typescript (minor updates usually safe)
- prettier (formatting tool, backwards compatible)

## Recommendations

### For Regular Updates
1. **Always update**: `@raycast/api` - This is the core runtime
2. **Can update**: TypeScript types, prettier
3. **Avoid updating**: ESLint packages until config is fixed
4. **Avoid updating**: Test framework (vitest, jsdom) unless there's a specific need

### For Major Updates
Before updating test dependencies to major versions:
1. Check changelog for breaking changes
2. Run `npm test` after update
3. Be prepared to fix test code

### Fixing the ESLint Issue
The ESLint setup needs to be properly configured for ESLint 9's flat config format. This is a separate task from dependency updates. Options:

**Option 1: Wait for upstream fix**
- Monitor @raycast/eslint-config releases for `/flat` export

**Option 2: Custom flat config**
```javascript
// eslint.config.mjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);
export default require("@raycast/eslint-config");
```
Note: Currently causes "Unexpected array" error - needs investigation

**Option 3: Downgrade to ESLint 8**
```bash
npm install eslint@8.57.0 --save-dev
```
Then create traditional `.eslintrc.js` instead of flat config

## Testing After Updates

Always run these after updating dependencies:
```bash
npm run build  # Verify TypeScript compilation
npm test       # Verify tests pass
```

Skip linting until ESLint config is fixed:
```bash
# This currently fails - known issue
npm run lint
```

## Last Updated
2025-10-24 - After attempting to update all outdated packages
