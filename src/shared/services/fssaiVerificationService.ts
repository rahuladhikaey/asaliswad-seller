export interface FSSAIValidationResult {
  valid: boolean;
  message?: string;
}

export interface FSSAIProvider {
  name: string;
  validateFormat(licenseNumber: string): FSSAIValidationResult;
  validateDocument(file: { size: number; type: string }): FSSAIValidationResult;
  verifyLicense(licenseNumber: string, businessName: string): Promise<{
    status: 'Verified' | 'Pending Verification' | 'Rejected';
    notes?: string;
  }>;
}

export class ManualAdminFSSAIProvider implements FSSAIProvider {
  name = "Manual Admin Review";

  validateFormat(licenseNumber: string): FSSAIValidationResult {
    const cleanNumber = licenseNumber.trim();
    if (!/^\d{14}$/.test(cleanNumber)) {
      return {
        valid: false,
        message: "FSSAI License Number must contain exactly 14 numeric digits."
      };
    }
    return { valid: true };
  }

  validateDocument(file: { size: number; type: string }): FSSAIValidationResult {
    const maxSizeBytes = 50 * 1024; // 50 KB
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        message: "Only PDF, JPG, JPEG, and PNG certificate documents are allowed."
      };
    }

    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        message: `File size exceeds the 50 KB maximum limit (Your file: ${(file.size / 1024).toFixed(1)} KB).`
      };
    }

    return { valid: true };
  }

  async verifyLicense(licenseNumber: string, businessName: string) {
    return {
      status: 'Pending Verification' as const,
      notes: "Submitted for manual verification by SuperAdmin."
    };
  }
}

export class OfficialFSSAIAPIProvider implements FSSAIProvider {
  name = "Official FSSAI API Service";

  validateFormat(licenseNumber: string): FSSAIValidationResult {
    return new ManualAdminFSSAIProvider().validateFormat(licenseNumber);
  }

  validateDocument(file: { size: number; type: string }): FSSAIValidationResult {
    return new ManualAdminFSSAIProvider().validateDocument(file);
  }

  async verifyLicense(licenseNumber: string, businessName: string) {
    return {
      status: 'Pending Verification' as const,
      notes: "Submitted for automated API verification."
    };
  }
}

export const activeFSSAIProvider: FSSAIProvider = new ManualAdminFSSAIProvider();

export function calculateMerchantCompletion(seller: any): number {
  if (!seller) return 0;

  const requiredFields = [
    { key: "business_name", val: seller.business_name },
    { key: "owner_name", val: seller.owner_name },
    { key: "email", val: seller.email },
    { key: "email_verified", val: seller.email_verified },
    { key: "mobile_number", val: seller.mobile_number },
    { key: "category", val: seller.category || seller.business_category },
    { key: "pickup_address", val: seller.pickup_address },
    { key: "warehouse_address", val: seller.warehouse_address },
    { key: "city", val: seller.city },
    { key: "state", val: seller.state },
    { key: "pincode", val: seller.pincode },
    { key: "fssai_license_number", val: seller.fssai_license_number },
    { key: "fssai_certificate_url", val: seller.fssai_certificate_url },
    { key: "phonepay_number", val: seller.phonepay_number || seller.phonepay_no },
    { key: "business_logo_url", val: seller.business_logo_url || seller.profile_photo },
    { key: "business_description", val: seller.business_description },
  ];

  let completedCount = 0;
  for (const field of requiredFields) {
    if (field.val !== undefined && field.val !== null && String(field.val).trim() !== "" && field.val !== false) {
      completedCount++;
    }
  }

  return Math.round((completedCount / requiredFields.length) * 100);
}
