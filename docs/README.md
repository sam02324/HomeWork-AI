# GradeAI Documentation

This directory is the navigation layer for product, architecture, release, and
operations documentation. Keep detailed facts in one canonical document and link
to it elsewhere.

## New developer path

1. [Project setup](../README.md)
2. [Contribution contract](../CONTRIBUTING.md)
3. [Current verified handoff](../CLAUDE.md)
4. [Repository guide](architecture/REPOSITORY_GUIDE.md)
5. [Major request flows](architecture/REQUEST_FLOWS.md)
6. [File placement rules](architecture/FILE_PLACEMENT.md)
7. [Agent team operating model](agents/README.md)

## Canonical documents

| Topic | Document |
| --- | --- |
| Local setup, commands, deployment | [Root README](../README.md) |
| Current implementation and launch blockers | [CLAUDE.md](../CLAUDE.md) |
| Contribution and review standards | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Security controls and accepted limitations | [SECURITY.md](../SECURITY.md) |
| Repository structure and runtime boundaries | [Repository guide](architecture/REPOSITORY_GUIDE.md) |
| Authentication, grading, sync, upload, and admin flows | [Request flows](architecture/REQUEST_FLOWS.md) |
| Where new code and docs belong | [File placement](architecture/FILE_PLACEMENT.md) |
| AI role contracts, delegation, and handoffs | [Agent team](agents/README.md) |
| Reviewed skill candidates for each AI role | [Agent skill matrix](agents/SKILL_MATRIX.md) |
| Admin authorization and operations | [Admin panel](admin-panel.md) |
| Beta gates, evidence, and owner actions | [August beta readiness](launch/2026-08-beta-readiness.md) |
| Product, mobile, and long-term direction | [Product roadmap](GRADEAI_PRODUCT_MOBILE_AND_30_YEAR_ROADMAP.md) |

## Source-of-truth order

When documents disagree, resolve the discrepancy rather than copying it:

1. Executed source code and committed Drizzle migrations.
2. Provider and framework behavior verified in the current environment.
3. `CLAUDE.md`, which records the latest verified repository handoff.
4. Architecture and operational documentation.
5. Roadmaps, which describe intended future state rather than current behavior.

## Documentation maintenance

- Link to canonical material instead of duplicating environment lists, launch
  status, or long plans.
- Label proposed behavior as proposed; do not describe it as implemented.
- Update architecture docs in the same pull request when a boundary or flow
  changes.
- Keep examples free of secrets, provider identifiers, personal data, and student
  work.
- Use repository-relative links and verify that every referenced path exists.
- Put dated launch evidence under `docs/launch/` and durable system explanations
  under `docs/architecture/`.
