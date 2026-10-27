import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@carbon/react";
import { WarningAltFilled } from "@carbon/icons-react";
import { useLocation } from "react-router";

interface State {
  error: Error | null;
}

class Boundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error("Route render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="os-error-fallback">
        <div className="os-error-fallback__inner">
          <WarningAltFilled size={32} className="os-error-fallback__icon" />
          <h1 className="os-error-fallback__title">Bu sayfada hata oluştu</h1>
          <p className="os-error-fallback__text">Uygulamanın geri kalanı çalışıyor. Bu sayfayı yeniden denemek için sayfayı yenileyin.</p>
          <Button kind="primary" onClick={() => window.location.reload()}>
            Sayfayı yenile
          </Button>
        </div>
      </div>
    );
  }
}

// Isolates one route's render error; navigating to another route resets it.
export default function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
}
