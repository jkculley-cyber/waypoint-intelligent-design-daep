# Session BS Handover
**Date:** 2026-04-07
**Agent:** Archer (CTO)
**Focus:** SP4 cloudflared tunnel — second attempt, still blocked

---

## What Was Done

- Confirmed cloudflared.exe downloads cleanly on SP4 (`cloudflared version 2026.3.0`)
- Walked through PowerShell setup repeatedly; binary present in `C:\Users\jkcul\Downloads\cloudflared.exe`
- Identified that user's SP4 has OneDrive-redirected Desktop (`$env:USERPROFILE\OneDrive\Desktop`)
- Tunnel token from Session BR (handover line 18) consistently mangled by PowerShell clipboard paste — variable lengths bouncing 184/187/195 across attempts
- Cloudflared rejected token with "Provided Tunnel token is not valid" — likely due to clipboard truncation, not actual invalidity (token never cleanly received in one piece)

---

## Current Blocker

PowerShell clipboard paste truncates / line-wraps the 184-char tunnel token unpredictably. Tried:
- Direct `--token <string>` paste → split across lines
- `$token = "..."` variable → length varied each paste
- `notepad token.txt` → still wrong length
- `$env:TUNNEL_TOKEN` env var → same issue
- `Set-Content` to file → 187 chars instead of 184

Never got a clean run.

---

## Next Session — Recommended Approach

**Skip manual token typing entirely.** Use Cloudflare dashboard's pre-built install command:

1. SP4 browser → `https://one.dash.cloudflare.com`
2. Networks → Tunnels → click `scout-inference`
3. Configure → "Install connector" section → copy the one-line Windows install command
4. Paste into PowerShell — it both installs the service AND embeds the token

If dashboard copy also truncates, alternative: SSH/RDP file transfer of a pre-built `.bat` file from main machine to SP4, or use `Invoke-WebRequest` to fetch token from a private gist.

Tunnel token (for reference, may be stale by next session — regenerate if needed):
```
eyJhIjoiMDVmZjhmOTRkODJhNTQxNjhlMTgzYmQ4ZTA2MTRiNzAiLCJ0IjoiYTBkYTJkMGUtNDZiNy00YzhjLWI3NzEtMTA2NDg5ZGQwY2Q1IiwicyI6Ik5HTTVPRFJrWWpJdE16TmlaaTAwT0dJNExUaGpaR1l0TnpBeVpHUXlNR0l5TkRRMiJ9
```

---

## SP4 Setup Status (unchanged from BR)

| Phase | Status |
|-------|--------|
| 1. SP4 pre-flight | ✅ Complete |
| 2. Ollama + Gemma 3 1B | ✅ Complete (Ollama reinstalled this session) |
| 3. Cloudflare Tunnel | 🔴 Still blocked — token paste corruption |
| 4. SCOUT code update | Not started |
| 5. Batch mode config | Not started |
| 6. Keep-alive + monitoring | Not started |

---

## What's Next (unchanged priorities from BR)

1. **Finish SP4 tunnel via dashboard install command** (above)
2. Update SCOUT source to call local Ollama
3. Re-upload VEP + PEIMS to TpT with fixes
4. Build remaining 6 TpT gap products from Vera's list
5. Store redesign
