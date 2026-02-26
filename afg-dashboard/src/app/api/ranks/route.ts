import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const agentsRef = adminDb.collection('agents');
    const snapshot = await agentsRef.where('role', '==', 'agent').get();
    
    const allPerformances: Record<string, number[]> = {
      '2025-08': [],
      '2025-09': [],
      '2025-10': [],
      '2025-11': [],
      '2025-12': [],
      '2026-01': [],
      '2026-02': [],
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.performance) {
        Object.keys(allPerformances).forEach(month => {
          allPerformances[month].push(data.performance[month] || 0);
        });
      }
    });

    // Sort all arrays descending
    Object.keys(allPerformances).forEach(month => {
      allPerformances[month].sort((a, b) => b - a);
    });

    return NextResponse.json({ ranks: allPerformances });
  } catch (error) {
    console.error('Get ranks error:', error);
    return NextResponse.json({ error: '순위 데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
