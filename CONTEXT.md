# CONTEXT.md

## Meta
- Last updated: 2026-04-27
- Owner: lower
- Status: active

## 1. System Overview
- Product domain: Personal productivity / goal tracking.
- High-level architecture: Frontend-only web app (MVP) with client-side state and local persistence.
- Core modules:
  - Goal management (create/edit)
  - Stage/column progress tracking
  - Persistence layer (local)
  - Presentation/UI layer

## 2. Tech Stack
- Frontend: TBD (candidate: React + TypeScript + Vite).
- Backend: None for MVP.
- Database: Browser local storage (TBD exact mechanism: localStorage or IndexedDB).
- Infra/Hosting: Static hosting (TBD provider).
- CI/CD: TBD; planned basic lint + tests in CI.

## 3. Repository Map
- `/`: documentation-first project setup and future app source.
- `/app`: TBD.
- `/api`: N/A for MVP.
- `/tests`: TBD.
- `/docs`: N/A (docs currently at repository root).

## 4. Global Rules
- Coding standards: Keep modules small, readable, and testable; enforce lint/format once toolchain is selected.
- Branching strategy: Short-lived feature branches from `main`.
- Versioning policy: Semantic versioning after first tagged release.
- Error handling policy: Validate user input and display clear inline feedback.
- Logging/observability policy: Client-side console/error tracking strategy TBD.

## 5. Domain Model
- Entities:
  - Goal (id, title, description, createdAt, updatedAt)
  - Stage (id, goalId, name, order, status)
- Relationships:
  - One Goal has many Stages.
- Invariants:
  - Goal title is required.
  - Stage order within a goal is unique.
  - Completed stages must remain visible.

## 6. API Contracts
- Public endpoints: None (MVP frontend-only).
- Internal endpoints/events: In-app state transitions for create/edit/update stage status.
- Request/response contracts: N/A for external network contracts.
- Backward compatibility rules: Preserve local data format compatibility across MVP updates where possible.

## 7. Data & Storage
- Schemas: Client-side JSON schema for goals and stages.
- Migration policy: Versioned local schema if/when structure changes.
- Retention policy: Persist until user deletes data.
- Backup/recovery: No automatic backup in MVP.

## 8. Security & Compliance
- AuthN/AuthZ: None in MVP (single-user local usage).
- Secrets handling: No secrets expected in frontend-only MVP.
- PII/data classification: User-entered goal text; treat as personal data on local device.
- Compliance constraints: TBD based on future hosting and analytics choices.

## 9. Performance Constraints
- Latency SLO: Goal create/edit/progress actions should complete in under 200ms perceived UI response.
- Throughput target: Support at least hundreds of goals on a typical modern browser without blocking UI.
- Cost constraints: Keep MVP at near-zero infrastructure cost.

## 10. Architecture Decision Log (ADR-lite)
1. Decision:
   - Context: Fast MVP is required today.
   - Choice: Start with frontend-only architecture and local persistence.
   - Consequences: Fast delivery, but no cross-device sync/auth in v1.
2. Decision:
   - Context: Scope needs to remain focused.
   - Choice: Exclude external integrations from MVP.
   - Consequences: Lower complexity; integration needs deferred to roadmap.

## 11. Dependencies
- External services: None planned for MVP.
- Third-party SDKs: TBD after framework selection.
- Known limitations: Data is local to browser/device until backend/sync is added.

## 12. Operational Runbook
- Start: TBD (depends on selected frontend stack).
- Build: TBD.
- Test: TBD.
- Deploy: TBD static deployment flow.
- Rollback: Re-deploy previous static build.
