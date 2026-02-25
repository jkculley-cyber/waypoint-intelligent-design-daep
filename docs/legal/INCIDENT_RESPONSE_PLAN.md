# Incident Response Plan

**Clear Path Education Group, LLC — Waypoint Platform**
Version: 1.0 | Effective: February 25, 2026
Classification: Internal — Share with district partners upon request

---

## 1. Purpose and Scope

This Incident Response Plan (IRP) governs how Clear Path Education Group, LLC ("Clear Path") detects, responds to, and recovers from security incidents that affect the Waypoint platform and the Student Education Records processed within it.

This plan applies to:
- All Clear Path personnel with access to Waypoint production systems
- Security incidents affecting customer data (district staff accounts, student records, incident reports, disciplinary data)
- Infrastructure incidents on Supabase, AWS us-east-1, or Cloudflare Pages

---

## 2. Definitions

| Term | Definition |
|---|---|
| **Security Incident** | Any actual or suspected unauthorized access, use, disclosure, modification, or destruction of protected data; or any event that disrupts normal service operations |
| **Data Breach** | A security incident that results in confirmed unauthorized access to or exfiltration of Student Education Records or staff PII |
| **Critical Incident** | Any security incident with confirmed or high-probability student data exposure, ransomware, credential compromise of admin accounts, or service outages affecting multiple districts simultaneously |
| **RTO** | Recovery Time Objective — maximum acceptable downtime before service is restored |
| **RPO** | Recovery Point Objective — maximum acceptable data loss measured in time |

---

## 3. Incident Classification

| Severity | Description | Examples | Response SLA |
|---|---|---|---|
| **P1 — Critical** | Confirmed data breach; ransomware; complete service outage | Student record exfiltration confirmed; database held for ransom; total platform unavailability | Immediate — 1-hour initial response |
| **P2 — High** | Suspected breach under investigation; partial service outage; compromised admin credential | Anomalous export of large student dataset; admin account login from unexpected geography | 4-hour initial response |
| **P3 — Medium** | Potential vulnerability discovered; isolated access anomaly; single-district outage | Penetration test finding; single failed unusual login; campus-level data access anomaly | 24-hour initial response |
| **P4 — Low** | Non-impactful security event; informational finding | Failed brute-force attempts (blocked); policy violation with no data exposure | 72-hour initial response |

---

## 4. Incident Response Team

| Role | Responsibility |
|---|---|
| **Incident Commander** | Declares incident severity; coordinates cross-functional response; authorizes customer notification |
| **Technical Lead** | Investigates root cause; implements containment and remediation in Supabase/AWS/Cloudflare console |
| **Customer Success Lead** | Drafts district notifications; serves as primary contact for affected districts during incident |
| **Legal/Compliance** | Advises on FERPA notification obligations; coordinates with counsel if law enforcement is required |

For the current company size, the founder/CEO may serve as Incident Commander. Clear Path will designate named individuals to these roles as the team grows.

---

## 5. Detection Sources

Clear Path monitors for incidents through:

1. **Supabase Dashboard Alerts** — unusual query volume, auth failures, RLS policy violations
2. **Cloudflare Analytics** — traffic anomalies, DDoS signals, bot patterns
3. **AWS CloudWatch / Supabase Logs** — error rate spikes, unusual data export volumes
4. **Customer Reports** — district staff report unexpected behavior via support channels
5. **External Reports** — security researchers submitting responsible disclosure to privacy@clearpathedgroup.com
6. **HaveIBeenPwned Integration** — Supabase Auth blocks compromised passwords at login; alerts surface breached credentials

---

## 6. Response Procedures

### Phase 1 — Identify (0–1 hour for P1/P2)

1. Receive alert or report
2. Assign initial severity (P1–P4)
3. Assemble response team in dedicated incident channel
4. Begin incident log — document all actions with timestamps
5. Preserve evidence — do NOT delete logs, do NOT patch systems before forensic snapshot
6. Determine: Is this a confirmed breach or suspected breach under investigation?

### Phase 2 — Contain (1–4 hours for P1)

**Immediate containment options (based on incident type):**

| Incident Type | Containment Action |
|---|---|
| Compromised staff account | Disable account in Supabase Auth; invalidate all active sessions; force password reset |
| Compromised service role key | Rotate Supabase service role key immediately; update all deployment secrets in Cloudflare Pages |
| SQL injection / data exfiltration | Enable Supabase database firewall; temporarily restrict API access to trusted IPs |
| Ransomware (infrastructure level) | Isolate affected systems; contact Supabase support; initiate restore from backup |
| Unauthorized admin access | Audit `profiles` table for unauthorized role changes; revoke elevated roles; re-examine RLS policies |

**Do not** notify customers before containment is underway — premature public disclosure can hamper investigation and alert threat actors.

### Phase 3 — Eradicate (4–24 hours for P1)

1. Identify root cause (vulnerability, misconfiguration, compromised credential, social engineering)
2. Remove threat actor access (rotate all secrets, patch vulnerability, revoke compromised accounts)
3. Verify eradication — confirm threat actor no longer has access path
4. Document remediation steps in incident log

### Phase 4 — Recover

1. Restore service from clean backup if data was corrupted or deleted
2. Monitor closely for 72 hours post-recovery for signs of re-compromise
3. Communicate restoration status to affected districts

**Recovery targets:**
- **RTO:** 4 hours for P1 (full service restoration or acceptable degraded mode)
- **RPO:** 24 hours maximum data loss (aligned to Supabase daily backup retention)

### Phase 5 — Notify

See Section 7 for notification procedures.

### Phase 6 — Post-Incident Review

Within 14 days of incident closure:
1. Complete post-incident report (root cause, timeline, impact, remediation)
2. Identify systemic improvements
3. Update this IRP if response procedures need revision
4. Conduct tabletop exercise if P1/P2 incident occurred

---

## 7. Customer Notification

### FERPA Breach Notification Requirements

Under FERPA, the school district is the custodian of student records. Clear Path's obligations:

- **Notify the district as soon as practicable** — Clear Path will notify affected districts within **72 hours** of confirming a breach of Student Education Records
- Notification will be sent to the district's designated DPA contact (or superintendent if no DPA contact is on file)
- Notification will include: nature of the incident, categories of records affected, approximate number of students affected, actions taken to contain the incident, recommended district actions

### State Law Notification

Clear Path will comply with applicable state data breach notification laws. For Texas customers, this includes Texas Business and Commerce Code § 521.053 (notification within 60 days of discovery for breaches affecting Texas residents' personal information).

### Notification Template — District

> **SECURITY INCIDENT NOTICE — Clear Path Education Group / Waypoint**
>
> Dear [District Name] Data Privacy Contact,
>
> We are writing to inform you of a security incident affecting the Waypoint platform that may involve student education records for your district.
>
> **What happened:** [Brief factual description]
> **When it occurred:** [Date/time range]
> **What data may be affected:** [Record types, estimated count]
> **What we have done:** [Containment and remediation steps]
> **What you should do:** [District actions, if any]
>
> We take this matter seriously and are committed to full transparency. A complete incident report will follow within 14 days.
>
> Contact: privacy@clearpathedgroup.com | [Direct phone if applicable]

---

## 8. Evidence Preservation

During any P1/P2 incident:
- Export and preserve Supabase logs before any remediation that could overwrite them
- Preserve Cloudflare access logs for the incident window
- Do not alter, delete, or modify any system until forensic snapshot is complete
- Store evidence in a separate, access-controlled location (not the compromised system)

If law enforcement is involved, preserve evidence indefinitely per their instructions.

---

## 9. Third-Party Coordination

| Party | Contact | Escalation Trigger |
|---|---|---|
| **Supabase** | [Supabase Support](https://supabase.com/support) / enterprise support channel | Infrastructure-level breach; database backup restoration needed |
| **Cloudflare** | Cloudflare Support / dashboard alert escalation | DDoS; CDN-level compromise; domain hijacking |
| **AWS** | Via Supabase (AWS is sub-processor) | Data center-level event |
| **Legal Counsel** | To be retained (TBD) | Any confirmed breach requiring district/state notification |
| **Cyber Insurance** | To be obtained (TBD) | P1 incidents with confirmed data exposure |

---

## 10. Testing and Maintenance

| Activity | Frequency |
|---|---|
| IRP review and update | Annually, or after any P1/P2 incident |
| Tabletop exercise (simulated incident walkthrough) | Annually |
| Backup restoration test | Quarterly (Supabase PITR validation) |
| Credential rotation audit | Semi-annually |
| Access review (active accounts, roles) | Quarterly |

---

## 11. Document Control

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-02-25 | Initial version |

Owner: Clear Path Education Group, LLC — Privacy & Compliance
Review date: February 2027

---

## Contact

To report a security incident or vulnerability:
- **Email:** privacy@clearpathedgroup.com
- **Subject line:** "SECURITY INCIDENT — [URGENT]" for P1/P2 issues

Clear Path commits to acknowledging all security reports within 24 hours.
