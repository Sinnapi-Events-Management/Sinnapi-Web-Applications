'use client';
import { useState } from 'react';
import { PhoneField } from '@sinnapi/ui/phone';

type Props = { error?: string; disabled?: boolean };

/**
 * The contact form's optional phone, with its country. The form reads its
 * values from FormData, so the international number travels in a hidden
 * input named `phone`; the visible input shows only the national part.
 */
export default function ContactPhoneField({ error, disabled }: Props) {
  const [phone, setPhone] = useState('');
  return (
    <>
      <PhoneField
        value={phone}
        onChange={setPhone}
        label="Phone (optional)"
        disabled={disabled}
        error={error}
      />
      <input type="hidden" name="phone" value={phone} />
    </>
  );
}
