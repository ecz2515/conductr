// Universal base64 helpers for browser and Node.js
export function encodeBase64(str: string): string {
  if (typeof window !== 'undefined' && window.btoa) {
    // Robust Unicode-safe base64 encoding for browsers
    // Encode as UTF-8, then base64
    return window.btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
  } else {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
}

export function decodeBase64(str: string): string {
  if (typeof window !== 'undefined' && window.atob) {
    // Unicode-safe base64 decoding for browsers
    return decodeURIComponent(
      Array.prototype.map.call(window.atob(str), function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
  } else {
    return Buffer.from(str, 'base64').toString('utf-8');
  }
} 