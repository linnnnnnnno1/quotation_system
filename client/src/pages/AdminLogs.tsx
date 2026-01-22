import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

const operationTypeLabels: Record<string, string> = {
  create_product: '创建产品',
  update_product: '更新产品',
  update_product_info: '更新产品信息',
  delete_product: '删除产品',
  create_quotation: '创建报价单',
  update_company: '更新公司信息',
  create_user: '添加用户',
  update_user_status: '更新用户状态',
  delete_user: '删除用户',
  export: '导出报价单',
};

export default function AdminLogs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const { data: allLogs } = trpc.logs.getAllLogs.useQuery(undefined, {
    enabled: isAdmin,
  });
  
  const { data: userLogs } = trpc.logs.getUserLogs.useQuery();
  
  const { data: exportHistory } = trpc.exports.getUserExports.useQuery();
  
  const logs = isAdmin ? allLogs : userLogs;
  
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>操作日志</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="logs">
            <TabsList>
              <TabsTrigger value="logs">操作记录</TabsTrigger>
              <TabsTrigger value="exports">导出历史</TabsTrigger>
            </TabsList>
            
            <TabsContent value="logs" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    {isAdmin && <TableHead>用户</TableHead>}
                    <TableHead>操作类型</TableHead>
                    <TableHead>描述</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>{log.userName || `用户${log.userId}`}</TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline">
                          {operationTypeLabels[log.operationType] || log.operationType}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.description}</TableCell>
                    </TableRow>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 4 : 3} className="text-center py-8 text-muted-foreground">
                        暂无操作记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="exports" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>文件名</TableHead>
                    <TableHead>详情</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportHistory?.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(record.exportedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{record.fileName}</TableCell>
                      <TableCell>
                        {record.exportData ? (() => {
                          try {
                            const data = JSON.parse(record.exportData);
                            return `${data.items || 0} 个产品`;
                          } catch {
                            return '-';
                          }
                        })() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!exportHistory || exportHistory.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        暂无导出记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
