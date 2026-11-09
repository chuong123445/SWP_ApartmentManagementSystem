import { useEffect, useRef, useState } from 'react';
import { dossierDateDisplay, dossierDateIso } from '@/utils/dossierDates';

export function DossierDateInput({ value, onChange, required, className, max }: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  max?: string;
}) {
  const [text, setText] = useState(() => dossierDateDisplay(value));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setText(dossierDateDisplay(value)); }, [value]);
  useEffect(() => {
    const date = dossierDateIso(text);
    const invalid = text !== '' && (!date || Boolean(max && date > max));
    input.current?.setCustomValidity(invalid ? 'Nhập ngày hợp lệ theo dd/MM/yyyy.' : '');
  }, [text, max]);
  return <input ref={input} type="text" inputMode="numeric" placeholder="dd/MM/yyyy"
    maxLength={10} required={required} className={className} value={text}
    onChange={event => {
      const next = event.target.value;
      setText(next);
      const date = dossierDateIso(next);
      input.current?.setCustomValidity(next && !date ? 'Nhập ngày hợp lệ theo dd/MM/yyyy.' : '');
      if (next === '' || date) onChange(date ?? '');
    }} />;
}
