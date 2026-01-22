export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

// 客户级别
export const CUSTOMER_LEVELS = {
  retail: '零售价',
  smallB: '小B价',
  largeB: '大B价',
  bulk: '批发价',
  cheap: '白菜价',
} as const;

export type CustomerLevel = keyof typeof CUSTOMER_LEVELS;

// 货币类型
export const CURRENCIES = {
  CNY: { symbol: '¥', name: '人民币' },
  USD: { symbol: '$', name: '美元' },
} as const;

export type CurrencyType = keyof typeof CURRENCIES;

// 默认汇率
export const DEFAULT_EXCHANGE_RATE = 7.2;

// 价格字段列表（用于权限控制）
export const PRICE_FIELDS = [
  'retailPrice',
  'smallBPrice',
  'largeBPrice',
  'bulkPrice',
  'cheapPrice',
] as const;
