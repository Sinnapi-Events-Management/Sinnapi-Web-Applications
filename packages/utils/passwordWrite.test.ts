import { describe, expect, it, vi } from 'vitest';
import {
  REAUTH_REQUIRED_MESSAGE,
  RESET_LINK_STALE_MESSAGE,
  updateOwnPassword,
  type PasswordWriter,
} from './passwordWrite';

function client(rpcError: string | null, updateError: string | null = null) {
  const calls: string[] = [];
  const c: PasswordWriter = {
    rpc: vi.fn(async (fn: string) => {
      calls.push(`rpc:${fn}`);
      return { error: rpcError ? { message: rpcError } : null };
    }),
    auth: {
      updateUser: vi.fn(async () => {
        calls.push('updateUser');
        return { error: updateError ? { message: updateError } : null };
      }),
    },
  };
  return { c, calls };
}

describe('updateOwnPassword', () => {
  it('asks for the ticket first, then writes', async () => {
    const { c, calls } = client(null);
    await expect(updateOwnPassword(c, { password: 'n3w-Passw0rd' })).resolves.toBeNull();
    expect(calls).toEqual(['rpc:authorize_password_change', 'updateUser']);
  });

  it('never writes when the server refuses the ticket', async () => {
    const { c, calls } = client('reauth_required');
    await expect(updateOwnPassword(c, { password: 'x' })).resolves.toBe(REAUTH_REQUIRED_MESSAGE);
    expect(calls).toEqual(['rpc:authorize_password_change']);
  });

  it('lets a reset screen word the refusal as a stale link', async () => {
    const { c } = client('reauth_required');
    await expect(updateOwnPassword(c, { password: 'x' }, RESET_LINK_STALE_MESSAGE)).resolves.toBe(
      RESET_LINK_STALE_MESSAGE,
    );
  });

  it('hides unexpected server errors behind a retryable sentence', async () => {
    const { c } = client('permission denied for function authorize_password_change');
    await expect(updateOwnPassword(c, { password: 'x' })).resolves.toMatch(/try again/);
  });

  it('surfaces GoTrue’s own password-policy message', async () => {
    const { c } = client(null, 'Password should be at least 8 characters.');
    await expect(updateOwnPassword(c, { password: 'x' })).resolves.toBe(
      'Password should be at least 8 characters.',
    );
  });
});
