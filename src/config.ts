import brand from '../app.config.json';

export const APP_NAME: string = brand.name;

export const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const TIME_ZONE = 'Europe/Vienna';
