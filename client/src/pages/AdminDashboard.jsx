import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import api from '@/lib/api'
import socket from '@/lib/socket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ToastContainer } from '@/components/ui/toast'
import { Loader2, Brain, MapPin, Clock, ShieldX, Search, Filter } from 'lucide-react'

const statusVariant = { pending: 'warning', 'in-progress': 'info', resolved: 'success' }
const priorityVariant = { high: 'destructive', medium: 'warning', low: 'secondary' }
const sentimentVariant = { positive: 'success', negative: 'destructive', neutral: 'secondary' }

const DEPARTMENTS = [
  'Public Works', 'Sanitation', 'Traffic & Roads', 'Utilities',
  'Parks & Recreation', 'Police', 'Municipal Services', 'Other',
]

function StatCard({ label, value, color }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function IssueRow({ issue, onClick }) {
  return (
    <tr
      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={() => onClick(issue)}
    >
      <td className="py-3 px-4 max-w-xs">
        <p className="font-medium text-sm truncate">{issue.title}</p>
        <p className="text-xs text-muted-foreground truncate">{issue.submitterName || 'Anonymous'}</p>
      </td>
      <td className="py-3 px-4">
        <Badge variant="secondary" className="text-xs">{issue.category}</Badge>
      </td>
      <td className="py-3 px-4">
        <Badge variant={sentimentVariant[issue.sentiment]} className="text-xs capitalize">{issue.sentiment}</Badge>
      </td>
      <td className="py-3 px-4">
        <Badge variant={priorityVariant[issue.priority]} className="text-xs capitalize">{issue.priority}</Badge>
      </td>
      <td className="py-3 px-4">
        <Badge variant={statusVariant[issue.status]} className="text-xs capitalize">{issue.status}</Badge>
      </td>
      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
        {new Date(issue.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </td>
    </tr>
  )
}

export default function AdminDashboard() {
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  const isAdmin = adminEmails.includes(user?.primaryEmailAddress?.emailAddress?.toLowerCase())

  const [stats, setStats] = useState(null)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)

  const [filters, setFilters] = useState({ status: '', priority: '', category: '', sentiment: '' })
  const [editForm, setEditForm] = useState({ status: '', priority: '', department: '', adminNote: '' })

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.category) params.category = filters.category
      if (filters.sentiment) params.sentiment = filters.sentiment

      const [statsRes, issuesRes] = await Promise.all([
        api.get('/issues/stats', { headers }),
        api.get('/issues', { headers, params }),
      ])
      setStats(statsRes.data)
      setIssues(issuesRes.data)
    } catch (err) {
      console.error(err)
      setFetchError(err.response?.data?.error || err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [getToken, filters])

  useEffect(() => {
    if (isAdmin) fetchData()
    else if (isLoaded) setLoading(false)
  }, [isAdmin, isLoaded, fetchData])

  useEffect(() => {
    if (!isAdmin) return

    socket.connect()

    socket.on('new_issue', (issue) => {
      setIssues((prev) => [issue, ...prev])
      setStats((prev) => prev ? { ...prev, total: prev.total + 1, pending: prev.pending + 1 } : prev)
      addToast(`New issue: ${issue.title}`, 'info')
    })

    socket.on('issue_updated', (updated) => {
      setIssues((prev) => prev.map((i) => i._id === updated._id ? updated : i))
      setSelected((prev) => prev?._id === updated._id ? updated : prev)
      addToast(`Issue updated: ${updated.title}`, 'success')
    })

    return () => {
      socket.off('new_issue')
      socket.off('issue_updated')
      socket.disconnect()
    }
  }, [isAdmin, addToast])

  const openDetail = (issue) => {
    setSelected(issue)
    setEditForm({
      status: issue.status,
      priority: issue.priority,
      department: issue.department || '',
      adminNote: issue.adminNote || '',
    })
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      const token = await getToken()
      const { data } = await api.patch(`/issues/${selected._id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setIssues((prev) => prev.map((i) => (i._id === data._id ? data : i)))
      setSelected(null)
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this issue permanently?')) return
    try {
      const token = await getToken()
      await api.delete(`/issues/${selected._id}`, { headers: { Authorization: `Bearer ${token}` } })
      setIssues((prev) => prev.filter((i) => i._id !== selected._id))
      setSelected(null)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const filteredIssues = issues.filter((i) =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.submitterName?.toLowerCase().includes(search.toLowerCase())
  )

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ShieldX className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-sm">This dashboard is only accessible to administrators.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage and respond to citizen issues</p>
      </div>

      {fetchError && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          API Error: {fetchError}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Issues" value={stats.total} color="text-foreground" />
          <StatCard label="Pending" value={stats.pending} color="text-yellow-600 dark:text-yellow-400" />
          <StatCard label="In Progress" value={stats.inProgress} color="text-blue-600 dark:text-blue-400" />
          <StatCard label="Resolved" value={stats.resolved} color="text-green-600 dark:text-green-400" />
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </Select>
            <Select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select value={filters.sentiment} onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}>
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ status: '', priority: '', category: '', sentiment: '' })}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Issues table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Issue</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Sentiment</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Priority</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No issues found
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <IssueRow key={issue._id} issue={issue} onClick={openDetail} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} className="max-w-2xl">
        {selected && (
          <>
            <DialogHeader>
              <DialogTitle>{selected.title}</DialogTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant={statusVariant[selected.status]} className="capitalize">{selected.status}</Badge>
                <Badge variant={sentimentVariant[selected.sentiment]} className="capitalize">{selected.sentiment}</Badge>
                <Badge variant="secondary">{selected.category}</Badge>
              </div>
            </DialogHeader>

            <DialogContent className="space-y-4">
              {/* Submitter */}
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p><span className="font-medium">Submitted by:</span> {selected.submitterName || 'Anonymous'}</p>
                {selected.submitterEmail && (
                  <p className="text-muted-foreground">{selected.submitterEmail}</p>
                )}
                {selected.location && (
                  <p className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5" /> {selected.location}
                  </p>
                )}
                <p className="flex items-center gap-1 mt-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(selected.createdAt).toLocaleString('en-IN')}
                </p>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{selected.description}</p>
              </div>

              {/* AI Summary */}
              {selected.aiSummary && (
                <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 mb-1.5">
                    <Brain className="h-3.5 w-3.5" /> AI Summary
                  </div>
                  <p className="text-sm italic">"{selected.aiSummary}"</p>
                </div>
              )}

              {/* Image */}
              {selected.imageBase64 && (
                <img
                  src={selected.imageBase64}
                  alt="Issue"
                  className="rounded-lg border max-h-48 object-cover w-full"
                />
              )}

              <Separator />

              {/* Admin controls */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Assign Department</Label>
                  <Select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Admin Note</Label>
                  <textarea
                    value={editForm.adminNote}
                    onChange={(e) => setEditForm({ ...editForm, adminNote: e.target.value })}
                    placeholder="Add a note for the citizen…"
                    className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
              </div>
            </DialogContent>

            <DialogFooter>
              <Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Cancel</Button>
              <Button size="sm" onClick={handleUpdate} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  )
}
