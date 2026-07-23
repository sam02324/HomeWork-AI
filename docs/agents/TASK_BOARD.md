# GradeAI Agent Task Board

This board turns current launch blockers into bounded team work. Status reflects
repository evidence, not optimism. The owner selects the next work order; the
lead decomposes it before assigning specialists.

**Recommended first assignment:** `GAI-002`. Private submission delivery closes
an immediate tenant-isolation and student-data exposure risk. Its work order must
keep production bucket policy and existing-object migration behind the owner gate.

| ID | Priority | Workstream | Lead role | Supporting roles | Status | Acceptance evidence |
| --- | --- | --- | --- | --- | --- | --- |
| GAI-001 | P0 | Durable grading jobs, idempotency, recovery, and item progress | Arjun - Backend and data | Iris, Quinn, Rowan, Sana | Ready | Duplicate-click denial, persisted jobs, bounded retries, abandoned-job recovery, progress API, load/failure tests |
| GAI-002 | P0 | Private R2 objects and authorized signed downloads | Arjun - Backend and data | Sana, Quinn, Rowan | Ready | Private bucket policy, tenant-scoped short-lived downloads, retention cleanup, cross-account denial tests |
| GAI-003 | P0 | Critical Playwright journeys | Quinn - QA and release | Theo, Arjun, Sana | Ready | Auth isolation, grading, reconnect, duplicate click, override, admin denial, and account-wipe journeys in CI |
| GAI-004 | P0 | Migration-ledger reconciliation | Arjun - Backend and data | Rowan, Quinn, Sana | Owner gate | Isolated Neon replay, ledger/repository alignment, rollback evidence; owner approval before persistent changes |
| GAI-005 | P0 | Legal, support, and teacher-facing AI disclosures | Maya - Product and UX | Sana, Quinn | Owner gate | Reviewed privacy, terms, acceptable use, retention/deletion, grievance, refund, and AI-assistance documents |
| GAI-006 | P0 | Multi-format teacher-scored grading benchmark | Iris - AI quality | Maya, Arjun, Quinn | Owner input | Approved de-identified/synthetic corpus, teacher scores, accuracy/cost/latency baseline, documented release threshold |
| GAI-007 | P0 | Production configuration and fresh-user launch drill | Rowan - DevOps and SRE | Quinn, Sana, Arjun | Owner gate | Rotated historical secrets, verified providers, non-admin end-to-end journey, live commit and rollback evidence |

## Status vocabulary

- **Ready:** can be converted into a work order from repository context.
- **In progress:** one lead owns an active work order and write sets are assigned.
- **Blocked:** a named external dependency prevents meaningful progress.
- **Owner gate:** the next material action requires explicit owner authorization.
- **Owner input:** agents can prepare the process, but the owner must supply or
  approve product evidence.
- **Verified:** acceptance evidence is committed and the required checks pass.

Do not mark a row verified from a specialist handoff alone. The lead must review
and integrate the evidence first.
