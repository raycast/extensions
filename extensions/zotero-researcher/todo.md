<think>I'll create a comprehensive todo.md checklist based on the prompts and project plan. I should organize it hierarchically by implementation phases and include all the specific tasks mentioned in the prompts, plus any implicit tasks that would be needed. I'll make sure it's detailed enough to track progress through the entire development lifecycle.</think># Zotero Researcher: Raycast Extension Development Checklist

## Phase 1: Project Setup and Foundation

### Project Initialization
- [x] Install Raycast CLI tools
- [x] Create new Raycast extension project with TypeScript
- [ ] Configure TypeScript settings
- [ ] Set up folder structure
  - [ ] src/
  - [ ] src/components/
  - [ ] src/services/
  - [ ] src/utils/
  - [ ] src/types/
  - [ ] assets/
- [ ] Setup package.json with correct metadata
  - [ ] Name: "zotero-researcher"
  - [ ] Description
  - [ ] Author information
  - [ ] MIT license
  - [ ] Required dependencies
- [ ] Create initial "Hello World" main command
- [ ] Test basic extension loads in Raycast

### Zotero Data Types and Interfaces
- [ ] Create types/index.ts for shared type definitions
- [ ] Define ZoteroItem interface
  - [ ] Basic metadata (id, key, title)
  - [ ] Publication metadata (journal, volume, pages)
  - [ ] Date handling
  - [ ] URL and DOI fields
- [ ] Define Creator/Author types
  - [ ] Name fields (firstName, lastName)
  - [ ] Creator type (author, editor, etc.)
- [ ] Define API response interfaces
  - [ ] Pagination metadata
  - [ ] Version information
  - [ ] Library metadata
- [ ] Define citation format types
  - [ ] InTextCitation type
  - [ ] BibliographyCitation type

### API Client Foundation
- [ ] Create ZoteroService class
  - [ ] Constructor with API key parameter
  - [ ] Base URL and endpoint constants
- [ ] Implement authentication logic
  - [ ] Header generation with API key
- [ ] Create method stubs
  - [ ] getUserLibrary(): Promise<ZoteroItem[]>
  - [ ] searchItems(query: string): Promise<ZoteroItem[]>
- [ ] Implement error handling utilities
  - [ ] Custom error classes
  - [ ] Error parsing functions
- [ ] Add mock data for testing
- [ ] Write unit tests for service methods

### Preferences Implementation
- [ ] Create preferences.ts file
- [ ] Define preferences interface
  - [ ] apiKey property
- [ ] Set up API key preference
  - [ ] Set required: true flag
  - [ ] Add description and placeholder
  - [ ] Create validation logic
- [ ] Implement getPreferenceValues helper
- [ ] Update main command to check for API key
- [ ] Test preference prompt appears correctly

## Phase 2: Core Functionality

### Main UI Structure
- [ ] Create List-based main component
- [ ] Implement search bar
  - [ ] Add placeholder text
  - [ ] Set up state for search query
- [ ] Create List.Item component for citations
  - [ ] Display title as primary text
  - [ ] Show authors in subtitle
  - [ ] Add year and publication as accessories
- [ ] Implement loading states
  - [ ] Add isLoading prop to List
  - [ ] Create loading indicator
- [ ] Create empty states
  - [ ] Empty state for no search results
  - [ ] Empty state for initial load
  - [ ] Empty state for errors
- [ ] Set up basic ActionPanel structure
  - [ ] Add placeholder actions

### Zotero API Integration
- [ ] Implement actual API calls in ZoteroService
  - [ ] Complete getUserLibrary method
  - [ ] Complete searchItems method
- [ ] Add authentication headers
- [ ] Implement error handling for API responses
  - [ ] Handle 401 unauthorized errors
  - [ ] Handle 429 rate limiting
  - [ ] Handle network errors
- [ ] Add pagination support
  - [ ] Track pagination state
  - [ ] Implement request for next page
  - [ ] Handle merging of paginated results
- [ ] Update unit tests with mock responses

### Citation Formatting
- [ ] Create citation formatting utility
  - [ ] formatInTextCitation function
  - [ ] formatBibliographyEntry function
- [ ] Implement author name formatting
  - [ ] Handle multiple authors
  - [ ] Implement "et al." logic for > 5 authors
- [ ] Add date formatting for APA style
- [ ] Implement title formatting
  - [ ] Journal article titles
  - [ ] Book titles with proper italics notation
- [ ] Add publication details formatting
- [ ] Write unit tests for formatting functions
  - [ ] Test with various publication types
  - [ ] Test edge cases (missing data)

### Connect Components
- [ ] Update main command to use ZoteroService
- [ ] Connect search bar to searchItems method
  - [ ] Implement search state
  - [ ] Add debouncing for API calls
- [ ] Implement ActionPanel with real actions
  - [ ] "Copy In-text Citation" action
  - [ ] "Copy Bibliography Entry" action
  - [ ] "Open in Zotero" action
- [ ] Add clipboard integration
  - [ ] Implement copy functionality
  - [ ] Add success feedback
- [ ] Add toast notifications
  - [ ] Success notifications
  - [ ] Error notifications
- [ ] Test full flow from search to copy

## Phase 3: Polish and Optimization

### Error Handling Enhancement
- [ ] Implement comprehensive error handling
  - [ ] API request errors
  - [ ] Authentication errors
  - [ ] Network connectivity issues
- [ ] Create user-friendly error messages
  - [ ] Actionable error suggestions
  - [ ] Clear error descriptions
- [ ] Add retry functionality
  - [ ] Retry buttons for failed requests
  - [ ] Automatic retry with backoff
- [ ] Implement UI error states
  - [ ] Error components in List
  - [ ] Error details display

### Performance Optimization
- [ ] Implement debounced search
  - [ ] Add debounce utility
  - [ ] Connect to search input
- [ ] Optimize pagination
  - [ ] Implement virtual list if needed
  - [ ] Add load more functionality
- [ ] Optimize rendering performance
  - [ ] Use React.memo where appropriate
  - [ ] Optimize state updates
- [ ] Add request cancellation
  - [ ] Cancel pending requests on new search
  - [ ] Handle cancellation in error handling

### Final Polish
- [ ] Code cleanup
  - [ ] Remove console logs
  - [ ] Fix lint issues
  - [ ] Organize imports
- [ ] Update action names and icons
  - [ ] Ensure Title Case for all actions
  - [ ] Add consistent icons
- [ ] Create comprehensive README
  - [ ] Installation instructions
  - [ ] Zotero API key setup guide
  - [ ] Usage examples
  - [ ] Troubleshooting section
- [ ] Prepare store listing
  - [ ] Write store description
  - [ ] Create screenshots
  - [ ] Select categories and tags
- [ ] Final testing
  - [ ] Test on different macOS versions
  - [ ] Test with large Zotero libraries
  - [ ] Test error scenarios
  - [ ] Verify preference handling

## Phase 4: Documentation and Release

### Documentation
- [ ] Complete inline code documentation
  - [ ] JSDoc for public functions
  - [ ] Comment complex logic
- [ ] Update package.json metadata
  - [ ] Verify author information
  - [ ] Check dependencies
  - [ ] Set correct version number
- [ ] Create changelog

### Release Preparation
- [ ] Run distribution build
  - [ ] npm run build
  - [ ] Verify build output
- [ ] Test distribution build in Raycast
- [ ] Run linting checks
  - [ ] npm run lint
  - [ ] Fix any issues
- [ ] Create release branch

### Submission
- [ ] Prepare for Raycast store submission
  - [ ] Verify all requirements are met
  - [ ] Check UI/UX guidelines compliance
  - [ ] Ensure no Keychain access is used
- [ ] Submit to Raycast store
  - [ ] npm run publish (or appropriate command)
  - [ ] Complete submission form

### Post-Release
- [ ] Gather user feedback
- [ ] Plan for future enhancements
  - [ ] Additional citation styles
  - [ ] Advanced filtering options
  - [ ] Performance improvements
