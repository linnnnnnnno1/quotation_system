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
import { ArrowLeft, ArrowRight, Download, Plus, Trash2, Search, Image as ImageIcon, RefreshCw, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

interface QuotationItemLocal {
  id: string;
  productId: number;
  productCode: string;
  productName: string;
  imageUrl?: string | null;
  quantity: number;
  customerLevel: CustomerLevel;
  unitPrice: number;
  retailPrice: number;
  smallBPrice: number;
  largeBPrice: number;
  bulkPrice: number;
  cheapPrice: number;
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
  const [searchMode, setSearchMode] = useState<'code' | 'name'>('code');
  const [step1SearchKeyword, setStep1SearchKeyword] = useState('');
  
  // Step 2: 预览编辑
  const [items, setItems] = useState<QuotationItemLocal[]>([]);
  const [currency, setCurrency] = useState<CurrencyType>('CNY');
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [includeDimensions, setIncludeDimensions] = useState(false);
  const [defaultCustomerLevel, setDefaultCustomerLevel] = useState<CustomerLevel>('retail');
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  
  // 搜索产品
  const [searchKeyword, setSearchKeyword] = useState('');
  const { data: allProducts, isLoading: isLoadingProducts } = trpc.products.list.useQuery();
  const { data: companyInfo } = trpc.company.getInfo.useQuery();
  
  const recordExportMutation = trpc.exports.record.useMutation();
  
  // Step 1 产品名称搜索结果
  const step1SearchResults = useMemo(() => {
    if (!step1SearchKeyword.trim() || !allProducts) return [];
    const keyword = step1SearchKeyword.toLowerCase().trim();
    return allProducts.filter(p => 
      p.productCode.toLowerCase().includes(keyword) ||
      p.productName.toLowerCase().includes(keyword)
    ).slice(0, 15);
  }, [step1SearchKeyword, allProducts]);
  
  // Step 2 本地搜索产品
  const searchResults = useMemo(() => {
    if (!searchKeyword.trim() || !allProducts) return [];
    const keyword = searchKeyword.toLowerCase().trim();
    return allProducts.filter(p => 
      p.productCode.toLowerCase().includes(keyword) ||
      p.productName.toLowerCase().includes(keyword)
    ).slice(0, 10);
  }, [searchKeyword, allProducts]);
  
  // 获取实时汇率
  const fetchExchangeRate = async () => {
    setIsLoadingRate(true);
    try {
      // 使用免费的汇率API
      const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
      if (response.ok) {
        const data = await response.json();
        if (data.usd && data.usd.cny) {
          const rate = data.usd.cny;
          setExchangeRate(Number(rate.toFixed(4)));
          toast.success(`汇率已更新: 1 USD = ${rate.toFixed(4)} CNY`);
          return;
        }
      }
      
      // 备用API
      const backupResponse = await fetch('https://open.er-api.com/v6/latest/USD');
      if (backupResponse.ok) {
        const backupData = await backupResponse.json();
        if (backupData.rates && backupData.rates.CNY) {
          const rate = backupData.rates.CNY;
          setExchangeRate(Number(rate.toFixed(4)));
          toast.success(`汇率已更新: 1 USD = ${rate.toFixed(4)} CNY`);
          return;
        }
      }
      
      toast.error('获取汇率失败，使用默认汇率');
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      toast.error('获取汇率失败，使用默认汇率');
    } finally {
      setIsLoadingRate(false);
    }
  };
  
  // 进入第2步时自动获取汇率
  useEffect(() => {
    if (step === 2 && currency === 'USD') {
      fetchExchangeRate();
    }
  }, [step]);
  
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
    if (!allProducts || allProducts.length === 0) {
      toast.error('产品数据尚未加载，请稍后重试');
      return;
    }
    
    const lines = batchInput.trim().split('\n').filter(line => line.trim());
    const newItems: QuotationItemLocal[] = [];
    const notFound: string[] = [];
    
    for (const line of lines) {
      const parts = line.split(/[\t,，\s]+/).filter(p => p.trim());
      if (parts.length < 1) continue;
      
      const code = parts[0].trim();
      const qty = parts.length >= 2 ? (parseInt(parts[1]) || 1) : 1;
      
      // 使用更宽松的匹配：包含匹配
      const product = allProducts.find(p => 
        p.productCode.toLowerCase() === code.toLowerCase() ||
        p.productCode.toLowerCase().includes(code.toLowerCase()) ||
        code.toLowerCase().includes(p.productCode.toLowerCase())
      );
      
      if (product) {
        newItems.push({
          id: `${product.id}-${Date.now()}-${Math.random()}`,
          productId: product.id,
          productCode: product.productCode,
          productName: product.productName,
          imageUrl: product.imageUrl,
          quantity: qty,
          customerLevel: defaultCustomerLevel,
          unitPrice: getPriceByLevel(product, defaultCustomerLevel),
          retailPrice: product.retailPrice,
          smallBPrice: product.smallBPrice,
          largeBPrice: product.largeBPrice,
          bulkPrice: product.bulkPrice,
          cheapPrice: product.cheapPrice,
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
    } else if (lines.length > 0) {
      toast.error('未找到任何有效产品，请检查产品编号是否正确');
    }
  };
  
  // 从搜索结果添加产品到批量输入
  const addToInputFromSearch = (product: any) => {
    const currentInput = batchInput.trim();
    const newLine = `${product.productCode} 1`;
    setBatchInput(currentInput ? `${currentInput}\n${newLine}` : newLine);
    setStep1SearchKeyword('');
    toast.success(`已添加 ${product.productCode} 到输入框`);
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
      customerLevel: defaultCustomerLevel,
      unitPrice: getPriceByLevel(product, defaultCustomerLevel),
      retailPrice: product.retailPrice,
      smallBPrice: product.smallBPrice,
      largeBPrice: product.largeBPrice,
      bulkPrice: product.bulkPrice,
      cheapPrice: product.cheapPrice,
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
  
  // 更新单个产品的客户级别
  const updateItemCustomerLevel = (id: string, level: CustomerLevel) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        customerLevel: level,
        unitPrice: getPriceByLevel(item, level),
      };
    }));
  };
  
  // 批量更新所有产品的客户级别
  const updateAllCustomerLevels = (level: CustomerLevel) => {
    setDefaultCustomerLevel(level);
    setItems(prev => prev.map(item => ({
      ...item,
      customerLevel: level,
      unitPrice: getPriceByLevel(item, level),
    })));
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
        customerLevel: item.customerLevel,
        length: item.length,
        width: item.width,
        height: item.height,
        pcsPerCarton: item.pcsPerCarton,
        unitWeight: item.unitWeight,
        unitVolume: item.unitVolume,
        note: item.note,
      }));
      
      // 图片代理函数 - 使用正确的tRPC调用格式
      const imageProxyFn = async (url: string): Promise<string | null> => {
        try {
          // 正确的tRPC batch格式
          const input = encodeURIComponent(JSON.stringify({ "0": { "json": url } }));
          const response = await fetch(`/api/trpc/imageProxy?batch=1&input=${input}`);
          const data = await response.json();
          
          // 处理batch响应格式
          if (data && data[0] && data[0].result && data[0].result.data && data[0].result.data.json) {
            const result = data[0].result.data.json;
            if (result.success) {
              return result.data;
            }
          }
          return null;
        } catch (error) {
          console.error('Image proxy error:', error);
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
              每行输入一个产品，格式：产品编号 数量（用空格、Tab或逗号分隔），数量可省略默认为1
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingProducts && (
              <div className="text-sm text-muted-foreground">正在加载产品数据...</div>
            )}
            
            {allProducts && (
              <div className="text-sm text-muted-foreground">
                已加载 {allProducts.length} 个产品
              </div>
            )}
            
            {/* 产品搜索功能 */}
            <div className="space-y-2">
              <Label>搜索产品（按编号或名称）</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="输入产品编号或名称搜索..."
                  value={step1SearchKeyword}
                  onChange={(e) => setStep1SearchKeyword(e.target.value)}
                  className="pl-9"
                />
                {step1SearchResults.length > 0 && step1SearchKeyword && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
                    {step1SearchResults.map((product) => (
                      <div
                        key={product.id}
                        className="p-3 hover:bg-muted cursor-pointer flex items-center justify-between"
                        onClick={() => addToInputFromSearch(product)}
                      >
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="w-8 h-8 object-cover rounded" />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <span className="font-medium">{product.productCode}</span>
                            <span className="text-muted-foreground ml-2">{product.productName}</span>
                          </div>
                        </div>
                        <Plus className="h-4 w-4" />
                      </div>
                    ))}
                  </div>
                )}
                {step1SearchKeyword && step1SearchResults.length === 0 && !isLoadingProducts && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 p-3 text-muted-foreground">
                    未找到匹配的产品
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>产品列表</Label>
              <Textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder={`示例：\nPROD001 10\nPROD002 5\nPROD003`}
                rows={10}
                className="font-mono"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                提示：在下一步可以为每个产品单独选择客户级别
              </div>
              <Button onClick={parseBatchInput} disabled={!batchInput.trim() || isLoadingProducts}>
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
              检查产品列表，调整数量和客户级别，设置货币和导出选项
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 设置区域 */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label>货币</Label>
                <Select value={currency} onValueChange={(v) => {
                  setCurrency(v as CurrencyType);
                  if (v === 'USD') {
                    fetchExchangeRate();
                  }
                }}>
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
                  <Label>汇率 (1 USD =</Label>
                  <Input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || DEFAULT_EXCHANGE_RATE)}
                    className="w-24"
                    step="0.0001"
                  />
                  <span className="text-sm">CNY)</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={fetchExchangeRate}
                    disabled={isLoadingRate}
                    title="获取实时汇率"
                  >
                    {isLoadingRate ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={includeDimensions}
                  onCheckedChange={setIncludeDimensions}
                />
                <Label>导出尺寸信息</Label>
              </div>
              
              <div className="flex items-center gap-2 ml-auto">
                <Label>批量设置级别</Label>
                <Select value={defaultCustomerLevel} onValueChange={(v) => updateAllCustomerLevels(v as CustomerLevel)}>
                  <SelectTrigger className="w-32">
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
            
            {/* 搜索添加产品 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索产品编号或名称添加..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
              />
              {searchResults.length > 0 && searchKeyword && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-muted cursor-pointer flex items-center justify-between"
                      onClick={() => addProduct(product)}
                    >
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-8 h-8 object-cover rounded" />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium">{product.productCode}</span>
                          <span className="text-muted-foreground ml-2">{product.productName}</span>
                        </div>
                      </div>
                      <Plus className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              )}
              {searchKeyword && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 p-3 text-muted-foreground">
                  未找到匹配的产品
                </div>
              )}
            </div>
            
            {/* 产品列表 - 调整列顺序 */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>产品编号</TableHead>
                    <TableHead>产品名称</TableHead>
                    <TableHead className="w-16">图片</TableHead>
                    <TableHead className="w-32">客户级别</TableHead>
                    <TableHead className="text-center w-24">数量</TableHead>
                    <TableHead className="text-right">单价</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    {includeDimensions && <TableHead className="text-center">一箱X套</TableHead>}
                    {includeDimensions && <TableHead>尺寸</TableHead>}
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productCode}</TableCell>
                      <TableCell>{item.productName}</TableCell>
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
                      <TableCell>
                        <Select 
                          value={item.customerLevel} 
                          onValueChange={(v) => updateItemCustomerLevel(item.id, v as CustomerLevel)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CUSTOMER_LEVELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-20 text-center h-8"
                          min={1}
                        />
                      </TableCell>
                      <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </TableCell>
                      {includeDimensions && (
                        <TableCell className="text-center">
                          {item.pcsPerCarton ? `一箱${item.pcsPerCarton}套` : '-'}
                        </TableCell>
                      )}
                      {includeDimensions && <TableCell>{getDimensionDisplay(item)}</TableCell>}
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
                        暂无产品，请在上方搜索添加或返回上一步批量输入
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
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
                <Label className="text-muted-foreground">货币</Label>
                <p className="text-lg">{CURRENCIES[currency].name}</p>
              </div>
              {currency === 'USD' && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">汇率</Label>
                  <p className="text-lg">1 USD = {exchangeRate} CNY</p>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-muted-foreground">包含尺寸信息</Label>
                <p className="text-lg">{includeDimensions ? '是' : '否'}</p>
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
