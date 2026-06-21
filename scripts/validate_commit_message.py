#!/usr/bin/env python
"""Validate a commit message against docs/development/COMMIT_CONVENTION.md.

Usage:
    python scripts/validate_commit_message.py <path-to-commit-msg-file>
    python scripts/validate_commit_message.py --message "feat(auth): add login"

Rules (convention §13):
1. Read the first line only.
2. Reject if length is greater than 71.
3. Reject if the subject differs from its lowercase form.
4. Reject if it does not match the type(module): description pattern.
5. Reject if the subject ends with a full stop.

Standard merge commits are allowed so the normal-merge-commit strategy keeps
every atomic commit visible in `main` (convention §13, §16).
"""
from __future__ import annotations

import re
import sys

PATTERN = re.compile(r"^(fix|feat|refactor|chore|docs|test)\([a-z0-9]+(?:-[a-z0-9]+)*\): .+$")
MAX_LENGTH = 71

# Git-generated commits required by the chosen merge strategy.
MERGE_PREFIXES = ("Merge branch", "Merge pull request", "Merge remote-tracking")
ALLOWED_MERGE_SUBJECT = "feat(repo): merge claude recruitment platform mvp"


def validate(subject: str) -> list[str]:
    errors: list[str] = []
    if subject.startswith(MERGE_PREFIXES) or subject == ALLOWED_MERGE_SUBJECT:
        return errors
    if len(subject) > MAX_LENGTH:
        errors.append(f"Subject is {len(subject)} chars; must be <= {MAX_LENGTH}.")
    if subject != subject.lower():
        errors.append("Subject must be lowercase.")
    if subject.endswith("."):
        errors.append("Subject must not end with a full stop.")
    if not PATTERN.match(subject):
        errors.append(
            "Subject must match 'type(module): description' where type is one of "
            "fix|feat|refactor|chore|docs|test and module is lowercase kebab-case."
        )
    return errors


def read_subject(argv: list[str]) -> str:
    if len(argv) >= 2 and argv[1] == "--message":
        return argv[2].splitlines()[0] if len(argv) > 2 else ""
    if len(argv) >= 2:
        with open(argv[1], encoding="utf-8") as handle:
            return handle.readline().rstrip("\n")
    raise SystemExit("usage: validate_commit_message.py <file> | --message <msg>")


def main() -> int:
    subject = read_subject(sys.argv)
    errors = validate(subject)
    if errors:
        sys.stderr.write(f"Invalid commit subject: {subject!r}\n")
        for error in errors:
            sys.stderr.write(f"  - {error}\n")
        sys.stderr.write("See docs/development/COMMIT_CONVENTION.md\n")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
