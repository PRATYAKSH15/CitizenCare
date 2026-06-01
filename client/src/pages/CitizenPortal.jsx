import { useState, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Upload, X, CheckCircle2, Loader2, Brain, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

const sentimentColors = { positive: 'success', negative: 'destructive', neutral: 'secondary' }
const priorityColors = { high: 'destructive', medium: 'warning', low: 'info' }

export default function CitizenPortal() {
  const { getToken } = useAuth()
  const fileRef = useRef(null)

  const [form, setForm] = useState({ title: '', description: '', location: '' })
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(null)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

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
      const { data } = await api.post('/issues', { ...form, imageBase64 }, {
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
              <Button onClick={() => { setSubmitted(null); setForm({ title: '', description: '', location: '' }); setImagePreview(null); setImageBase64(null) }}>
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
