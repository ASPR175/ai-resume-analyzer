import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET() {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'inr',
                product_data: { name: 'Test - 5 Analyses' },
                unit_amount: 39900,
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
        metadata: {
            clerkUserId: 'user_3Ef6KKct2xvOydZyRFRGZNIphhc',
            creditsToAdd: '5',
        },
    })

    return NextResponse.redirect(session.url!)
}