# Research: Agent Client Protocol Raycast Extension

**Research Date**: 2025-10-10
**Focus Areas**: ACP Protocol, TypeScript SDK, Raycast UI Patterns, Testing Framework

## ACP Protocol Core Concepts

### Decision: Use JSON-RPC 2.0 based ACP protocol
**Rationale**: ACP follows JSON-RPC 2.0 specification with structured message flow for agent-client communication. Protocol provides standardized methods for initialization, session management, and prompt handling.

**Key Protocol Flow**:
1. **Initialization**: `initialize` → `authenticate` (optional)
2. **Session Setup**: `session/new` or `session/load`
3. **Prompt Turn**: `session/prompt` → `session/update` notifications → response

**Message Types**:
- **Methods**: Request-response pairs (expect result/error)
- **Notifications**: One-way messages (no response expected)

**Alternatives considered**: Custom protocol, WebSocket-only communication
**Why chosen**: Standardized, well-documented, growing ecosystem adoption

## TypeScript SDK Integration

### Decision: Use @zed-industries/agent-client-protocol npm package
**Rationale**: Official TypeScript implementation provides `ClientSideConnection` class for building ACP clients. Well-maintained with comprehensive type definitions.

**Key Classes**:
- `ClientSideConnection`: Main client interface
- `ndJsonStream`: Stream handling for JSON-RPC communication
- Built-in protocol version management and capability negotiation

**Integration Pattern**:
```typescript
import * as acp from "@zed-industries/agent-client-protocol";

class RaycastACPClient implements acp.Client {
  // Implement required methods: sessionUpdate, requestPermission
  // Optional: readTextFile, writeTextFile for context sharing
}

const connection = new acp.ClientSideConnection(
  () => client,
  acp.ndJsonStream(input, output)
);
```

**Alternatives considered**: Custom WebSocket implementation, REST API wrapper
**Why chosen**: Type safety, protocol compliance guaranteed, active maintenance

## Raycast UI Patterns

### Decision: Use List component with ActionPanel for conversation interface
**Rationale**: Raycast's List component provides optimal UX for chat-like interactions. ActionPanel enables rich interactions (copy, share context, settings).

**UI Structure**:
- **List**: Display conversation history as list items
- **List.Item**: Individual messages (user/agent) with content and metadata
- **ActionPanel**: Context menu with actions (copy, clear, settings)
- **List.Dropdown**: Agent selection and configuration

**Key Components**:
- `List` - Main conversation container
- `List.Item` - Message display with sender identification
- `ActionPanel` - Quick actions (copy response, share file context)
- `showHUD` - Success/error notifications
- `showToast` - Status updates during operations

**Alternatives considered**: Detail view, Form-based interface
**Why chosen**: Familiar chat UX, supports real-time updates, action-oriented

## Connection Management

### Decision: Subprocess spawning with stream communication
**Rationale**: Following ACP standard pattern of spawning agents as subprocesses. Enables connection to any ACP-compatible agent.

**Implementation Pattern**:
```typescript
import { spawn } from "node:child_process";

const agentProcess = spawn(command, args, {
  stdio: ["pipe", "pipe", "inherit"]
});

const stream = acp.ndJsonStream(
  Writable.toWeb(agentProcess.stdin),
  Readable.toWeb(agentProcess.stdout)
);
```

**Error Handling**:
- Connection timeouts with retry logic
- Process lifecycle management
- Graceful disconnection and cleanup

**Alternatives considered**: Direct HTTP/WebSocket connections
**Why chosen**: Standard ACP pattern, works with all compliant agents

## Testing Framework

### Decision: Jest with Raycast API mocks
**Rationale**: Jest is standard for TypeScript projects. Raycast provides testing utilities for extension development.

**Testing Strategy**:
- **Unit Tests**: ACP client logic, message handling, state management
- **Integration Tests**: End-to-end protocol communication with mock agents
- **UI Tests**: Raycast component behavior with mocked ACP responses

**Test Structure**:
```
tests/
├── unit/           # Service and utility tests
├── integration/    # ACP protocol tests
└── mocks/          # Mock agent implementations
```

**Coverage Requirements**: 80% minimum per constitution
**TDD Approach**: Write tests first, implement features to pass tests

**Alternatives considered**: Vitest, custom test framework
**Why chosen**: Jest ecosystem maturity, Raycast compatibility, TypeScript support

## Performance Considerations

### Decision: Streaming responses with progressive UI updates
**Rationale**: ACP supports streaming via `session/update` notifications. Enables real-time response display for better UX.

**Optimization Strategies**:
- **Message Chunking**: Handle `agent_message_chunk` updates for streaming text
- **Memory Management**: Limit conversation history storage (e.g., last 100 messages)
- **Connection Pooling**: Reuse agent connections for performance
- **Timeout Handling**: 5-second response timeout per requirements

**Resource Management**:
- Cleanup agent processes on extension close
- Memory-efficient message storage with circular buffer
- Background connection health checks

## Security and Error Handling

### Decision: User permission model with graceful degradation
**Rationale**: ACP includes permission system for file operations. Raycast extensions should follow principle of least privilege.

**Permission Strategy**:
- Request file access only when needed for context sharing
- User approval required for file read/write operations
- Clear permission descriptions in UI

**Error Scenarios**:
- Agent connection failures → Show user-friendly error with retry option
- Protocol violations → Log technical details, show generic error to user
- Timeout scenarios → Cancel gracefully with option to retry
- Invalid responses → Fallback to basic text display

## Dependencies and Integration

### Key Dependencies Identified:
- `@zed-industries/agent-client-protocol`: ^1.x (ACP TypeScript SDK)
- `@raycast/api`: ^1.103+ (Raycast API)
- `@raycast/utils`: ^1.17+ (Raycast utilities)

### Agent Compatibility:
- Claude Code (via Zed's SDK adapter)
- Gemini CLI
- Goose
- Any ACP-compliant agent

### Configuration Management:
- Agent endpoint configuration in Raycast preferences
- Default to local agent spawning with fallback to configured endpoints
- Support for custom agent commands and arguments