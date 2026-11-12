export function BrandLogo({ onDark = false }: { onDark?: boolean }) {
  return <span className={`ancu-brand${onDark ? ' ancu-brand-on-dark' : ''}`}>
    <img src="/brand/ancu-mark.png" alt="" width={50} height={46} />
    <span className="ancu-brand-name">An Cư<small>PROPTECH</small></span>
  </span>;
}
