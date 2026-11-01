# ShieldChain incident response playbook — draft

## Severity and first response
- **Critical:** suspected key/custody compromise, unauthorized money movement, widespread account takeover, exposed credentials, or active production data exfiltration. Page the designated incident lead immediately; suspend affected capability through a tested kill switch; preserve evidence.
- **High:** confirmed privileged-account compromise, sensitive-data exposure, or repeated targeted authentication abuse. Restrict affected accounts/sessions and escalate to security lead.
- **Moderate:** contained abuse, isolated service degradation, or suspicious activity without confirmed compromise. Triage, document, and monitor.

## Response sequence
1. Open a restricted incident record and assign an incident commander and scribe.
2. Verify the alert from trusted telemetry; do not paste secrets or personal data into chat.
3. Contain with least-disruptive controls: revoke sessions/credentials, disable the affected integration, pause relevant financial capability, and block abusive traffic. Do not improvise ledger edits.
4. Preserve immutable logs, timestamps, relevant deployment/configuration identifiers and chain-of-custody notes.
5. Assess affected systems, users, funds, data categories and jurisdictions with security, privacy, legal and financial-operations owners.
6. Communicate only through approved channels. Legal/privacy leads determine notification duties and deadlines.
7. Recover from reviewed clean configuration, rotate affected secrets, validate integrity and monitor for recurrence.
8. Complete a post-incident review with root cause, control gaps, owners, due dates and evidence of closure.

## Required before production
Name the 24/7 escalation contacts, confirm provider kill switches and recovery paths, define notification decision owners, test tabletop scenarios, and measure time to detect/contain/recover. This document is not proof that monitoring or a staffed incident team exists.
