import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'

const CREDIT_PACKS = {
    starter: { credits: 1, amount: 99, label: '1 Analysis' },
    basic: { credits: 5, amount: 399, label: '5 Analyses' },
    pro: { credits: 12, amount: 799, label: '12 Analyses' },
} as const

export async function POST(req: Request) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pack } = await req.json() as { pack: keyof typeof CREDIT_PACKS }
    const selected = CREDIT_PACKS[pack]
    if (!selected) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

    const user = await currentUser()

    let dbUser = await prisma.user.findUnique({ where: { id: userId } })

    let stripeCustomerId = dbUser?.stripeCustomerId

    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: user?.emailAddresses[0].emailAddress,
            metadata: { clerkUserId: userId },
        })
        stripeCustomerId = customer.id
        await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId },
        })
    }

    const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'inr',
                product_data: { name: selected.label },
                unit_amount: selected.amount * 100,
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
        metadata: {
            clerkUserId: userId,
            creditsToAdd: selected.credits.toString(),
            pack,
        },
    })

    return NextResponse.json({ url: session.url })
}