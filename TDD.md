# TDD.md

## Meta
- Last updated: 2026-04-27
- Owner: lower
- Status: active

## 1. Testing Strategy
- Primary approach: Test-Driven Development (red -> green -> refactor)
- Test pyramid ratio: 70% unit / 20% integration / 10% E2E smoke
- Coverage target: >= 80% on core goal and stage logic

## 2. Test Environments
- Local: Fast unit/integration loop during development.
- CI: Lint + automated tests on each PR.
- Staging: Optional static preview for manual UX checks.

## 3. Test Types
- Unit: Goal and stage domain logic (create/edit/complete/validation).
- Integration: UI + state + persistence interactions.
- Contract: N/A for MVP (no external API contracts).
- E2E: Core user path smoke (create goal -> edit goal -> mark stage complete).
- Visual regression: Optional screenshot checks for key flows.
- Performance smoke: Ensure no obvious UI lag in core interactions.

## 4. Red-Green-Refactor Workflow
1. Write failing test that captures behavior.
2. Implement minimal code to pass.
3. Refactor with tests green.
4. Update docs and state.

## 5. Feature Test Template
### Feature Name
- Requirement link: `REQ.md#6-functional-requirements`
- Context link: `CONTEXT.md#1-system-overview`

### Cases
1. Happy path: user creates and sees a new goal.
2. Validation: empty goal title cannot be saved.
3. Error handling: storage write/read failure shows recoverable UI feedback.
4. Edge conditions: goal edit preserves existing stage state.

### Test Data
- Fixtures: sample goals with 0, 1, and multiple stages.
- Factories: lightweight goal/stage test object builders.
- Mocks/stubs: storage adapter and clock/time values where needed.

### Exit Criteria
- All mandatory cases green.
- No flaky tests.
- CI pipeline green.

## 6. Regression Checklist
- Existing core flows unaffected.
- Backward compatibility validated for stored data shape.
- Critical bug fixes covered by tests.

## 7. Quality Gates in CI
- Lint/type checks: required.
- Unit tests: required.
- Integration tests: required for goal create/edit/progress.
- E2E smoke: required for pre-release branch.
- Coverage threshold: 80% for core modules.

## 8. Defect Log Template
| Bug ID | Found in | Test added? | Root cause | Preventive action |
|---|---|---|---|---|
| BUG-001 |  | yes/no |  |  |

## 9. Flakiness Protocol
- How to quarantine: mark unstable test and isolate from required pipeline temporarily.
- Max quarantine period: 3 working days.
- Owner to fix: lower.
