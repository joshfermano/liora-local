---
description: Show Tell Liora's Linear progress, fix stale ticket states, and name the next ticket
---

Use the Linear tools on project `liora-local-hackathon` (team LUM) and check the Manila time with
`TZ=Asia/Manila date`. Report in at most 15 lines, in plain language:

1. Each milestone M1 to M7: tickets done out of total, and whether it is on time against the
   window in its description.
2. Tickets In Progress, and tickets In Review waiting on an iPhone check (say exactly what a person
   must check on the phones).
3. Blocked tickets: Todo tickets whose blockers are not Done.
4. The single next unblocked ticket, highest priority first.

Compare with `git log --oneline -20`. If a commit says `Fixes: LUM-nn` but that ticket is not
Done or In Review, or work for a Todo ticket has clearly started, correct the ticket and say what
you changed. Do not create, delete or reassign tickets from this command.

$ARGUMENTS
