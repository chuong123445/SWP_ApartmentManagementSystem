const files = { apartment: 'material-symbols--apartment.svg', location: 'material-symbols--location-on-outline-rounded.svg', bed: 'material-symbols--bed-outline-rounded.svg', money: 'money.svg' };
export function HomeIcon({ name }: { name: keyof typeof files }) {
  return <img className="home-icon" src={`/home/assets/${files[name]}`} alt="" aria-hidden="true" />;
}
