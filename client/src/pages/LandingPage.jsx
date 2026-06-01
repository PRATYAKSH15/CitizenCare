import { Link } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlusCircle, BarChart3, Brain, ShieldCheck, ArrowRight, MapPin } from 'lucide-react'

const features = [
  {
    icon: PlusCircle,
    title: 'Easy Reporting',
    description: 'Submit civic issues in seconds with text descriptions and photo uploads. No technical skills required.',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Gemini AI automatically categorizes issues, detects sentiment, and generates concise summaries for authorities.',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  {
    icon: BarChart3,
    title: 'Real-time Dashboard',
    description: 'Authorities get a live view of all issues with smart filters by priority, category, and sentiment.',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Private',
    description: 'Built on Clerk authentication with role-based access — citizens and admins each see only what they need.',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
  },
]

const categories = ['Pothole', 'Waste Management', 'Street Light', 'Water Supply', 'Public Safety', 'Road Damage']

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-muted/30 py-24 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground mb-6 shadow-sm">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Civic engagement, reimagined
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Empowering Citizens,<br />
            <span className="text-primary">Improving Communities</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            CitizenCare bridges the gap between citizens and local authorities. Report issues,
            track progress, and let AI turn your feedback into actionable insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <SignedOut>
              <Button size="lg" asChild className="gap-2">
                <Link to="/sign-up">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/sign-in">Admin Login</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button size="lg" asChild className="gap-2">
                <Link to="/submit">
                  Report an Issue <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/my-issues">My Issues</Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* Category chips */}
      <section className="border-y bg-muted/20 py-4 overflow-hidden">
        <div className="flex gap-2 justify-center flex-wrap px-4">
          {categories.map((cat) => (
            <span key={cat} className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              {cat}
            </span>
          ))}
          <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            + more
          </span>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything you need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete platform for citizens to report problems and for authorities to respond faster.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, description, color, bg }) => (
              <Card key={title} className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className={`inline-flex rounded-lg p-2.5 mb-4 ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground py-16 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to make a difference?</h2>
          <p className="mb-8 opacity-80">
            Join thousands of citizens already using CitizenCare to improve their communities.
          </p>
          <SignedOut>
            <Button size="lg" variant="secondary" asChild className="gap-2">
              <Link to="/sign-up">
                Start Reporting <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <Button size="lg" variant="secondary" asChild className="gap-2">
              <Link to="/submit">
                Report an Issue <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </SignedIn>
        </div>
      </section>
    </main>
  )
}
