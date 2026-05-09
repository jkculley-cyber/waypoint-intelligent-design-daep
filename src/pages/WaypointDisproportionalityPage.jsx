import { useState } from 'react'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { PageLoader } from '../components/ui/LoadingSpinner'
import { useWaypointDisproportionality, RACE_LABELS, SMALL_CELL_THRESHOLD } from '../hooks/useDisproportionality'
import { useCampuses } from '../hooks/useCampuses'

/**
 * T2-3 — Waypoint Disproportionality Radar (CC22 R2 finding F-R2-1).
 *
 * Closes Reyes's R1 Title VI dimension: Waypoint-only districts had no in-app
 * OCR risk-index monitor (Navigator had one, but it was gated behind
 * hasProduct('navigator'), so a Waypoint-only district was unmonitored).
 *
 * Now reads from useWaypointDisproportionality (Waypoint-side hook over
 * incidents/students), renders byRace + bySpedStatus tables with severity
 * tiering, OCR small-cell suppression, and longitudinal trend chips.
 *
 * Severity buckets (OCR-aligned, on removal-share / enrollment-share):
 *   ≥ 2.0  severe        (red)
 *   ≥ 1.5  high          (orange)
 *   ≥ 1.2  elevated      (amber)
 *   < 1.2  within range  (emerald)
 *
 * Removal = consequence_type IN ('oss', 'daep') in Waypoint's incidents schema.
 */

const SEVERITY_STYLES = {
  severe:       { label: 'Severe',       badge: 'bg-red-100 text-red-700 border-red-200' },
  high:         { label: 'High',         badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  elevated:     { label: 'Elevated',     badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  within_range: { label: 'Within range', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

function TrendCell({ row }) {
  if (row.suppressed) return null
  if (row.trend == null) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-medium"
        title="Fewer than 5 removals in either current or prior 90-day window. Trend cannot be assessed reliably."
      >
        <span aria-hidden>ⓘ</span>
        <span>insufficient</span>
      </span>
    )
  }
  const tooltip = `Prior 90d: ${row.prior_oss_risk_index ?? '—'}  →  Current 90d: ${row.oss_risk_index ?? '—'}  (Δ ${row.trend_delta > 0 ? '+' : ''}${row.trend_delta})`
  if (row.trend === 'up') {
    return (
      <span title={tooltip} className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs">
        <span aria-hidden>▲</span>
        <span>+{row.trend_delta}</span>
      </span>
    )
  }
  if (row.trend === 'down') {
    return (
      <span title={tooltip} className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
        <span aria-hidden>▼</span>
        <span>{row.trend_delta}</span>
      </span>
    )
  }
  return (
    <span title={tooltip} className="inline-flex items-center gap-1 text-gray-400 text-xs">
      <span aria-hidden>—</span>
      <span>flat</span>
    </span>
  )
}

function SeverityBadge({ severity }) {
  if (!severity) return <span className="text-xs text-gray-400">—</span>
  const s = SEVERITY_STYLES[severity]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${s.badge}`}>
      {s.label}
    </span>
  )
}

export default function WaypointDisproportionalityPage() {
  // P2: campus filter — Title VI complaints land campus-by-campus, not
  // district-rolled. Default to district-aggregate; admin can drill into
  // a single campus.
  const [campusFilterId, setCampusFilterId] = useState('')
  const { byRace, bySpedStatus, loading, error, refetch } = useWaypointDisproportionality(campusFilterId || null)
  const { campuses } = useCampuses()

  if (loading && byRace.length === 0) return <><Topbar title="Disproportionality Radar" /><PageLoader /></>

  return (
    <>
      <Topbar
        title="Disproportionality Radar"
        subtitle="OCR risk index over a rolling 90-day window — Title VI + IDEA + Section 504 monitoring"
      />
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* P2: campus filter */}
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Scope</p>
              <p className="text-xs text-gray-500 mt-1">
                Title VI complaints typically arrive campus-by-campus. Drill into a single
                campus to surface disparities the district-aggregate hides.
              </p>
            </div>
            <select
              value={campusFilterId}
              onChange={(e) => setCampusFilterId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">All campuses (district aggregate)</option>
              {(campuses || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Methodology / disclosure */}
        <Card>
          <CardTitle>How this is calculated</CardTitle>
          <div className="text-sm text-gray-700 space-y-2 mt-2">
            <p>
              <strong>Risk index</strong> = (cohort's share of OSS + DAEP placements)
              ÷ (cohort's share of district enrollment). 1.0 = proportional.
              Values ≥ 1.2 = elevated; ≥ 1.5 = high; ≥ 2.0 = severe (OCR convention).
            </p>
            <p>
              <strong>Window</strong>: rolling 90 days of approved/active/completed
              incidents. <strong>Trend</strong> compares current 90d to prior 90d
              (days 91–180 ago); insufficient when fewer than 5 removals in either window.
            </p>
            <p>
              <strong>Small-cell suppression</strong>: cohorts with enrollment under{' '}
              {SMALL_CELL_THRESHOLD} are suppressed per OCR small-cell guidance and
              FERPA aggregate-data rules. The risk index is hidden, not the cohort label.
            </p>
            <p className="text-xs text-gray-500 italic">
              The current-enrollment denominator is used for both windows. Trend
              stability is overstated when a cohort's enrollment changed materially.
              For OCR-grade longitudinal analysis, export the full incident dataset
              and join against historical SIS enrollment snapshots.
            </p>
          </div>
        </Card>

        {error && (
          <Card>
            <p className="text-sm text-red-600">Error loading data: {error}</p>
            <button onClick={refetch} className="mt-2 text-sm text-orange-600 underline">
              Retry
            </button>
          </Card>
        )}

        {/* By Race / Ethnicity */}
        <Card>
          <CardTitle>By race / ethnicity</CardTitle>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Sorted by OSS+DAEP risk index, descending. Suppressed cohorts (enrollment &lt; {SMALL_CELL_THRESHOLD}) appear at the bottom.
          </p>
          {byRace.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No incidents in the last 90 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2 pr-2">Cohort</th>
                    <th className="py-2 pr-2 text-right">Enrollment</th>
                    <th className="py-2 pr-2 text-right">Incidents</th>
                    <th className="py-2 pr-2 text-right">Removals</th>
                    <th className="py-2 pr-2 text-right">Removal share</th>
                    <th className="py-2 pr-2 text-right">Risk index</th>
                    <th className="py-2 pr-2">Severity</th>
                    <th className="py-2 pr-2">Trend (90d)</th>
                  </tr>
                </thead>
                <tbody>
                  {byRace.map((r) => (
                    <tr key={r.race} className={`border-b ${r.suppressed ? 'text-gray-400' : ''}`}>
                      <td className="py-2 pr-2">
                        <span className="font-medium text-gray-900">{r.label}</span>
                        {r.suppressed && (
                          <span className="ml-2 text-[10px] text-gray-500 italic">
                            (n &lt; {SMALL_CELL_THRESHOLD}, suppressed)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right">{r.enrollment}</td>
                      <td className="py-2 pr-2 text-right">{r.referrals}</td>
                      <td className="py-2 pr-2 text-right">{r.suppressed ? '—' : r.removals}</td>
                      <td className="py-2 pr-2 text-right">{r.suppressed ? '—' : `${r.removal_share}%`}</td>
                      <td className="py-2 pr-2 text-right font-medium">{r.suppressed ? '—' : r.oss_risk_index ?? '—'}</td>
                      <td className="py-2 pr-2"><SeverityBadge severity={r.severity} /></td>
                      <td className="py-2 pr-2"><TrendCell row={r} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* By SPED / 504 status */}
        <Card>
          <CardTitle>By SPED &amp; Section 504 status</CardTitle>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            IDEA disability status (SPED) and Section 504 plan status. OCR investigates these alongside race-based disparity.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 pr-2">Cohort</th>
                  <th className="py-2 pr-2 text-right">Enrollment</th>
                  <th className="py-2 pr-2 text-right">Incidents</th>
                  <th className="py-2 pr-2 text-right">Removals</th>
                  <th className="py-2 pr-2 text-right">Risk index</th>
                  <th className="py-2 pr-2">Severity</th>
                  <th className="py-2 pr-2">Trend (90d)</th>
                </tr>
              </thead>
              <tbody>
                {bySpedStatus.map((r) => (
                  <tr key={r.group} className={`border-b ${r.suppressed ? 'text-gray-400' : ''}`}>
                    <td className="py-2 pr-2 font-medium text-gray-900">{r.label}</td>
                    <td className="py-2 pr-2 text-right">{r.enrollment ?? '—'}</td>
                    <td className="py-2 pr-2 text-right">{r.referrals ?? '—'}</td>
                    <td className="py-2 pr-2 text-right">{r.suppressed ? '—' : r.removals}</td>
                    <td className="py-2 pr-2 text-right font-medium">{r.suppressed ? '—' : r.oss_risk_index ?? '—'}</td>
                    <td className="py-2 pr-2">
                      <SeverityBadge severity={
                        r.suppressed || r.oss_risk_index == null ? null
                        : r.oss_risk_index >= 2.0 ? 'severe'
                        : r.oss_risk_index >= 1.5 ? 'high'
                        : r.oss_risk_index >= 1.2 ? 'elevated'
                        : 'within_range'
                      } />
                    </td>
                    <td className="py-2 pr-2"><TrendCell row={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Notes / next steps */}
        <Card>
          <CardTitle>What to do with this data</CardTitle>
          <ul className="text-sm text-gray-700 space-y-2 mt-2 list-disc list-inside">
            <li><strong>Severe / High</strong> rows for race or 504/SPED status — review the underlying placements and assess whether discipline matrix or campus-level practices are driving disparate outcomes.</li>
            <li><strong>Trend ▲ up</strong> on a cohort already above 1.0 — schedule a District Equity Review (TEC §39A.501-style). Document the analysis in case of OCR inquiry.</li>
            <li><strong>insufficient</strong> trend chips — small samples; revisit at the next 90-day cycle. Don't use them to claim disproportionality is improving.</li>
            <li>This page is internal monitoring, not OCR submission. For OCR Civil Rights Data Collection (CRDC), use the existing PEIMS export plus campus-level enrollment from the SIS.</li>
          </ul>
        </Card>

      </div>
    </>
  )
}
