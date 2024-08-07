export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://wum.bo";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_REDIRECT_URL || "https://app.wum.bo";

export const DEFAULT_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_API_URL || "https://api.devnet.solana.com";

export const WUMBO_IDENTITY_SERVICE_URL =
  process.env.NEXT_PUBLIC_WUMBO_IDENTITY_SERVICE_URL;

export const GA_TRACKING_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS || "G-3K3X1TLYCC";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
