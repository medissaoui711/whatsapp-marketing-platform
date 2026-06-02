export function sanitizeId(id: string): string {
  const validChars = /^[a-zA-Z_]+$/;
  if (validChars.test(id)) return id;

  let result = '';
  for (const c of id) {
    if (c >= '0' && c <= '9') {
      result += String.fromCharCode('A'.charCodeAt(0) + (c.charCodeAt(0) - '0'.charCodeAt(0)));
    } else if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
      result += c;
    }
  }
  return result;
}

export function hasCompleteAction(children: any[]): boolean {
  for (const child of children) {
    const action = child['on-click-action'];
    if (action?.name === 'complete') {
      return true;
    }
  }
  return false;
}

export function validateFlowStructure(screens: any[]): string | null {
  if (!screens.length) {
    return 'يجب أن يحتوي التدفق على شاشة واحدة على الأقل';
  }

  const screensWithComplete: number[] = [];

  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i];
    const layout = screen?.layout;
    if (!layout?.children) continue;

    if (hasCompleteAction(layout.children)) {
      screensWithComplete.push(i);
    }
  }

  if (screensWithComplete.length === 0) {
    return 'يجب أن يحتوي التدفق على زر Footer مع إجراء "Complete Flow"';
  }

  if (screens.length > 1) {
    const lastScreenIndex = screens.length - 1;
    for (const idx of screensWithComplete) {
      if (idx !== lastScreenIndex) {
        return `إجراء 'Complete Flow' يجب أن يكون على الشاشة الأخيرة فقط. الشاشة ${idx + 1} تحتوي على إجراء Complete. استخدم 'Navigate to Screen' للشاشات المتوسطة.`;
      }
    }
  }

  return null;
}


