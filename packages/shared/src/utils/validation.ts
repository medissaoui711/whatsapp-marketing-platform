export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

export function isValidHexColor(color: string): boolean {
  const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return regex.test(color);
}

const validTagColors = ['blue', 'red', 'green', 'yellow', 'purple', 'gray'];

export function isValidTagColor(color: string): boolean {
  return validTagColors.includes(color);
}

export function isAlphanumericUnderscore(str: string): boolean {
  const regex = /^[a-zA-Z0-9_]+$/;
  return regex.test(str);
}

export function isStrongPassword(password: string): boolean {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
}


