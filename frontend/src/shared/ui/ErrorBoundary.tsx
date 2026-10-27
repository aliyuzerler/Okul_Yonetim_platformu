import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@carbon/react";
import { WarningAltFilled } from "@carbon/icons-react";

interface State {
  error: Error | null;
}

// Last-resort guard so an unhandled render error never blanks the whole page.
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="os-error-fallback os-error-fallback--full">
        <div className="os-error-fallback__inner">
          <WarningAltFilled size={32} className="os-error-fallback__icon" />
          <h1 className="os-error-fallback__title">Bir sorun oluştu</h1>
          <p className="os-error-fallback__text">
            Beklenmeyen bir hata oluştu. Sayfayı yenilemek genellikle sorunu çözer. Sorun sürerse yöneticinizle iletişime geçin.
          </p>
          <Button kind="primary" onClick={() => window.location.reload()}>
            Sayfayı yenile
          </Button>
        </div>
      </div>
    );
  }
}
