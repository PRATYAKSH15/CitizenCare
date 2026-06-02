import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '@/components/ui/dialog'
import { StatusTimeline } from '@/components/StatusTimeline'
import { Loader2, ThumbsUp, Search, Globe2, Brain, Clock } from 'lucide-react'

const statusVariant = { pending: 'warning', 'in-progress': 'info', resolved: 'success' }
const priorityVariant = { high: 'destructive', medium: 'warning', low: 'secondary' }

export default function Feed() {
  const { getToken, isSignedIn } = useAuth()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('votes')
  const [filterStatus, setFilterStatus] = useState('')
  const [voting, setVoting] = useState(null)
  const [votedIds, setVotedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cc_voted') || '[]')) }
    catch { return new Set() }
  })

  useEffect(() => {
    api.get('/issues/feed')
      .then(r => setIssues(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleVote = async (issueId, e) => {
    e?.stopPropagation()
    if (!isSignedIn || voting) return
    setVoting(issueId)
    try {
      const token = await getToken()
      const { data } = await api.post(`/issues/${issueId}/vote`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setIssues(prev => prev.map(i => i._id === issueId ? { ...i, votes: data.votes } : i))
      setSelected(prev => prev?._id === issueId ? { ...prev, votes: data.votes } : prev)
      setVotedIds(prev => {
        const next = new Set(prev)
        data.voted ? next.add(issueId) : next.delete(issueId)
        localStorage.setItem('cc_voted', JSON.stringify([...next]))
        return next
      })
    } catch (err) {
      console.error(err)
    } finally {
      setVoting(null)
    }
  }

  const filtered = issues
    .filter(i => {
      if (filterStatus && i.status !== filterStatus) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          i.title.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.state?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) =>
      sortBy === 'votes'
        ? (b.votes || 0) - (a.votes || 0)
        : new Date(b.createdAt) - new Date(a.createdAt)
    )

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Globe2 className="h-6 w-6 text-primary" /> Community Feed
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse all civic issues from across India.{' '}
          {isSignedIn ? 'Upvote the ones that affect you.' : 'Sign in to upvote issues.'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search issues, states, categories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </Select>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="votes">Most Voted</option>
          <option value="newest">Newest</option>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground mb-4">{filtered.length} issue{filtered.length !== 1 ? 's' : ''}</p>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Globe2 className="h-10 w-10 mx-auto mb-3 opacity-25" />
          <p className="font-medium">No issues found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(issue => {
            const voted = votedIds.has(issue._id)
            return (
              <Card
                key={issue._id}
                className="cursor-pointer hover:shadow-md transition-shadow flex flex-col"
                onClick={() => setSelected(issue)}
              >
                <CardContent className="pt-5 pb-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{issue.title}</h3>
                    <Badge variant={statusVariant[issue.status]} className="shrink-0 capitalize text-xs">
                      {issue.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {issue.aiSummary || issue.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="secondary" className="text-xs">{issue.category}</Badge>
                    <Badge variant={priorityVariant[issue.priority]} className="text-xs capitalize">{issue.priority}</Badge>
                    {issue.state && <Badge variant="outline" className="text-xs">{issue.state}</Badge>}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(issue.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <button
                      onClick={e => handleVote(issue._id, e)}
                      disabled={!isSignedIn || voting === issue._id}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                        voted
                          ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                          : 'text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                      } disabled:opacity-50 disabled:cursor-default`}
                    >
                      {voting === issue._id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <ThumbsUp className="h-3 w-3" />}
                      {issue.votes || 0}
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} className="max-w-lg">
        {selected && (
          <>
            <DialogHeader>
              <DialogTitle>{selected.title}</DialogTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant={statusVariant[selected.status]} className="capitalize">{selected.status}</Badge>
                <Badge variant="secondary">{selected.category}</Badge>
                <Badge variant={priorityVariant[selected.priority]} className="capitalize">{selected.priority}</Badge>
              </div>
            </DialogHeader>

            <DialogContent className="space-y-4">
              {/* Meta */}
              <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
                {selected.submitterName && (
                  <p><span className="font-medium">Reported by:</span> {selected.submitterName}</p>
                )}
                {(selected.state || selected.location) && (
                  <p className="text-muted-foreground">
                    {[selected.state, selected.location].filter(Boolean).join(' · ')}
                  </p>
                )}
                {selected.department && (
                  <p className="text-muted-foreground">Assigned to: {selected.department}</p>
                )}
                <p className="text-muted-foreground flex items-center gap-1">
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
                  <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
                    <Brain className="h-3.5 w-3.5" /> AI Summary
                  </div>
                  <p className="text-sm italic">"{selected.aiSummary}"</p>
                </div>
              )}

              {/* Admin note */}
              {selected.adminNote && (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Note from Admin</p>
                  <p className="text-sm">{selected.adminNote}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground mb-3">Status Timeline</p>
                <StatusTimeline issue={selected} />
              </div>

              {/* Vote */}
              <button
                onClick={e => handleVote(selected._id, e)}
                disabled={!isSignedIn || voting === selected._id}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  votedIds.has(selected._id)
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'text-muted-foreground border-border hover:bg-muted'
                } disabled:opacity-50`}
              >
                {voting === selected._id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ThumbsUp className="h-4 w-4" />}
                {votedIds.has(selected._id) ? 'Voted · ' : ''}
                {selected.votes || 0} upvote{selected.votes !== 1 ? 's' : ''}
                {!isSignedIn && <span className="text-xs opacity-60">(sign in to vote)</span>}
              </button>
            </DialogContent>
          </>
        )}
      </Dialog>
    </div>
  )
}
