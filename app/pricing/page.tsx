'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2 } from 'lucide-react'

const PACKS = [
    {
        id: 'starter',
        name: 'Starter',
        credits: 1,
        price: 99,
        popular: false,
        features: ['1 Resume Analysis', 'Detailed AI Feedback', 'Section-by-section breakdown'],
    },
    {
        id: 'basic',
        name: 'Basic',
        credits: 5,
        price: 399,
        popular: true,
        features: ['5 Resume Analyses', 'Detailed AI Feedback', 'Section-by-section breakdown', 'Priority support'],
    },
    {
        id: 'pro',
        name: 'Pro',
        credits: 12,
        price: 799,
        popular: false,
        features: ['12 Resume Analyses', 'Detailed AI Feedback', 'Section-by-section breakdown', 'Priority support', 'Best value per credit'],
    },
] as const

export default function PricingPage() {
    const [loading, setLoading] = useState<string | null>(null)

    async function handleBuy(packId: string) {
        setLoading(packId)
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pack: packId }),
            })

            const data = await res.json()

            if (data.url) {
                window.location.href = data.url
            } else {
                setLoading(null)
            }
        } catch {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-background py-16">
            <div className="max-w-5xl mx-auto px-6">
                <div className="text-center mb-12 space-y-2">
                    <h1 className="text-3xl font-bold">Buy Credits</h1>
                    <p className="text-muted-foreground">
                        Each credit = one resume analysis. No subscriptions, pay only for what you use.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {PACKS.map((pack) => (
                        <Card key={pack.id} className={pack.popular ? 'border-primary shadow-lg relative' : 'relative'}>
                            {pack.popular && (
                                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 ">
                                    Most Popular
                                </Badge>
                            )}
                            <CardHeader>
                                <CardTitle>{pack.name}</CardTitle>
                                <CardDescription>{pack.credits} {pack.credits === 1 ? 'Credit' : 'Credits'}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <span className="text-4xl font-bold">₹{pack.price}</span>
                                    <span className="text-muted-foreground text-sm">
                                        {' '}(₹{Math.round(pack.price / pack.credits)}/credit)
                                    </span>
                                </div>

                                <ul className="space-y-2">
                                    {pack.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm">
                                            <Check className="w-4 h-4 text-green-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    className="w-full"
                                    variant={pack.popular ? 'default' : 'outline'}
                                    onClick={() => handleBuy(pack.id)}
                                    disabled={loading !== null}
                                >
                                    {loading === pack.id
                                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting...</>
                                        : 'Buy Now'
                                    }
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}