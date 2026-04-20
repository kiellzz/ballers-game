import { getCountryCode } from "./getCountryCode";

export function getFlagUrl(country: string): string {
  const countryCode = getCountryCode(country);
  return `https://flagcdn.com/24x18/${countryCode}.png`;
}