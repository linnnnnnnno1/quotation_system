import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Edit, Trash2, Image as ImageIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface ProductFormData {
  productCode: string;
  productName: string;
  description: string;
  imageUrl: string;
  retailPrice: number;
  smallBPrice: number;
  largeBPrice: number;
  bulkPrice: number;
  cheapPrice: number;
  length: string;
  width: string;
  height: string;
  pcsPerCarton: number;
  unitWeight: string;
  unitVolume: string;
  note: string;
}

const emptyFormData: ProductFormData = {
  productCode: '',
  productName: '',
  description: '',
  imageUrl: '',
  retailPrice: 0,
  smallBPrice: 0,
  largeBPrice: 0,
  bulkPrice: 0,
  cheapPrice: 0,
  length: '',
  width: '',
  height: '',
  pcsPerCarton: 0,
  unitWeight: '',
  unitVolume: '',
  note: '',
};

export default function ProductManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData);
  
  const { data: products, refetch } = trpc.products.list.useQuery();
  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success('产品添加成功');
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success('产品更新成功');
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const updateNonPriceMutation = trpc.products.updateNonPrice.useMutation({
    onSuccess: () => {
      toast.success('产品信息更新成功');
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success('产品删除成功');
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const filteredProducts = products?.filter(p => 
    p.productCode.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    p.productName.toLowerCase().includes(searchKeyword.toLowerCase())
  ) || [];
  
  const handleOpenDialog = useCallback((product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        productCode: product.productCode,
        productName: product.productName,
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        retailPrice: product.retailPrice / 100,
        smallBPrice: product.smallBPrice / 100,
        largeBPrice: product.largeBPrice / 100,
        bulkPrice: product.bulkPrice / 100,
        cheapPrice: product.cheapPrice / 100,
        length: product.length || '',
        width: product.width || '',
        height: product.height || '',
        pcsPerCarton: product.pcsPerCarton || 0,
        unitWeight: product.unitWeight || '',
        unitVolume: product.unitVolume || '',
        note: product.note || '',
      });
    } else {
      setEditingProduct(null);
      setFormData(emptyFormData);
    }
    setIsDialogOpen(true);
  }, []);
  
  const handleSubmit = useCallback(() => {
    const data = {
      productCode: formData.productCode,
      productName: formData.productName,
      description: formData.description || null,
      imageUrl: formData.imageUrl || null,
      retailPrice: Math.round(formData.retailPrice * 100),
      smallBPrice: Math.round(formData.smallBPrice * 100),
      largeBPrice: Math.round(formData.largeBPrice * 100),
      bulkPrice: Math.round(formData.bulkPrice * 100),
      cheapPrice: Math.round(formData.cheapPrice * 100),
      length: formData.length || null,
      width: formData.width || null,
      height: formData.height || null,
      pcsPerCarton: formData.pcsPerCarton || null,
      unitWeight: formData.unitWeight || null,
      unitVolume: formData.unitVolume || null,
      note: formData.note || null,
    };
    
    if (editingProduct) {
      if (isAdmin) {
        updateMutation.mutate({ id: editingProduct.id, ...data });
      } else {
        // 业务员只能更新非价格字段
        const nonPriceData = {
          id: editingProduct.id,
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
        updateNonPriceMutation.mutate(nonPriceData);
      }
    } else {
      createMutation.mutate(data);
    }
  }, [formData, editingProduct, isAdmin, createMutation, updateMutation, updateNonPriceMutation]);
  
  const handleDelete = useCallback((id: number) => {
    if (confirm('确定要删除这个产品吗？')) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);
  
  const updateFormField = useCallback((field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);
  
  // 自动计算体积
  useEffect(() => {
    if (formData.length && formData.width && formData.height) {
      const volume = (parseFloat(formData.length) * parseFloat(formData.width) * parseFloat(formData.height)) / 1000000;
      setFormData(prev => ({ ...prev, unitVolume: volume.toFixed(4) }));
    }
  }, [formData.length, formData.width, formData.height]);
  
  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>产品管理</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索产品编号或名称..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            {isAdmin && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                添加产品
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">图片</TableHead>
                <TableHead>产品编号</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead className="text-right">零售价</TableHead>
                <TableHead className="text-right">小B价</TableHead>
                <TableHead className="text-right">大B价</TableHead>
                <TableHead className="text-right">批发价</TableHead>
                <TableHead className="text-right">白菜价</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.productName}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.productCode}</TableCell>
                  <TableCell>{product.productName}</TableCell>
                  <TableCell className="text-right">¥{(product.retailPrice / 100).toFixed(2)}</TableCell>
                  <TableCell className="text-right">¥{(product.smallBPrice / 100).toFixed(2)}</TableCell>
                  <TableCell className="text-right">¥{(product.largeBPrice / 100).toFixed(2)}</TableCell>
                  <TableCell className="text-right">¥{(product.bulkPrice / 100).toFixed(2)}</TableCell>
                  <TableCell className="text-right">¥{(product.cheapPrice / 100).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    暂无产品数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? '编辑产品' : '添加产品'}</DialogTitle>
            {!isAdmin && editingProduct && (
              <p className="text-sm text-muted-foreground">
                注意：业务员只能修改非价格信息，价格字段为只读
              </p>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-150px)] pr-4">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>产品编号 *</Label>
                  <Input
                    value={formData.productCode}
                    onChange={(e) => updateFormField('productCode', e.target.value)}
                    placeholder="输入产品编号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>产品名称 *</Label>
                  <Input
                    value={formData.productName}
                    onChange={(e) => updateFormField('productName', e.target.value)}
                    placeholder="输入产品名称"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>产品描述</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => updateFormField('description', e.target.value)}
                  placeholder="输入产品描述"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>图片URL</Label>
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => updateFormField('imageUrl', e.target.value)}
                  placeholder="输入图片链接"
                />
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">
                  价格信息（单位：元）
                  {!isAdmin && <span className="text-sm text-muted-foreground ml-2">- 只读</span>}
                </h4>
                <div className="grid grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>零售价</Label>
                    <Input
                      type="number"
                      value={formData.retailPrice}
                      onChange={(e) => updateFormField('retailPrice', parseFloat(e.target.value) || 0)}
                      disabled={!isAdmin && !!editingProduct}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>小B价</Label>
                    <Input
                      type="number"
                      value={formData.smallBPrice}
                      onChange={(e) => updateFormField('smallBPrice', parseFloat(e.target.value) || 0)}
                      disabled={!isAdmin && !!editingProduct}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>大B价</Label>
                    <Input
                      type="number"
                      value={formData.largeBPrice}
                      onChange={(e) => updateFormField('largeBPrice', parseFloat(e.target.value) || 0)}
                      disabled={!isAdmin && !!editingProduct}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>批发价</Label>
                    <Input
                      type="number"
                      value={formData.bulkPrice}
                      onChange={(e) => updateFormField('bulkPrice', parseFloat(e.target.value) || 0)}
                      disabled={!isAdmin && !!editingProduct}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>白菜价</Label>
                    <Input
                      type="number"
                      value={formData.cheapPrice}
                      onChange={(e) => updateFormField('cheapPrice', parseFloat(e.target.value) || 0)}
                      disabled={!isAdmin && !!editingProduct}
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">尺寸信息</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>长度（cm）</Label>
                    <Input
                      type="number"
                      value={formData.length}
                      onChange={(e) => updateFormField('length', e.target.value)}
                      placeholder="长度"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>宽度（cm）</Label>
                    <Input
                      type="number"
                      value={formData.width}
                      onChange={(e) => updateFormField('width', e.target.value)}
                      placeholder="宽度"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>高度（cm）</Label>
                    <Input
                      type="number"
                      value={formData.height}
                      onChange={(e) => updateFormField('height', e.target.value)}
                      placeholder="高度"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>每箱数量</Label>
                    <Input
                      type="number"
                      value={formData.pcsPerCarton}
                      onChange={(e) => updateFormField('pcsPerCarton', parseInt(e.target.value) || 0)}
                      placeholder="每箱数量"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>单件重量（kg）</Label>
                    <Input
                      type="number"
                      value={formData.unitWeight}
                      onChange={(e) => updateFormField('unitWeight', e.target.value)}
                      placeholder="重量"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>单件体积（m³）</Label>
                    <Input
                      type="number"
                      value={formData.unitVolume}
                      onChange={(e) => updateFormField('unitVolume', e.target.value)}
                      placeholder="自动计算"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => updateFormField('note', e.target.value)}
                  placeholder="输入备注信息"
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>
              {editingProduct ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
