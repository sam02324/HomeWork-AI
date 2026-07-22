import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  findFirst: vi.fn(),
  values: vi.fn(),
  onConflictDoNothing: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      users: { findFirst: mocks.findFirst },
    },
    insert: () => ({ values: mocks.values }),
  },
}));

vi.mock('@/db/schema', () => ({ users: { id: 'users.id' } }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'user-id-filter') }));

import { getAuthUserId } from './utils';

beforeEach(() => {
  mocks.auth.mockResolvedValue({ userId: 'user_teacher' });
  mocks.currentUser.mockResolvedValue({
    emailAddresses: [{ emailAddress: 'teacher@example.com' }],
    firstName: 'Grade',
    lastName: 'Teacher',
    publicMetadata: { role: 'teacher' },
  });
  mocks.findFirst.mockResolvedValue({ id: 'user_teacher', accountStatus: 'active' });
  mocks.onConflictDoNothing.mockResolvedValue(undefined);
  mocks.values.mockReturnValue({ onConflictDoNothing: mocks.onConflictDoNothing });
});

describe('getAuthUserId account enforcement', () => {
  it('returns the active authenticated user', async () => {
    await expect(getAuthUserId()).resolves.toBe('user_teacher');
  });

  it('rejects a suspended account before route logic executes', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'user_teacher', accountStatus: 'suspended' });

    const response = await getAuthUserId();
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error('Expected an HTTP response');
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: 'ACCOUNT_SUSPENDED',
    });
  });

  it('fails closed when the account database cannot be checked', async () => {
    mocks.findFirst.mockRejectedValue(new Error('database unavailable'));

    const response = await getAuthUserId();
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error('Expected an HTTP response');
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: 'AUTHORIZATION_UNAVAILABLE',
    });
  });

  it('auto-provisions a missing Clerk user once', async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(getAuthUserId()).resolves.toBe('user_teacher');
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      id: 'user_teacher',
      email: 'teacher@example.com',
      role: 'teacher',
    }));
    expect(mocks.onConflictDoNothing).toHaveBeenCalledOnce();
  });
});
