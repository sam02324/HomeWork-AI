const SPREADSHEET_ID_RE = /^[A-Za-z0-9_-]{20,200}$/;

export function parseGoogleSpreadsheetId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)/i);
  const candidate = urlMatch?.[1] ?? trimmed;

  return SPREADSHEET_ID_RE.test(candidate) ? candidate : null;
}
