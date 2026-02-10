// utils/phoneNumber.ts
// Phone Number Utilities for Kenyan Numbers
// ============================================================================

/**
 * Kenyan phone number formats:
 * - 07XX XXX XXX (local format)
 * - 01XX XXX XXX (local format)
 * - 2547XX XXX XXX (international without +)
 * - +2547XX XXX XXX (international with +)
 */

/**
 * Validate Kenyan phone number
 */
export function validateKenyanPhoneNumber(phone: string): boolean {
  // Remove all non-digit characters for validation
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it matches Kenyan number patterns
  const patterns = [
    /^0[17]\d{8}$/,           // 07XX XXX XXX or 01XX XXX XXX
    /^254[17]\d{8}$/,         // 2547XX XXX XXX
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Format phone number to international format (+254...)
 */
export function formatToInternational(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Convert local format to international
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  // Add + prefix if not present
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return '+' + cleaned;
}

/**
 * Format phone number for display (e.g., 0712 345 678)
 */
export function formatForDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Convert to local format if international
  let localNumber = cleaned;
  if (cleaned.startsWith('254')) {
    localNumber = '0' + cleaned.substring(3);
  }
  
  // Format as XXXX XXX XXX
  if (localNumber.length === 10) {
    return `${localNumber.substring(0, 4)} ${localNumber.substring(4, 7)} ${localNumber.substring(7)}`;
  }
  
  return localNumber;
}

/**
 * Get validation error message
 */
export function getPhoneValidationError(phone: string): string | null {
  if (!phone || phone.trim() === '') {
    return 'Phone number is required';
  }
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 9) {
    return 'Phone number is too short';
  }
  
  if (cleaned.length > 12) {
    return 'Phone number is too long';
  }
  
  if (!validateKenyanPhoneNumber(phone)) {
    return 'Please enter a valid Kenyan phone number (e.g., 0712345678)';
  }
  
  return null;
}

/**
 * Extract country code
 */
export function extractCountryCode(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('254')) {
    return '254';
  }
  
  return '254'; // Default to Kenya
}

/**
 * Mask phone number for privacy (e.g., 0712 XXX 678)
 */
export function maskPhoneNumber(phone: string): string {
  const formatted = formatForDisplay(phone);
  const parts = formatted.split(' ');
  
  if (parts.length === 3) {
    return `${parts[0]} XXX ${parts[2]}`;
  }
  
  return phone;
}