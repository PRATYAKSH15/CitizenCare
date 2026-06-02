import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Loader2, FileText, Brain, MapPin, Clock, Trash2, ThumbsUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusTimeline } from '@/components/StatusTimeline'

const statusVariant = { pending: 'warning', 'in-progress': 'info', resolved: 'success' }
const priorityVariant = { high: 'destructive', medium: 'warning', low: 'secondary' }
const sentimentVariant = { positive: 'success', negative: 'destructive', neutral: 'secondary' }

function IssueCard({ issue, onClick }) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(issue)}
    >
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-medium text-sm leading-snug line-clamp-2">{issue.title}</h3>
          <Badge variant={statusVariant[issue.status]} className="shrink-0 capitalize">
            {issue.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{issue.aiSummary || issue.description}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">{issue.category}</Badge>
          <Badge variant={priorityVariant[issue.priority]} className="text-xs capitalize">{issue.priority}</Badge>
          <Badge variant={sentimentVariant[issue.sentiment]} className="text-xs capitalize">{issue.sentiment}</Badge>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(issue.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          {issue.votes > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ThumbsUp className="h-3 w-3" /> {issue.votes}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`text-2xl transition-colors leading-none ${
            star <= (hover || value) ? 'text-yellow-400' : 'text-muted-foreground/30'
          } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function MyIssues() {
  const { getToken } = useAuth()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [ratingScore, setRatingScore] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  const handleRate = async () => {
    if (!ratingScore) return
    setSubmittingRating(true)
    try {
      const token = await getToken()
      const { data } = await api.post(`/issues/${selected._id}/rate`, { score: ratingScore, comment: ratingComment }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setIssues(prev => prev.map(i => i._id === data._id ? data : i))
      setSelected(data)
      setRatingScore(0)
      setRatingComment('')
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingRating(false)
    }
  }

  const handleDelete = async (issue) => {
    if (!confirm('Delete this issue permanently?')) return
    setDeleting(true)
    try {
      const token = await getToken()
      await api.delete(`/issues/${issue._id}`, { headers: { Authorization: `Bearer ${token}` } })
      setIssues((prev) => prev.filter((i) => i._id !== issue._id))
      setSelected(null)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken()
        const { data } = await api.get('/issues/my', { headers: { Authorization: `Bearer ${token}` } })
        setIssues(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getToken])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">My Issues</h1>
          <p className="text-sm text-muted-foreground">{issues.length} issue{issues.length !== 1 ? 's' : ''} submitted</p>
        </div>
        <Button asChild size="sm">
          <Link to="/submit">+ Report New</Link>
        </Button>
      </div>

      {issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium mb-1">No issues yet</p>
          <p className="text-sm text-muted-foreground mb-4">Your submitted issues will appear here.</p>
          <Button asChild size="sm">
            <Link to="/submit">Report an Issue</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {issues.map((issue) => (
            <IssueCard key={issue._id} issue={issue} onClick={setSelected} />
          ))}
        </div>
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)} className="max-w-lg">
        {selected && (
          <>
            <DialogHeader>
              <DialogTitle>{selected.title}</DialogTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant={statusVariant[selected.status]} className="capitalize">{selected.status}</Badge>
                <Badge variant={priorityVariant[selected.priority]} className="capitalize">{selected.priority} priority</Badge>
              </div>
            </DialogHeader>
            <DialogContent className="pb-2">
              <div className="space-y-4">
                {selected.location && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span>{selected.location}</span>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Description</p>
                  <p className="text-sm">{selected.description}</p>
                </div>
                {selected.aiSummary && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 mb-1">
                      <Brain className="h-3.5 w-3.5" /> AI Summary
                    </div>
                    <p className="text-sm italic text-muted-foreground">"{selected.aiSummary}"</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{selected.category}</Badge>
                  <Badge variant={sentimentVariant[selected.sentiment]} className="capitalize">{selected.sentiment} sentiment</Badge>
                </div>
                {selected.department && (
                  <p className="text-sm"><span className="font-medium">Assigned to:</span> {selected.department}</p>
                )}
                {selected.adminNote && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Admin Note</p>
                    <p className="text-sm border rounded-md p-2 bg-muted/20">{selected.adminNote}</p>
                  </div>
                )}

                {/* Status Timeline */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Status Timeline</p>
                  <StatusTimeline issue={selected} />
                </div>

                {/* Satisfaction Rating */}
                {selected.status === 'resolved' && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Your Rating</p>
                    {selected.rating?.score ? (
                      <div>
                        <StarRating value={selected.rating.score} readonly />
                        {selected.rating.comment && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{selected.rating.comment}"</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">How satisfied are you with the resolution?</p>
                        <StarRating value={ratingScore} onChange={setRatingScore} />
                        <textarea
                          value={ratingComment}
                          onChange={e => setRatingComment(e.target.value)}
                          placeholder="Optional feedback…"
                          className="w-full text-xs rounded-md border border-input bg-transparent px-2.5 py-1.5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none min-h-[56px]"
                        />
                        <Button size="sm" onClick={handleRate} disabled={!ratingScore || submittingRating} className="w-full">
                          {submittingRating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          Submit Rating
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {selected.imageBase64 && (
                  <img src={selected.imageBase64} alt="Issue" className="rounded-lg border max-h-48 object-cover w-full" />
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Submitted {new Date(selected.createdAt).toLocaleString('en-IN')}</span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" /> {selected.votes || 0} upvote{selected.votes !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </DialogContent>
            <DialogFooter>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(selected)}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Delete Issue
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  )
}
