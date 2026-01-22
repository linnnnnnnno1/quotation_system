import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // 图片代理接口，绕过CORS限制
  imageProxy: publicProcedure.input((val: unknown) => {
    if (typeof val === 'string') return val;
    throw new Error('Invalid input: URL must be a string');
  }).query(async ({ input: imageUrl }) => {
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      return {
        success: true,
        data: `data:${contentType};base64,${base64}`,
        contentType,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  products: router({
    list: publicProcedure.query(async () => {
      const { getAllProducts } = await import('../server/db');
      return getAllProducts();
    }),
    search: publicProcedure.input((val: unknown) => {
      if (typeof val === 'string') return val;
      throw new Error('Invalid input');
    }).query(async ({ input }) => {
      const { searchProducts } = await import('../server/db');
      return searchProducts(input);
    }),
    get: publicProcedure.input((val: unknown) => {
      if (typeof val === 'number') return val;
      throw new Error('Invalid input');
    }).query(async ({ input }) => {
      const { getProductById } = await import('../server/db');
      return getProductById(input);
    }),
    // 管理员创建产品
    create: protectedProcedure.input((val: unknown) => val as any).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('只有管理员可以添加产品');
      const { createProduct, createOperationLog } = await import('../server/db');
      const result = await createProduct(input);
      await createOperationLog({
        userId: ctx.user.id,
        operationType: 'create_product',
        description: `创建产品: ${input.productName}`,
        resourceId: result?.id,
      });
      return result;
    }),
    // 管理员更新产品（包含价格）
    update: protectedProcedure.input((val: unknown) => val as any).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('只有管理员可以修改价格信息');
      const { updateProduct, createOperationLog } = await import('../server/db');
      const { id, ...data } = input;
      const result = await updateProduct(id, data);
      await createOperationLog({
        userId: ctx.user.id,
        operationType: 'update_product',
        description: `更新产品: ${data.productName || id}`,
        resourceId: id,
      });
      return result;
    }),
    // 业务员更新产品（不包含价格）
    updateNonPrice: protectedProcedure.input((val: unknown) => val as any).mutation(async ({ input, ctx }) => {
      const { updateProductNonPrice, createOperationLog } = await import('../server/db');
      const { id, ...data } = input;
      // 确保不包含价格字段
      const safeData = {
        productCode: data.productCode,
        productName: data.productName,
        description: data.description,
        imageUrl: data.imageUrl,
        length: data.length,
        width: data.width,
        height: data.height,
        pcsPerCarton: data.pcsPerCarton,
        unitWeight: data.unitWeight,
        unitVolume: data.unitVolume,
        note: data.note,
      };
      const result = await updateProductNonPrice(id, safeData);
      await createOperationLog({
        userId: ctx.user.id,
        operationType: 'update_product_info',
        description: `更新产品信息(非价格): ${data.productName || id}`,
        resourceId: id,
      });
      return result;
    }),
    delete: protectedProcedure.input((val: unknown) => {
      if (typeof val === 'number') return val;
      throw new Error('Invalid input');
    }).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('只有管理员可以删除产品');
      const { deleteProduct, createOperationLog } = await import('../server/db');
      await createOperationLog({
        userId: ctx.user.id,
        operationType: 'delete_product',
        description: `删除产品ID: ${input}`,
        resourceId: input,
      });
      return deleteProduct(input);
    }),
  }),

  company: router({
    getInfo: publicProcedure.query(async () => {
      const { getCompanyInfo } = await import('../server/db');
      return getCompanyInfo();
    }),
    updateInfo: protectedProcedure.input((val: unknown) => val as any).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('只有管理员可以修改公司信息');
      const { createOrUpdateCompanyInfo, createOperationLog } = await import('../server/db');
      const result = await createOrUpdateCompanyInfo(input);
      await createOperationLog({
        userId: ctx.user.id,
        operationType: 'update_company',
        description: `更新公司信息`,
      });
      return result;
    }),
  }),

  quotations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserQuotations } = await import('../server/db');
      return getUserQuotations(ctx.user.id);
    }),
    get: protectedProcedure.input((val: unknown) => {
      if (typeof val === 'number') return val;
      throw new Error('Invalid input');
    }).query(async ({ input }) => {
      const { getQuotationById } = await import('../server/db');
      return getQuotationById(input);
    }),
    create: protectedProcedure.input((val: unknown) => val as any).mutation(async ({ input, ctx }) => {
      const { createQuotation, createOperationLog } = await import('../server/db');
      const result = await createQuotation({ ...input, userId: ctx.user.id });
      await createOperationLog({
        userId: ctx.user.id,
        operationType: 'create_quotation',
        description: `创建报价单: ${input.quotationNumber}`,
        resourceId: result?.id,
      });
      return result;
    }),
    updateStatus: protectedProcedure.input((val: unknown) => val as any).mutation(async ({ input }) => {
      const { updateQuotationStatus } = await import('../server/db');
      return updateQuotationStatus(input.id, input.status);
    }),
  }),

  quotationItems: router({
    list: protectedProcedure.input((val: unknown) => {
      if (typeof val === 'number') return val;
      throw new Error('Invalid input');
    }).query(async ({ input }) => {
      const { getQuotationItems } = await import('../server/db');
      return getQuotationItems(input);
    }),
    create: protectedProcedure.input((val: unknown) => val as any).mutation(async ({ input }) => {
      const { createQuotationItem } = await import('../server/db');
      return createQuotationItem(input);
    }),
    delete: protectedProcedure.input((val: unknown) => {
      if (typeof val === 'number') return val;
      throw new Error('Invalid input');
    }).mutation(async ({ input }) => {
      const { deleteQuotationItems } = await import('../server/db');
      return deleteQuotationItems(input);
    }),
  }),

  logs: router({
    getUserLogs: protectedProcedure.query(async ({ ctx }) => {
      const { getUserOperationLogs } = await import('../server/db');
      return getUserOperationLogs(ctx.user.id);
    }),
    getAllLogs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('无权限访问');
      const { getAllOperationLogs } = await import('../server/db');
      return getAllOperationLogs();
    }),
    create: protectedProcedure.input((val: unknown) => val as any).mutation(async ({ input, ctx }) => {
      const { createOperationLog } = await import('../server/db');
      return createOperationLog({ ...input, userId: ctx.user.id });
    }),
  }),

  templates: router({
    list: publicProcedure.query(async () => {
      const { getQuotationTemplates } = await import('../server/db');
      return getQuotationTemplates();
    }),
    getDefault: publicProcedure.query(async () => {
      const { getDefaultQuotationTemplate } = await import('../server/db');
      return getDefaultQuotationTemplate();
    }),
  }),

  exports: router({
    getUserExports: protectedProcedure.query(async ({ ctx }) => {
      const { getUserExportHistory } = await import('../server/db');
      return getUserExportHistory(ctx.user.id);
    }),
    record: protectedProcedure.input((val: unknown) => val as any).mutation(async ({ input, ctx }) => {
      const { recordQuotationExport, createOperationLog } = await import('../server/db');
      await createOperationLog({
        userId: ctx.user.id,
        operationType: 'export',
        description: `导出报价单: ${input.fileName}`,
      });
      return recordQuotationExport({ ...input, userId: ctx.user.id });
    }),
  }),

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
      const { getAllUsers } = await import('../server/db');
      return getAllUsers();
    }),
    create: protectedProcedure.input((val: unknown) => val as any).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
      const { createUser, createOperationLog } = await import('../server/db');
      const result = await createUser(input);
      await createOperationLog({
        userId: ctx.user.id,
        operationType: 'create_user',
        description: `添加用户: ${input.email}`,
        resourceId: result?.id,
      });
      return result;
    }),
    updateStatus: protectedProcedure.input((val: unknown) => val as any).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
      const { updateUserStatus, createOperationLog } = await import('../server/db');
      await createOperationLog({
        userId: ctx.user.id,
        operationType: 'update_user_status',
        description: `更新用户状态: ${input.id} -> ${input.status}`,
        resourceId: input.id,
      });
      return updateUserStatus(input.id, input.status);
    }),
    delete: protectedProcedure.input((val: unknown) => {
      if (typeof val === 'number') return val;
      throw new Error('Invalid input');
    }).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') throw new Error('Unauthorized');
      const { deleteUser, createOperationLog } = await import('../server/db');
      await createOperationLog({
        userId: ctx.user.id,
        operationType: 'delete_user',
        description: `删除用户ID: ${input}`,
        resourceId: input,
      });
      return deleteUser(input);
    }),
  }),
});

export type AppRouter = typeof appRouter;
