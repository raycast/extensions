# Data Model: Agent Client Protocol Raycast Extension

**Created**: 2025-10-10
**Based on**: Feature specification and ACP protocol requirements

## Core Entities

### Agent Connection
**Purpose**: Represents an active connection to an ACP-compatible agent

**Properties**:
- `id: string` - Unique identifier for the connection
- `name: string` - Human-readable agent name
- `endpoint: string` - Agent endpoint (command/args for subprocess, URL for remote)
- `status: 'connecting' | 'connected' | 'disconnected' | 'error'` - Connection state
- `capabilities: AgentCapabilities` - Agent's declared capabilities
- `protocolVersion: number` - Negotiated ACP protocol version
- `lastSeen: Date` - Last successful communication timestamp
- `connectionType: 'subprocess' | 'remote'` - How the agent is accessed

**Validation Rules**:
- `id` must be unique across all connections
- `endpoint` must be valid command or URL
- `status` changes must follow valid state transitions
- `protocolVersion` must be supported (currently 1)

**State Transitions**:
```
disconnected → connecting → connected
connected → disconnected
connecting → error → disconnected
```

### Conversation Session
**Purpose**: Contains message history and session state for agent interaction

**Properties**:
- `sessionId: string` - ACP session identifier
- `agentConnectionId: string` - Reference to agent connection
- `title: string` - User-defined session title
- `messages: Message[]` - Ordered conversation history
- `createdAt: Date` - Session creation timestamp
- `lastActivity: Date` - Last message timestamp
- `status: 'active' | 'archived' | 'error'` - Session state
- `context: ProjectContext[]` - Shared project context

**Validation Rules**:
- `sessionId` must match ACP session format
- `agentConnectionId` must reference valid connection
- `messages` must maintain chronological order
- `lastActivity` must be ≥ `createdAt`

**Relationships**:
- One-to-Many with `AgentConnection` (one agent, many sessions)
- One-to-Many with `Message` (one session, many messages)
- One-to-Many with `ProjectContext` (one session, multiple context items)

### Message
**Purpose**: Individual communication unit in conversation

**Properties**:
- `id: string` - Unique message identifier
- `sessionId: string` - Parent session reference
- `type: 'user' | 'agent' | 'system'` - Message sender type
- `content: MessageContent[]` - Message content (text, code, files)
- `timestamp: Date` - Message creation time
- `status: 'sending' | 'sent' | 'failed'` - Delivery status
- `metadata: MessageMetadata` - Additional message information

**MessageContent Types**:
```typescript
type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'code'; code: string; language?: string }
  | { type: 'file'; filename: string; content: string }
  | { type: 'error'; error: string; details?: string }
```

**MessageMetadata**:
- `tokensUsed?: number` - Token count for cost tracking
- `processingTime?: number` - Response generation time
- `stopReason?: string` - Why agent stopped generating
- `toolCalls?: ToolCall[]` - Tool calls made during response

**Validation Rules**:
- `content` array must not be empty
- `timestamp` must be valid date
- `type` must match sender (user messages from user, etc.)

### Project Context
**Purpose**: File content or project information shared with agent

**Properties**:
- `id: string` - Unique context identifier
- `sessionId: string` - Parent session reference
- `type: 'file' | 'directory' | 'selection'` - Context type
- `path: string` - Absolute file/directory path
- `content?: string` - File content (for file type)
- `language?: string` - Programming language detected
- `addedAt: Date` - When context was shared
- `size: number` - Content size in bytes

**Validation Rules**:
- `path` must be absolute path
- `content` required for `type: 'file'`
- `size` must match actual content size
- `language` auto-detected from file extension

**Relationships**:
- Many-to-One with `ConversationSession`
- Used by agent for context-aware responses

## Configuration Entities

### Agent Configuration
**Purpose**: User preferences for agent connections

**Properties**:
- `defaultAgent: string` - Default agent connection ID
- `agentCommands: Record<string, AgentCommand>` - Custom agent configurations
- `preferences: UserPreferences` - User interface preferences
- `security: SecuritySettings` - Permission and security settings

**AgentCommand**:
```typescript
interface AgentCommand {
  name: string;
  command: string;
  args: string[];
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
}
```

**UserPreferences**:
```typescript
interface UserPreferences {
  maxMessageHistory: number; // Default: 100
  autoSaveConversations: boolean; // Default: true
  showTypingIndicator: boolean; // Default: true
  theme: 'auto' | 'light' | 'dark'; // Default: 'auto'
}
```

**SecuritySettings**:
```typescript
interface SecuritySettings {
  allowFileAccess: boolean; // Default: false
  allowedDirectories: string[]; // Whitelisted paths
  requirePermissionForTools: boolean; // Default: true
}
```

## State Management

### Session State
**Active Sessions**: Currently open conversations
- Stored in memory for performance
- Persisted to disk on changes
- Auto-archived after inactivity

**Message History**: Conversation messages
- Circular buffer with configurable size
- Older messages archived to disk
- Search index for message content

### Connection State
**Active Connections**: Agent connection pool
- Health monitoring with heartbeat
- Automatic reconnection on failure
- Connection timeout handling

**Configuration State**: User preferences
- Stored in Raycast preferences
- Hot-reload on changes
- Migration support for schema updates

## Data Persistence

### Local Storage
**Format**: JSON files in Raycast extension data directory
```
~/.raycast/extensions/agent-client-protocol/
├── sessions/           # Conversation sessions
│   ├── {sessionId}.json
├── agents/             # Agent configurations
│   └── config.json
└── preferences.json    # User preferences
```

**Storage Strategy**:
- Immediate persistence for critical state
- Batched writes for performance
- Backup and recovery for data protection
- Cleanup of old/orphaned data

### Memory Management
**Message Limits**:
- Active: 50 messages per session
- Archived: Unlimited (disk-based)
- Search: Last 1000 messages indexed

**Connection Limits**:
- Active: 5 concurrent agent connections
- Idle timeout: 30 minutes
- Connection pooling for reuse

## Error Handling

### Data Validation
**Schema Validation**: All entities validated against TypeScript types
**Constraint Validation**: Business rules enforced at entity level
**Migration Handling**: Automatic schema migration for updates

### Recovery Strategies
**Corrupt Data**: Graceful degradation with user notification
**Missing Files**: Automatic recovery from backups
**Invalid State**: Reset to known-good configuration

### Error Entity
**Purpose**: Track and display error information

**Properties**:
- `id: string` - Error identifier
- `type: 'connection' | 'protocol' | 'validation' | 'system'`
- `message: string` - User-friendly error message
- `details: string` - Technical error details
- `timestamp: Date` - When error occurred
- `resolved: boolean` - Whether error is resolved
- `context: ErrorContext` - Additional context for debugging

This data model supports all required user scenarios while maintaining ACP protocol compliance and Raycast performance standards.