import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import prisma from '@/lib/prisma'
import PDFParser from "pdf2json";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export async function POST(req: Request) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { fileUrl, fileName } = await req.json()
    if (!fileUrl || !fileName) return NextResponse.json({ error: 'Missing fileUrl or fileName' }, { status: 400 })
    console.log('1. userId:', userId)

    // check credits without deducting yet
    const user = await prisma.user.findUnique({ where: { id: userId } })
    console.log('2. user:', user)

    if (!user || user.credits < 1) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
    }
    console.log('3. creating analysis row')


    const analysis = await prisma.analysis.create({
        data: {
            userId,
            fileUrl,
            fileName,
            status: 'PENDING',
            creditsUsed: 1,
        }
    })
    console.log('4. analysis created:', analysis.id)

    try {
        console.log('5. fetching PDF')
        const response = await fetch(fileUrl)
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)



        const extractedText = await new Promise<string>((resolve, reject) => {
            const pdfParser = new PDFParser()

            pdfParser.on('pdfParser_dataReady', (pdfData) => {
                const text = pdfData.Pages
                    .flatMap((page: any) => page.Texts)
                    .map((t: any) => decodeURIComponent(t.R[0].T))
                    .join(' ')
                resolve(text)
            })

            pdfParser.on('pdfParser_dataError', reject)

            pdfParser.parseBuffer(buffer)
        })

        if (!extractedText || extractedText.trim().length < 50) {
            throw new Error('Could not extract enough text from PDF')
        }


        const aiResponse = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert resume reviewer with 10+ years of experience. Analyze this resume and provide detailed feedback:\n\n${extractedText}`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        summary: { type: Type.STRING },
                        sections: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    status: { type: Type.STRING, enum: ['good', 'warning', 'critical'] },
                                    feedback: { type: Type.STRING }
                                },
                                required: ['title', 'status', 'feedback']
                            }
                        },
                        topImprovements: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['score', 'summary', 'sections', 'topImprovements']
                }
            }
        })

        const parsedResult = JSON.parse(aiResponse.text!)


        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { credits: { decrement: 1 } }
            }),
            prisma.analysis.update({
                where: { id: analysis.id },
                data: {
                    status: 'COMPLETED',
                    extractedText: extractedText,
                    result: parsedResult,
                    rawResponse: { text: aiResponse.text },
                }
            })
        ])

        return NextResponse.json({ analysisId: analysis.id, result: parsedResult })

    } catch (error) {
        console.error('ANALYZE ERROR:', error)

        await prisma.analysis.update({
            where: { id: analysis.id },
            data: {
                status: 'FAILED',
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        })

        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
    }
}
