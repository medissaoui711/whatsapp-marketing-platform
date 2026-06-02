export function maskPhoneNumber(phone: string): string {
  if (!phone) return phone;
  if (phone.length <= 4) return phone;

  const maskedLength = phone.length - 4;
  const maskedPart = '*'.repeat(maskedLength);
  const visiblePart = phone.slice(-4);

  return maskedPart + visiblePart;
}

export function looksLikePhoneNumber(str: string): boolean {
  if (!str || str.length < 7) return false;

  let digitCount = 0;
  for (const char of str) {
    if (char >= '0' && char <= '9') {
      digitCount++;
    }
  }

  const digitRatio = digitCount / str.length;
  return digitCount >= 7 && digitRatio > 0.7;
}

export function maskIfPhoneNumber(str: string): string {
  if (looksLikePhoneNumber(str)) {
    return maskPhoneNumber(str);
  }
  return str;
}

export function maskPhoneNumberCustom(
  phone: string,
  visibleStart: number = 0,
  visibleEnd: number = 4,
  maskChar: string = '*'
): string {
  if (!phone) return phone;
  if (phone.length <= visibleStart + visibleEnd) return phone;

  const startPart = phone.slice(0, visibleStart);
  const maskedLength = phone.length - visibleStart - visibleEnd;
  const maskedPart = maskChar.repeat(maskedLength);
  const endPart = phone.slice(-visibleEnd);

  return startPart + maskedPart + endPart;
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;

  if (phone.startsWith('+')) {
    const countryCode = phone.match(/^\+\d{1,3}/)?.[0] || '';
    const remaining = phone.slice(countryCode.length);
    const maskedRemaining = maskPhoneNumber(remaining);
    return countryCode + maskedRemaining;
  }

  return maskPhoneNumber(phone);
}

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;

  const digits = phone.replace(/\D/g, '');

  return digits.length >= 10 && digits.length <= 15;
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function getCountryCode(phone: string): string {
  if (!phone) return '';

  const normalized = phone.replace(/\s/g, '');
  const match = normalized.match(/^\+(\d{1,3})/);
  return match ? match[1] : '';
}


