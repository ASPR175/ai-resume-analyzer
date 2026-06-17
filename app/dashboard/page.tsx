'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { UploadDropzone } from '@/utils/uploadthing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Coins, FileText, Loader2, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'

interface AnalysisSection {
    title: string
    status: 'good' | 'warning' | 'critical'
    feedback: string
}

interface AnalysisResult {
    score: number
    summary: string
    sections: AnalysisSection[]
    topImprovements: string[]
}

interface PastAnalysis {
    id: string
    fileName: string
    createdAt: string
    status: string
    result: AnalysisResult | null
}

export default function DashboardPage() {
    const { user } = useUser()
    const [openItems, setOpenItems] = useState<Set<string>>(new Set())
    const [credits, setCredits] = useState<number | null>(null)
    const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [result, setResult] = useState<AnalysisResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [history, setHistory] = useState<PastAnalysis[]>([])
    const [loadingHistory, setLoadingHistory] = useState(true)


    useEffect(() => {
        fetchUserData()
    }, [])

    async function fetchUserData() {
        try {
            const res = await fetch('/api/user')
            const data = await res.json()
            setCredits(data.credits)
            setHistory(data.analyses)
        } finally {
            setLoadingHistory(false)
        }
    }

    async function handleAnalyze() {
        if (!uploadedFile) return
        setAnalyzing(true)
        setError(null)
        setResult(null)

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileUrl: uploadedFile.url,
                    fileName: uploadedFile.name,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error ?? 'Analysis failed')
                return
            }

            setResult(data.result)
            fetchUserData()
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setAnalyzing(false)
        }
    }

    function toggleItem(id: string) {
        setOpenItems(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }
    function getStatusIcon(status: string) {
        if (status === 'good') return <CheckCircle className="w-4 h-4 text-green-500" />
        if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-500" />
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }

    function getStatusBadge(status: string) {
        if (status === 'good') return <Badge className="bg-green-100 text-green-700">Good</Badge>
        if (status === 'warning') return <Badge className="bg-yellow-100 text-yellow-700">Needs Work</Badge>
        return <Badge className="bg-red-100 text-red-700">Critical</Badge>
    }

    function getScoreColor(score: number) {
        if (score >= 75) return 'text-green-500'
        if (score >= 50) return 'text-yellow-500'
        return 'text-red-500'
    }

    return (
        <div className="min-h-screen bg-background">


            <div className="border-b px-6 py-4 flex items-center justify-between bg-background/80 backdrop-blur sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <h1 className="text-lg font-semibold tracking-tight">Resume Analyzer</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm font-mono-score px-2.5 py-1 rounded-full bg-muted">
                        <Coins className="w-3.5 h-3.5 text-yellow-500" />
                        <span>{credits ?? '···'}</span>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = '/pricing'}
                    >
                        Buy Credits
                    </Button>
                    <span className="text-sm text-muted-foreground hidden sm:inline">{user?.firstName}</span>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">


                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Upload Your Resume</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <UploadDropzone
                            endpoint="resumeUploader"
                            onClientUploadComplete={(res) => {
                                const file = res[0]
                                setUploadedFile({ url: file.ufsUrl, name: file.name })
                                setResult(null)
                                setError(null)
                            }}
                            onUploadError={(err) => setError(err.message)}
                        />

                        {uploadedFile && (
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                    <FileText className="w-4 h-4" />
                                    <span>{uploadedFile.name}</span>
                                </div>
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={analyzing || credits === 0}
                                >
                                    {analyzing
                                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                                        : 'Analyze Resume'
                                    }
                                </Button>
                            </div>
                        )}

                        {credits === 0 && (
                            <p className="text-sm text-red-500">
                                You have no credits. Buy a pack to analyze your resume.
                            </p>
                        )}

                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}
                    </CardContent>
                </Card>


                {result && (
                    <div className="space-y-6">

                        {/* score — report header */}
                        <Card className="overflow-hidden border-2">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-6">
                                    {/* gauge */}
                                    <div className="relative w-24 h-24 shrink-0">
                                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                                            <circle
                                                cx="50" cy="50" r="42" fill="none"
                                                stroke={result.score >= 75 ? 'var(--score-good)' : result.score >= 50 ? 'var(--score-warning)' : 'var(--score-critical)'}
                                                strokeWidth="8"
                                                strokeDasharray={`${(result.score / 100) * 263.9} 263.9`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className={`font-mono-score text-2xl font-bold ${getScoreColor(result.score)}`}>
                                                {result.score}
                                            </span>
                                        </div>
                                    </div>

                                    {/* summary */}
                                    <div className="flex-1 space-y-1.5">
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                            Analysis Report
                                        </p>
                                        <p className="text-sm leading-relaxed">{result.summary}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>


                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                    Section Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {result.sections.map((section, i) => (
                                    <div key={i} className="flex gap-3 p-3 rounded-lg border bg-muted/30">
                                        <div className="mt-0.5">{getStatusIcon(section.status)}</div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{section.title}</span>
                                                {getStatusBadge(section.status)}
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{section.feedback}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                    Top Improvements
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ol className="space-y-3">
                                    {result.topImprovements.map((item, i) => (
                                        <li key={i} className="flex gap-3 text-sm">
                                            <span className="font-mono-score font-bold text-primary shrink-0">
                                                {String(i + 1).padStart(2, '0')}
                                            </span>
                                            <span className="leading-relaxed">{item}</span>
                                        </li>
                                    ))}
                                </ol>
                            </CardContent>
                        </Card>
                    </div>
                )}


                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Past Analyses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingHistory ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : history.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No analyses yet. Upload your resume to get started.
                            </p>
                        ) : (

                            <div className="space-y-2">
                                {history.map((item) => (
                                    <Collapsible
                                        key={item.id}
                                        open={openItems.has(item.id)}
                                        onOpenChange={() => toggleItem(item.id)}
                                    >
                                        <div className="rounded-lg border">
                                            <CollapsibleTrigger className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    <span>{item.fileName}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {item.result && (
                                                        <span className={`font-medium ${getScoreColor(item.result.score)}`}>
                                                            {item.result.score}/100
                                                        </span>
                                                    )}
                                                    <span className="text-muted-foreground">
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${openItems.has(item.id) ? 'rotate-180' : ''}`} />
                                                </div>
                                            </CollapsibleTrigger>

                                            {item.result && (
                                                <CollapsibleContent className="px-3 pb-3 space-y-3 border-t pt-3">
                                                    <p className="text-sm text-muted-foreground">{item.result.summary}</p>

                                                    <div className="space-y-2">
                                                        {item.result.sections.map((section, i) => (
                                                            <div key={i} className="flex gap-3 p-2 rounded-lg border text-sm">
                                                                <div className="mt-0.5">{getStatusIcon(section.status)}</div>
                                                                <div className="flex-1 space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-medium">{section.title}</span>
                                                                        {getStatusBadge(section.status)}
                                                                    </div>
                                                                    <p className="text-muted-foreground">{section.feedback}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-medium mb-2">Top Improvements</p>
                                                        <ol className="space-y-1">
                                                            {item.result.topImprovements.map((imp, i) => (
                                                                <li key={i} className="flex gap-2 text-sm">
                                                                    <span className="font-bold text-primary">{i + 1}.</span>
                                                                    <span>{imp}</span>
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                </CollapsibleContent>
                                            )}
                                        </div>
                                    </Collapsible>
                                ))}
                            </div>

                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}