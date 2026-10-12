// City labels and illustration URLs from the user-supplied HomePage_new.
export const homeCities = [
  { label: 'TP.HCM', city: 'TP. Hồ Chí Minh', aliases: ['TP.HCM', 'Hồ Chí Minh', 'Thành phố Hồ Chí Minh'], photo: 'photo-1583417319070-4a69db38a482' },
  { label: 'Hà Nội', city: 'Hà Nội', aliases: ['TP. Hà Nội', 'Thành phố Hà Nội'], photo: 'photo-1509030450996-dd1a26dda07a' },
  { label: 'Đà Nẵng', city: 'Đà Nẵng', aliases: ['TP. Đà Nẵng', 'Thành phố Đà Nẵng'], photo: 'photo-1559592413-7cec4d0cae2b' },
  { label: 'Bình Dương', city: 'Bình Dương', aliases: ['Tỉnh Bình Dương'], photo: 'photo-1449158743715-0a90ebb6d2d8' },
];
const normalize = (value: string) => value.toLocaleLowerCase('vi').replace(/[.\s]/g, '');
export function catalogCity(city: typeof homeCities[number], options: string[]) {
  const names = [city.city, ...city.aliases].map(normalize);
  return options.find(value => names.includes(normalize(value))) ?? city.city;
}
