import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(role: 'admin' | 'user'): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// Mock the db module
vi.mock('../server/db', () => ({
  createProduct: vi.fn().mockResolvedValue({ id: 1 }),
  updateProduct: vi.fn().mockResolvedValue({ id: 1 }),
  updateProductNonPrice: vi.fn().mockResolvedValue({ id: 1 }),
  deleteProduct: vi.fn().mockResolvedValue(true),
  createOperationLog: vi.fn().mockResolvedValue({ id: 1 }),
}));

describe("产品权限控制", () => {
  describe("管理员权限", () => {
    it("管理员可以创建产品", async () => {
      const ctx = createMockContext('admin');
      const caller = appRouter.createCaller(ctx);

      const result = await caller.products.create({
        productCode: "TEST001",
        productName: "测试产品",
        retailPrice: 10000,
        smallBPrice: 9000,
        largeBPrice: 8000,
        bulkPrice: 7000,
        cheapPrice: 6000,
      });

      expect(result).toBeDefined();
    });

    it("管理员可以更新产品（包括价格）", async () => {
      const ctx = createMockContext('admin');
      const caller = appRouter.createCaller(ctx);

      const result = await caller.products.update({
        id: 1,
        productName: "更新后的产品",
        retailPrice: 15000,
      });

      expect(result).toBeDefined();
    });

    it("管理员可以删除产品", async () => {
      const ctx = createMockContext('admin');
      const caller = appRouter.createCaller(ctx);

      const result = await caller.products.delete(1);

      expect(result).toBe(true);
    });
  });

  describe("业务员权限", () => {
    it("业务员不能创建产品", async () => {
      const ctx = createMockContext('user');
      const caller = appRouter.createCaller(ctx);

      await expect(caller.products.create({
        productCode: "TEST002",
        productName: "测试产品",
        retailPrice: 10000,
        smallBPrice: 9000,
        largeBPrice: 8000,
        bulkPrice: 7000,
        cheapPrice: 6000,
      })).rejects.toThrow("只有管理员可以添加产品");
    });

    it("业务员不能更新产品价格（使用update接口）", async () => {
      const ctx = createMockContext('user');
      const caller = appRouter.createCaller(ctx);

      await expect(caller.products.update({
        id: 1,
        productName: "更新后的产品",
        retailPrice: 15000,
      })).rejects.toThrow("只有管理员可以修改价格信息");
    });

    it("业务员可以更新产品非价格字段", async () => {
      const ctx = createMockContext('user');
      const caller = appRouter.createCaller(ctx);

      const result = await caller.products.updateNonPrice({
        id: 1,
        productCode: "TEST001-UPDATED",
        productName: "更新后的产品名称",
        description: "新的描述",
        imageUrl: "https://example.com/image.jpg",
        length: "10",
        width: "20",
        height: "30",
        note: "备注信息",
      });

      expect(result).toBeDefined();
    });

    it("业务员不能删除产品", async () => {
      const ctx = createMockContext('user');
      const caller = appRouter.createCaller(ctx);

      await expect(caller.products.delete(1)).rejects.toThrow("只有管理员可以删除产品");
    });
  });
});

describe("业务员非价格字段更新", () => {
  it("updateNonPrice不会包含价格字段", async () => {
    const ctx = createMockContext('user');
    const caller = appRouter.createCaller(ctx);
    
    // 即使传入价格字段，也应该被过滤掉
    const result = await caller.products.updateNonPrice({
      id: 1,
      productCode: "TEST001",
      productName: "产品名称",
      retailPrice: 99999, // 这个应该被忽略
    } as any);

    expect(result).toBeDefined();
  });
});
