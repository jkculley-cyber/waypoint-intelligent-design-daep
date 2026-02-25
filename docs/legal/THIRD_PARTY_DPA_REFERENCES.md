# Third-Party Data Processing Agreements

**Clear Path Education Group, LLC — Waypoint Platform**
Last Updated: February 25, 2026

This document provides references to the Data Processing Agreements (DPAs) and privacy terms of the infrastructure subprocessors Clear Path uses to deliver Waypoint. Districts that require these agreements as part of vendor review can access them at the links below.

---

## 1. Supabase, Inc.

**Role:** Primary database, authentication, and API provider for Waypoint.

**Data processed:** All student education records, staff profiles, discipline incidents, and application data are stored and processed in Supabase's managed PostgreSQL service.

**Infrastructure:** Supabase runs on Amazon Web Services (AWS) us-east-1 (Northern Virginia, USA).

**FERPA Compliance Note:** Supabase can execute a FERPA-compliant DPA under its standard school official agreement. Clear Path's agreement with Supabase designates Supabase as a school official subprocessor.

| Document | Link |
|---|---|
| Supabase Data Processing Agreement | https://supabase.com/legal/dpa |
| Supabase Privacy Policy | https://supabase.com/privacy |
| Supabase Terms of Service | https://supabase.com/terms |
| Supabase Security Practices | https://supabase.com/security |
| Supabase SOC 2 / Trust Center | https://supabase.com/security |

---

## 2. Amazon Web Services, Inc. (AWS)

**Role:** Cloud infrastructure underlying Supabase (compute, storage, networking). AWS is a **sub-processor** — Clear Path does not have a direct AWS account for student data; AWS is accessed only through Supabase.

**Data location:** AWS us-east-1 (Northern Virginia, USA). Student data does not leave this region.

**FERPA:** AWS is a FERPA-covered entity for educational technology customers and has published guidance on its FERPA compliance posture.

| Document | Link |
|---|---|
| AWS Data Processing Addendum | https://aws.amazon.com/agreement/data-processing/ |
| AWS FERPA Compliance Overview | https://aws.amazon.com/compliance/ferpa/ |
| AWS Privacy Notice | https://aws.amazon.com/privacy/ |
| AWS Compliance Programs | https://aws.amazon.com/compliance/programs/ |
| AWS HIPAA / EDU Eligibility | https://aws.amazon.com/compliance/hipaa-eligible-services-reference/ |

> **Note for districts:** Because Clear Path does not hold a direct AWS account for student data (Supabase does), districts reviewing Waypoint typically need Supabase's DPA rather than a direct AWS DPA. Clear Path is happy to provide Supabase's executed DPA upon request.

---

## 3. Cloudflare, Inc.

**Role:** Frontend application hosting (Cloudflare Pages), content delivery network (CDN), TLS encryption, and DDoS protection.

**Data processed:** Cloudflare delivers the Waypoint web application (HTML, CSS, JavaScript). Cloudflare **does not** process or store Student Education Records — all student data is fetched directly from Supabase via encrypted API calls and is never stored on Cloudflare's edge.

**FERPA Note:** Because Cloudflare does not process Student Education Records in connection with Waypoint, it is not acting as a FERPA school official for purposes of this service. Cloudflare is a routine CDN/hosting provider.

| Document | Link |
|---|---|
| Cloudflare Customer DPA | https://www.cloudflare.com/cloudflare-customer-dpa/ |
| Cloudflare Privacy Policy | https://www.cloudflare.com/privacypolicy/ |
| Cloudflare Trust Hub | https://www.cloudflare.com/trust-hub/ |
| Cloudflare GDPR / Compliance | https://www.cloudflare.com/gdpr/introduction/ |

---

## Executed DPA Requests

Districts that require an **executed copy** of any of the above third-party DPAs as part of their vendor procurement process should contact:

**Clear Path Education Group, LLC**
Email: privacy@clearpathedgroup.com
Website: clearpathedgroup.com

Clear Path will coordinate with the relevant subprocessor to provide executed documentation, or will provide its own executed DPA that passes through the relevant obligations.

---

## Relationship to Clear Path's Customer DPA

The obligations in Clear Path's **District Data Processing Agreement** (provided separately) flow down to all subprocessors listed here. Clear Path is not relieved of its DPA obligations by subprocessor failure — if a subprocessor causes a breach, Clear Path remains responsible to the district under the terms of the customer DPA.

See also: [Subprocessor List](./SUBPROCESSOR_LIST.md) for a full table of all third-party subprocessors.
