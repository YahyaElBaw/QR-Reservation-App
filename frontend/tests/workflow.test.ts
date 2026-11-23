import { beforeEach, describe, it, expect, vi } from 'vitest'
import type { Product, RestaurantTable } from '../src/types'
const memory = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => memory.set(k, v),
  removeItem: (k: string) => memory.delete(k),
})
vi.stubGlobal('window', new EventTarget())
const { demo } = await import('../src/services/demo')
const { setToken } = await import('../src/services/http')
const { tunisDay } = await import('../src/utils/money')
async function login(name: string) {
  const result = await demo.login(name, 'demo1234')
  setToken(result.accessToken)
}
beforeEach(async () => {
  memory.clear()
  await login('admin')
})
describe('staff ticket workflow', () => {
  it('edits, pays once, closes and frees a table', async () => {
    await login('cuisinier')
    await demo.item('t1', 'add', { productId: 'p3', quantity: 3 })
    await demo.item('t1', 'update', { itemId: 'i1', quantity: 1 })
    expect((await demo.ticket('t1')).total).toBe(30.5)
    await login('caissier')
    await demo.pay('t1', 'CASH')
    expect((await demo.ticket('t1')).status).toBe('PAID')
    await expect(demo.pay('t1', 'CASH')).rejects.toMatchObject({ code: 'TICKET_NOT_OPEN' })
    await demo.close('t1')
    expect((await demo.list<RestaurantTable>('tables')).find((t) => t._id === 'tb1')?.status).toBe(
      'AVAILABLE',
    )
  })
  it('keeps paid tickets available for a later close', async () => {
    await demo.pay('t2', 'CARD')
    expect((await demo.list<RestaurantTable>('tables')).find((t) => t._id === 'tb2')?.status).toBe(
      'RESERVED',
    )
    await demo.close('t2')
    expect((await demo.ticket('t2')).paymentMethod).toBe('CARD')
  })
  it('refuses early closing and editing after payment', async () => {
    await expect(demo.close('t1')).rejects.toMatchObject({ code: 'TICKET_NOT_OPEN' })
    await demo.pay('t1', 'OTHER')
    await expect(demo.item('t1', 'update', { itemId: 'i1', quantity: 3 })).rejects.toMatchObject({
      code: 'TICKET_NOT_OPEN',
    })
  })
  it('enforces staff roles', async () => {
    await login('caissier')
    await expect(demo.availability('p1', false)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(demo.save('users', undefined, {})).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await login('cuisinier')
    await expect(demo.pay('t1', 'CASH')).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(demo.list('users')).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('rejects unavailable products and invalid quantities', async () => {
    await expect(demo.item('t1', 'add', { productId: 'p4', quantity: 1 })).rejects.toMatchObject({
      code: 'PRODUCT_UNAVAILABLE',
    })
    await expect(demo.item('t1', 'update', { itemId: 'i1', quantity: 0 })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })
  it('preserves snapshot prices when catalog prices change', async () => {
    await demo.save('products', 'p1', { price: 99 })
    await demo.item('t1', 'update', { itemId: 'i1', quantity: 3 })
    expect((await demo.ticket('t1')).total).toBe(55.5)
    expect((await demo.list<Product>('products'))[0]?.price).toBe(99)
  })
  it('protects occupied tables and regenerates QR tokens', async () => {
    await expect(demo.remove('tables', 'tb1')).rejects.toMatchObject({
      code: 'TABLE_HAS_OPEN_TICKET',
    })
    const before = (await demo.list<RestaurantTable>('tables'))[0]!.qrToken
    await demo.regenerate('tb1')
    expect((await demo.list<RestaurantTable>('tables'))[0]!.qrToken).not.toBe(before)
  })
  it('filters payments in dashboard stats', async () => {
    await demo.pay('t1', 'CASH')
    const day = tunisDay(new Date())
    const stats = await demo.stats(day, day)
    expect(stats.salesTotal).toBe(37)
    expect(stats.ticketsCount).toBe(1)
    expect(stats.topProducts[0]?.quantity).toBe(2)
  })
})
