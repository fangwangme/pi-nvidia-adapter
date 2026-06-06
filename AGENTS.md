## Project Structure
- Work in a non-`main` git worktree for normal development
- Only modify `main` directly when the user explicitly authorizes template or repository-structure maintenance
- Manual worktrees live under `.worktrees/`
- Worktree-local state lives under `.local/`
- Shared specs live under `docs/specs/`
- Agent notes, plans, archives, and project status live under `.agents/`
