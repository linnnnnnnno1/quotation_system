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
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/products"} component={ProductManagement} />
        <Route path={"/import"} component={ProductImport} />
        <Route path={"/quotation"} component={QuotationFlow} />
        <Route path={"/company"} component={CompanySettings} />
        <Route path={"/users"} component={AdminUsers} />
        <Route path={"/logs"} component={AdminLogs} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
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
