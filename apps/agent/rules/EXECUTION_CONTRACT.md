# Agent Execution Contract

**This file documents the strict execution contract that the agent MUST follow.**

## Agent MAY (Allowed Actions)

1. **Register itself** - Agent can register with backend to get agent token
2. **Send heartbeat** - Agent sends periodic heartbeat to prove liveness
3. **Pull jobs** - Agent requests jobs from backend
4. **Execute exactly one job at a time** - Agent executes jobs sequentially
5. **Report factual results** - Agent reports what actually happened
6. **Upload screenshots** - Agent uploads proof of action (before/after/failure)
7. **Stop immediately on error** - Agent stops when errors occur

## Agent MUST NEVER (Forbidden Actions)

1. **Decide what to execute** - Backend decides, agent executes
2. **Retry jobs** - Agent never retries failed jobs
3. **Reorder jobs** - Agent executes jobs in order received
4. **Infer backend state** - Agent never assumes backend state
5. **Work offline** - Agent requires backend connection
6. **Handle credentials** - Browser session lives on user's machine
7. **Continue after refusal** - Agent stops if `allowed = false`

## Backend Authority

Backend is authoritative for:
- Job creation
- Job ordering
- Execution permission
- Risk decisions
- State transitions

## Safety Boundaries

- Agent checks heartbeat response for `allowed` flag
- Agent checks control state before execution
- Agent respects `earliestExecutionTime` from backend
- Agent stops on any error or refusal
- Agent never caches or assumes state

## Implementation Notes

- All job execution is synchronous (one at a time)
- All state comes from backend API responses
- No local state caching or optimization
- All errors result in immediate stop
- Screenshots are captured for audit trail

