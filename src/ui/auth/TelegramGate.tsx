import { useEffect } from "react";
import { useAuthStore } from "../../store/authStore";

/**
 * TelegramGate:
 * Handles the entire auth flow:
 * 1. Initializes → detects Telegram → auto-login
 * 2. Dev mode: auto dev-login if outside Telegram
 * 3. Shows loading state while bootstrapping / authenticating
 * 4. Shows error if auth fails
 * 5. Shows "not in Telegram" only AFTER bootstrap completes
 * 6. Renders children if authenticated
 */
export function TelegramGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    if (status === "initializing") {
      init();
    }
  }, [status, init]);

  switch (status) {
    case "authenticated":
      return <>{children}</>;
    case "loading":
      return <LoadingScreen />;
    case "error":
      return <ErrorScreen message={error || "Error de autenticación"} onRetry={init} />;
    case "not_in_telegram":
      return <NotInTelegramScreen />;
    case "initializing":
    default:
      return <LoadingScreen />;
  }
}

function LoadingScreen() {
  return (
    <div className="tg-loading">
      <div className="tg-loading-card">
        <div className="tg-logo">
          <svg viewBox="0 0 48 48" width="64" height="64">
            <circle cx="24" cy="24" r="23" fill="currentColor" opacity="0.12" />
            <path d="M24 9 L36 17 L12 17 Z" fill="#c9a84c" />
            <path d="M15 17 H33 V34 H15 Z" fill="currentColor" opacity="0.85" />
            <path d="M21 34 V40 M27 34 V40 M24 34 V41" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="tg-spinner" />
        <p className="tg-loading-text">Conectando con tu cuenta de Telegram...</p>
        <p className="tg-loading-sub">Granja Inmersiva</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="tg-loading">
      <div className="tg-loading-card">
        <div className="tg-logo tg-logo-error">
          <svg viewBox="0 0 48 48" width="64" height="64">
            <circle cx="24" cy="24" r="23" fill="currentColor" opacity="0.12" />
            <path d="M24 9 L36 17 L12 17 Z" fill="#c9a84c" />
            <path d="M15 17 H33 V34 H15 Z" fill="currentColor" opacity="0.85" />
          </svg>
        </div>
        <p className="tg-error-text">Error de autenticación</p>
        <p className="tg-error-detail">{message}</p>
        <button className="tg-retry-btn" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    </div>
  );
}

function NotInTelegramScreen() {
  return (
    <div className="tg-loading">
      <div className="tg-loading-card">
        <div className="tg-logo">
          <svg viewBox="0 0 48 48" width="64" height="64">
            <circle cx="24" cy="24" r="23" fill="currentColor" opacity="0.12" />
            <path d="M24 9 L36 17 L12 17 Z" fill="#c9a84c" />
            <path d="M15 17 H33 V34 H15 Z" fill="currentColor" opacity="0.85" />
          </svg>
        </div>
        <p className="tg-error-text">Acceso exclusivo vía Telegram</p>
        <p className="tg-error-detail">
          Esta aplicación debe abrirse desde Telegram Bot.
          <br />
          Busca nuestro bot y abre el Mini App desde allí.
        </p>
      </div>
    </div>
  );
}
