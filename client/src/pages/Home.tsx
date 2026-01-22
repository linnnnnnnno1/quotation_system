import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Package, FileText, Users, History, LogIn, Settings, Upload, ClipboardList, LogOut } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const { data: products } = trpc.products.list.useQuery(undefined, {
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
  
  // 已登录用户的首页 - 单页面集中显示
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">报价管理系统</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.name || '用户'} ({isAdmin ? '管理员' : '业务员'})
            </span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4 mr-1" />
              退出
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* 欢迎信息 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">滴滴，{user?.name || '用户'}</h2>
          <p className="text-gray-600 mt-1">{user?.email}</p>
        </div>
        
        {/* 功能入口 - 放在最上面 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/quotation">
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-green-500 mb-3" />
                <span className="font-medium">生成报价单</span>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/products">
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Package className="h-12 w-12 text-blue-500 mb-3" />
                <span className="font-medium">产品管理</span>
              </CardContent>
            </Card>
          </Link>
          
          {isAdmin && (
            <Link href="/import">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Upload className="h-12 w-12 text-orange-500 mb-3" />
                  <span className="font-medium">批量导入</span>
                </CardContent>
              </Card>
            </Link>
          )}
          
          {isAdmin && (
            <Link href="/company">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Settings className="h-12 w-12 text-gray-500 mb-3" />
                  <span className="font-medium">公司设置</span>
                </CardContent>
              </Card>
            </Link>
          )}
          
          {isAdmin && (
            <Link href="/users">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Users className="h-12 w-12 text-purple-500 mb-3" />
                  <span className="font-medium">用户管理</span>
                </CardContent>
              </Card>
            </Link>
          )}
          
          {isAdmin && (
            <Link href="/logs">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <ClipboardList className="h-12 w-12 text-indigo-500 mb-3" />
                  <span className="font-medium">操作日志</span>
                </CardContent>
              </Card>
            </Link>
          )}
          
          {/* 产品总数放在操作日志后面 */}
          <Card className="h-full">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Package className="h-12 w-12 text-cyan-500 mb-3" />
              <span className="font-medium">产品总数</span>
              <span className="text-2xl font-bold mt-2">{products?.length || 0}</span>
            </CardContent>
          </Card>
        </div>
        
        {/* 权限说明 */}
        <Card>
          <CardHeader>
            <CardTitle>权限说明</CardTitle>
            <CardDescription>
              {isAdmin ? '管理员权限' : '业务员权限'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
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
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  查看所有产品信息
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  编辑产品非价格字段
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
      </main>
    </div>
  );
}
