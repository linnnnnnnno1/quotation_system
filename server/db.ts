import { eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  Product, InsertProduct, products, 
  CompanyInfo, InsertCompanyInfo, companyInfo, 
  Quotation, InsertQuotation, quotations, 
  QuotationItem, InsertQuotationItem, quotationItems, 
  OperationLog, InsertOperationLog, operationLogs, 
  QuotationTemplate, InsertQuotationTemplate, quotationTemplates, 
  QuotationExport, InsertQuotationExport, quotationExports 
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== 用户相关 ====================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // 检查是否已有相同邮箱的用户（由管理员添加）
    let existingUserByEmail = null;
    if (user.email) {
      const result = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
      existingUserByEmail = result.length > 0 ? result[0] : null;
    }

    // 如果存在由管理员添加的同邮箱用户，且openId不同，则更新openId
    if (existingUserByEmail && existingUserByEmail.openId !== user.openId) {
      await db.update(users).set({ 
        openId: user.openId, 
        lastSignedIn: new Date(),
        name: user.name || existingUserByEmail.name,
        loginMethod: user.loginMethod || existingUserByEmail.loginMethod
      }).where(eq(users.id, existingUserByEmail.id));
      return;
    }

    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    } else if (existingUserByEmail) {
      values.role = existingUserByEmail.role;
      updateSet.role = existingUserByEmail.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.createdAt);
}

export async function createUser(data: InsertUser) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(users).values(data);
  const result = await db.select().from(users).where(eq(users.email, data.email!)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserStatus(id: number, status: "active" | "disabled") {
  const db = await getDb();
  if (!db) return false;
  await db.update(users).set({ status }).where(eq(users.id, id));
  return true;
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(users).where(eq(users.id, id));
  return true;
}

// ==================== 产品相关 ====================
export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).orderBy(products.productCode);
}

export async function getProductByCode(productCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.productCode, productCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchProducts(keyword: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(
    or(
      like(products.productCode, `%${keyword}%`),
      like(products.productName, `%${keyword}%`)
    )
  );
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(products).values(data);
  return getProductByCode(data.productCode);
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(products).set(data).where(eq(products.id, id));
  return getProductById(id);
}

// 业务员更新产品（不包含价格字段）
export async function updateProductNonPrice(id: number, data: {
  productCode?: string;
  productName?: string;
  description?: string | null;
  imageUrl?: string | null;
  length?: string | null;
  width?: string | null;
  height?: string | null;
  pcsPerCarton?: number | null;
  unitWeight?: string | null;
  unitVolume?: string | null;
  note?: string | null;
}) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(products).set(data).where(eq(products.id, id));
  return getProductById(id);
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(products).where(eq(products.id, id));
  return true;
}

// ==================== 公司信息相关 ====================
export async function getCompanyInfo() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companyInfo).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrUpdateCompanyInfo(data: InsertCompanyInfo) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getCompanyInfo();
  if (existing) {
    await db.update(companyInfo).set(data).where(eq(companyInfo.id, existing.id));
    return getCompanyInfo();
  } else {
    await db.insert(companyInfo).values(data);
    return getCompanyInfo();
  }
}

// ==================== 报价单相关 ====================
export async function createQuotation(data: InsertQuotation) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(quotations).values(data);
  const result = await db.select().from(quotations).where(eq(quotations.quotationNumber, data.quotationNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQuotationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserQuotations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotations).where(eq(quotations.userId, userId)).orderBy(quotations.createdAt);
}

export async function updateQuotationStatus(id: number, status: 'draft' | 'sent' | 'accepted' | 'rejected') {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(quotations).set({ status }).where(eq(quotations.id, id));
  return getQuotationById(id);
}

// ==================== 报价单明细相关 ====================
export async function createQuotationItem(data: InsertQuotationItem) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(quotationItems).values(data);
  const result = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, data.quotationId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQuotationItems(quotationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId));
}

export async function deleteQuotationItems(quotationId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(quotationItems).where(eq(quotationItems.quotationId, quotationId));
  return true;
}

// ==================== 操作日志相关 ====================
export async function createOperationLog(data: InsertOperationLog) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(operationLogs).values(data);
  return true;
}

export async function getUserOperationLogs(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(operationLogs).where(eq(operationLogs.userId, userId)).orderBy(operationLogs.createdAt).limit(limit);
}

export async function getAllOperationLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: operationLogs.id,
    userId: operationLogs.userId,
    operationType: operationLogs.operationType,
    description: operationLogs.description,
    resourceId: operationLogs.resourceId,
    createdAt: operationLogs.createdAt,
    userName: users.name,
  }).from(operationLogs)
    .leftJoin(users, eq(operationLogs.userId, users.id))
    .orderBy(operationLogs.createdAt)
    .limit(limit);
  return result;
}

// ==================== 报价模板相关 ====================
export async function getQuotationTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotationTemplates);
}

export async function getDefaultQuotationTemplate() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quotationTemplates).where(eq(quotationTemplates.isDefault, 1)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== 导出历史相关 ====================
export async function recordQuotationExport(data: InsertQuotationExport) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(quotationExports).values(data);
  return true;
}

export async function getUserExportHistory(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotationExports).where(eq(quotationExports.userId, userId)).limit(limit);
}

export async function getAllExportHistory(limit = 500) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotationExports).limit(limit);
}
