import { useEffect, useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import api from '@/lib/api'
import { Loader2, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const GEO_URL = '/india-states.json'

const STATUS_COLORS = {
  pending: '#f59e0b',
  'in-progress': '#3b82f6',
  resolved: '#10b981',
}

const STATUS_LABELS = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  resolved: 'Resolved',
}

function heatColor(count, max) {
  if (!count || !max) return '#f1f5f9'
  const t = Math.min(count / max, 1)
  const r = Math.round(219 - t * 182)
  const g = Math.round(234 - t * 135)
  const b = Math.round(254 - t * 19)
  return `rgb(${r},${g},${b})`
}

export default function IssueMap() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null)
  const [selectedState, setSelectedState] = useState(null)

  useEffect(() => {
    api.get('/issues/public')
      .then(r => setIssues(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const issuesByState = issues.reduce((acc, issue) => {
    if (!issue.state) return acc
    if (!acc[issue.state]) acc[issue.state] = { total: 0, pending: 0, 'in-progress': 0, resolved: 0 }
    acc[issue.state].total++
    acc[issue.state][issue.status] = (acc[issue.state][issue.status] || 0) + 1
    return acc
  }, {})

  const maxCount = Math.max(...Object.values(issuesByState).map(v => v.total), 1)

  const selectedIssues = selectedState ? issues.filter(i => i.state === selectedState) : []

  const topStates = Object.entries(issuesByState)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 7)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold mb-1">Issue Map</h1>
        <p className="text-sm text-muted-foreground">
          Issue density across India. Hover to inspect, click a state to see its issues.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[520px] rounded-xl border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* Map panel */}
          <div className="relative rounded-xl border bg-slate-50 dark:bg-slate-900 overflow-hidden">

            {/* Hover tooltip */}
            {tooltip && (
              <div className="absolute top-3 left-3 z-10 bg-background border rounded-lg shadow-lg px-3 py-2.5 text-sm pointer-events-none min-w-[160px]">
                <p className="font-semibold mb-1">{tooltip.name}</p>
                <p className="text-muted-foreground text-xs mb-1.5">{tooltip.total} issue{tooltip.total !== 1 ? 's' : ''}</p>
                {tooltip.total > 0 && (
                  <div className="space-y-0.5">
                    {['pending', 'in-progress', 'resolved'].map(s =>
                      tooltip[s] ? (
                        <div key={s} className="flex items-center gap-1.5 text-xs">
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s], flexShrink: 0 }} />
                          <span className="text-muted-foreground">{STATUS_LABELS[s]}:</span>
                          <span className="font-medium">{tooltip[s]}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            )}

            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [82, 23], scale: 1050 }}
              style={{ width: '100%', height: 520 }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map(geo => {
                    const stateName = geo.properties.ST_NM
                    const data = issuesByState[stateName]
                    const count = data?.total || 0
                    const isSelected = selectedState === stateName

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => setSelectedState(isSelected ? null : stateName)}
                        onMouseEnter={() => setTooltip({ name: stateName, total: count, ...data })}
                        onMouseLeave={() => setTooltip(null)}
                        style={{
                          default: {
                            fill: isSelected ? '#6366f1' : heatColor(count, maxCount),
                            stroke: '#cbd5e1',
                            strokeWidth: 0.5,
                            outline: 'none',
                            cursor: 'pointer',
                            transition: 'fill 0.15s',
                          },
                          hover: {
                            fill: isSelected ? '#4f46e5' : '#a5b4fc',
                            stroke: '#94a3b8',
                            strokeWidth: 0.8,
                            outline: 'none',
                            cursor: 'pointer',
                          },
                          pressed: { outline: 'none' },
                        }}
                      />
                    )
                  })
                }
              </Geographies>
            </ComposableMap>

            {/* Color legend */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur px-2.5 py-1.5 rounded-lg border">
              <span>Fewer issues</span>
              <div className="flex gap-0.5">
                {[0.05, 0.25, 0.5, 0.75, 1].map(t => (
                  <div key={t} style={{ width: 16, height: 14, borderRadius: 3, background: heatColor(t * maxCount, maxCount) }} />
                ))}
              </div>
              <span>More issues</span>
            </div>

            {selectedState && (
              <button
                onClick={() => setSelectedState(null)}
                className="absolute top-3 right-3 z-10 text-xs bg-background border rounded-md px-2 py-1 shadow hover:bg-muted transition-colors"
              >
                Clear selection ✕
              </button>
            )}
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Overall stats */}
            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold mb-3">Overall</p>
              <div className="space-y-2">
                {Object.entries(STATUS_COLORS).map(([s, color]) => {
                  const count = issues.filter(i => i.status === s).length
                  const pct = issues.length ? Math.round((count / issues.length) * 100) : 0
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span className="text-sm flex-1 text-muted-foreground">{STATUS_LABELS[s]}</span>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                      <span className="text-sm font-semibold w-6 text-right">{count}</span>
                    </div>
                  )
                })}
                <div className="border-t pt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">{issues.length}</span>
                </div>
              </div>
            </div>

            {/* Top states */}
            {topStates.length > 0 && (
              <div className="rounded-xl border p-4">
                <p className="text-sm font-semibold mb-3">Top States</p>
                <div className="space-y-3">
                  {topStates.map(([state, data]) => (
                    <div
                      key={state}
                      className={`cursor-pointer rounded-md transition-colors ${selectedState === state ? 'text-primary' : 'hover:text-primary'}`}
                      onClick={() => setSelectedState(selectedState === state ? null : state)}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground truncate">{state}</span>
                        <span className="font-semibold ml-2 shrink-0">{data.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(data.total / maxCount) * 100}%`,
                            background: selectedState === state ? '#6366f1' : '#3b82f6',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected state issue list */}
            {selectedState && (
              <div className="rounded-xl border p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-500" /> {selectedState}
                </p>
                {selectedIssues.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No issues with state tag.</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {selectedIssues.map(issue => (
                      <div key={issue._id} className="rounded-md border p-2 text-sm">
                        <p className="font-medium line-clamp-1 mb-1">{issue.title}</p>
                        <div className="flex items-center gap-1.5">
                          <span
                            style={{
                              background: `${STATUS_COLORS[issue.status]}20`,
                              color: STATUS_COLORS[issue.status],
                              padding: '1px 6px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {STATUS_LABELS[issue.status]}
                          </span>
                          <span className="text-xs text-muted-foreground">{issue.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {issues.length === 0 && (
              <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
                No issues yet. Submit an issue and select your state — it will appear on the map.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
