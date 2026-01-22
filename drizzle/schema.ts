import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * 用户表：支持管理员和业务员角色
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 产品表：存储产品信息和多级别价格
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 64 }).notNull().unique(),
  productName: varchar("productName", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  retailPrice: int("retailPrice").notNull(), // 单位：分
  smallBPrice: int("smallBPrice").notNull(), // 小B客户价格
  largeBPrice: int("largeBPrice").notNull(), // 大B客户价格
  bulkPrice: int("bulkPrice").notNull(), // 批发价
  cheapPrice: int("cheapPrice").notNull(), // 白菜价
  length: decimal("length", { precision: 10, scale: 2 }), // 长度（厘米）
  width: decimal("width", { precision: 10, scale: 2 }), // 宽度（厘米）
  height: decimal("height", { precision: 10, scale: 2 }), // 高度（厘米）
  pcsPerCarton: decimal("pcsPerCarton", { precision: 10, scale: 2 }), // 每箱数量（支持小数）
  unitWeight: decimal("unitWeight", { precision: 10, scale: 2 }), // 单件重量（千克）
  unitVolume: decimal("unitVolume", { precision: 10, scale: 4 }), // 单件体积（立方米）
  note: text("note"), // 备注
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * 公司信息表：存储报价单抬头信息
 */
export const companyInfo = mysqlTable("companyInfo", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  taxId: varchar("taxId", { length: 64 }),
  bankAccount: text("bankAccount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanyInfo = typeof companyInfo.$inferSelect;
export type InsertCompanyInfo = typeof companyInfo.$inferInsert;

/**
 * 报价单表
 */
export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  quotationNumber: varchar("quotationNumber", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  customerLevel: mysqlEnum("customerLevel", ["retail", "smallB", "largeB", "bulk", "cheap"]).notNull(),
  totalAmount: int("totalAmount").notNull(),
  itemCount: int("itemCount").notNull(),
  status: mysqlEnum("status", ["draft", "sent", "accepted", "rejected"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * 报价单明细表
 */
export const quotationItems = mysqlTable("quotationItems", {
  id: int("id").autoincrement().primaryKey(),
  quotationId: int("quotationId").notNull(),
  productId: int("productId").notNull(),
  productCode: varchar("productCode", { length: 64 }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  imageUrl: text("imageUrl"),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(),
  subtotal: int("subtotal").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = typeof quotationItems.$inferInsert;

/**
 * 操作日志表
 */
export const operationLogs = mysqlTable("operationLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  operationType: varchar("operationType", { length: 64 }).notNull(),
  description: text("description"),
  resourceId: int("resourceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OperationLog = typeof operationLogs.$inferSelect;
export type InsertOperationLog = typeof operationLogs.$inferInsert;

/**
 * 报价模板表
 */
export const quotationTemplates = mysqlTable("quotationTemplates", {
  id: int("id").autoincrement().primaryKey(),
  templateName: varchar("templateName", { length: 255 }).notNull(),
  description: text("description"),
  companyHeader: text("companyHeader"),
  columnConfig: text("columnConfig"),
  footer: text("footer"),
  isDefault: int("isDefault").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuotationTemplate = typeof quotationTemplates.$inferSelect;
export type InsertQuotationTemplate = typeof quotationTemplates.$inferInsert;

/**
 * 报价导出历史表
 */
export const quotationExports = mysqlTable("quotationExports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  quotationId: int("quotationId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  exportData: text("exportData"),
  exportedAt: timestamp("exportedAt").defaultNow().notNull(),
});

export type QuotationExport = typeof quotationExports.$inferSelect;
export type InsertQuotationExport = typeof quotationExports.$inferInsert;
