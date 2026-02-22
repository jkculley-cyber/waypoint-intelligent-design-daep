# Demo & Pilot Accounts

**Live app:** https://waypoint.clearpathedgroup.com
**All demo accounts use password:** `Password123!`

---

## Waypoint Internal (Owner Only)

| Role | Email | Password |
|------|-------|----------|
| Waypoint Admin | admin@waypoint.internal | Waypoint2025! |

Access: `/waypoint-admin` — district provisioning, business dashboard, contracts

---

## Demo District — Lone Star ISD

District with full seed data: students, incidents, compliance records, transition plans, orientation data.

### Staff Accounts

| Role | Email | Password | Campus Access |
|------|-------|----------|---------------|
| District Admin | admin@lonestar-isd.org | Password123! | All campuses |
| DAEP Staff (AP) | daep-staff@lonestar-isd.org | Password123! | All campuses |
| Principal | hs-principal@lonestar-isd.org | Password123! | High School only |
| Assistant Principal | hs-ap@lonestar-isd.org | Password123! | High School only |
| Counselor | ms-counselor@lonestar-isd.org | Password123! | Middle School only |
| Teacher | el-teacher@lonestar-isd.org | Password123! | Elementary only |
| SPED Coordinator | sped-coord@lonestar-isd.org | Password123! | Middle School only |

### Parent Portal

| Role | Email | Password | Linked Students |
|------|-------|----------|-----------------|
| Parent | parent@lonestar-isd.org | Password123! | Marcus & Sofia Johnson |

Access: `/parent` — read-only view of incidents and transition plans for linked students

---

## Demo Flow — Recommended Order

1. **Log in as `admin@lonestar-isd.org`** — show full admin view (dashboard, students, incidents, compliance, reports)
2. **Switch to `hs-principal@lonestar-isd.org`** — show campus-scoped view (only sees High School data)
3. **Switch to `daep-staff@lonestar-isd.org`** — show DAEP workflow (incident approval, transition plans)
4. **Switch to `parent@lonestar-isd.org`** — show parent portal (read-only, student-specific)

---

## Provisioning New Pilot Districts

Log in as `admin@waypoint.internal` → `/waypoint-admin` → **+ Provision New District**

The wizard creates:
- The district record
- A primary campus
- A district admin account with a temporary password

Share the login URL and temp password with the pilot district contact. They should change the password on first login.

---

## Notes

- Demo data is seeded for Lone Star ISD — **do not delete or modify** during demos
- Supabase auth rate limits password reset emails to 3/hr on the free plan — configure SMTP before pilot go-live
- All accounts are on the production Supabase project (`kvxecksvkimcgwhxxyhw`)
- This file is internal only — do not share publicly
