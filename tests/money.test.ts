import { describe, it, expect } from 'vitest'
import { money, subtotal, total } from '../src/utils/money'
describe('TND money', () => {
  it('shows exactly three decimal places in French and English', () => {
    expect(money(24.5, 'en')).toContain('24.500')
    expect(money(24.5, 'fr')).toContain('24,500')
    expect(money(24.5, 'ar')).toBeTruthy()
  })
  it('computes with integer millimes', () => {
    expect(total([{ subtotal: subtotal(0.1, 3) }, { subtotal: subtotal(0.2, 2) }])).toBe(0.7)
  })
})
