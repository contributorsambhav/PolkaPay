'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  Calendar,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Phone,
  User
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface KYCDetailsData {
  walletAddress: string;
  mobileNo: string;
  country: string;
  idNumber: string;
  idType: string;
  timestamp: string;
  documentCID: string;
  additionalData?: string;
  requestedTier?: string;
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentHash: string;
}

export function DetailModal({ isOpen, onClose, documentHash }: DetailModalProps) {
  const [kycData, setKycData] = useState<KYCDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && documentHash && documentHash !== 'Error loading data' && documentHash !== 'No document hash provided' && documentHash !== 'Error parsing data') {
      fetchKYCData();
    } else if (isOpen && (documentHash === 'Error loading data' || documentHash === 'No document hash provided' || documentHash === 'Error parsing data')) {
      setError('Invalid document hash. Cannot load KYC details.');
      setIsLoading(false);
    }
  }, [isOpen, documentHash]);

  const fetchKYCData = async () => {
    setIsLoading(true);
    setError(null);
    setKycData(null);
    
    try {
      const url = `${documentHash}`;
      console.log('Fetching KYC data from IPFS URL:', url);
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch KYC data from IPFS: HTTP ${response.status}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      console.log('Content-Type:', contentType);

      // Try to parse as JSON
      const text = await response.text();
      
      // Check if response starts with PDF marker or other binary indicators
      if (text.trim().startsWith('%PDF') || text.trim().startsWith('\xFF\xD8\xFF')) {
        throw new Error('The document hash appears to point to a file rather than KYC metadata. Please ensure the correct IPFS hash is stored on the blockchain.');
      }

      const data = JSON.parse(text);
      
      // Validate that we have the expected structure
      if (!data.walletAddress || !data.documentCID) {
        throw new Error('Invalid KYC data structure');
      }

      console.log('Successfully loaded KYC data:', data);
      setKycData(data);
      
      // If there's a documentCID, prepare the preview URL
      if (data.documentCID) {
        setDocumentPreview(`https://gateway.pinata.cloud/ipfs/${data.documentCID}`);
      }
      
    } catch (err) {
      console.error('Error fetching KYC data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load KYC details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatIdType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getTierBadge = (tier?: string) => {
    if (!tier) return null;
    
    const tierColors: { [key: string]: string } = {
      basic: 'bg-blue-100 text-blue-800 border-blue-200',
      standard: 'bg-green-100 text-green-800 border-green-200',
      premium: 'bg-purple-100 text-purple-800 border-purple-200',
      vip: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    return (
      <Badge className={tierColors[tier.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
        {tier.toUpperCase()}
      </Badge>
    );
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] lg:w-[75vw] max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            KYC Request Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="text-center text-sm text-muted-foreground">
              Loading KYC data from IPFS...
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>{error}</p>
                <p className="text-xs mt-2">Document Hash: {documentHash}</p>
              </div>
            </AlertDescription>
          </Alert>
        ) : kycData ? (
          <div className="space-y-6 py-4">
            {/* User Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">User Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Wallet Address</p>
                    <p className="text-sm font-mono break-all">{kycData.walletAddress}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Mobile Number</p>
                    <p className="text-sm">{kycData.mobileNo}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Country</p>
                    <p className="text-sm">{kycData.country}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Submission Date</p>
                    <p className="text-sm">{formatDate(kycData.timestamp)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Identity Verification Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Identity Verification</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">ID Type</p>
                    <p className="text-sm">{formatIdType(kycData.idType)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">ID Number</p>
                    <p className="text-sm font-mono">{kycData.idNumber}</p>
                  </div>
                </div>
              </div>

              {kycData.requestedTier && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Requested Tier</p>
                    {getTierBadge(kycData.requestedTier)}
                  </div>
                </div>
              )}

              {kycData.additionalData && kycData.additionalData !== 'none' && (
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Additional Information</p>
                    <p className="text-sm">{kycData.additionalData}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Document Section */}
            {kycData.documentCID && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Supporting Documents</h3>
                
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Document CID</p>
                      <p className="text-xs font-mono text-muted-foreground break-all">
                        {kycData.documentCID}
                      </p>
                    </div>
                  </div>

                  {/* Document Preview */}
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <div className="aspect-video relative">
                      <iframe
                        src={documentPreview || ''}
                        className="w-full h-full"
                        title="Document Preview"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => documentPreview && openInNewTab(documentPreview)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Size
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => documentPreview && openInNewTab(documentPreview)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>

                  <Alert>
                    <ExternalLink className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Documents are stored on IPFS and will open in a new tab. Supported formats: PNG, JPG, JPEG, PDF
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {/* IPFS Metadata Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold border-b pb-2">Metadata</h3>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">IPFS Hash (Metadata)</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-mono break-all">{documentHash}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openInNewTab(`https://ipfs.io/ipfs/${documentHash}`)}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No KYC data available</p>
            <p className="text-xs mt-2">Document Hash: {documentHash}</p>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}