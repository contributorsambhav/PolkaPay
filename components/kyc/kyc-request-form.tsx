'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, CheckCircle, Copy, ExternalLink, FileCheck, Info, Upload, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { parseAbi } from 'viem';
import { toast } from 'sonner';

const REMITTANCE_ABI = parseAbi(['function getKYCStatus(address user) external view returns (uint8)', 'function requestKYC(string calldata documentHash) external', 'function getTierLimit(uint8 tier) external view returns (uint256)']);
const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

const getContractAddress = (): `0x${string}` | undefined => {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address || !address.startsWith('0x') || address.length !== 42) {
    return undefined;
  }
  return address as `0x${string}`;
};

const KYCStatus = {
  0: 'NONE',
  1: 'PENDING',
  2: 'APPROVED',
  3: 'REJECTED'
} as const;

const COUNTRIES = [
  { name: 'United States', code: '+1', pattern: /^\d{10}$/ },
  { name: 'United Kingdom', code: '+44', pattern: /^\d{10}$/ },
  { name: 'Canada', code: '+1', pattern: /^\d{10}$/ },
  { name: 'Australia', code: '+61', pattern: /^\d{9}$/ },
  { name: 'Germany', code: '+49', pattern: /^\d{10,11}$/ },
  { name: 'France', code: '+33', pattern: /^\d{9}$/ },
  { name: 'India', code: '+91', pattern: /^\d{10}$/ },
  { name: 'Japan', code: '+81', pattern: /^\d{10}$/ },
  { name: 'Singapore', code: '+65', pattern: /^\d{8}$/ },
  { name: 'United Arab Emirates', code: '+971', pattern: /^\d{9}$/ },
  { name: 'Switzerland', code: '+41', pattern: /^\d{9}$/ },
  { name: 'Netherlands', code: '+31', pattern: /^\d{9}$/ },
  { name: 'Sweden', code: '+46', pattern: /^\d{9}$/ },
  { name: 'Norway', code: '+47', pattern: /^\d{8}$/ },
  { name: 'Denmark', code: '+45', pattern: /^\d{8}$/ },
  { name: 'Other', code: '+', pattern: /^\d{7,15}$/ }
];

const VERIFICATION_TIERS = [
  {
    value: 1,
    name: 'basic',
    label: 'Basic Tier (Tier 1)',
    description: 'Standard verification for basic transactions'
  },
  {
    value: 2,
    name: 'standard',
    label: 'Standard Tier (Tier 2)',
    description: 'Enhanced verification for moderate transactions'
  },
  {
    value: 3,
    name: 'premium',
    label: 'Premium Tier (Tier 3)',
    description: 'Full verification for high-value transactions'
  },
  {
    value: 4,
    name: 'enterprise',
    label: 'Enterprise Tier (Tier 4)',
    description: 'Corporate-level verification for business accounts'
  }
];

interface KYCFormData {
  mobileNo: string;
  countryCode: string;
  country: string;
  idNumber: string;
  idType: string;
  requestedTier: string;
  additionalData: string;
  document: File | null;
}

export function KYCRequestForm() {
  const { address, isConnected } = useAccount();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [formData, setFormData] = useState<KYCFormData>({
    mobileNo: '',
    countryCode: '',
    country: '',
    idNumber: '',
    idType: '',
    requestedTier: '',
    additionalData: '',
    document: null
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [tierLimits, setTierLimits] = useState<Record<number, string>>({});

  // Document hash state
  const [documentHash, setDocumentHash] = useState<string | null>(null);
  const [ipfsUrl, setIpfsUrl] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  useEffect(() => {
    const addr = getContractAddress();
    setContractAddress(addr);
    if (!addr) {
      toast.error('Contract address not configured properly');
    }
  }, []);

  const CORRECT_CHAIN_ID = 420420417;

  const {
    data: kycStatusNum,
    refetch: refetchKYCStatus,
    isLoading: loadingKYCStatus,
    error: errorKYCStatus,
    isError: hasErrorKYCStatus
  } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getKYCStatus',
    args: [address!],
    account: address,
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected
    }
  });

  // Fetch tier limits
  const { data: tier1Limit, isLoading: isLoadingTier1 } = useReadContract({
    address: contractAddress,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [1],
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected
    }
  });

  const { data: tier2Limit, isLoading: isLoadingTier2 } = useReadContract({
    address: contractAddress,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [2],
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected
    }
  });

  const { data: tier3Limit, isLoading: isLoadingTier3 } = useReadContract({
    address: contractAddress,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [3],
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected
    }
  });

  const { data: tier4Limit, isLoading: isLoadingTier4 } = useReadContract({
    address: contractAddress,
    account: address,
    abi: REMITTANCE_ABI,
    functionName: 'getTierLimit',
    args: [4],
    chainId: CORRECT_CHAIN_ID,
    query: {
      enabled: !!contractAddress && !!address && isConnected
    }
  });

  const { writeContractAsync, data: txHash, isPending: isWriting, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash
  });

  const kycStatus = kycStatusNum !== undefined ? KYCStatus[kycStatusNum as keyof typeof KYCStatus] : undefined;

  // Helper function to format ${SYMBOL} values
  const formatEthValue = (value: bigint | number | string | undefined, decimals: number = 0): string => {
    if (!value || value === 0 || value === '0') return '0';
    try {
      const ethValue = typeof value === 'bigint' ? Number(value) / 1e18 : typeof value === 'string' ? Number(value) / 1e18 : Number(value) / 1e18;
      if (ethValue === 0) return '0';
      return ethValue.toFixed(decimals);
    } catch (error) {
      console.error(`Error formatting ${SYMBOL} value:`, error);
      return '0';
    }
  };

  // Update tier limits when contract data changes
  useEffect(() => {
    const limits = [tier1Limit, tier2Limit, tier3Limit, tier4Limit];
    const newTierLimits: Record<number, string> = {};
    limits.forEach((limit, index) => {
      if (limit) {
        newTierLimits[index + 1] = formatEthValue(limit as bigint, 0);
      }
    });
    setTierLimits(newTierLimits);
  }, [tier1Limit, tier2Limit, tier3Limit, tier4Limit]);

  // Map tier names to contract tier numbers for auto-approve
  const TIER_NAME_TO_NUMBER: Record<string, number> = {
    basic: 1,
    standard: 2,
    premium: 3,
    enterprise: 4,
  };

  useEffect(() => {
    if (isConfirmed) {
      toast.success('KYC request submitted to blockchain successfully!');

      // Silently trigger auto-approval for demo (no UI indication)
      if (address) {
        const tierNum = TIER_NAME_TO_NUMBER[formData.requestedTier] || 1;
        fetch('/api/kyc/auto-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userAddress: address, tier: tierNum }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              console.log('Demo auto-KYC processed');
              // Silently refetch status after auto-approval completes
              setTimeout(() => refetchKYCStatus(), 3000);
            }
          })
          .catch(() => {
            // Silently fail — this is a demo convenience feature
          });
      }

      setDocumentHash(null);
      setIpfsUrl(null);
      setDocumentUrl(null);
      setFormData({
        mobileNo: '',
        countryCode: '',
        country: '',
        idNumber: '',
        idType: '',
        requestedTier: '',
        additionalData: '',
        document: null
      });
      setDocumentPreview(null);
      setTimeout(() => {
        refetchKYCStatus();
      }, 2000);
    }
  }, [isConfirmed, refetchKYCStatus]);

  useEffect(() => {
    if (writeError) {
      toast.error('Blockchain submission failed: ' + writeError.message);
    }
  }, [writeError]);

  const detectCountryFromPhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');

    for (const country of COUNTRIES) {
      if (country.code !== '+' && cleaned.startsWith(country.code)) {
        const numberPart = cleaned.substring(country.code.length);
        return { country: country.name, code: country.code, number: numberPart };
      }
    }
    return null;
  };

  const validatePhoneNumber = (phone: string, countryName: string): boolean => {
    const country = COUNTRIES.find((c) => c.name === countryName);
    if (!country) return false;

    const cleaned = phone.replace(/\s/g, '');
    return country.pattern.test(cleaned);
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\s/g, '');

    if (cleaned.startsWith('+')) {
      const detected = detectCountryFromPhone(cleaned);
      if (detected) {
        setFormData({
          ...formData,
          mobileNo: detected.number,
          country: detected.country,
          countryCode: detected.code
        });

        if (!validatePhoneNumber(detected.number, detected.country)) {
          setPhoneError('Invalid phone number for selected country');
        } else {
          setPhoneError(null);
        }
      } else {
        setFormData({ ...formData, mobileNo: value });
        setPhoneError('Could not detect country from phone number');
      }
    } else {
      setFormData({ ...formData, mobileNo: value });

      if (formData.country && value.length > 0) {
        if (!validatePhoneNumber(value, formData.country)) {
          setPhoneError('Invalid phone number for selected country');
        } else {
          setPhoneError(null);
        }
      } else {
        setPhoneError(null);
      }
    }

    setLocalError(null);
  };

  const handleCountryChange = (countryName: string) => {
    const selectedCountry = COUNTRIES.find((c) => c.name === countryName);
    setFormData({
      ...formData,
      country: countryName,
      countryCode: selectedCountry?.code || ''
    });

    if (formData.mobileNo && selectedCountry) {
      if (!validatePhoneNumber(formData.mobileNo, countryName)) {
        setPhoneError('Invalid phone number for selected country');
      } else {
        setPhoneError(null);
      }
    }

    setLocalError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setLocalError('Please upload a valid document (JPG, PNG, or PDF)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setLocalError('File size must be less than 10MB');
        return;
      }

      setFormData({ ...formData, document: file });
      setLocalError(null);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setDocumentPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setDocumentPreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setFormData({ ...formData, document: null });
    setDocumentPreview(null);
  };

  const handleInputChange = (field: keyof KYCFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    setLocalError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.country) {
      setLocalError('Please select a country');
      return false;
    }
    if (!formData.mobileNo.trim()) {
      setLocalError('Mobile number is required');
      return false;
    }
    if (phoneError) {
      setLocalError(phoneError);
      return false;
    }
    if (!validatePhoneNumber(formData.mobileNo, formData.country)) {
      setLocalError('Invalid phone number for selected country');
      return false;
    }
    if (!formData.idType) {
      setLocalError('Please select ID type');
      return false;
    }
    if (!formData.idNumber.trim()) {
      setLocalError('ID number is required');
      return false;
    }
    if (!formData.requestedTier) {
      setLocalError('Please select a verification tier');
      return false;
    }
    if (!formData.document) {
      setLocalError('Please upload your identity document');
      return false;
    }
    return true;
  };

  const handleUploadToIPFS = async () => {
    if (!validateForm()) {
      return;
    }

    setLocalError(null);
    setUploading(true);

    try {
      const uploadData = new FormData();
      uploadData.append('document', formData.document!);
      uploadData.append('mobileNo', `${formData.countryCode}${formData.mobileNo}`);
      uploadData.append('country', formData.country);
      uploadData.append('idNumber', formData.idNumber);
      uploadData.append('idType', formData.idType);
      uploadData.append('requestedTier', formData.requestedTier);
      uploadData.append('additionalData', formData.additionalData);
      uploadData.append('walletAddress', address!);

      console.log('📤 Uploading KYC data to IPFS...');

      const response = await fetch('/api/kyc/submit', {
        method: 'POST',
        body: uploadData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit KYC request');
      }

      console.log('✅ KYC uploaded successfully:', result);
      setDocumentHash(result.documentCID);

      setIpfsUrl(result.ipfsUrl);
      setDocumentUrl(result.documentUrl);
      toast.success('Document uploaded to IPFS successfully! Proceed to blockchain submission.');
    } catch (error) {
      console.error('❌ KYC upload failed:', error);
      setLocalError(error instanceof Error ? error.message : 'Failed to upload KYC data');
      toast.error('Failed to upload KYC data');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitToBlockchain = async () => {
    if (!documentHash || !contractAddress) {
      toast.error('No document hash available');
      return;
    }

    try {
      await writeContractAsync({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: 'requestKYC',
        args: [documentHash],
        chainId: CORRECT_CHAIN_ID
      });
    } catch (error) {
      console.error('❌ Blockchain submission failed:', error);
      toast.error('Failed to submit to blockchain');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getTierLimitDisplay = (tierValue: number): string => {
    const isLoading = (tierValue === 1 && isLoadingTier1) || (tierValue === 2 && isLoadingTier2) || (tierValue === 3 && isLoadingTier3) || (tierValue === 4 && isLoadingTier4);

    if (isLoading) return 'Loading...';

    const limit = tierLimits[tierValue];
    return limit ? `$${limit}` : 'Not set';
  };

  const canSubmitKYC = kycStatus === 'NONE' || kycStatus === 'REJECTED';
  const isTransactionInProgress = uploading || isWriting || isConfirming;

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            KYC Verification Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Please connect your wallet to submit KYC request</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!contractAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            KYC Verification Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Contract address not configured</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          KYC Verification Request
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loadingKYCStatus ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : hasErrorKYCStatus ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Error loading KYC status. Please refresh the page and try again.</AlertDescription>
          </Alert>
        ) : !canSubmitKYC ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{kycStatus === 'PENDING' ? 'Your KYC request is currently under review. Please wait for admin approval.' : kycStatus === 'APPROVED' ? 'Your KYC has already been approved. No further action needed.' : 'Unable to determine KYC status. Please refresh and try again.'}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* Country */}
            <div className="space-y-2 w-full">
              <Label htmlFor="country">
                Country <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.country} onValueChange={handleCountryChange} disabled={isTransactionInProgress || !!documentHash}>
                <SelectTrigger id="country" className="w-full">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.name} value={country.name} className="w-full">
                      {country.name} ({country.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <Label htmlFor="mobileNo">
                Mobile Number <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input type="text" value={formData.countryCode} readOnly className="w-24 bg-muted text-center font-mono cursor-not-allowed" placeholder="+" />
                <Input id="mobileNo" type="tel" placeholder="Enter phone number" value={formData.mobileNo} onChange={(e) => handlePhoneChange(e.target.value)} disabled={isTransactionInProgress || !!documentHash} required className="flex-1" />
              </div>
              {phoneError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {phoneError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">You can also enter the full number with country code (e.g., +911234567890)</p>
            </div>

            {/* ID Type */}
            <div className="space-y-2 w-full">
              <Label htmlFor="idType">
                ID Type <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.idType} onValueChange={(value) => handleInputChange('idType', value)} disabled={isTransactionInProgress || !!documentHash}>
                <SelectTrigger id="idType" className="w-full">
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="passport" className="w-full">
                    Passport
                  </SelectItem>
                  <SelectItem value="drivers_license" className="w-full">
                    Driver's License
                  </SelectItem>
                  <SelectItem value="national_id" className="w-full">
                    National ID
                  </SelectItem>
                  <SelectItem value="pan" className="w-full">
                    PAN Card
                  </SelectItem>
                  <SelectItem value="ssn" className="w-full">
                    Social Security Number
                  </SelectItem>
                  <SelectItem value="other" className="w-full">
                    Other Government ID
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ID Number */}
            <div className="space-y-2 w-full">
              <Label htmlFor="idNumber">
                {formData.idType === 'pan' ? 'PAN Number' : formData.idType === 'ssn' ? 'Social Security Number' : 'ID Number'} <span className="text-red-500">*</span>
              </Label>
              <Input id="idNumber" type="text" placeholder="Enter your ID number" value={formData.idNumber} onChange={(e) => handleInputChange('idNumber', e.target.value)} disabled={isTransactionInProgress || !!documentHash} required className="w-full" />
            </div>

            {/* Requested Verification Tier */}
            <div className="space-y-2 w-full">
              <Label htmlFor="requestedTier">
                Requested Verification Tier <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.requestedTier} onValueChange={(value) => handleInputChange('requestedTier', value)} disabled={isTransactionInProgress || !!documentHash}>
                <SelectTrigger id="requestedTier" className="w-full">
                  <SelectValue placeholder="Select verification tier" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  {VERIFICATION_TIERS.map((tier) => (
                    <SelectItem key={tier.value} value={tier.name} className="w-full group">
                      <div className="flex flex-col items-start py-1">
                        <span className="font-medium group-hover:text-white">{tier.label}</span>
                        <span className="text-xs text-muted-foreground group-hover:text-white">
                          {tier.description} • Daily Limit: {getTierLimitDisplay(tier.value)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.requestedTier && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{VERIFICATION_TIERS.find((t) => t.name === formData.requestedTier)?.label}</strong>
                    {' - '}
                    Daily Transaction Limit: {getTierLimitDisplay(VERIFICATION_TIERS.find((t) => t.name === formData.requestedTier)?.value || 0)}
                  </p>
                </div>
              )}
            </div>

            {/* Additional Data */}
            <div className="space-y-2 w-full">
              <Label htmlFor="additionalData">Additional Information (Optional)</Label>
              <Textarea id="additionalData" placeholder="Enter any additional information (e.g., business details, source of funds, purpose of account)" value={formData.additionalData} onChange={(e) => handleInputChange('additionalData', e.target.value)} disabled={isTransactionInProgress || !!documentHash} className="w-full min-h-[100px]" maxLength={500} />
              <p className="text-xs text-muted-foreground">{formData.additionalData.length}/500 characters</p>
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label htmlFor="document">
                Identity Document <span className="text-red-500">*</span>
              </Label>
              {!formData.document ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center bg-muted/10 hover:bg-muted/20 transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">Upload your identity document</p>
                  <p className="text-xs text-muted-foreground mb-3">JPG, PNG or PDF (Max 10MB)</p>
                  <Input id="document" type="file" accept="image/jpeg,image/jpg,image/png,application/pdf" onChange={handleFileChange} disabled={isTransactionInProgress || !!documentHash} className="hidden" />
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('document')?.click()} disabled={isTransactionInProgress || !!documentHash}>
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-muted/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{formData.document.name}</p>
                      <p className="text-xs text-muted-foreground">{(formData.document.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    {!documentHash && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile} disabled={isTransactionInProgress}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {documentPreview && (
                    <div className="mt-3">
                      <img src={documentPreview} alt="Document preview" className="max-h-48 rounded border" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Document Hash Display */}
            {documentHash && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800 mb-1">Document Uploaded to IPFS Successfully!</h4>
                    <p className="text-sm text-green-700 mb-2">Your KYC data has been uploaded. Now submit to blockchain.</p>

                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-green-700">Document Hash (IPFS CID)</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 text-xs bg-white border border-green-300 rounded px-2 py-1.5 font-mono break-all">{documentHash}</code>
                          <Button type="button" variant="ghost" size="sm" onClick={() => copyToClipboard(documentHash)} className="shrink-0">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {ipfsUrl && (
                          <Button type="button" variant="outline" size="sm" onClick={() => window.open(ipfsUrl, '_blank')} className="flex-1">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Metadata
                          </Button>
                        )}
                        {documentUrl && (
                          <Button type="button" variant="outline" size="sm" onClick={() => window.open(documentUrl, '_blank')} className="flex-1">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Document
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">KYC Requirements</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• All required fields must be completed</li>
                <li>• Government-issued photo ID required</li>
                <li>• Clear, high-resolution image or PDF</li>
                <li>• All information must be clearly visible</li>
                <li>• Document must be valid and not expired</li>
                <li>• Select appropriate verification tier for your needs</li>
              </ul>
            </div>

            {/* Transaction Status */}
            {isTransactionInProgress && (
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {uploading ? 'Uploading document to IPFS...' : isWriting ? 'Waiting for wallet confirmation...' : 'Confirming transaction on blockchain...'}
                  {txHash && (
                    <p className="text-xs mt-1 font-mono">
                      Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Display */}
            {localError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{localError}</AlertDescription>
              </Alert>
            )}

            {/* Success Display */}
            {isConfirmed && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  KYC request submitted to blockchain successfully! You will be notified once it's reviewed.
                  {txHash && <p className="text-xs mt-1 font-mono">Transaction: {txHash}</p>}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            {!documentHash ? (
              <ConfirmationModal
                trigger={
                  <Button type="button" disabled={isTransactionInProgress || !formData.document || !!phoneError} className="w-full">
                    {uploading ? 'Uploading to IPFS...' : 'Upload to IPFS'}
                  </Button>
                }
                title="Upload KYC Data to IPFS"
                description="This will upload your KYC data and documents to IPFS. After upload, you'll need to submit the document hash to the blockchain."
                confirmText="Upload to IPFS"
                onConfirm={handleUploadToIPFS}
                icon={<Upload className="h-5 w-5" />}
                disabled={isTransactionInProgress || !formData.document || !!phoneError}
              />
            ) : (
              <ConfirmationModal
                trigger={
                  <Button type="button" disabled={isWriting || isConfirming} className="w-full">
                    {isWriting ? 'Waiting for Confirmation...' : isConfirming ? 'Confirming Transaction...' : 'Submit to Blockchain'}
                  </Button>
                }
                title="Submit KYC to Blockchain"
                description={`Are you sure you want to submit your KYC request to the blockchain? The document hash will be recorded on-chain. This action cannot be undone.`}
                confirmText="Submit to Blockchain"
                onConfirm={handleSubmitToBlockchain}
                icon={<FileCheck className="h-5 w-5" />}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
