# Quickstart Guide: Agent Client Protocol Raycast Extension

**Version**: 1.0.0
**Last Updated**: 2025-10-10
**Prerequisites**: Raycast installed, Node.js 18+, TypeScript 5.8+

## Overview

This guide walks through setting up and using the Agent Client Protocol (ACP) Raycast extension for vibe coding. The extension connects Raycast to ACP-compatible AI agents for seamless coding assistance.

## Installation

### 1. Development Setup

```bash
# Clone or navigate to the extension directory
cd extensions/agent-client-protocol

# Install dependencies
npm install

# Build the extension
npm run build

# Start development mode
npm run dev
```

### 2. Add to Raycast

1. Open Raycast Preferences
2. Go to Extensions tab
3. Click "Add Extension"
4. Select the built extension directory
5. Enable the extension

## First Run

### 1. Launch Agent Interface

1. Open Raycast (`⌘ + Space`)
2. Type "Start Agent"
3. Select "Agent Client Protocol: Start Agent"
4. Choose your preferred agent from the dropdown

### 2. Configure Agent (Optional)

For custom agents:
1. Type "Agent Settings" in Raycast
2. Click "Add Custom Agent"
3. Configure agent command/endpoint
4. Test connection

## Basic Usage

### Starting a Conversation

1. **Launch**: Use "Start Agent" command
2. **Select Agent**: Choose from available ACP agents
3. **Ask Question**: Type your coding question
4. **Get Response**: See AI response in real-time

**Example First Question**:
```
How do I create a REST API endpoint in Express.js?
```

### Adding Project Context

1. **In Conversation**: Press `⌘ + O` to add context
2. **Select Files**: Choose files/directories to share
3. **Confirm**: Agent acknowledges context received
4. **Ask Contextual Questions**: Get project-specific help

**Example with Context**:
```
Looking at my package.json, what testing framework should I add?
```

### Managing Conversations

- **View History**: `⌘ + H` to see past conversations
- **Clear Session**: `⌘ + R` to reset current conversation
- **Copy Response**: `⌘ + C` on any agent message
- **Export Chat**: `⌘ + E` to export conversation

## Agent Configuration

### Built-in Agents

The extension supports these ACP-compatible agents out of the box:

1. **Claude Code** (via Zed adapter)
2. **Gemini CLI**
3. **Goose**
4. **Local Custom Agents**

### Adding Custom Agents

1. **Access Settings**:
   ```
   Raycast → Agent Settings → Add Custom Agent
   ```

2. **Configure Subprocess Agent**:
   ```json
   {
     "name": "My Custom Agent",
     "type": "subprocess",
     "command": "npx",
     "args": ["tsx", "/path/to/my-agent.ts"],
     "workingDirectory": "/path/to/agent"
   }
   ```

3. **Configure Remote Agent**:
   ```json
   {
     "name": "Remote Agent",
     "type": "remote",
     "endpoint": "ws://localhost:8080/acp"
   }
   ```

### Agent Requirements

Custom agents must:
- Support ACP protocol version 1
- Implement required methods: `initialize`, `session/new`, `session/prompt`
- Handle JSON-RPC 2.0 communication
- Provide proper error responses

## Advanced Features

### File Context Sharing

**Share Single File**:
1. `⌘ + O` in conversation
2. Select file from picker
3. Agent receives file content

**Share Directory Structure**:
1. `⌘ + Shift + O` for directory
2. Choose directory
3. Agent gets file tree and key files

**Share Code Selection**:
1. Copy code to clipboard
2. In conversation: `⌘ + V` to share
3. Agent analyzes specific code

### Conversation Management

**Save Important Conversations**:
1. `⌘ + S` to bookmark conversation
2. Add tags for categorization
3. Search later with `⌘ + F`

**Export Options**:
- **Markdown**: For documentation
- **JSON**: For analysis/backup
- **Plain Text**: For sharing

### Performance Optimization

**Response Speed**:
- Agents typically respond in 2-5 seconds
- Streaming responses show progress
- Long responses appear incrementally

**Memory Management**:
- Extension keeps 50 recent messages in memory
- Older messages archived to disk
- Automatic cleanup of old conversations

## Troubleshooting

### Common Issues

**Agent Won't Connect**:
```bash
# Check agent command
npx tsx /path/to/agent.ts

# Verify ACP protocol support
curl -X POST agent-endpoint -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":1}}'
```

**Slow Responses**:
1. Check network connection
2. Verify agent performance
3. Reduce context size
4. Check system resources

**Protocol Errors**:
1. Verify agent ACP compliance
2. Check protocol version compatibility
3. Review agent logs
4. Test with minimal example

### Error Messages

| Error | Cause | Solution |
|-------|--------|----------|
| "Agent Unavailable" | Connection failed | Check agent status/config |
| "Protocol Mismatch" | Version incompatibility | Update agent/extension |
| "Session Expired" | Idle timeout | Start new session |
| "Permission Denied" | File access blocked | Enable file permissions |

### Debugging

**Enable Debug Mode**:
1. Raycast Preferences → Extensions
2. Find ACP Extension → Settings
3. Enable "Debug Logging"
4. Check Console.app for logs

**Log Locations**:
```
~/Library/Logs/Raycast/extensions/agent-client-protocol/
├── connection.log    # Agent connections
├── protocol.log      # ACP messages
└── error.log        # Error details
```

## Best Practices

### Effective Prompting

**Be Specific**:
```
❌ "Help me with React"
✅ "How do I handle form validation in React with TypeScript?"
```

**Provide Context**:
```
❌ "Fix this bug"
✅ "I'm getting TypeScript error TS2339 in this component: [share file]"
```

**Iterate Conversationally**:
```
1. "Create a user authentication system"
2. "Add password hashing to that"
3. "Now add JWT tokens"
4. "How do I handle token refresh?"
```

### Security Considerations

**File Access**:
- Only share necessary files
- Review permissions regularly
- Use project-specific contexts

**Sensitive Data**:
- Avoid sharing API keys/secrets
- Use environment variables in examples
- Review agent responses before copying

### Performance Tips

**Context Management**:
- Share relevant files only
- Remove outdated context
- Use directory summaries for large projects

**Conversation Hygiene**:
- Start new sessions for different topics
- Archive completed conversations
- Clear context when switching projects

## Integration Examples

### VS Code Workflow

1. **Code in VS Code**: Write initial code
2. **Switch to Raycast**: `⌘ + Space` → "Start Agent"
3. **Share Current File**: `⌘ + O` → select active file
4. **Get Suggestions**: Ask for improvements/debugging
5. **Copy Back**: `⌘ + C` on agent response

### Terminal Integration

1. **Terminal Command**: `open raycast://extensions/agent-client-protocol/start-agent`
2. **Share Current Directory**: Agent gets context automatically
3. **CLI Help**: Ask about commands, debugging, optimization

### Documentation Workflow

1. **Share Project**: Directory context to agent
2. **Generate Docs**: "Create README for this project"
3. **Iterate**: Refine based on feedback
4. **Export**: Save final documentation

## Next Steps

- **Explore Agents**: Try different ACP agents for various tasks
- **Customize Configuration**: Set up project-specific agent configs
- **Share Feedback**: Report issues or suggestions
- **Advanced Usage**: Learn about tool calls and custom extensions

## Support

- **Documentation**: [ACP Protocol Docs](https://agentclientprotocol.com)
- **Issues**: GitHub repository issues
- **Community**: Raycast Discord #extensions
- **Updates**: Extension auto-updates with Raycast