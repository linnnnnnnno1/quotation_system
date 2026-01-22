import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Package, FileText, Users, History, ArrowRight, LogIn } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const { data: products } = trpc.products.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: exportHistory } = trpc.exports.getUserExports.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              外贸报价管理系统
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              高效管理产品信息，快速生成专业报价单，支持多级价格体系和Excel导出
            </p>
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>
                <LogIn className="h-5 w-5 mr-2" />
                登录系统
              </a>
            </Button>
            
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <Package className="h-10 w-10 text-blue-500 mb-4 mx-auto" />
                <h3 className="font-semibold text-lg mb-2">产品管理</h3>
                <p className="text-gray-600 text-sm">
                  支持多级价格体系、批量导入、尺寸信息管理
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <FileText className="h-10 w-10 text-green-500 mb-4 mx-auto" />
                <h3 className="font-semibold text-lg mb-2">报价生成</h3>
                <p className="text-gray-600 text-sm">
                  三步流程快速生成报价单，支持货币切换
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <History className="h-10 w-10 text-purple-500 mb-4 mx-auto" />
                <h3 className="font-semibold text-lg mb-2">操作追踪</h3>
                <p className="text-gray-600 text-sm">
                  完整的操作日志和导出历史记录
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">欢迎回来，{user?.name || '用户'}</h1>
          <p className="text-muted-foreground">
            {isAdmin ? '管理员' : '业务员'} · {user?.email}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">产品总数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">导出次数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exportHistory?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">角色</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isAdmin ? '管理员' : '业务员'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">最近登录</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString() : '-'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用功能入口</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/quotation">
              <Button variant="outline" className="w-full justify-between">
                生成报价单
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" className="w-full justify-between">
                产品管理
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/import">
                <Button variant="outline" className="w-full justify-between">
                  批量导入
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>权限说明</CardTitle>
            <CardDescription>
              {isAdmin ? '管理员权限' : '业务员权限'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  查看和管理所有产品信息
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  修改产品价格和所有字段
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  批量导入产品
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  管理用户和公司信息
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  查看所有操作日志
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  查看所有产品信息
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  编辑产品非价格字段（编号、名称、描述、图片、尺寸、备注）
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  生成和导出报价单
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  无法修改产品价格
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  无法添加或删除产品
                </li>
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
