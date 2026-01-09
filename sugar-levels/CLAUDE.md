# Sugar Levels - Raycast Extension

## Project Overview

A Raycast extension that displays real-time blood glucose levels from Nightscout in the macOS menu bar. This extension helps people with diabetes monitor their glucose levels at a glance without opening additional applications.

## Purpose

Provides quick, continuous access to:
- Current blood glucose reading
- Trend direction (rising, falling, stable)
- Historical graph of last 10 readings
- Automatic updates every 5 minutes

## Architecture

### Technology Stack
- **Framework**: Raycast Extension API v1.88.4
- **Language**: TypeScript 5.4.5
- **UI Library**: React 18.3.3
- **Data Fetching**: @raycast/utils useFetch hook
- **Build System**: Raycast CLI

### Extension Type
- **Mode**: Menu Bar Extension
- **Update Interval**: 5 minutes
- **Platform**: macOS (via Raycast)

## Project Structure

```
sugar-levels/
├── src/
│   └── sugar-levels.tsx          # Main extension logic
├── package.json                   # Extension manifest and dependencies
├── tsconfig.json                  # TypeScript configuration
├── .eslintrc.json                 # ESLint rules
├── .prettierrc                    # Code formatting rules
├── README.md                      # User documentation
├── CHANGELOG.md                   # Version history
└── extension_icon.png             # Extension icon
```

## Key Components

### Main File: `src/sugar-levels.tsx`

#### Data Types

**Nightscout Interface** (lines 4-18)
- Represents blood glucose reading from Nightscout API
- Key fields:
  - `sgv`: Sugar glucose value (blood glucose level)
  - `direction`: Trend direction
  - `date`: Timestamp of reading
  - `device`: Glucose monitoring device identifier

**Preferences Interface** (lines 35-38)
- `apiUrl`: Nightscout API endpoint (required)
- `units`: Display units - "mg" (mg/dL) or "mmol" (mmol/L)

#### Direction Indicators (lines 20-33)

Maps Nightscout direction values to Unicode arrow characters:
- TripleUp (⤊), DoubleUp (⇈), SingleUp (↑)
- FortyFiveUp (↗), Flat (→), FortyFiveDown (↘)
- SingleDown (↓), DoubleDown (⇊), TripleDown (⤋)
- Special cases: NONE (⇼), NOT COMPUTABLE (-), RATE OUT OF RANGE (⇕)

#### Graph Component (lines 40-62)

Renders visual representation of last 10 readings:
- Displays horizontal bar chart using █ character
- Shows relative glucose values with timestamps
- Bar width scales based on value range
- Converts units based on user preference

#### Main Command Component (lines 70-98)

Entry point for the extension:
1. Loads user preferences (API URL, units)
2. Fetches data from Nightscout API
3. Displays current reading in menu bar with trend arrow
4. Provides dropdown menu with:
   - Last update timestamp
   - Graph of recent readings
   - Error messages if API fails

## Data Flow

1. **Initialization**
   - Extension loads every 5 minutes (configured in package.json:15)
   - Reads preferences (API URL and units)

2. **API Request**
   - Fetches from Nightscout `/api/v1/entries.json` endpoint
   - Uses `useFetch` hook for automatic error handling and loading states

3. **Data Processing**
   - Extracts latest reading (`data[0]`)
   - Converts units if needed (mg/dL ÷ 18 = mmol/L)
   - Maps direction to Unicode character

4. **UI Rendering**
   - Menu bar: Shows "value arrow" (e.g., "5.5 →")
   - Dropdown: Shows update time + graph of last 10 readings

## Configuration

### User Preferences

Configured via Raycast preferences UI:

1. **Nightscout API URL** (required)
   - Format: `https://YOUR_NIGHTSCOUT_HOST/api/v1/entries.json`
   - Must be accessible from the user's network

2. **Units** (optional, default: mg/dL)
   - `mg/dL`: Milligrams per deciliter (US standard)
   - `mmol/L`: Millimoles per liter (International standard)

### Conversion Factor

- Constant `MGDL_TO_MMOL = 18` (line 64)
- Formula: mg/dL ÷ 18 = mmol/L
- Applied when `units === "mg"` (actually displaying as mmol/L when "mg" is NOT selected)

**Note**: There appears to be a logic issue at lines 49, 81 where the conversion is inverted. When units is "mg", it divides by 18 (converting TO mmol). This should likely be reversed.

## Development

### Available Scripts

```bash
npm run dev          # Start development mode with hot reload
npm run build        # Build extension for production
npm run lint         # Check code for linting issues
npm run fix-lint     # Auto-fix linting issues
npm run publish      # Publish to Raycast Store
```

### Development Workflow

1. Install dependencies: `npm install`
2. Run in development: `npm run dev`
3. Test in Raycast (automatically reloads on save)
4. Lint before commit: `npm run fix-lint`
5. Build for production: `npm run build`

### Code Quality Tools

- **ESLint**: @raycast/eslint-config for consistent code style
- **Prettier**: Automated code formatting
- **TypeScript**: Type safety and better IDE support

## API Integration

### Nightscout API

**Endpoint**: `/api/v1/entries.json`

**Response**: Array of glucose readings (most recent first)

**Expected Fields**:
- `_id`: Unique identifier
- `sgv`: Sensor glucose value (number)
- `date`: Unix timestamp
- `direction`: Trend direction string
- Other metadata (device, noise level, etc.)

**Error Handling**:
- Network errors displayed in menu dropdown
- Missing API URL opens extension preferences
- Graceful degradation with default values

## Technical Details

### Unit Conversion Logic

Current implementation (potential bug):
```typescript
const level = preferences.units === "mg" ? latestSgv / MGDL_TO_MMOL : latestSgv;
```

This divides when units is "mg", but Nightscout typically returns mg/dL by default, so this logic may be inverted.

### Graph Rendering

- Uses Unicode block character (█) for visual bars
- Scales bars relative to min/max in dataset
- Minimum bar width of 1 to ensure visibility
- Limited to 10 most recent readings for readability

### Performance Considerations

- 5-minute polling interval balances freshness with API load
- `useFetch` hook provides automatic caching
- Menu bar updates without opening dropdown
- Lightweight React components minimize overhead

## Future Enhancement Opportunities

Potential improvements:
- Add color coding for high/low glucose ranges
- Support for multiple Nightscout accounts
- Alert notifications for dangerous levels
- Customizable refresh interval
- Offline data caching
- Support for different graph visualizations
- Integration with Apple Health

## License

MIT License

## Author

Neven Duranec (neven_duranec)

## Dependencies

### Production
- `@raycast/api`: Core Raycast extension API
- `@raycast/utils`: Utility functions (useFetch, etc.)

### Development
- TypeScript, ESLint, Prettier
- Node types for TypeScript support
- React types for component development
