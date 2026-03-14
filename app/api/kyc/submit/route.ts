import { NextRequest, NextResponse } from 'next/server';

// Pinata configuration
const PINATA_JWT = process.env.PINATA_JWT || "your-jwt-token-here";

interface KYCData {
  walletAddress: string;
  mobileNo: string;
  country: string;
  idNumber: string;
  idType: string;
  timestamp: string;
  documentCID: string;
  additionalData: string;
  requestedTier: string;
}

/**
 * Upload file to Pinata IPFS
 */
async function uploadToPinata(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const pinataMetadata = JSON.stringify({
      name: `KYC-Document-${Date.now()}`,
      keyvalues: {
        type: 'kyc-document',
        uploadedAt: new Date().toISOString(),
      },
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({ cidVersion: 1 });
    formData.append('pinataOptions', pinataOptions);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Pinata upload failed: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    throw new Error('Failed to upload document to IPFS');
  }
}

/**
 * Upload JSON metadata to Pinata IPFS
 */
async function uploadJSONToPinata(data: KYCData): Promise<string> {
  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataMetadata: {
          name: `KYC-Metadata-${data.walletAddress}-${Date.now()}`,
          keyvalues: {
            walletAddress: data.walletAddress,
            type: 'kyc-metadata',
            uploadedAt: data.timestamp,
          },
        },
        pinataOptions: { cidVersion: 1 },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Pinata JSON upload failed: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: 'Server configuration error: Pinata JWT not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const document = formData.get('document') as File;
    const walletAddress = formData.get('walletAddress') as string;
    const mobileNo = formData.get('mobileNo') as string;
    const country = formData.get('country') as string;
    const idNumber = formData.get('idNumber') as string;
    const idType = formData.get('idType') as string;
    const additionalData = formData.get('additionalData') as string;
    const requestedTier = formData.get('requestedTier') as string;

    // ✅ Validate required fields
    if (
      !document ||
      !walletAddress ||
      !mobileNo ||
      !country ||
      !idNumber ||
      !idType ||
      !requestedTier
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ✅ Validate wallet address
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // ✅ Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(document.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and PDF are allowed' },
        { status: 400 }
      );
    }

    // ✅ Validate file size (10 MB max)
    if (document.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    console.log('📤 Step 1: Uploading document to IPFS...');
    const documentCID = await uploadToPinata(document);

    console.log('📤 Step 2: Uploading metadata...');
    const kycData: KYCData = {
      walletAddress,
      mobileNo,
      country,
      idNumber,
      idType,
      timestamp: new Date().toISOString(),
      documentCID,
      additionalData: additionalData || '',
      requestedTier,
    };

    const metadataCID = await uploadJSONToPinata(kycData);

    return NextResponse.json({
      success: true,
      documentCID,
      metadataCID,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${metadataCID}`,
      documentUrl: `https://gateway.pinata.cloud/ipfs/${documentCID}`,
    });
  } catch (error) {
    console.error('❌ KYC submission error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process KYC request',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
