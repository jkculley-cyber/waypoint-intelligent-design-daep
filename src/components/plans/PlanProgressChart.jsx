import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import Card, { CardTitle } from '../ui/Card'
import {
  REVIEW_TYPE_LABELS,
  PROGRESS_RATING_LABELS,
} from '../../lib/constants'
import { formatDate } from '../../lib/utils'

const RATING_VALUES = {
  exceeding: 4,
  on_track: 3,
  at_risk: 2,
  failing: 1,
}

const RATING_COLORS = {
  4: '#22c55e',
  3: '#f97316',
  2: '#eab308',
  1: '#ef4444',
}

export default function PlanProgressChart({ reviews }) {
  const chartData = useMemo(() => {
    return reviews
      .filter((r) => r.progress_rating)
      .map((r) => ({
        date: formatDate(r.review_date),
        label: REVIEW_TYPE_LABELS[r.review_type] || r.review_type,
        rating: RATING_VALUES[r.progress_rating] || 0,
        ratingLabel: PROGRESS_RATING_LABELS[r.progress_rating] || r.progress_rating,
      }))
  }, [reviews])

  if (chartData.length < 2) return null

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const data = payload[0].payload
    return (
      <div className="bg-white shadow-lg border border-gray-200 rounded-lg px-3 py-2 text-sm">
        <p className="font-medium">{data.label}</p>
        <p className="text-gray-500">{data.date}</p>
        <p className="mt-1" style={{ color: RATING_COLORS[data.rating] }}>
          {data.ratingLabel}
        </p>
      </div>
    )
  }

  return (
    <Card>
      <CardTitle>Progress Over Time</CardTitle>
      <div className="mt-4" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              domain={[0, 4]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={(val) =>
                val === 4 ? 'Exceeding' :
                val === 3 ? 'On Track' :
                val === 2 ? 'At Risk' :
                val === 1 ? 'Failing' : ''
              }
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="rating"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#progressGradient)"
              dot={{ fill: '#f97316', r: 5 }}
              activeDot={{ r: 7, fill: '#2563eb' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
