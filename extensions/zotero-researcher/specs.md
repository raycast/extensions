## Overview
A Raycast extension that integrates with Zotero to enable quick insertion of academic citations anywhere on the user's system. The extension allows users to search their Zotero library and insert properly formatted APA citations (both in-text and bibliography formats) with minimal friction.

## Technical Architecture

### Technology Stack
- **Language/Framework**: TypeScript, React, Node.js
- **API Integration**: Zotero Web API
- **UI Components**: Raycast's built-in UI components
- **State Management**: React hooks for local state management

### Data Flow
1. User authenticates with Zotero API key
2. Extension fetches library data from Zotero API
3. User searches and selects citation
4. Extension formats citation according to APA style
5. Formatted citation is copied to clipboard for pasting anywhere

## Feature Requirements

### Phase 1: MVP

#### Authentication
- **Requirement**: Setup Zotero API integration via preferences
- **Implementation**:
  - Use Raycast's preferences API with `required: true` flag
  - Store the API key securely (note: avoid Keychain Access as per Raycast guidelines)
  - Provide clear instructions for obtaining a Zotero API key
  - Include a "Test Connection" action to validate API key

#### Citation Search Interface
- **Requirement**: Simple, searchable list of citations
- **Implementation**:
  - Use Raycast's `<List>` component with search functionality
  - Display detailed metadata (title, authors, year, publication)
  - Implement standard keyboard navigation (arrow keys, enter)
  - Show loading state during API calls

#### Citation Formatting
- **Requirement**: Support for APA format citations
- **Implementation**:
  - Format in-text citations: "(Author, Year)" and "Author (Year)"
  - Format bibliography entries according to APA 7th edition rules
  - Present both options after citation selection

#### Action Panel
- **Requirement**: Clear actions following Raycast guidelines
- **Implementation**:
  - "Copy In-text Citation"
  - "Copy Bibliography Entry"
  - "Open in Zotero" (links to the reference in Zotero if possible)
  - All actions should use Title Case and appropriate icons

#### Synchronization
- **Requirement**: Fetch fresh data on extension open
- **Implementation**:
  - Call Zotero API when extension is launched
  - Implement exponential backoff for retries
  - Handle pagination for large libraries

#### Error Handling
- **Requirement**: Simple error notifications with retry options
- **Implementation**:
  - Informative error messages for API failures
  - Retry button for connection issues
  - Clear guidance for authentication errors

## Development Phases

### Phase 1: MVP (2-3 weeks)
1. **Week 1**: Project setup, Zotero API integration, authentication flow
   - Create extension scaffold
   - Implement preferences for API key
   - Basic API connection testing

2. **Week 2**: Core functionality implementation
   - Search interface development
   - Citation formatting logic
   - Clipboard integration
   - Error handling

3. **Week 3**: Testing, refinement, and initial submission
   - User testing and bug fixes
   - Performance optimization
   - Documentation
   - Store submission preparation

### Phase 2: Enhancements (Future Iterations)

1. **Additional Citation Styles**
   - Add support for MLA, Chicago, Harvard styles
   - Allow customizable citation templates

2. **Advanced Search Features**
   - Filters for publication type, year, author
   - Collection/folder navigation matching Zotero structure

3. **Performance Optimizations**
   - Intelligent caching strategies
   - Background sync options

4. **Integration Expansions**
   - Support for other reference managers
   - Direct word processor integration

## Technical Implementation Guidelines

### API Integration

```typescript
// Example Zotero API service structure
class ZoteroService {
  private apiKey: string;
  private apiBaseUrl = 'https://api.zotero.org';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getUserLibrary(): Promise<ZoteroItem[]> {
    // Implementation for fetching library
  }

  async searchItems(query: string): Promise<ZoteroItem[]> {
    // Implementation for searching items
  }

  formatInTextCitation(item: ZoteroItem): string {
    // APA in-text citation formatting
  }

  formatBibliographyEntry(item: ZoteroItem): string {
    // APA bibliography entry formatting
  }
}
```

### Main Command Component

```typescript
// Example main component structure
export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [items, setItems] = useState<ZoteroItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchZoteroLibrary();
  }, []);

  async function fetchZoteroLibrary() {
    try {
      setIsLoading(true);
      const zoteroService = new ZoteroService(apiKey);
      const library = await zoteroService.getUserLibrary();
      setItems(library);
      setError(null);
    } catch (e) {
      setError("Failed to load Zotero library");
    } finally {
      setIsLoading(false);
    }
  }

  // Render list with search functionality
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={handleSearch}
      searchBarPlaceholder="Search your Zotero library..."
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning }}
          title="Connection Error"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={fetchZoteroLibrary} />
            </ActionPanel>
          }
        />
      ) : (
        items.map((item) => (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={formatAuthors(item.creators)}
            accessories={[{ text: item.year }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy In-text Citation"
                  onAction={() => copyToClipboard(formatInTextCitation(item))}
                />
                <Action
                  title="Copy Bibliography Entry"
                  onAction={() => copyToClipboard(formatBibliographyEntry(item))}
                />
                <Action.OpenInBrowser
                  title="Open in Zotero"
                  url={`zotero://select/items/${item.key}`}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
```

### Preferences Definition

```typescript
// Example preferences.ts file
export interface Preferences {
  apiKey: string;
}

export default {
  apiKey: {
    type: "textfield",
    required: true,
    title: "Zotero API Key",
    description: "Enter your Zotero API key (create one at https://www.zotero.org/settings/keys)",
    placeholder: "API Key",
  },
} as const;
```

## Testing Plan

### Unit Testing
- Test citation formatting functions with various input types
- Test API service methods with mocked responses
- Test error handling scenarios

### Integration Testing
- Test end-to-end flow from search to clipboard
- Test with various network conditions
- Test with different sized libraries

### User Testing
- Internal testing with team members
- Closed beta with academic users
- Feedback collection via structured form

## Publishing Guidelines

### Store Listing Requirements
- Clear, concise description highlighting use cases
- Screenshots showing search and both citation formats
- List of prerequisites (Zotero account required)
- Privacy policy regarding API usage

### Distribution Checklist
- Ensure code follows Raycast coding standards
- Complete all metadata fields in package.json
- Prepare informative README.md
- Test on multiple macOS versions

## Getting Started (Developer Instructions)

1. Clone the Raycast extensions repository
2. Use the Raycast CLI to create a new extension:
   ```
   npm install -g @raycast/api
   npx create-raycast-extension
   ```
3. Implement the extension following this specification
4. Test using `npm run dev`
5. Submit to the Raycast store using `npm run publish`

## Performance Considerations
- Minimize bundle size by avoiding unnecessary dependencies
- Use pagination for large Zotero libraries
- Implement throttling for search to avoid excessive API calls
- Consider adding a minimal caching layer if needed for performance

By following this specification, developers can create a lightweight yet powerful Raycast extension that significantly improves citation workflows for users who need to quickly insert research references.
