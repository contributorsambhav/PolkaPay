// Path: app/api/kyc/document/route.ts
import { NextRequest, NextResponse } from 'next/server';

const PINATA_JWT = process.env.PINATA_JWT_SECRET;
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';

/**
 * GET endpoint to proxy IPFS documents (images/PDFs)
 * This helps avoid CORS issues and adds authentication
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get('cid');

    if (!cid) {
      return NextResponse.json(
        { error: 'CID parameter is required' },
        { status: 400 }
      );
    }

    // Validate CID format
    if (!cid.match(/^[a-zA-Z0-9]{46,59}$/)) {
      return NextResponse.json(
        { error: 'Invalid IPFS CID format' },
        { status: 400 }
      );
    }

    console.log('📥 Fetching document for CID:', cid);

    // Try multiple gateways
    const gatewayUrls = [
      `https://${PINATA_GATEWAY}/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`
    ];

    let lastError: Error | null = null;

    for (const url of gatewayUrls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: PINATA_JWT ? {
            'Authorization': `Bearer ${PINATA_JWT}`
          } : {},
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`Gateway responded with status: ${response.status}`);
        }

        // Get the content type from the response
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        
        // Stream the response
        const arrayBuffer = await response.arrayBuffer();
        
        console.log('✅ Document fetched successfully, size:', arrayBuffer.byteLength, 'bytes');

        return new NextResponse(arrayBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        console.warn(`⚠️ Failed to fetch from ${url}:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw lastError || new Error('All gateway attempts failed');
  } catch (error) {
    console.error('❌ Error fetching document:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch document',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to fetch document by CID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cid } = body;

    if (!cid) {
      return NextResponse.json(
        { error: 'CID is required' },
        { status: 400 }
      );
    }

    // Redirect to GET with query param
    return NextResponse.redirect(
      new URL(`/api/kyc/document?cid=${cid}`, request.url)
    );
  } catch (error) {
    console.error('❌ Error in POST /api/kyc/document:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process request'
      },
      { status: 500 }
    );
  }
}