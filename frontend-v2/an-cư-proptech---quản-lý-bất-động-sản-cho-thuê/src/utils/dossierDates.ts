export function dossierDateIso(value: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const local = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!iso && !local) return null;
  const candidate = iso ? iso[0] : `${local![3]}-${local![2]}-${local![1]}`;
  const date = new Date(`${candidate}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === candidate ? candidate : null;
}

export function dossierDateDisplay(value?: string | null): string {
  if (!value) return '';
  const iso = dossierDateIso(value);
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : value;
}

export function dossierFieldDisplay(field: string, value: string): string {
  return /Date$|From$|Until$/.test(field) ? dossierDateDisplay(value) : value;
}
