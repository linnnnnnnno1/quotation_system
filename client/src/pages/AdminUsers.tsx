import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminUsers() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'user' as 'user' | 'admin',
  });
  
  const { data: users, refetch } = trpc.users.list.useQuery(undefined, {
    enabled: isAdmin,
  });
  
  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success('用户添加成功');
      setIsDialogOpen(false);
      setNewUser({ email: '', name: '', role: 'user' });
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const updateStatusMutation = trpc.users.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('用户状态已更新');
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success('用户已删除');
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const handleAddUser = () => {
    if (!newUser.email) {
      toast.error('请输入邮箱');
      return;
    }
    createMutation.mutate({
      openId: `manual-${Date.now()}`,
      email: newUser.email,
      name: newUser.name || null,
      role: newUser.role,
    });
  };
  
  const handleToggleStatus = (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    updateStatusMutation.mutate({ id: userId, status: newStatus });
  };
  
  const handleDelete = (userId: number) => {
    if (confirm('确定要删除这个用户吗？')) {
      deleteMutation.mutate(userId);
    }
  };
  
  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">只有管理员可以访问用户管理</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>用户管理</CardTitle>
          <Button onClick={() => setIsDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            添加用户
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>登录方式</TableHead>
                <TableHead>最后登录</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{u.name || '-'}</TableCell>
                  <TableCell>{u.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role === 'admin' ? '管理员' : '业务员'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'active' ? 'default' : 'destructive'}>
                      {u.status === 'active' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.loginMethod || '-'}</TableCell>
                  <TableCell>
                    {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleString() : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={u.status === 'active'}
                        onCheckedChange={() => handleToggleStatus(u.id, u.status)}
                        disabled={u.id === user?.id}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === user?.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!users || users.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    暂无用户数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>邮箱 *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                placeholder="输入用户邮箱"
              />
            </div>
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                placeholder="输入用户姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select 
                value={newUser.role} 
                onValueChange={(v) => setNewUser(prev => ({ ...prev, role: v as 'user' | 'admin' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">业务员</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
            <Button onClick={handleAddUser}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
