type IconName =
  | 'mail' | 'phone' | 'whatsapp' | 'instagram' | 'fiverr' | 'arrow-up-right'
  | 'chevron-down' | 'plus' | 'minus' | 'close' | 'map-pin' | 'clock';

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <span className={`icon ${name} ${className}`.trim()} aria-hidden="true" />;
}
