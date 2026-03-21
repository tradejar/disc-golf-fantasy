import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isPremium } from '@/lib/premium';

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ isPremium: false });
    const premium = await isPremium(userId);
    return NextResponse.json({ isPremium: premium });
}
