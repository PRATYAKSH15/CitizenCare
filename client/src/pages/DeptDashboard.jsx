import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useRole } from '@/contexts/RoleContext'
import api from '@/lib/api'
import socket from '@/lib/socket'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ToastContainer } from '@/components/ui/toast'
import { Loader2, Brain, MapPin, Clock, ShieldX, Search } from 'lucide-react'

const statusVariant = { pending: 'warning', 'in-progress': 'info', resolved: 'success' }
const priorityVariant = { high: 'destructive', medium: 'warning', low: 'secondary' }
const sentimentVariant = { positive: 'success', negative: 'destructive', neutral: 'secondary' }

const daysSince = (date) => (Date.now() - new Date(date)) / (1000 * 60 * 60 * 24)
const isOverdue = (issue) => issue.status === 'pending' && daysSince(issue.createdAt) > 7

function StatCard({ label, value, color, highlight }) {
  return (
    <Card className={highlight ? 'border-red-200 dark:border-red-900' : ''}>
      <CardContent className="pt-5 pb-4">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function IssueRow({ issue, onClick }) {
  const overdue = isOverdue(issue)
  return (
    <tr
      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={() => onClick(issue)}
    >
      <td className="py-3 px-4 max-w-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{issue.title}</p>
          {overdue && (
            <span className="shrink-0 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">
              Overdue
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {issue.submitterName || 'Anonymous'} {issue.state ? `· ${issue.state}` : ''}
        </p>
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

export default function DeptDashboard() {
  const { getToken } = useAuth()
  const { role, department, synced } = useRole()

  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [toasts, setToasts] = useState([])
  const [editForm, setEditForm] = useState({ status: '', adminNote: '' })
  const toastIdRef = useRef(0)

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const fetchIssues = useCallback(async () => {
    try {
      const token = await getToken()
      const params = {}
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/issues', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      })
      setIssues(data)
    } catch (err) {
      setFetchError(err.response?.data?.error || 'Failed to load issues')
    } finally {
      setLoading(false)
    }
  }, [getToken, statusFilter])

  useEffect(() => {
    if (synced && role === 'dept_admin') fetchIssues()
    else if (synced) setLoading(false)
  }, [synced, role, fetchIssues])

  useEffect(() => {
    if (role !== 'dept_admin') return
    socket.connect()
    socket.on('issue_updated', (updated) => {
      if (updated.department === department) {
        setIssues((prev) => prev.map((i) => i._id === updated._id ? updated : i))
        setSelected((prev) => prev?._id === updated._id ? updated : prev)
        addToast(`Issue updated: ${updated.title}`, 'success')
      }
    })
    return () => {
      socket.off('issue_updated')
      socket.disconnect()
    }
  }, [role, department, addToast])

  const openDetail = (issue) => {
    setSelected(issue)
    setEditForm({ status: issue.status, adminNote: issue.adminNote || '' })
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
      addToast('Issue updated', 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filteredIssues = issues.filter((i) =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.submitterName?.toLowerCase().includes(search.toLowerCase())
  )

  const pending = issues.filter(i => i.status === 'pending').length
  const inProgress = issues.filter(i => i.status === 'in-progress').length
  const resolved = issues.filter(i => i.status === 'resolved').length
  const overdueCount = issues.filter(isOverdue).length

  if (!synced || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (role !== 'dept_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ShieldX className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-sm">This dashboard is only accessible to department admins.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Department Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Managing issues for <span className="font-semibold text-foreground">{department}</span>
        </p>
      </div>

      {fetchError && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {fetchError}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={issues.length} color="text-foreground" />
        <StatCard label="Pending" value={pending} color="text-yellow-600 dark:text-yellow-400" />
        <StatCard label="In Progress" value={inProgress} color="text-blue-600 dark:text-blue-400" />
        <StatCard label="Resolved" value={resolved} color="text-green-600 dark:text-green-400" />
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input placeholder="Search issues…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setStatusFilter('')}>Clear</Button>
          </div>
        </CardContent>
      </Card>

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
                    {issues.length === 0 ? 'No issues assigned to your department yet' : 'No issues match your search'}
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

      <Dialog open={!!selected} onClose={() => setSelected(null)} className="max-w-2xl">
        {selected && (
          <>
            <DialogHeader>
              <DialogTitle>{selected.title}</DialogTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant={statusVariant[selected.status]} className="capitalize">{selected.status}</Badge>
                <Badge variant={sentimentVariant[selected.sentiment]} className="capitalize">{selected.sentiment}</Badge>
                <Badge variant="secondary">{selected.category}</Badge>
                {isOverdue(selected) && <Badge variant="destructive">Overdue</Badge>}
              </div>
            </DialogHeader>

            <DialogContent className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p><span className="font-medium">Submitted by:</span> {selected.submitterName || 'Anonymous'}</p>
                {selected.submitterEmail && <p className="text-muted-foreground">{selected.submitterEmail}</p>}
                {selected.state && <p className="text-muted-foreground">State: {selected.state}</p>}
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

              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{selected.description}</p>
              </div>

              {selected.aiSummary && (
                <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 mb-1.5">
                    <Brain className="h-3.5 w-3.5" /> AI Summary
                  </div>
                  <p className="text-sm italic">"{selected.aiSummary}"</p>
                </div>
              )}

              {selected.imageBase64 && (
                <img src={selected.imageBase64} alt="Issue" className="rounded-lg border max-h-48 object-cover w-full" />
              )}

              <Separator />

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Update Status</Label>
                  <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Note for Citizen</Label>
                  <textarea
                    value={editForm.adminNote}
                    onChange={(e) => setEditForm({ ...editForm, adminNote: e.target.value })}
                    placeholder="Update the citizen on the progress…"
                    className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
              </div>
            </DialogContent>

            <DialogFooter>
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
