# Backing up Codex settings

The live chat history is not stored in the container, but your Codex settings, skills, and cache live under `~/.codex/`. To keep them across devcontainer rebuilds, save them into the workspace and restore after rebuilding.

## Backup

```bash
cd /workspaces/liminal-notes
tar -czf codex-backup.tar.gz -C /home/vscode .codex
```

## Restore

```bash
cd /home/vscode
tar -xzf /workspaces/liminal-notes/codex-backup.tar.gz
```

Keep the `codex-backup.tar.gz` in the repo root (or another mounted path) so it survives container rebuilds.
