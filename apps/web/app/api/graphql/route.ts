import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Use internal Docker network URL
    const apiUrl = process.env.API_URL || 'http://api:4000/graphql';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('GraphQL proxy error:', error);
    return NextResponse.json(
      { errors: [{ message: 'Failed to fetch from GraphQL API' }] },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST method for GraphQL queries' },
    { status: 405 }
  );
}
