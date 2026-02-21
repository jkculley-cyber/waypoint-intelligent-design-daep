# Waypoint — IT Security & Infrastructure FAQ

**Provided by Clear Path Education Group, LLC**
**For district IT directors and procurement teams**
Version 1.0 | Updated February 2026

---

## 1. Hosting & Infrastructure

**Who hosts Waypoint?**
Waypoint runs on Amazon Web Services (AWS) via Supabase, a SOC 2 Type II certified managed cloud database and authentication platform. Waypoint does not operate its own data centers.

**What AWS region is used?**
Waypoint deploys to a single US-based AWS region (US East — N. Virginia, `us-east-1`). All district data is stored and processed within that region. Data does not replicate to international regions.

**Is Waypoint a shared or dedicated environment?**
Waypoint is a multi-tenant SaaS application. Multiple districts share the same underlying infrastructure; however, each district's data is fully isolated at the database layer through PostgreSQL Row-Level Security (RLS) policies tied to a unique `district_id`. It is architecturally impossible for one district's users to query, view, or modify another district's records — the isolation is enforced in the database, not just the application.

**What third-party subprocessors does Waypoint use?**

| Subprocessor | Role | Location |
|-------------|------|----------|
| Amazon Web Services (AWS) | Cloud infrastructure, physical servers, storage | US East (N. Virginia) |
| Supabase | Managed PostgreSQL database, authentication, file storage | US East (N. Virginia) via AWS |
| Netlify | Frontend static hosting (no student data stored here) | CDN — US primary |
| Cloudflare | DDoS protection, CDN layer (Supabase-managed) | US primary |

No student data is stored by Netlify or Cloudflare. They serve the application files only. All student records and documents reside exclusively in the Supabase/AWS environment.

---

## 2. Data Residency

**Where is student data stored?**
All student data is stored in AWS US East (N. Virginia). Data does not leave the United States.

**Does Waypoint transfer data to any international locations?**
No. Waypoint does not transfer, replicate, or process student data outside the United States.

**Is student data used for any purpose other than the district's use of the platform?**
No. Student data is used solely to provide the Waypoint service to the district. Waypoint does not use student data for product development, analytics, advertising, or any purpose beyond operating the platform for that district. This is documented in the District Data Processing Agreement each district executes at onboarding.

---

## 3. Encryption

**How is data encrypted at rest?**
All data stored in the Waypoint database, file storage, and backups is encrypted at rest using **AES-256**, the same standard used by U.S. government agencies. This is enforced at the AWS infrastructure level.

**How is data encrypted in transit?**
All data transmitted between user browsers and Waypoint servers is encrypted using **TLS 1.2 or higher**. Unencrypted HTTP connections are automatically redirected to HTTPS. This applies to all API calls, file uploads, and authentication requests.

**How are user passwords protected?**
User passwords are never stored in plaintext. Supabase Auth hashes all passwords using **bcrypt** before storage. Clear Path Education Group, LLC staff have no ability to retrieve a user's password.

**How are authentication tokens handled?**
Session tokens are short-lived JWTs (JSON Web Tokens) signed with a secret key. Sensitive credentials (service role keys) are encrypted at the application level before storage.

**Is the database itself directly accessible from the internet?**
No. The PostgreSQL database is not publicly accessible. All data access goes through the PostgREST API, which enforces Row-Level Security on every query. Even if an attacker obtained valid API credentials, RLS policies would restrict data access to only the authenticated user's own district.

---

## 4. Access Control & Authentication

**What authentication methods are supported?**
- Email and password (default, bcrypt-hashed)
- Password reset via secure email link (Supabase Auth email flow)
- SSO / SAML integration available on Enterprise tier (contact Clear Path Education Group, LLC for configuration)

**Is multi-factor authentication (MFA) available?**
Yes. Supabase Auth supports MFA via TOTP (authenticator app). District administrators can require MFA for all staff accounts. Contact Clear Path Education Group, LLC to enable MFA enforcement for your district.

**How are user roles and permissions managed?**
Waypoint uses an 8-tier role system (Administrator, Principal, Assistant Principal, Counselor, SPED Coordinator, Teacher, Parent, Student). Role assignments and campus scoping are configured by the district administrator. Non-admin roles can only access data for their assigned campuses — enforced at the database layer, not the application layer.

**What happens when a staff member leaves the district?**
District administrators can deactivate user accounts instantly from the Waypoint admin panel. Deactivated accounts cannot log in and all their sessions are immediately invalidated. The district administrator has full control over all user accounts within their district.

---

## 5. Compliance Certifications

**Is Waypoint SOC 2 compliant?**
Waypoint's infrastructure provider, Supabase, is **SOC 2 Type II certified**. SOC 2 Type II reports are available to Enterprise and Team plan customers upon request under NDA. Contact Clear Path Education Group, LLC to request the report for your procurement process.

**Is Waypoint FERPA compliant?**
FERPA is a legal obligation, not a technical certification. Waypoint is designed and operated in compliance with FERPA requirements:

- Student education records are accessible only to authorized users within the student's own district
- Data is used solely to provide the educational service — no commercial use, no sale of student data
- Each district executes a **District Data Processing Agreement (DPA)** with Clear Path Education Group, LLC, establishing its role as a "school official" with a legitimate educational interest under FERPA
- Student data is deleted or returned upon contract termination (see Section 8)

Clear Path Education Group, LLC maintains a signed DPA with Supabase covering its use as a data subprocessor.

**Is Waypoint COPPA compliant?**
Waypoint does not collect personal information directly from students. The student-facing kiosk feature (daily check-in/check-out) requires only a student ID number to operate and does not collect any information from students independently of district records.

**Is Waypoint HIPAA compliant?**
Waypoint does not process Protected Health Information (PHI) as defined by HIPAA. Behavioral and disciplinary records are education records under FERPA, not medical records under HIPAA. Supabase is HIPAA-eligible with a Business Associate Agreement for customers who require it.

**Does Waypoint have a penetration test report?**
Supabase conducts regular third-party penetration testing of its platform. Clear Path Education Group, LLC conducts application-level security reviews. Contact Clear Path Education Group, LLC for the current security posture documentation.

---

## 6. Uptime & Availability

**What is Waypoint's uptime commitment?**
Waypoint targets **99.9% monthly uptime**, consistent with Supabase's published SLA for Team and Enterprise plan customers. This equates to less than 45 minutes of unplanned downtime per month.

**How can the district monitor Waypoint's status?**
Infrastructure status is available in real time at [status.supabase.com](https://status.supabase.com). Clear Path Education Group, LLC will provide proactive email notification for any planned maintenance windows affecting your district.

**What is the planned maintenance window?**
Planned maintenance, when required, is scheduled during off-peak hours (weekends or after 10 PM Central Time) with advance notice to district administrators.

---

## 7. Backup & Disaster Recovery

**How frequently is data backed up?**
The Waypoint database is backed up **daily** on an automated schedule by Supabase. Backups are encrypted and stored separately from production data.

**How long are backups retained?**
Backups are retained for a minimum of **7 days** (Pro plan) or **14 days** (Team plan). Point-in-time recovery (PITR) is available on Team and Enterprise plans, allowing restoration to any point within the retention window.

**What is the Recovery Point Objective (RPO)?**
RPO is 24 hours under standard backup configuration. With Point-in-Time Recovery enabled, RPO is reduced to the most recent transaction log entry (near-zero).

**What is the Recovery Time Objective (RTO)?**
For full database restore from backup: typically under 4 hours. Supabase maintains geographic redundancy within the AWS region to minimize downtime from hardware failures.

**Has a disaster recovery test been performed?**
Supabase performs regular restore testing as part of its SOC 2 compliance program. District-level restore tests can be arranged upon request.

---

## 8. Data Retention & Deletion

**How long does Waypoint retain student data?**
Waypoint retains district data for the duration of the active contract plus a 90-day grace period following contract termination to allow data export.

**What happens to data when a district ends their contract?**
Upon contract termination:
1. The district administrator receives a full data export (JSON + CSV format) within 30 days of request
2. All district data — including student records, incidents, documents, and user accounts — is permanently deleted from production systems within 90 days of contract end
3. Deletion from backups occurs as backup files roll off the retention window (within 14 days of production deletion)

**Can a district export their own data at any time?**
Yes. District administrators can export incident reports, student data, and audit logs at any time from the Waypoint reports module. Bulk data exports in machine-readable format are available on request.

---

## 9. Audit Logging & Incident Response

**Does Waypoint maintain audit logs?**
Yes. Waypoint logs all significant user actions with user ID, timestamp, action type, and relevant record identifiers. Logs are retained for 12 months and are accessible to district administrators for their own district's activity.

**What is Waypoint's data breach notification process?**
In the event of a confirmed data breach affecting district student records, Clear Path Education Group, LLC will:
1. Notify affected districts within **72 hours** of confirmed breach discovery
2. Provide a written incident report within **5 business days**
3. Cooperate with district investigation and any required TEA or law enforcement notifications
4. Remediate the root cause and provide a post-incident report

This process is documented in the District Data Processing Agreement.

---

## 10. Vendor Risk Summary

| Control Area | Implementation |
|-------------|---------------|
| Physical security | AWS data center (SOC 2, ISO 27001) |
| Network security | Cloudflare DDoS protection, TLS-only access |
| Data encryption at rest | AES-256 |
| Data encryption in transit | TLS 1.2+ |
| Access control | Role-based, campus-scoped, database-enforced RLS |
| Multi-tenant isolation | PostgreSQL Row-Level Security on every table |
| Authentication | bcrypt passwords, short-lived JWTs, optional MFA |
| SOC 2 Type II | Yes (Supabase) |
| FERPA DPA | Yes (executed per district) |
| Backups | Daily, 7–14 day retention |
| Uptime SLA | 99.9% monthly |
| Breach notification | Within 72 hours |
| Data deletion on exit | Within 90 days of contract termination |

---

*For additional questions, security documentation requests, or to schedule a technical review call, contact Clear Path Education Group, LLC at [contact information]. SOC 2 reports available under NDA upon request.*
