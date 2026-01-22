export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// 客户级别
export const CUSTOMER_LEVELS = {
  retail: '零售价',
  smallB: '小B价',
  largeB: '大B价',
  bulk: '批发价',
  cheap: '白菜价',
} as const;

// 货币类型
export const CURRENCIES = {
  CNY: { symbol: '¥', name: '人民币' },
  USD: { symbol: '$', name: '美元' },
} as const;

// 默认汇率
export const DEFAULT_EXCHANGE_RATE = 7.2;
