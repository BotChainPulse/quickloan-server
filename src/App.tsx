import { Routes, Route, Navigate } from "react-router";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { lazy, Suspense } from "react";
const Dashboard = lazy(() => import("./pages/Dashboard"));
import BorrowerAccount from "./pages/BorrowerAccount";
import Calculator from "./pages/Calculator";
import Privacy from "./pages/Privacy";
import Help from "./pages/Help";
import BorrowerHome from "./pages/BorrowerHome";
import Apply from "./pages/Apply";
import MyLoan from "./pages/MyLoan";
import AuthLayout from "./components/AuthLayout";
import { useAuth } from "./hooks/useAuth";
import { LOGIN_PATH } from "./const";

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to={LOGIN_PATH} replace />;
  return <AuthLayout>{children}</AuthLayout>;
}

export default function App() {
  return (
    <Suspense
      fallback={
        <p className="p-6" role="status">
          Loading Quick Loan…
        </p>
      }
    >
      <Routes>
        <Route path="/" element={<BorrowerHome />} />
        <Route path="/account" element={<BorrowerAccount />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/help" element={<Help />} />
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/status" element={<MyLoan />} />
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
