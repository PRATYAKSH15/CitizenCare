import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Loader2, FileText, Brain, MapPin, Clock, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

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
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {new Date(issue.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MyIssues() {
  const { getToken } = useAuth()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)

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
                {selected.imageBase64 && (
                  <img src={selected.imageBase64} alt="Issue" className="rounded-lg border max-h-48 object-cover w-full" />
                )}
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(selected.createdAt).toLocaleString('en-IN')}
                </p>
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
