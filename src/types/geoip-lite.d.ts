declare module 'geoip-lite' {
  export interface Lookup {
    range: number[];
    country: string;
    region: string;
    city: string;
    timezone: string;
    ll?: [number, number];
  }
  export function lookup(ip: string): Lookup | null;
}
