import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface ImportRow {
  productCode: string;
  productName: string;
  description?: string;
  imageUrl?: string;
  retailPrice: number;
  smallBPrice: number;
  largeBPrice: number;
  bulkPrice: number;
  cheapPrice: number;
  length?: string;
  width?: string;
  height?: string;
  pcsPerCarton?: number;
  unitWeight?: string;
  unitVolume?: string;
  note?: string;
  status?: 'pending' | 'success' | 'error';
  error?: string;
}

export default function ProductImport() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createMutation = trpc.products.create.useMutation();
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const rows: ImportRow[] = jsonData.map((row: any) => ({
        productCode: String(row['产品编号'] || row['productCode'] || ''),
        productName: String(row['产品名称'] || row['productName'] || ''),
        description: row['描述'] || row['description'] || '',
        imageUrl: row['图片URL'] || row['imageUrl'] || '',
        retailPrice: parseFloat(row['零售价'] || row['retailPrice'] || 0) * 100,
        smallBPrice: parseFloat(row['小B价'] || row['smallBPrice'] || 0) * 100,
        largeBPrice: parseFloat(row['大B价'] || row['largeBPrice'] || 0) * 100,
        bulkPrice: parseFloat(row['批发价'] || row['bulkPrice'] || 0) * 100,
        cheapPrice: parseFloat(row['白菜价'] || row['cheapPrice'] || 0) * 100,
        length: row['长度'] || row['length'] || '',
        width: row['宽度'] || row['width'] || '',
        height: row['高度'] || row['height'] || '',
        pcsPerCarton: parseInt(row['每箱数量'] || row['pcsPerCarton'] || 0),
        unitWeight: row['重量'] || row['unitWeight'] || '',
        unitVolume: row['体积'] || row['unitVolume'] || '',
        note: row['备注'] || row['note'] || '',
        status: 'pending',
      }));
      
      setImportData(rows);
      toast.success(`已解析 ${rows.length} 条产品数据`);
    } catch (error) {
      toast.error('文件解析失败，请检查文件格式');
    }
    
    // 清空input以便重新选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleImport = async () => {
    if (!isAdmin) {
      toast.error('只有管理员可以导入产品');
      return;
    }
    
    setIsImporting(true);
    const updatedData = [...importData];
    
    for (let i = 0; i < updatedData.length; i++) {
      const row = updatedData[i];
      try {
        await createMutation.mutateAsync({
          productCode: row.productCode,
          productName: row.productName,
          description: row.description || null,
          imageUrl: row.imageUrl || null,
          retailPrice: row.retailPrice,
          smallBPrice: row.smallBPrice,
          largeBPrice: row.largeBPrice,
          bulkPrice: row.bulkPrice,
          cheapPrice: row.cheapPrice,
          length: row.length || null,
          width: row.width || null,
          height: row.height || null,
          pcsPerCarton: row.pcsPerCarton || null,
          unitWeight: row.unitWeight || null,
          unitVolume: row.unitVolume || null,
          note: row.note || null,
        });
        updatedData[i] = { ...row, status: 'success' };
      } catch (error: any) {
        updatedData[i] = { ...row, status: 'error', error: error.message };
      }
      setImportData([...updatedData]);
    }
    
    setIsImporting(false);
    const successCount = updatedData.filter(r => r.status === 'success').length;
    const errorCount = updatedData.filter(r => r.status === 'error').length;
    toast.success(`导入完成：成功 ${successCount} 条，失败 ${errorCount} 条`);
  };
  
  const downloadTemplate = () => {
    const template = [
      {
        '产品编号': 'PROD001',
        '产品名称': '示例产品',
        '描述': '产品描述',
        '图片URL': 'https://example.com/image.jpg',
        '零售价': 100,
        '小B价': 90,
        '大B价': 80,
        '批发价': 70,
        '白菜价': 60,
        '长度': 10,
        '宽度': 10,
        '高度': 10,
        '每箱数量': 12,
        '重量': 0.5,
        '体积': 0.001,
        '备注': '备注信息',
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '产品模板');
    XLSX.writeFile(wb, '产品导入模板.xlsx');
  };
  
  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">只有管理员可以批量导入产品</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>批量导入产品</CardTitle>
          <CardDescription>
            上传Excel文件批量导入产品数据，支持 .xlsx 和 .xls 格式
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              选择文件
            </Button>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              下载模板
            </Button>
          </div>
          
          {importData.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  共 {importData.length} 条数据待导入
                </p>
                <Button onClick={handleImport} disabled={isImporting}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {isImporting ? '导入中...' : '开始导入'}
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">状态</TableHead>
                      <TableHead>产品编号</TableHead>
                      <TableHead>产品名称</TableHead>
                      <TableHead className="text-right">零售价</TableHead>
                      <TableHead className="text-right">小B价</TableHead>
                      <TableHead className="text-right">大B价</TableHead>
                      <TableHead>错误信息</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {row.status === 'pending' && <span className="text-muted-foreground">待导入</span>}
                          {row.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                          {row.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                        </TableCell>
                        <TableCell className="font-medium">{row.productCode}</TableCell>
                        <TableCell>{row.productName}</TableCell>
                        <TableCell className="text-right">¥{(row.retailPrice / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right">¥{(row.smallBPrice / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right">¥{(row.largeBPrice / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-red-500 text-sm">{row.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
