import { NavLink, Outlet, useNavigate } from "react-router";
import { Button } from "@carbon/react";
import { Enterprise } from "@carbon/icons-react";
import { useAuth } from "@/shared/auth/AuthContext";

// Shared shell for tenant panel (/panel/*) and super-admin (/yonetim/*).
export default function PanelLayout({ admin = false }: { admin?: boolean }) {
  const { me, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/giris", { replace: true });
  };

  return (
    <div className="pl-shell">
      <header className="pl-header">
        <Link0 />
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span style={{ color: "var(--pl-muted)", fontSize: "0.9rem" }}>{me?.email}</span>
          <Button size="sm" kind="ghost" onClick={handleLogout}>
            Çıkış
          </Button>
        </div>
      </header>

      <main className="pl-main">
        <div className="pl-panel">
          <nav className="pl-sidenav">
            {admin ? (
              <>
                <NavLink to="/yonetim/ozet" className={({ isActive }) => (isActive ? "active" : "")}>
                  Gelir özeti
                </NavLink>
                <NavLink to="/yonetim/okullar" className={({ isActive }) => (isActive ? "active" : "")}>
                  Okullar
                </NavLink>
                <NavLink to="/yonetim/odemeler" className={({ isActive }) => (isActive ? "active" : "")}>
                  Ödemeler
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/panel/abonelik" className={({ isActive }) => (isActive ? "active" : "")}>
                  Aboneliğim
                </NavLink>
              </>
            )}
          </nav>
          <div>
            <Outlet />
          </div>
        </div>
      </main>

      <footer className="pl-footer">
        <span>OpenSchool Platform</span>
        <span>Ödemeler iyzico güvencesiyle</span>
      </footer>
    </div>
  );
}

function Link0() {
  return (
    <span className="pl-brand">
      <Enterprise size={22} />
      OpenSchool Platform
    </span>
  );
}
