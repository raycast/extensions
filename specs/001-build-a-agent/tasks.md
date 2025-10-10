---
description: "Task list for Agent Client Protocol Raycast Extension implementation"
---

# Tasks: Agent Client Protocol Raycast Extension

**Input**: Design documents from `/specs/001-build-a-agent/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The tasks below include comprehensive test coverage per constitution requirements. TDD approach is mandatory for all ACP protocol interactions.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Raycast extension**: `src/`, `tests/` at repository root
- Paths shown below follow the Raycast extension structure from plan.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per implementation plan in src/
- [X] T002 Initialize TypeScript project with @raycast/api dependencies
- [ ] T003 [P] Configure ESLint and Prettier for code quality standards
- [X] T004 [P] Configure Jest testing framework for TDD approach
- [X] T005 [P] Setup TypeScript strict mode and comprehensive type checking
- [X] T006 [P] Install @zed-industries/agent-client-protocol SDK dependency
- [ ] T007 [P] Install and configure Gemini CLI for local testing (npm install -g @google-ai/generativelanguage-cli)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Create ACP protocol types in src/types/acp.ts based on contracts/acp-client.ts
- [ ] T009 [P] Create extension types in src/types/extension.ts based on contracts/raycast-api.ts
- [ ] T010 [P] Create data model types in src/types/entities.ts from data-model.md
- [X] T011 [P] Create storage keys constants in src/utils/storageKeys.ts
- [ ] T012 Implement base ACP client service in src/services/acpClient.ts
- [X] T013 [P] Implement configuration service using Raycast LocalStorage in src/services/configService.ts
- [X] T014 [P] Implement storage service using Raycast LocalStorage in src/services/storageService.ts
- [X] T015 Create error handling utilities in src/utils/errors.ts
- [X] T016 [P] Create logging utilities in src/utils/logging.ts
- [X] T017 [P] Setup built-in agent configurations (Gemini CLI, default agents)
- [X] T018 [P] Setup extension manifest and Raycast command registration

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick AI Coding Assistant Access (Priority: P1) 🎯 MVP

**Goal**: Enable users to quickly access AI coding assistance through Raycast interface

**Independent Test**: Install extension, launch "Start Agent" command, ask coding question, receive response within 5 seconds

### Tests for User Story 1 (TDD - WRITE THESE FIRST) ⚠️

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T019 [P] [US1] Unit test for agent connection in tests/unit/services/agentService.test.ts
- [ ] T020 [P] [US1] Unit test for message handling in tests/unit/services/sessionService.test.ts
- [ ] T021 [P] [US1] Integration test with Gemini CLI in tests/integration/geminiCli.test.ts
- [ ] T022 [P] [US1] Integration test for ACP protocol compliance in tests/integration/acpProtocol.test.ts
- [ ] T023 [P] [US1] E2E test for basic conversation flow in tests/e2e/basicConversation.test.ts

### Implementation for User Story 1

- [ ] T024 [P] [US1] Create AgentConnection entity model in src/types/entities.ts
- [ ] T025 [P] [US1] Create ConversationSession entity model in src/types/entities.ts
- [ ] T026 [P] [US1] Create Message entity model in src/types/entities.ts
- [ ] T027 [US1] Implement AgentService for connection management in src/services/agentService.ts (depends on T024)
- [ ] T028 [US1] Implement SessionService for conversation management in src/services/sessionService.ts (depends on T025, T026)
- [ ] T029 [US1] Create StartAgent command handler in src/commands/startAgent.tsx
- [ ] T030 [US1] Create ConversationView component in src/components/ConversationView.tsx
- [ ] T031 [US1] Create MessageItem component in src/components/MessageItem.tsx
- [ ] T032 [US1] Implement agent selection logic with built-in and custom agents
- [ ] T033 [US1] Implement basic agent connection flow with error handling
- [ ] T034 [US1] Add message send/receive functionality with streaming support
- [ ] T035 [US1] Add copy-to-clipboard functionality for agent responses

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Context-Aware Code Generation (Priority: P2)

**Goal**: Enable users to share project context with agents for context-aware assistance

**Independent Test**: Share file context with agent, request code generation relevant to project

### Tests for User Story 2 (TDD - WRITE THESE FIRST) ⚠️

- [ ] T036 [P] [US2] Unit test for file context sharing in tests/unit/services/contextService.test.ts
- [ ] T037 [P] [US2] Unit test for context validation in tests/unit/utils/fileUtils.test.ts
- [ ] T038 [P] [US2] Integration test for file sharing workflow in tests/integration/contextSharing.test.ts

### Implementation for User Story 2

- [ ] T039 [P] [US2] Create ProjectContext entity model in src/types/entities.ts
- [ ] T040 [US2] Implement ContextService for file sharing in src/services/contextService.ts
- [ ] T041 [P] [US2] Create file utilities for path validation in src/utils/fileUtils.ts
- [ ] T042 [P] [US2] Create file picker integration in src/utils/filePicker.ts
- [ ] T043 [US2] Add context sharing UI to ConversationView component
- [ ] T044 [US2] Implement file content reading and sharing via ACP protocol
- [ ] T045 [US2] Add context display in conversation with file information
- [ ] T046 [US2] Implement context removal and management features
- [ ] T047 [US2] Add permission handling for file access requests

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Multi-Turn Coding Conversations (Priority: P3)

**Goal**: Enable ongoing conversations with persistent history and context

**Independent Test**: Start conversation, ask multiple related questions, verify agent maintains context throughout

### Tests for User Story 3 (TDD - WRITE THESE FIRST) ⚠️

- [ ] T048 [P] [US3] Unit test for conversation persistence in tests/unit/services/persistenceService.test.ts
- [ ] T049 [P] [US3] Unit test for conversation history management in tests/unit/services/historyService.test.ts
- [ ] T050 [P] [US3] Integration test for multi-turn conversation flow in tests/integration/multiTurnConversation.test.ts

### Implementation for User Story 3

- [ ] T051 [P] [US3] Implement conversation persistence using LocalStorage in src/services/persistenceService.ts
- [ ] T052 [P] [US3] Implement conversation history management in src/services/historyService.ts
- [ ] T053 [US3] Add conversation list view in src/components/ConversationList.tsx
- [ ] T054 [US3] Add conversation management UI (archive, delete, search)
- [ ] T055 [US3] Implement conversation loading and resumption
- [ ] T056 [US3] Add conversation history export functionality
- [ ] T057 [US3] Implement conversation search and filtering
- [ ] T058 [US3] Add conversation auto-save and recovery features

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Configuration and Agent Management

**Purpose**: Advanced configuration and agent management features

- [X] T059 [P] Create agent configuration UI in src/components/AgentConfig.tsx
- [ ] T060 [P] Implement agent management with LocalStorage in src/services/agentConfigService.ts
- [ ] T061 [P] Add agent health monitoring in src/services/healthService.ts
- [ ] T062 Create agent selector component in src/components/AgentSelector.tsx
- [X] T063 Implement add/edit/delete agent workflow with LocalStorage persistence
- [ ] T064 Add agent connection testing and validation
- [ ] T065 [P] Implement user preferences management with LocalStorage
- [ ] T066 [P] Add security settings for file access permissions
- [ ] T067 [P] Create built-in agent templates (Gemini CLI, Claude Code, custom)
- [ ] T068 [P] Add agent import/export functionality

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T069 [P] Performance optimization for large conversation histories stored in LocalStorage
- [ ] T070 [P] Memory management and cleanup for agent connections
- [ ] T071 [P] Enhanced error handling with user-friendly messages
- [ ] T072 [P] Accessibility improvements for UI components
- [ ] T073 [P] Add comprehensive logging for debugging
- [ ] T074 [P] Security hardening for file access and agent communication
- [ ] T075 [P] LocalStorage migration utilities for data model updates
- [ ] T076 [P] Documentation updates in quickstart.md validation
- [ ] T077 [P] Extension icon and branding assets
- [ ] T078 [P] Final performance testing and optimization with Gemini CLI integration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Configuration (Phase 6)**: Can start after User Story 1 is complete
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 but is independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Builds upon US1/US2 but is independently testable

### Within Each User Story

- Tests (TDD) MUST be written and FAIL before implementation
- Entity models before services
- Services before UI components
- Core implementation before integration features
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Entity models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD first):
Task: "Unit test for agent connection in tests/unit/services/agentService.test.ts"
Task: "Unit test for message handling in tests/unit/services/sessionService.test.ts"
Task: "Integration test for ACP protocol compliance in tests/integration/acpProtocol.test.ts"
Task: "E2E test for basic conversation flow in tests/e2e/basicConversation.test.ts"

# Launch all entity models for User Story 1 together:
Task: "Create AgentConnection entity model in src/types/entities.ts"
Task: "Create ConversationSession entity model in src/types/entities.ts"
Task: "Create Message entity model in src/types/entities.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (TDD first)
   - Developer B: User Story 2 (TDD first)
   - Developer C: User Story 3 (TDD first)
3. Stories complete and integrate independently

---

## Testing Strategy (TDD Mandatory)

### Test-First Development

1. **Write Tests First**: For each user story, write ALL tests before any implementation
2. **Verify Failure**: Ensure tests fail initially (red)
3. **Implement Minimum**: Write just enough code to pass tests (green)
4. **Refactor**: Improve code while keeping tests passing (refactor)

### Test Coverage Requirements

- **Critical Paths**: 80% minimum coverage per constitution
- **ACP Protocol**: 100% coverage for protocol compliance
- **User Workflows**: E2E tests for all acceptance scenarios
- **Error Scenarios**: Tests for all edge cases identified in spec

### Test Types by Phase

- **Unit Tests**: Services, utilities, entity validation
- **Integration Tests**: ACP protocol communication, file system integration
- **E2E Tests**: Complete user workflows through Raycast interface
- **Contract Tests**: ACP protocol compliance and agent compatibility

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- TDD approach: Write tests first, verify they fail, then implement
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Constitution compliance: TypeScript strict mode, ESLint clean, 80% test coverage
