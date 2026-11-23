import { newQrToken } from '../common/token';
import { TablesService } from './tables.service';

describe('qrToken & baseUrl', () => {
  it('generates TBL- tokens with 8 unambiguous url-safe chars, unique in practice', () => {
    const set = new Set(Array.from({ length: 2000 }, newQrToken));
    expect(set.size).toBe(2000);
    for (const t of set) expect(t).toMatch(/^TBL-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/);
  });
  it('rejects localhost / 127.0.0.1 and accepts a LAN url', () => {
    expect(() => TablesService.validateBaseUrl('http://localhost:5173')).toThrow(/localhost/);
    expect(() => TablesService.validateBaseUrl('http://127.0.0.1:5173')).toThrow();
    expect(TablesService.validateBaseUrl('http://192.168.1.20:5173/')).toBe('http://192.168.1.20:5173');
  });
});
