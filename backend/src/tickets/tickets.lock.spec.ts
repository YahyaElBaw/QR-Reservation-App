import { TicketsService } from './tickets.service';

describe('TicketsService session & IP locking', () => {
  // Test isTicketOwner logic directly on TicketsService prototype
  const service = Object.create(TicketsService.prototype) as TicketsService;

  const phone1 = {
    ip: '192.168.1.50',
    deviceId: 'dev_phone_1_abc123',
  };

  const phone2 = {
    ip: '192.168.1.99',
    deviceId: 'dev_phone_2_xyz789',
  };

  const ticketLockedToPhone1 = {
    clientIp: phone1.ip,
    clientDeviceId: phone1.deviceId,
  };

  it('allows the same phone (same IP & deviceId) to reorder', () => {
    const isOwner = service.isTicketOwner(ticketLockedToPhone1, phone1.ip, phone1.deviceId);
    expect(isOwner).toBe(true);
  });

  it('blocks another phone with a different deviceId from ordering on the table', () => {
    const isOwner = service.isTicketOwner(ticketLockedToPhone1, phone1.ip, phone2.deviceId);
    expect(isOwner).toBe(false);
  });

  it('blocks another phone with a different IP from ordering on the table', () => {
    const isOwner = service.isTicketOwner(ticketLockedToPhone1, phone2.ip, phone2.deviceId);
    expect(isOwner).toBe(false);
  });

  it('blocks anonymous caller without deviceId when ticket is locked to a device', () => {
    const isOwner = service.isTicketOwner(ticketLockedToPhone1, phone2.ip, undefined);
    expect(isOwner).toBe(false);
  });

  it('allows access if ticket has no lock data (unlocked)', () => {
    const isOwner = service.isTicketOwner({ clientIp: null, clientDeviceId: null }, phone2.ip, phone2.deviceId);
    expect(isOwner).toBe(true);
  });

  it('handles IP-only locked ticket correctly', () => {
    const ipOnlyTicket = { clientIp: '10.0.0.5', clientDeviceId: null };
    expect(service.isTicketOwner(ipOnlyTicket, '10.0.0.5')).toBe(true);
    expect(service.isTicketOwner(ipOnlyTicket, '10.0.0.6')).toBe(false);
  });
});
