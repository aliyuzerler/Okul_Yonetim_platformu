import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "@/shared/auth/AuthContext";
import Loading from "@/shared/ui/Loading";

import { lazy as lazyComponent } from "react";

const Landing = lazyComponent(() => import("@/pages/Landing"));
const Register = lazyComponent(() => import("@/pages/Register"));
const VerifyEmail = lazyComponent(() => import("@/pages/VerifyEmail"));
const Login = lazyComponent(() => import("@/pages/Login"));
const ForgotPassword = lazyComponent(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazyComponent(() => import("@/pages/ResetPassword"));
const PanelLayout = lazyComponent(() => import("@/pages/PanelLayout"));
const Subscription = lazyComponent(() => import("@/pages/panel/Subscription"));
const PaymentResult = lazyComponent(() => import("@/pages/panel/PaymentResult"));
const AdminDashboard = lazyComponent(() => import("@/pages/admin/Dashboard"));
const AdminTenants = lazyComponent(() => import("@/pages/admin/Tenants"));
const AdminPayments = lazyComponent(() => import("@/pages/admin/Payments"));

function RequireRole({ role, children }: { role: "tenant_admin" | "super_admin"; children: React.ReactNode }) {
  const { me, loading } = useAuth();
  if (loading) return <Loading />;
  if (!me) return <Navigate to="/giris" replace />;
  if (me.role !== role) return <Navigate to={me.role === "super_admin" ? "/yonetim" : "/panel/abonelik"} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/kayit" element={<Register />} />
      <Route path="/e-posta-dogrula" element={<VerifyEmail />} />
      <Route path="/giris" element={<Login />} />
      <Route path="/sifremi-unuttum" element={<ForgotPassword />} />
      <Route path="/sifre-sifirla" element={<ResetPassword />} />

      <Route
        path="/panel"
        element={
          <RequireRole role="tenant_admin">
            <PanelLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="/panel/abonelik" replace />} />
        <Route path="abonelik" element={<Subscription />} />
        <Route path="odeme-sonuc" element={<PaymentResult />} />
      </Route>

      <Route
        path="/yonetim"
        element={
          <RequireRole role="super_admin">
            <PanelLayout admin />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="/yonetim/ozet" replace />} />
        <Route path="ozet" element={<AdminDashboard />} />
        <Route path="okullar" element={<AdminTenants />} />
        <Route path="odemeler" element={<AdminPayments />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
