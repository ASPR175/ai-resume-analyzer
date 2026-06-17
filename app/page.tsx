import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { SignUpButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Sparkles, TrendingUp, ArrowRight } from 'lucide-react'

export default async function HomePage() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen bg-background">

      {/* hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Get your resume reviewed by AI in seconds
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload your resume and get an instant score, section-by-section feedback,
          and actionable suggestions to land more interviews.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          {userId ? (
            <Link href="/dashboard">
              <Button size="lg">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          ) : (
            <SignUpButton>
              <Button size="lg">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </SignUpButton>
          )}
          <Link href="/pricing">
            <Button size="lg" variant="outline">View Pricing</Button>
          </Link>
        </div>
      </section>

      {/* how it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">1. Upload your resume</h3>
              <p className="text-sm text-muted-foreground">
                Drop your PDF resume — takes a few seconds.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">2. AI analyzes it</h3>
              <p className="text-sm text-muted-foreground">
                Our AI reviews structure, content, and impact like a hiring expert.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">3. Get actionable feedback</h3>
              <p className="text-sm text-muted-foreground">
                Score, section breakdown, and top improvements to make.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-12 space-y-4">
            <h2 className="text-2xl font-bold">Ready to improve your resume?</h2>
            <p className="text-muted-foreground">Starting at ₹99 per analysis. No subscription.</p>
            {userId ? (
              <Link href="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
            ) : (
              <SignUpButton>
                <Button size="lg">Get Started Free</Button>
              </SignUpButton>
            )}
          </CardContent>
        </Card>
      </section>

      {/* footer */}
      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        © 2026 ResumeAI. All rights reserved.
      </footer>
    </div>
  )
}
