const placeholder = '/images/apartment-placeholder.svg';

export function ApartmentImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return <img src={src || placeholder} alt={alt} className={className} loading="lazy" onError={event => {
    const element = event.currentTarget;
    if (!element.src.endsWith(placeholder)) element.src = placeholder;
  }} />;
}
