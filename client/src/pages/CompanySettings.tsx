import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function CompanySettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const { data: companyInfo, refetch } = trpc.company.getInfo.useQuery();
  const updateMutation = trpc.company.updateInfo.useMutation({
    onSuccess: () => {
      toast.success('公司信息保存成功');
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    bankAccount: '',
  });
  
  useEffect(() => {
    if (companyInfo) {
      setFormData({
        companyName: companyInfo.companyName || '',
        address: companyInfo.address || '',
        phone: companyInfo.phone || '',
        email: companyInfo.email || '',
        website: companyInfo.website || '',
        taxId: companyInfo.taxId || '',
        bankAccount: companyInfo.bankAccount || '',
      });
    }
  }, [companyInfo]);
  
  const handleSubmit = () => {
    if (!formData.companyName) {
      toast.error('请输入公司名称');
      return;
    }
    updateMutation.mutate(formData);
  };
  
  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">只有管理员可以修改公司信息</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>公司信息设置</CardTitle>
          <CardDescription>
            设置报价单抬头显示的公司信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>公司名称 *</Label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="输入公司名称"
              />
            </div>
            <div className="space-y-2">
              <Label>联系电话</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="输入联系电话"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>公司地址</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="输入公司地址"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>电子邮箱</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="输入电子邮箱"
              />
            </div>
            <div className="space-y-2">
              <Label>公司网站</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="输入公司网站"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>税号</Label>
              <Input
                value={formData.taxId}
                onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                placeholder="输入税号"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>银行账户信息</Label>
            <Textarea
              value={formData.bankAccount}
              onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
              placeholder="输入银行账户信息"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              保存设置
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
