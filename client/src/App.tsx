import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ProductManagement from "./pages/ProductManagement";
import ProductImport from "./pages/ProductImport";
import QuotationFlow from "./pages/QuotationFlow";
import CompanySettings from "./pages/CompanySettings";
import AdminUsers from "./pages/AdminUsers";
import AdminLogs from "./pages/AdminLogs";

function Router() {
  return (
    <Switch>
      {/* 首页不使用侧边栏布局 */}
      <Route path={"/"} component={Home} />
      
      {/* 其他页面使用DashboardLayout */}
      <Route path={"/products"}>
        <DashboardLayout>
          <ProductManagement />
        </DashboardLayout>
      </Route>
      <Route path={"/import"}>
        <DashboardLayout>
          <ProductImport />
        </DashboardLayout>
      </Route>
      <Route path={"/quotation"}>
        <DashboardLayout>
          <QuotationFlow />
        </DashboardLayout>
      </Route>
      <Route path={"/company"}>
        <DashboardLayout>
          <CompanySettings />
        </DashboardLayout>
      </Route>
      <Route path={"/users"}>
        <DashboardLayout>
          <AdminUsers />
        </DashboardLayout>
      </Route>
      <Route path={"/logs"}>
        <DashboardLayout>
          <AdminLogs />
        </DashboardLayout>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
