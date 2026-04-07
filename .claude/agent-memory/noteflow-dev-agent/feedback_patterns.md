---
name: Feedback Patterns
description: Learnings from user corrections and preferred workflows.
type: feedback
---

- **Rule:** Prefer bundled PRs for feature updates.
- **Why:** Reduces noise in the GitHub history.
- **How to apply:** Group DTO changes, Repository updates, and Frontend wiring in a single PR.

- **Rule:** Explicit Test Generation.
- **Why:** The user wants tests to be generated proactively after a feature is stable.
- **How to apply:** Once a component or controller is finished, automatically offer to write the xUnit or Jest suite.