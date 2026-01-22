import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CUSTOMER_LEVELS, CURRENCIES, DEFAULT_EXCHANGE_RATE, CustomerLevel, CurrencyType } from "@/const";
import { exportQuotationToExcel, QuotationItem } from "@/utils/excelExport";
import { ArrowLeft, ArrowRight, Download, Plus, Trash2, Search, Image as ImageIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

interface QuotationItemLocal {
  id: string;
  productId: number;
  productCode: string;
  productName: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  length?: string | null;
  width?: string | null;
  height?: string | null;
  pcsPerCarton?: number | null;
  unitWeight?: string | null;
  unitVolume?: string | null;
  note?: string | null;
}

export default function QuotationFlow() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  // Step 1: 批量输入
  const [batchInput, setBatchInput] = useState('');
  const [customerLevel, setCustomerLevel] = useState<CustomerLevel>('retail');
  
  // Step 2: 预览编辑
  const [items, setItems] = useState<QuotationItemLocal[]>([]);
  const [currency, setCurrency] = useState<CurrencyType>('CNY');
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [includeDimensions, setIncludeDimensions] = useState(false);
  
  // 搜索产品
  const [searchKeyword, setSearchKeyword] = useState('');
  const { data: searchResults } = trpc.products.search.useQuery(searchKeyword, {
    enabled: searchKeyword.length > 0,
  });
  const { data: allProducts } = trpc.products.list.useQuery();
  const { data: companyInfo } = trpc.company.getInfo.useQuery();
  
  const imageProxyQuery = trpc.imageProxy.useQuery;
  
  const recordExportMutation = trpc.exports.record.useMutation();
  
  // 根据客户级别获取价格
  const getPriceByLevel = (product: any, level: CustomerLevel): number => {
    const priceMap: Record<CustomerLevel, string> = {
      retail: 'retailPrice',
      smallB: 'smallBPrice',
      largeB: 'largeBPrice',
      bulk: 'bulkPrice',
      cheap: 'cheapPrice',
    };
    return product[priceMap[level]] || 0;
  };
  
  // 解析批量输入
  const parseBatchInput = () => {
    const lines = batchInput.trim().split('\n').filter(line => line.trim());
    const newItems: QuotationItemLocal[] = [];
    const notFound: string[] = [];
    
    for (const line of lines) {
      const parts = line.split(/[\t,，\s]+/).filter(p => p.trim());
      if (parts.length < 2) continue;
      
      const code = parts[0].trim();
      const qty = parseInt(parts[1]) || 1;
      
      const product = allProducts?.find(p => 
        p.productCode.toLowerCase() === code.toLowerCase()
      );
      
      if (product) {
        newItems.push({
          id: `${product.id}-${Date.now()}-${Math.random()}`,
          productId: product.id,
          productCode: product.productCode,
          productName: product.productName,
          imageUrl: product.imageUrl,
          quantity: qty,
          unitPrice: getPriceByLevel(product, customerLevel),
          length: product.length,
          width: product.width,
          height: product.height,
          pcsPerCarton: product.pcsPerCarton,
          unitWeight: product.unitWeight,
          unitVolume: product.unitVolume,
          note: product.note,
        });
      } else {
        notFound.push(code);
      }
    }
    
    if (notFound.length > 0) {
      toast.warning(`以下产品编号未找到: ${notFound.join(', ')}`);
    }
    
    if (newItems.length > 0) {
      setItems(prev => [...prev, ...newItems]);
      setBatchInput('');
      setStep(2);
      toast.success(`已添加 ${newItems.length} 个产品`);
    } else {
      toast.error('未找到任何有效产品');
    }
  };
  
  // 添加搜索到的产品
  const addProduct = (product: any) => {
    const newItem: QuotationItemLocal = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productCode: product.productCode,
      productName: product.productName,
      imageUrl: product.imageUrl,
      quantity: 1,
      unitPrice: getPriceByLevel(product, customerLevel),
      length: product.length,
      width: product.width,
      height: product.height,
      pcsPerCarton: product.pcsPerCarton,
      unitWeight: product.unitWeight,
      unitVolume: product.unitVolume,
      note: product.note,
    };
    setItems(prev => [...prev, newItem]);
    setSearchKeyword('');
    toast.success('产品已添加');
  };
  
  // 更新数量
  const updateQuantity = (id: string, quantity: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
    ));
  };
  
  // 删除项目
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };
  
  // 计算总金额
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [items]);
  
  // 货币转换
  const convertPrice = (priceInCents: number): number => {
    const priceInYuan = priceInCents / 100;
    return currency === 'CNY' ? priceInYuan : priceInYuan / exchangeRate;
  };
  
  // 格式化价格
  const formatPrice = (priceInCents: number): string => {
    const converted = convertPrice(priceInCents);
    const symbol = CURRENCIES[currency].symbol;
    return `${symbol}${converted.toFixed(2)}`;
  };
  
  // 获取尺寸显示
  const getDimensionDisplay = (item: QuotationItemLocal): string => {
    if (item.length && item.width && item.height) {
      return `${item.length}×${item.width}×${item.height}`;
    }
    if (item.note) {
      return item.note;
    }
    return '-';
  };
  
  // 导出Excel
  const handleExport = async () => {
    try {
      const exportItems: QuotationItem[] = items.map(item => ({
        productCode: item.productCode,
        productName: item.productName,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.unitPrice * item.quantity,
        length: item.length,
        width: item.width,
        height: item.height,
        pcsPerCarton: item.pcsPerCarton,
        unitWeight: item.unitWeight,
        unitVolume: item.unitVolume,
        note: item.note,
      }));
      
      // 图片代理函数
      const imageProxyFn = async (url: string): Promise<string | null> => {
        try {
          const response = await fetch(`/api/trpc/imageProxy?input=${encodeURIComponent(JSON.stringify(url))}`);
          const data = await response.json();
          if (data.result?.data?.success) {
            return data.result.data.data;
          }
          return null;
        } catch {
          return null;
        }
      };
      
      const blob = await exportQuotationToExcel({
        items: exportItems,
        currency,
        exchangeRate,
        includeDimensions,
        companyInfo: companyInfo ? {
          companyName: companyInfo.companyName,
          address: companyInfo.address || undefined,
          phone: companyInfo.phone || undefined,
          email: companyInfo.email || undefined,
        } : undefined,
        imageProxyFn,
      });
      
      const fileName = `报价单_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      // 记录导出
      await recordExportMutation.mutateAsync({
        fileName,
        exportData: JSON.stringify({ items: exportItems.length, total: totalAmount }),
      });
      
      toast.success('报价单导出成功');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('导出失败，请重试');
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {s}
            </div>
            <span className={`ml-2 ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s === 1 ? '批量输入' : s === 2 ? '预览编辑' : '导出'}
            </span>
            {s < 3 && <div className="w-12 h-0.5 bg-muted mx-4" />}
          </div>
        ))}
      </div>
      
      {/* Step 1: 批量输入 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>批量输入产品</CardTitle>
            <CardDescription>
              每行输入一个产品，格式：产品编号 数量（用空格、Tab或逗号分隔）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>客户级别</Label>
                <Select value={customerLevel} onValueChange={(v) => setCustomerLevel(v as CustomerLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CUSTOMER_LEVELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>产品列表</Label>
              <Textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder={`示例：\nPROD001 10\nPROD002 5\nPROD003,20`}
                rows={10}
                className="font-mono"
              />
            </div>
            
            <div className="flex justify-end">
              <Button onClick={parseBatchInput} disabled={!batchInput.trim()}>
                下一步
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 2: 预览编辑 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>预览和编辑</CardTitle>
            <CardDescription>
              检查产品列表，调整数量，设置货币和导出选项
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 设置区域 */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label>货币</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyType)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CURRENCIES).map(([key, { name }]) => (
                      <SelectItem key={key} value={key}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {currency === 'USD' && (
                <div className="flex items-center gap-2">
                  <Label>汇率</Label>
                  <Input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || DEFAULT_EXCHANGE_RATE)}
                    className="w-24"
                    step="0.01"
                  />
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={includeDimensions}
                  onCheckedChange={setIncludeDimensions}
                />
                <Label>导出尺寸信息</Label>
              </div>
            </div>
            
            {/* 搜索添加产品 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索产品编号或名称添加..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
              />
              {searchResults && searchResults.length > 0 && searchKeyword && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-muted cursor-pointer flex items-center justify-between"
                      onClick={() => addProduct(product)}
                    >
                      <div>
                        <span className="font-medium">{product.productCode}</span>
                        <span className="text-muted-foreground ml-2">{product.productName}</span>
                      </div>
                      <Plus className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 产品列表 */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">图片</TableHead>
                  <TableHead>产品编号</TableHead>
                  <TableHead>产品名称</TableHead>
                  {includeDimensions && <TableHead>尺寸</TableHead>}
                  {includeDimensions && <TableHead>装箱数</TableHead>}
                  <TableHead className="text-center">数量</TableHead>
                  <TableHead className="text-right">单价</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.productName}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.productCode}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    {includeDimensions && <TableCell>{getDimensionDisplay(item)}</TableCell>}
                    {includeDimensions && <TableCell>{item.pcsPerCarton || '-'}</TableCell>}
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-20 text-center"
                        min={1}
                      />
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={includeDimensions ? 10 : 8} className="text-center py-8 text-muted-foreground">
                      暂无产品，请添加
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* 总计 */}
            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="text-lg">
                  总计：<span className="font-bold text-xl">{formatPrice(totalAmount)}</span>
                </div>
              </div>
            )}
            
            {/* 操作按钮 */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                上一步
              </Button>
              <Button onClick={() => setStep(3)} disabled={items.length === 0}>
                下一步
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 3: 导出 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>导出报价单</CardTitle>
            <CardDescription>
              确认信息无误后，点击导出按钮下载Excel报价单
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">产品数量</Label>
                <p className="text-2xl font-bold">{items.length} 个</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">总金额</Label>
                <p className="text-2xl font-bold">{formatPrice(totalAmount)}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">客户级别</Label>
                <p className="text-lg">{CUSTOMER_LEVELS[customerLevel]}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">货币</Label>
                <p className="text-lg">{CURRENCIES[currency].name}</p>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回编辑
              </Button>
              <Button onClick={handleExport} size="lg">
                <Download className="h-4 w-4 mr-2" />
                导出Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
