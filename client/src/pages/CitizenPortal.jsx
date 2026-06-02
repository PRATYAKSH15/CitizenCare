import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select } from '@/components/ui/select'
import { Upload, X, CheckCircle2, Loader2, Brain, MapPin, AlertTriangle, ThumbsUp } from 'lucide-react'
import { Link } from 'react-router-dom'

const sentimentColors = { positive: 'success', negative: 'destructive', neutral: 'secondary' }
const priorityColors = { high: 'destructive', medium: 'warning', low: 'info' }

const INDIAN_STATES = [
  'Andaman & Nicobar', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
]

export default function CitizenPortal() {
  const { getToken } = useAuth()
  const fileRef = useRef(null)
  const searchTimer = useRef(null)

  const [form, setForm] = useState({ title: '', description: '', location: '', state: '' })
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(null)
  const [similarIssues, setSimilarIssues] = useState([])

  const searchSimilar = useCallback((query) => {
    clearTimeout(searchTimer.current)
    if (query.trim().length < 4) { setSimilarIssues([]); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/issues/search?q=${encodeURIComponent(query.trim())}`)
        setSimilarIssues(data)
      } catch { setSimilarIssues([]) }
    }, 600)
  }, [])

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value }
    setForm(updated)
    if (e.target.name === 'title') searchSimilar(e.target.value)
  }

const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
      setImageBase64(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required')
      return
    }
    setLoading(true)
    try {
      const token = await getToken()
      const { data } = await api.post('/issues', { ...form, imageBase64, state: form.state || undefined }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSubmitted(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card className="border-green-200 dark:border-green-900">
          <CardContent className="pt-8 pb-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold mb-1">Issue Submitted!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your issue has been received and analysed by our AI system.
            </p>

            <div className="rounded-lg border bg-muted/30 p-4 text-left mb-6">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                <Brain className="h-4 w-4 text-purple-500" />
                AI Analysis
              </div>
              <p className="text-sm text-muted-foreground mb-3 italic">"{submitted.aiSummary}"</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{submitted.category}</Badge>
                <Badge variant={sentimentColors[submitted.sentiment] || 'secondary'}>
                  {submitted.sentiment} sentiment
                </Badge>
                <Badge variant={priorityColors[submitted.priority] || 'secondary'}>
                  {submitted.priority} priority
                </Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => { setSubmitted(null); setForm({ title: '', description: '', location: '', state: '' }); setImagePreview(null); setImageBase64(null); setSimilarIssues([]) }}>
                Submit Another
              </Button>
              <Button variant="outline" asChild>
                <Link to="/my-issues">View My Issues</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Report an Issue</h1>
        <p className="text-muted-foreground text-sm">
          Describe the civic problem in your area. Our AI will analyse and categorise it automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issue Details</CardTitle>
          <CardDescription>All fields except image are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Large pothole on Main Street near the school"
                value={form.title}
                onChange={handleChange}
                required
              />
              {similarIssues.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50/60 dark:border-yellow-900 dark:bg-yellow-950/30 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Similar issues already reported — consider upvoting instead
                  </div>
                  <div className="space-y-1.5">
                    {similarIssues.map(issue => (
                      <div key={issue._id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-foreground/80">{issue.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {issue.votes > 0 && (
                            <span className="flex items-center gap-0.5 text-muted-foreground">
                              <ThumbsUp className="h-2.5 w-2.5" />{issue.votes}
                            </span>
                          )}
                          <Badge variant={issue.status === 'resolved' ? 'success' : issue.status === 'in-progress' ? 'info' : 'warning'} className="capitalize text-[10px] py-0">
                            {issue.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to="/feed" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                    View in Community →
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the issue in detail — location, severity, how long it has been there…"
                value={form.description}
                onChange={handleChange}
                className="min-h-[120px]"
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="location">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Location
                  </span>
                </Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g., 12 Baker Street, near the park"
                  value={form.location}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State / UT</Label>
                <Select
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                >
                  <option value="">Select state…</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Photo (optional, max 5 MB)</Label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="preview" className="rounded-lg max-h-48 object-cover border" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageBase64(null); fileRef.current.value = '' }}
                    className="absolute -top-2 -right-2 rounded-full bg-destructive text-white p-0.5 shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <Upload className="h-6 w-6" />
                  Click to upload a photo
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting & Analysing…
                </>
              ) : (
                'Submit Issue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
