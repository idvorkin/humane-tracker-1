# CHOP Logs

This directory contains curated transcripts from AI-assisted development sessions using specstory.

## Purpose

- Archive interesting or useful AI coding sessions
- Document complex problem-solving approaches
- Share learnings and patterns across the team

## Usage

Use the `chop` CLI tool to manage logs:

```bash
chop git-latest   # Get the latest session and add to git
chop git-pick     # Select a session from history and add to git
chop view-latest  # View the latest session
chop diff         # Compare recent sessions
```

## Note

- `.specstory/` contains all raw transcripts (gitignored, not committed)
- This directory contains only selected/curated transcripts (committed to git)
