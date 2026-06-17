// import { NextResponse } from 'next/server'
// import { stripe } from '@/lib/stripe'
// import prisma from '@/lib/prisma'

// export async function POST(req: Request) {
//     const body = await req.text()
//     const signature = req.headers.get('stripe-signature')!

//     let event

//     try {
//         event = stripe.webhooks.constructEvent(
//             body,
//             signature,
//             process.env.STRIPE_WEBHOOK_SECRET!
//         )
//     } catch {
//         return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
//     }

//     if (event.type === 'checkout.session.completed') {
//         const session = event.data.object

//         const clerkUserId = session.metadata?.clerkUserId
//         const creditsToAdd = parseInt(session.metadata?.creditsToAdd ?? '0')

//         if (!clerkUserId || !creditsToAdd) {
//             return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
//         }

//         // idempotency — skip if this session was already processed
//         const existing = await prisma.creditPurchase.findUnique({
//             where: { stripeSessionId: session.id }
//         })
//         if (existing) return NextResponse.json({ received: true })

//         // atomic: create purchase record + increment credits in one transaction
//         await prisma.$transaction([
//             prisma.creditPurchase.create({
//                 data: {
//                     userId: clerkUserId,
//                     stripeSessionId: session.id,
//                     creditsAdded: creditsToAdd,
//                     amountPaid: session.amount_total ?? 0,
//                 }
//             }),
//             prisma.user.update({
//                 where: { id: clerkUserId },
//                 data: { credits: { increment: creditsToAdd } }
//             })
//         ])
//     }

//     return NextResponse.json({ received: true })
// }

// // Stripe needs raw body — disable Next.js body parsing
// export const config = { api: { bodyParser: false } }

import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')!

    let event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object

        const clerkUserId = session.metadata?.clerkUserId
        const creditsToAdd = parseInt(session.metadata?.creditsToAdd ?? '0')

        if (!clerkUserId || !creditsToAdd) {
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
        }


        const existing = await prisma.creditPurchase.findUnique({
            where: { stripeSessionId: session.id }
        })
        if (existing) return NextResponse.json({ received: true })

        // atomic: write purchase record + increment credits together
        await prisma.$transaction([
            prisma.creditPurchase.create({
                data: {
                    userId: clerkUserId,
                    stripeSessionId: session.id,
                    creditsAdded: creditsToAdd,
                    amountPaid: session.amount_total ?? 0,
                }
            }),
            prisma.user.update({
                where: { id: clerkUserId },
                data: { credits: { increment: creditsToAdd } }
            })
        ])
    }

    return NextResponse.json({ received: true })
}