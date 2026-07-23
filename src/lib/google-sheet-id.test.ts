import { describe, expect, it } from 'vitest';
import { parseGoogleSpreadsheetId } from './google-sheet-id';

describe('parseGoogleSpreadsheetId', () => {
  const id = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';

  it('accepts a spreadsheet ID', () => {
    expect(parseGoogleSpreadsheetId(id)).toBe(id);
  });

  it('extracts an ID from a Google Sheets URL', () => {
    expect(parseGoogleSpreadsheetId(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`)).toBe(id);
  });

  it('rejects malformed and non-Google values', () => {
    expect(parseGoogleSpreadsheetId('https://example.com/sheet')).toBeNull();
    expect(parseGoogleSpreadsheetId('short-id')).toBeNull();
  });
});
