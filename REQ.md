# REQ.md

## Meta
- Last updated: 2026-04-27
- Owner: lower
- Status: draft

## 1. Product Brief
- Product/Feature: Neon Goal Columns
- One-line value proposition: A step-by-step goal tracker that helps users see and manage progress across clear stages.
- Why now: Users need a simple way to track completed stages while working through personal goals.

## 2. Target Audience (ICP)
- Primary segment: People who actively track and improve themselves (self-monitoring users).
- Secondary segment: Individuals who want lightweight personal goal planning without complex tools.
- Context of use: Daily personal planning and progress check-ins on web.
- Pain points: Users lose clarity on which stages are already completed while executing tasks.

## 3. Business Goals
- Goal 1: Launch a usable web MVP today (2026-04-27).
- Goal 2: Enable users to add and edit goals with minimal friction.
- Goal 3: Provide clear stage-by-stage progress visibility.

## 4. Jobs To Be Done
- When I work on a personal objective, I want to break it into stages and track completed steps so I can stay consistent.
- Core functional job: Create, edit, and track goals by stage.
- Emotional/social job: Feel in control and motivated through visible progress.

## 5. Scope
### In scope
- Create a goal.
- Edit an existing goal.
- Represent goal progress in stage/column form.
- Track completed stages for each goal.
- Frontend web implementation.

### Out of scope
- External integrations.
- Native mobile apps.
- Third-party sync connectors.

## 6. Functional Requirements
1. FR-001: User can create a goal with required title and optional details.
2. FR-002: User can edit goal content after creation.
3. FR-003: User can track progress through defined stages/columns.
4. FR-004: User can see which stages are completed for each goal.
5. FR-005: User data persists across page reloads in MVP storage (implementation TBD).

## 7. Non-Functional Requirements
- Performance: Main interactions should feel instant on modern desktop/mobile web browsers.
- Reliability: Goal data should not disappear after refresh in normal usage.
- Security: Apply secure frontend practices (input validation, no unsafe HTML rendering).
- Accessibility: Keyboard support and readable contrast for core flows.
- Localization: English-first for MVP.

## 8. User Scenarios
1. Happy path: User creates a goal, defines stages, and marks the next stage as completed.
2. Edge case: User tries to save a goal with empty title and receives validation feedback.
3. Failure/recovery: User reloads the page and previously created goals remain available.

## 9. Acceptance Criteria
1. Given a new user, when they open the app and submit valid goal data, then a new goal appears in the list/board.
2. Given an existing goal, when user edits and saves it, then updated data is shown immediately.
3. Given a goal with stages, when user marks a stage completed, then completion state is visible and preserved.

## 10. Success Metrics
- North star metric: Weekly goals with at least one progress update.
- Leading indicators: Number of goals created per day; number of goal edits per week.
- Guardrail metrics: Goal data-loss incidents; client-side error rate in core goal flows.

## 11. Risks and Assumptions
- Assumption 1: Frontend-only architecture is sufficient for MVP launch.
- Assumption 2: Local persistence is acceptable before backend is introduced.
- Risk 1 + mitigation: Security gaps in frontend input handling -> enforce sanitization and safe rendering patterns.
- Risk 2 + mitigation: Scope ambiguity until final prompt arrives -> lock MVP scope after prompt review.

## 12. Open Questions
1. Final MVP feature list (user will provide full prompt later).
2. Preferred frontend framework and state management approach.
3. Should authentication/cloud sync be considered for post-MVP roadmap?
