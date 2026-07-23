import { Routes, Route, Navigate } from "react-router";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
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
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
