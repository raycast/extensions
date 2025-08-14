# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-08-14

### Added
- **Complete rewrite** from simple article search to comprehensive Zendesk management
- **Ticket Management**: View, reply, assign, and update status of Zendesk tickets
- **Enhanced Article Search**: Improved Help Center article search with live search
- **API Integration**: Full Zendesk API integration with proper authentication
- **Rate Limiting**: Respects Zendesk API rate limits
- **Error Handling**: Comprehensive error handling with user feedback
- **Authentication**: Secure API token-based authentication system

### Changed
- **Architecture**: Moved from web scraping to full API integration
- **UI**: Enhanced interface following Raycast design patterns
- **Commands**: Added "My Tickets" command alongside "Search Articles"

### Removed
- **Legacy search implementation**: Replaced with modern API-based approach
- **Basic URL authentication**: Replaced with secure API token system

## [0.0.1] - 2024-08-14

### Added
- Initial release with basic Help Center article search functionality
