import { useState, useMemo } from 'react'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  useRDADetermination,
  useRDAIndicators,
  useCampusRDABreakdown,
  upsertRDADetermination,
  upsertRDAIndicator,
} from '../../hooks/useMeridian'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Skeleton, Card } from './MeridianUI'

function currentSchoolYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 7 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`
}

// ── PEIMS indicator config (manually entered from annual PEIMS export) ────────
const PEIMS_INDICATORS = {
  '1':  { label: 'Graduation Rate',                 target: 85,   domain: 'I'   },
  '2':  { label: 'Dropout Rate (≤)',                target: 0.54, domain: 'I'   },
  '5':  { label: 'LRE ≥80% (School-Age)',           target: 65,   domain: 'II'  },
  '6':  { label: 'LRE (Preschool Regular)',          target: 32,   domain: 'II'  },
  '7':  { label: 'Preschool Outcomes',               target: null, domain: 'II'  },
  '8':  { label: 'Parent Involvement',               target: 80,   domain: 'II'  },
  '12': { label: 'Early Childhood Transition',       target: 100,  domain: 'II'  },
  '9':  { label: 'Disproportionality (Overall)',     target: null, domain: 'III' },
  '10': { label: 'Disproportionality (Disability)',  target: null, domain: 'III' },
}

const PEIMS_DOMAINS = [
  { label: 'Domain I — Academic Achievement', keys: ['1', '2'] },
  { label: 'Domain II — Program Quality',     keys: ['5', '6', '7', '8', '12'] },
  { label: 'Domain III — Disproportionality', keys: ['9', '10'] },
]

const DL_CONFIG = {
  dl1: { label: 'DL1 — Meets Requirements',             bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800' },
  dl2: { label: 'DL2 — Needs Assistance',               bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-800'   },
  dl3: { label: 'DL3 — Needs Intervention',             bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-800'  },
  dl4: { label: 'DL4 — Needs Substantial Intervention', bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-800'     },
}

// Color a percentage cell against a target threshold
function metricColor(pct, target = 100) {
  if (pct === null || pct === undefined) return null
  if (pct >= target) return 'green'
  if (pct >= target * 0.8) return 'amber'
  return 'red'
}

const COLOR_CLASSES = {
  green: 'bg-emerald-50 text-emerald-800',
  amber: 'bg-amber-50 text-amber-800',
  red:   'bg-red-50 text-red-700',
}

function PctCell({ pct, target }) {
  if (pct === null || pct === undefined) {
    return <span className="text-xs text-gray-300 font-mono">—</span>
  }
  const color = metricColor(pct, target)
  return (
    <span className={`inline-block text-xs font-mono font-semibold px-2 py-0.5 rounded ${COLOR_CLASSES[color]}`}>
      {pct}%
    </span>
  )
}

// ── Live metric header cards ──────────────────────────────────────────────────
function LiveCard({ label, sppiLabel, pct, target, loading, subtitle }) {
  const color = metricColor(pct, target)
  const textColor = { green: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600' }[color] ?? 'text-gray-400'
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 border-t-2 border-t-purple-400">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-mono leading-tight">{label}</p>
        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-mono whitespace-nowrap">
          {sppiLabel} Live
        </span>
      </div>
      {loading
        ? <Skeleton className="h-8 w-16 mb-1" />
        : <p className={`font-mono text-3xl font-medium leading-none mb-1 ${pct !== null ? textColor : 'text-gray-300'}`}>
            {pct !== null ? `${pct}%` : '—'}
          </p>
      }
      <p className="text-xs text-gray-400">{subtitle ?? (target ? `Target: ${target}%` : '')}</p>
    </div>
  )
}

// ── PEIMS indicator mini card ─────────────────────────────────────────────────
function PeimsCard({ sppiNum, indicator, onEdit }) {
  const cfg = PEIMS_INDICATORS[sppiNum]
  if (!cfg) return null
  const pct = indicator?.district_pct
  const status = indicator?.status

  const statusCls = {
    meets:       'bg-emerald-100 text-emerald-700',
    approaching: 'bg-amber-100 text-amber-700',
    not_meets:   'bg-red-100 text-red-700',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">SPPI-{sppiNum}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{cfg.label}</p>
        {cfg.target !== null && (
          <p className="text-xs text-gray-400">State target: {cfg.target}%</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {status && (
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${statusCls[status] ?? 'bg-gray-100 text-gray-500'}`}>
            {status.replace('_', ' ')}
          </span>
        )}
        {pct !== null && pct !== undefined
          ? <span className="text-sm font-mono font-bold text-gray-700">{pct}%</span>
          : <span className="text-sm font-mono text-gray-300">—</span>
        }
        <button
          onClick={() => onEdit(sppiNum)}
          className="text-xs text-purple-600 hover:text-purple-800 font-medium"
        >
          {indicator ? 'Edit' : 'Enter'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MeridianRDAPage() {
  const { districtId, profile } = useAuth()
  const { data: determination, loading: loadingDL, refetch: refetchDL } = useRDADetermination()
  const { data: indicators, loading: loadingInd, refetch: refetchInd } = useRDAIndicators()
  const { data: campusBreakdown, loading: loadingBreakdown, refetch: refetchBreakdown } = useCampusRDABreakdown()

  const [dlModalOpen, setDlModalOpen] = useState(false)
  const [editingIndicator, setEditingIndicator] = useState(null)
  const [peimsOpen, setPeimsOpen] = useState(false)

  const sy = currentSchoolYear()
  const dl = determination?.determination_level ?? null
  const dlCfg = dl ? DL_CONFIG[dl] : null
  const needsSSP = dl && dl !== 'dl1'

  const nextCheckin = useMemo(() => {
    if (!determination?.next_checkin_date) return null
    try {
      const d = parseISO(determination.next_checkin_date)
      const days = differenceInDays(d, new Date())
      return { date: format(d, 'MMM d, yyyy'), days }
    } catch { return null }
  }, [determination])

  const indicatorMap = useMemo(() => {
    const m = {}
    for (const ind of (indicators ?? [])) m[ind.sppi_number] = ind
    return m
  }, [indicators])

  // District row is always first in campusBreakdown
  const districtRow = campusBreakdown?.[0]
  const campusRows  = campusBreakdown?.slice(1) ?? []

  const handleRefetchAll = () => { refetchDL(); refetchInd(); refetchBreakdown() }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Results Driven Accountability (RDA)</h1>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono font-medium border border-purple-200">TEA</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Live compliance metrics by campus — School Year {sy}
          </p>
        </div>
        <button
          onClick={() => setDlModalOpen(true)}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Update Determination
        </button>
      </div>

      {/* DL Banner */}
      {loadingDL ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : !determination ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500">No RDA determination recorded for {sy}</p>
            <p className="text-xs text-gray-400 mt-0.5">Enter your TEA determination level to track SSP obligations.</p>
          </div>
          <button onClick={() => setDlModalOpen(true)} className="text-sm text-purple-600 hover:underline font-medium">
            Enter Determination →
          </button>
        </div>
      ) : (
        <div className={`${dlCfg.bg} border ${dlCfg.border} rounded-xl px-5 py-4`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <span className={`text-lg font-bold ${dlCfg.text}`}>{dlCfg.label}</span>
                {determination.determination_date && (
                  <span className="text-xs text-gray-500">as of {format(parseISO(determination.determination_date), 'MMM d, yyyy')}</span>
                )}
              </div>
              {determination.notes && <p className="text-xs text-gray-600">{determination.notes}</p>}
            </div>
            {needsSSP && (
              <div className="flex gap-5 text-sm flex-wrap">
                {determination.ssp_due_date && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-0.5">SSP Due</p>
                    <p className="font-semibold text-gray-800">{format(parseISO(determination.ssp_due_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {determination.ssp_submitted_date ? (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Submitted</p>
                    <p className="font-semibold text-emerald-700">{format(parseISO(determination.ssp_submitted_date), 'MMM d, yyyy')}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-0.5">SSP Status</p>
                    <p className="font-semibold text-amber-700">Not Submitted</p>
                  </div>
                )}
                {nextCheckin && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Next TEA Check-in</p>
                    <p className="font-semibold text-gray-800">{nextCheckin.date}</p>
                    <p className="text-xs text-gray-500">
                      {nextCheckin.days > 0 ? `in ${nextCheckin.days}d` : nextCheckin.days === 0 ? 'today' : `${Math.abs(nextCheckin.days)}d overdue`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Indicator Summary Cards */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Meridian Live Indicators</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingBreakdown ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <LiveCard
                label="Eval Timeliness"
                sppiLabel="SPPI-11"
                pct={districtRow?.sppi11_pct ?? null}
                target={100}
                subtitle="Evals completed on time"
              />
              <LiveCard
                label="Secondary Transition"
                sppiLabel="SPPI-13"
                pct={districtRow?.sppi13_pct ?? null}
                target={100}
                subtitle="All 5 IEP elements met"
              />
              <LiveCard
                label="IEP Folder Readiness"
                sppiLabel="Proxy"
                pct={districtRow?.folder_pct ?? null}
                target={85}
                subtitle="Avg folder completeness"
              />
              <LiveCard
                label="ARD Timeliness"
                sppiLabel="Proxy"
                pct={districtRow?.ard_pct ?? null}
                target={100}
                subtitle="ARDs held by due date"
              />
            </>
          )}
        </div>
      </div>

      {/* Campus Breakdown Table */}
      <Card>
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Compliance by Campus</h3>
            <p className="text-xs text-gray-400 mt-0.5">Updated live from Meridian data. Green = at/above target. Amber = within 20%. Red = below.</p>
          </div>
          <button
            onClick={handleRefetchAll}
            className="text-xs text-purple-600 hover:text-purple-800 font-medium"
          >
            Refresh ↻
          </button>
        </div>

        {loadingBreakdown ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded" />)}
          </div>
        ) : !campusBreakdown || campusBreakdown.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">No campus data found. Add campuses and SPED students to see live metrics here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Campus</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SPED</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">
                    <div>SPPI-11</div>
                    <div className="text-[10px] font-normal text-gray-400 normal-case">Eval Timeliness</div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">
                    <div>SPPI-13</div>
                    <div className="text-[10px] font-normal text-gray-400 normal-case">Sec. Transition</div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">
                    <div>Folder</div>
                    <div className="text-[10px] font-normal text-gray-400 normal-case">Readiness</div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">
                    <div>ARD</div>
                    <div className="text-[10px] font-normal text-gray-400 normal-case">Timeliness</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campusBreakdown.map((row, idx) => (
                  <tr
                    key={row.campus_id}
                    className={idx === 0
                      ? 'bg-purple-50 font-semibold border-b border-purple-100'
                      : 'hover:bg-gray-50 transition-colors'
                    }
                  >
                    <td className="px-5 py-3 text-gray-900">
                      {row.campus_name}
                      {idx === 0 && (
                        <span className="ml-2 text-[10px] font-mono text-purple-500 uppercase tracking-wider">district</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 font-mono text-xs">{row.sped_count}</td>
                    <td className="px-4 py-3 text-center">
                      <PctCell pct={row.sppi11_pct} target={100} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PctCell pct={row.sppi13_pct} target={100} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PctCell pct={row.folder_pct} target={85} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PctCell pct={row.ard_pct} target={100} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">
                SPPI-11 and SPPI-13 are federally reported indicators.
                Folder Readiness and ARD Timeliness are Meridian-derived proxies and are not submitted to TEA.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* PEIMS Indicators — Annual Data */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setPeimsOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Annual PEIMS Indicators</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              SPPI-1, 2, 5, 6, 7, 8, 9, 10, 12 — enter once per year from PEIMS export
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-mono">
              {Object.keys(PEIMS_INDICATORS).filter(k => indicatorMap[k]).length}/{Object.keys(PEIMS_INDICATORS).length} entered
            </span>
            <span className="text-gray-400 text-xs">{peimsOpen ? '▲' : '▼'}</span>
          </div>
        </button>

        {peimsOpen && (
          <div className="p-5 border-t border-gray-100 space-y-5">
            {loadingInd ? (
              <Skeleton className="h-40 w-full rounded" />
            ) : (
              PEIMS_DOMAINS.map(domain => (
                <div key={domain.label}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{domain.label}</p>
                  <div className="space-y-2">
                    {domain.keys.map(num => (
                      <PeimsCard
                        key={num}
                        sppiNum={num}
                        indicator={indicatorMap[num]}
                        onEdit={setEditingIndicator}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
            <p className="text-xs text-gray-400 pt-1">
              These indicators require annual PEIMS submission data and cannot be auto-calculated from Meridian records.
              Pull from your PEIMS SPPI report or TEA district performance report.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {dlModalOpen && (
        <DeterminationModal
          districtId={districtId}
          profileId={profile?.id}
          schoolYear={sy}
          existing={determination}
          onClose={() => setDlModalOpen(false)}
          onSaved={() => { handleRefetchAll(); setDlModalOpen(false) }}
        />
      )}

      {editingIndicator && (
        <IndicatorEditModal
          districtId={districtId}
          schoolYear={sy}
          sppiNum={editingIndicator}
          existing={indicatorMap[editingIndicator]}
          onClose={() => setEditingIndicator(null)}
          onSaved={() => { refetchInd(); setEditingIndicator(null) }}
        />
      )}
    </div>
  )
}

// ── Determination Modal (simplified — DL + SSP only) ──────────────────────────
const SCHOOL_YEARS = ['2024-25', '2025-26', '2026-27']

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

function DeterminationModal({ districtId, profileId, schoolYear, existing, onClose, onSaved }) {
  const [saving, setSaving]       = useState(false)
  const [dl, setDl]               = useState(existing?.determination_level ?? 'dl1')
  const [sy, setSy]               = useState(existing?.school_year ?? schoolYear)
  const [dlDate, setDlDate]       = useState(existing?.determination_date ?? '')
  const [sspDue, setSspDue]       = useState(existing?.ssp_due_date ?? '')
  const [sspSub, setSspSub]       = useState(existing?.ssp_submitted_date ?? '')
  const [nextCI, setNextCI]       = useState(existing?.next_checkin_date ?? '')
  const [notes, setNotes]         = useState(existing?.notes ?? '')

  const needsSSP = dl !== 'dl1'
  const cadenceMap = { dl2: 90, dl3: 60, dl4: 30 }
  const cadenceDays = cadenceMap[dl] ?? null

  const computedNextCI = useMemo(() => {
    if (!sspDue || !cadenceDays) return ''
    try { return format(addDays(parseISO(sspDue), cadenceDays), 'yyyy-MM-dd') } catch { return '' }
  }, [sspDue, cadenceDays])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await upsertRDADetermination({
      district_id:         districtId,
      school_year:         sy,
      determination_level: dl,
      determination_date:  dlDate || null,
      ssp_due_date:        needsSSP ? (sspDue || null) : null,
      ssp_submitted_date:  needsSSP ? (sspSub || null) : null,
      next_checkin_date:   needsSSP ? (nextCI || computedNextCI || null) : null,
      notes:               notes || null,
      updated_by:          profileId || null,
      updated_at:          new Date().toISOString(),
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Determination saved')
    onSaved()
  }

  const dlOptions = [
    { value: 'dl1', label: 'DL1 — Meets Requirements',             desc: 'No SSP required'            },
    { value: 'dl2', label: 'DL2 — Needs Assistance',               desc: 'SSP required · 90-day cycle' },
    { value: 'dl3', label: 'DL3 — Needs Intervention',             desc: 'SSP required · 60-day cycle' },
    { value: 'dl4', label: 'DL4 — Needs Substantial Intervention', desc: 'SSP required · 30-day cycle' },
  ]

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="RDA Determination Level"
      description={`Record your TEA determination for School Year ${sy}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">School Year</label>
            <select value={sy} onChange={e => setSy(e.target.value)} className={inputCls}>
              {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Determination Date</label>
            <input type="date" value={dlDate} onChange={e => setDlDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Determination Level</label>
          <div className="space-y-2">
            {dlOptions.map(opt => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                dl === opt.value ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input type="radio" name="dl" value={opt.value} checked={dl === opt.value} onChange={() => setDl(opt.value)} className="mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {needsSSP && (
          <div className="border border-amber-200 rounded-lg bg-amber-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">SSP Obligations</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SSP Due Date</label>
                <input type="date" value={sspDue} onChange={e => setSspDue(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SSP Submitted Date</label>
                <input type="date" value={sspSub} onChange={e => setSspSub(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Next TEA Check-in</label>
              <input
                type="date"
                value={nextCI || computedNextCI}
                onChange={e => setNextCI(e.target.value)}
                className={inputCls}
              />
              {computedNextCI && !nextCI && (
                <p className="text-xs text-gray-400 mt-1">
                  Auto-computed: {format(parseISO(computedNextCI), 'MMM d, yyyy')} ({cadenceDays} days from SSP due)
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>
      </div>
    </Modal>
  )
}

// ── Indicator Edit Modal (PEIMS only) ─────────────────────────────────────────
function IndicatorEditModal({ districtId, schoolYear, sppiNum, existing, onClose, onSaved }) {
  const cfg = PEIMS_INDICATORS[sppiNum]
  const [distPct, setDistPct]   = useState(existing?.district_pct ?? '')
  const [stateTgt, setStateTgt] = useState(existing?.state_target ?? cfg?.target ?? '')
  const [status, setStatus]     = useState(existing?.status ?? '')
  const [notes, setNotes]       = useState(existing?.notes ?? '')
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await upsertRDAIndicator({
      district_id:  districtId,
      school_year:  schoolYear,
      sppi_number:  sppiNum,
      district_pct: distPct !== '' ? parseFloat(distPct) : null,
      state_target: stateTgt !== '' ? parseFloat(stateTgt) : null,
      status:       status || null,
      data_source:  'manual',
      notes:        notes || null,
      updated_at:   new Date().toISOString(),
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(`SPPI-${sppiNum} updated`)
    onSaved()
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`SPPI-${sppiNum}: ${cfg?.label}`}
      description={`Domain ${cfg?.domain} — ${schoolYear} PEIMS data`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">District %</label>
            <input type="number" min="0" max="100" step="0.01" value={distPct} onChange={e => setDistPct(e.target.value)} placeholder="e.g. 78.5" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">State Target %</label>
            <input type="number" min="0" max="100" step="0.01" value={stateTgt} onChange={e => setStateTgt(e.target.value)} placeholder={cfg?.target ?? '—'} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
            <option value="">— Select —</option>
            <option value="meets">Meets</option>
            <option value="approaching">Approaching</option>
            <option value="not_meets">Not Meets</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>
      </div>
    </Modal>
  )
}
