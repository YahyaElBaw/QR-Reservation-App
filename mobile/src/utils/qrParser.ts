export interface ParsedTableQr {
  valid: boolean;
  qrToken?: string;
  host?: string;
  networkApiUrl?: string;
  networkSocketUrl?: string;
  error?: string;
}

/**
 * Extracts a valid table qrToken and optional network host from a scanned QR payload or URL.
 * Supports:
 *  - Network URLs: http://192.168.1.128:5173/table/TBL-A1B2
 *  - Localhost URLs: http://localhost:5173/table/TBL-A1B2
 *  - Deep links: qrresto://table/TBL-A1B2
 *  - Raw token: TBL-A1B2
 *  - Simple table numbers: 1, 2, 3...
 */
export function parseTableQrToken(input: string): ParsedTableQr {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Code QR vide ou invalide' };
  }

  const trimmed = input.trim();
  let extractedHost: string | undefined;
  let networkApiUrl: string | undefined;
  let networkSocketUrl: string | undefined;

  // Extract host IP or domain if present in URL
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsedUrl = new URL(trimmed);
      const hostname = parsedUrl.hostname;
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        extractedHost = hostname;
        networkApiUrl = `http://${hostname}:3000/api/v1`;
        networkSocketUrl = `http://${hostname}:3000`;
      }
    }
  } catch {
    // ignore URL parse errors
  }

  // 1. URL containing /table/:qrToken
  const urlMatch = trimmed.match(/\/table\/([A-Za-z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    const rawToken = urlMatch[1];
    const token = rawToken.toUpperCase();
    return {
      valid: true,
      qrToken: token.startsWith('TBL-') ? token : `TBL-${token}`,
      host: extractedHost,
      networkApiUrl,
      networkSocketUrl,
    };
  }

  // 2. Direct TBL- prefix match
  const directMatch = trimmed.match(/TBL-[A-Za-z0-9_-]+/i);
  if (directMatch) {
    return {
      valid: true,
      qrToken: directMatch[0].toUpperCase(),
      host: extractedHost,
      networkApiUrl,
      networkSocketUrl,
    };
  }

  // 3. Fallback: simple numeric table input (e.g. "1" or "table 1")
  const numMatch = trimmed.match(/\d+/);
  if (numMatch) {
    return {
      valid: true,
      qrToken: numMatch[0],
      host: extractedHost,
      networkApiUrl,
      networkSocketUrl,
    };
  }

  return {
    valid: false,
    error: 'Ce code QR ne correspond pas à une table de restaurant valide (format attendu: TBL-XXXX).',
  };
}
