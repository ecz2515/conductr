// Universal base64 helpers for browser and Node.js
export function encodeBase64(str: string): string {
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(str);
  } else {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
}

export function decodeBase64(str: string): string {
  if (typeof window !== 'undefined' && window.atob) {
    return window.atob(str);
  } else {
    return Buffer.from(str, 'base64').toString('utf-8');
  }
} 