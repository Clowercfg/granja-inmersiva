import { useEffect, useRef, useState } from "react";
import "./auth.css";
import { FarmBackdrop } from "./FarmBackdrop";
import {
  QUOTES,
  firstName,
  passwordStrength,
  STRENGTH_LABEL,
  STRENGTH_COLOR,
  isValidEmail,
  isValidName,
  maskPhone,
  registerUser,
  findByEmail,
  saveSession,
  readPref,
  type FarmRole,
  type Strength,
} from "./authStore";
import { startAmbient } from "./ambient";

type Mode = "login" | "register";
type Busy = "idle" | "busy" | "success";

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  msg: string;
}

const TOAST_ICON: Record<Toast["type"], string> = { success: "✓", error: "✕", info: "i" };

/** Logo minimalista: granero + espiga de trigo. */
function FarmLogo() {
  return (
    <svg className="auth-logo" viewBox="0 0 48 48" role="img" aria-label="Granja Inmersiva">
      <circle cx="24" cy="24" r="23" fill="currentColor" opacity="0.12" />
      <path d="M24 9 L36 17 L12 17 Z" fill="#c9a84c" />
      <path d="M15 17 H33 V34 H15 Z" fill="currentColor" opacity="0.85" />
      <path d="M21 34 V40 M27 34 V40 M24 34 V41" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 13 C42 12 44 7 44 4 C40 6 35 7 36 13 Z" fill="#c9a84c" />
    </svg>
  );
}

/** Contador animado para la estadística de agricultores. */
function CountUp({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1600;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <b>{value.toLocaleString("es")}</b>;
}

interface Props {
  onSuccess: (name: string) => void;
}

export function AuthPanel({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [dark] = useState(() => readPref("theme", false));

  // Login
  const [loginId, setLoginId] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [remember, setRemember] = useState(true);
  const [loginTouched, setLoginTouched] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Registro
  const [reg, setReg] = useState({ name: "", email: "", phone: "", pass: "", pass2: "", role: "owner" as FarmRole, terms: false });
  const [regTouched, setRegTouched] = useState<Record<string, boolean>>({});

  const [busy, setBusy] = useState<Busy>("idle");
  const [modal, setModal] = useState<null | "forgot" | "terms">(null);
  const [forgotEmail, setForgotEmail] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const toastId = useRef(0);
  const timers = useRef<number[]>([]);

  /* ---------- Toasts ---------- */
  const pushToast = (type: Toast["type"], msg: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, type, msg }]);
    const timer = window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
    timers.current.push(timer);
  };

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  /* ---------- Música ambiente (permanente) ---------- */
  useEffect(() => {
    void startAmbient();
    const kick = () => {
      void startAmbient();
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, []);

  /* ---------- Frase rotatoria ---------- */
  useEffect(() => {
    const iv = window.setInterval(() => setQuoteIndex((i) => (i + 1) % QUOTES.length), 5500);
    return () => clearInterval(iv);
  }, []);

  /* ---------- Validación en tiempo real ---------- */
  const strength: Strength = passwordStrength(reg.pass);

  const loginIdError = !loginId ? "Introduce tu correo o nombre de usuario." : isValidEmail(loginId) || loginId.trim().length >= 3 ? null : "Parece que falta un dominio en el correo.";
  const regNameError = !reg.name ? "Necesitamos tu nombre." : isValidName(reg.name) ? null : "Mínimo 3 caracteres.";
  const regEmailError = !reg.email ? "Necesitamos tu correo." : isValidEmail(reg.email) ? null : "Revisa el formato del correo.";
  const regPassError = !reg.pass ? "Crea una contraseña." : reg.pass.length < 8 ? "Mínimo 8 caracteres." : null;
  const regPass2Error = !reg.pass2 ? "Repite la contraseña." : reg.pass2 !== reg.pass ? "Las contraseñas no coinciden." : null;

  const setRegField = (key: keyof typeof reg, value: string | boolean | FarmRole) => {
    setReg((r) => ({ ...r, [key]: value }));
    setRegTouched((t) => ({ ...t, [key]: true }));
    setBusy("idle");
  };

  /* ---------- Envío: iniciar sesión ---------- */
  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy === "busy") return;
    setLoginTouched(true);
    setLoginError(null);
    if (loginIdError) {
      pushToast("error", "Revisa el correo o usuario.");
      return;
    }
    if (!loginPass) {
      pushToast("error", "Introduce tu contraseña.");
      return;
    }
    setBusy("busy");
    const user = findByEmail(loginId);
    const match = user && user.password === loginPass;

    window.setTimeout(() => {
      if (!user) {
        setBusy("idle");
        pushToast("error", "No existe una cuenta con esos datos.");
        return;
      }
      if (!match) {
        setBusy("idle");
        setLoginError("Contraseña incorrecta. Inténtalo de nuevo.");
        pushToast("error", "Contraseña incorrecta.");
        return;
      }
      saveSession({ name: user.name, email: user.email, role: user.role }, remember);
      setBusy("success");
      pushToast("success", `Bienvenido de vuelta, ${firstName(user.name)}.`);
      window.setTimeout(() => onSuccess(user.name), 1500);
    }, 900);
  };

  /* ---------- Envío: registrarse ---------- */
  const submitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy === "busy") return;
    const allTouched = { name: true, email: true, phone: true, pass: true, pass2: true, terms: true };
    setRegTouched(allTouched);
    const bad =
      regNameError || regEmailError || regPassError || regPass2Error || !reg.terms
        ? true
        : false;
    if (bad) {
      pushToast("error", "Revisa los campos marcados en rojo.");
      return;
    }
    setBusy("busy");
    const user = registerUser({
      name: reg.name.trim(),
      email: reg.email,
      phone: reg.phone,
      password: reg.pass,
      role: reg.role,
    });
    window.setTimeout(() => {
      if (!user) {
        setBusy("idle");
        pushToast("error", "Ya existe una cuenta con ese correo.");
        return;
      }
      saveSession({ name: user.name, email: user.email, role: user.role }, true);
      setBusy("success");
      pushToast("success", "Cuenta creada exitosamente. ¡Bienvenido a la granja!");
      window.setTimeout(() => onSuccess(user.name), 1500);
    }, 1000);
  };

  /* ---------- Recuperar contraseña (simulado) ---------- */
  const submitForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidEmail(forgotEmail)) {
      setModal(null);
      pushToast("info", `Hemos enviado un enlace de recuperación a ${forgotEmail}.`);
      setForgotEmail("");
    } else {
      pushToast("error", "Introduce un correo válido para recuperarla.");
    }
  };

  /* ---------- Render: utilidades de input ---------- */
  const inputClass = (touched: boolean, error: string | null, valid: boolean) => {
    if (!touched) return "";
    if (error) return " is-invalid";
    if (valid) return " is-valid";
    return "";
  };

  const fieldErr = (error: string | null) =>
    error ? (
      <p className="field-error" role="alert">
        {error}
      </p>
    ) : null;

  return (
    <div className={`auth-root${dark ? " theme-dark" : " theme-light"}`}>
      <FarmBackdrop particles />

      {/* Barra superior: logo */}
      <header className="auth-topbar">
        <div className="auth-brand">
          <FarmLogo />
          <div>
            <h2>Granja Inmersiva</h2>
            <span>Ecosistema agrícola digital</span>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="auth-main">
        {/* Título */}
        <header className="auth-title">
          <p className="auth-eyebrow">Bienvenido al campo</p>
          <h1>
            Cultiva tu <span>experiencia</span>
          </h1>
          <p className="auth-tagline">La cosecha te espera.</p>
        </header>

        {/* Columnas: frase | panel | contador */}
        <div className="auth-cols">
          {/* Lado izquierdo: experiencia */}
          <aside className="auth-side auth-side-left">
            <p className="auth-side-phrase">
              Ten una <b>Experiencia Inmersiva real</b>
            </p>
            <p className="auth-side-note">
              Recorre tu granja en 3D, cuida los cultivos y vive el campo al atardecer.
            </p>
            <div className="auth-gold-bar" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </aside>

          {/* Panel de formulario (glassmorphism) */}
          <section className="auth-card" aria-label="Acceso a la granja">
          {/* Tabs Login / Registro */}
          <div className="auth-tabs" role="tablist" aria-label="Modo de acceso">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab${mode === "login" ? " active" : ""}`}
              onClick={() => {
                setMode("login");
                setBusy("idle");
              }}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`auth-tab${mode === "register" ? " active" : ""}`}
              onClick={() => {
                setMode("register");
                setBusy("idle");
              }}
            >
              Crear Cuenta
            </button>
          </div>

          <div className="auth-pane">
            {/* ---------------- LOGIN ---------------- */}
            {mode === "login" && (
              <form onSubmit={submitLogin} noValidate className="auth-form" aria-label="Formulario de inicio de sesión">
                <div className="auth-field">
                  <label htmlFor="auth-login-id">Correo o usuario</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">
                      ✉️
                    </span>
                    <input
                      id="auth-login-id"
                      type="text"
                      autoComplete="username"
                      placeholder="Tu correo de la granja"
                      value={loginId}
                      onChange={(e) => {
                        setLoginId(e.target.value);
                        setLoginError(null);
                      }}
                      aria-invalid={loginTouched && !!loginIdError}
                      className={inputClass(loginTouched, loginIdError, !loginIdError)}
                    />
                  </div>
                  {loginTouched && fieldErr(loginIdError)}
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-login-pass">Contraseña</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">
                      🔒
                    </span>
                    <input
                      id="auth-login-pass"
                      type={showLoginPass ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Tu contraseña secreta"
                      value={loginPass}
                      onChange={(e) => {
                        setLoginPass(e.target.value);
                        setLoginError(null);
                      }}
                      aria-invalid={!!loginError}
                      className={loginError ? " is-invalid" : ""}
                    />
                    <button
                      type="button"
                      className="auth-eye"
                      onClick={() => setShowLoginPass((s) => !s)}
                      aria-label={showLoginPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showLoginPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {fieldErr(loginError)}
                </div>

                <div className="auth-row-between">
                  <label className="auth-check">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>Recordarme</span>
                  </label>
                  <button type="button" className="auth-link" onClick={() => setModal("forgot")}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button
                  type="submit"
                  className={`auth-submit${busy !== "idle" ? ` is-${busy}` : ""}`}
                  disabled={busy === "busy"}
                >
                  {busy === "busy" && <span className="auth-spinner" aria-hidden="true" />}
                  {busy === "success" ? "✓ ¡Bienvenido!" : "Acceder a la Granja"}
                </button>

                <div className="auth-divider">
                  <span>o continúa con</span>
                </div>

                <div className="auth-social">
                  <button
                    type="button"
                    className="auth-social-btn"
                    onClick={() => pushToast("info", "Google estará disponible próximamente.")}
                  >
                    <span className="auth-social-google">G</span> Google
                  </button>
                  <button
                    type="button"
                    className="auth-social-btn"
                    onClick={() => pushToast("info", "Facebook estará disponible próximamente.")}
                  >
                    <span className="auth-social-fb">f</span> Facebook
                  </button>
                </div>

                <p className="auth-switch-hint">
                  ¿Aún no tienes cuenta?{" "}
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => {
                      setMode("register");
                      setBusy("idle");
                    }}
                  >
                    Crea una gratis
                  </button>
                </p>
              </form>
            )}

            {/* ---------------- REGISTRO ---------------- */}
            {mode === "register" && (
              <form onSubmit={submitRegister} noValidate className="auth-form" aria-label="Formulario de registro">
                <div className="auth-field">
                  <label htmlFor="auth-reg-name">Nombre completo</label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-reg-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Tu nombre y apellido"
                      value={reg.name}
                      onChange={(e) => setRegField("name", e.target.value)}
                      aria-invalid={regTouched.name && !!regNameError}
                      className={`auth-input-plain${inputClass(regTouched.name, regNameError, !regNameError)}`}
                    />
                  </div>
                  {regTouched.name && fieldErr(regNameError)}
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-reg-email">Correo electrónico</label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-reg-email"
                      type="email"
                      autoComplete="email"
                      placeholder="Tu correo de la granja"
                      value={reg.email}
                      onChange={(e) => setRegField("email", e.target.value)}
                      aria-invalid={regTouched.email && !!regEmailError}
                      className={`auth-input-plain${inputClass(regTouched.email, regEmailError, !regEmailError)}`}
                    />
                  </div>
                  {regTouched.email && fieldErr(regEmailError)}
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-reg-phone">
                    Teléfono <em>(opcional)</em>
                  </label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-reg-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="(000) 000-0000"
                      value={reg.phone}
                      onChange={(e) => setRegField("phone", maskPhone(e.target.value))}
                      className="auth-input-plain"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-reg-pass">Contraseña</label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-reg-pass"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Tu contraseña secreta"
                      value={reg.pass}
                      onChange={(e) => setRegField("pass", e.target.value)}
                      aria-invalid={regTouched.pass && !!regPassError}
                      className={`auth-input-plain${inputClass(regTouched.pass, regPassError, !regPassError)}`}
                    />
                  </div>
                  {/* Indicador de fortaleza en tiempo real */}
                  <div className="auth-strength" role="meter" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={3}>
                    <div className="auth-strength-track">
                      {[0, 1, 2].map((i) => (
                        <i key={i} style={{ opacity: i < strength ? 1 : 0.18, background: STRENGTH_COLOR[strength] }} />
                      ))}
                    </div>
                    <span style={{ color: STRENGTH_COLOR[strength] }}>{STRENGTH_LABEL[strength]}</span>
                  </div>
                  {regTouched.pass && fieldErr(regPassError)}
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-reg-pass2">Confirmar contraseña</label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-reg-pass2"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repite tu contraseña"
                      value={reg.pass2}
                      onChange={(e) => setRegField("pass2", e.target.value)}
                      aria-invalid={regTouched.pass2 && !!regPass2Error}
                      className={`auth-input-plain${inputClass(regTouched.pass2, regPass2Error, !regPass2Error)}`}
                    />
                  </div>
                  {regTouched.pass2 && fieldErr(regPass2Error)}
                </div>

                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={reg.terms}
                    onChange={(e) => setRegField("terms", e.target.checked)}
                    aria-invalid={regTouched.terms && !reg.terms}
                  />
                  <span>
                    Acepto los{" "}
                    <button type="button" className="auth-link" onClick={() => setModal("terms")}>
                      términos y condiciones
                    </button>
                  </span>
                </label>
                {regTouched.terms && !reg.terms && (
                  <p className="field-error" role="alert">
                    Debes aceptar los términos para continuar.
                  </p>
                )}

                <button type="submit" className={`auth-submit gold${busy !== "idle" ? ` is-${busy}` : ""}`} disabled={busy === "busy"}>
                  {busy === "busy" && <span className="auth-spinner" aria-hidden="true" />}
                  {busy === "success" ? "✓ ¡Listo!" : "Comenzar Experiencia"}
                </button>

                <p className="auth-switch-hint">
                  ¿Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => {
                      setMode("login");
                      setBusy("idle");
                    }}
                  >
                    Inicia sesión
                  </button>
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Lado derecho: personas en la Granja */}
        <aside className="auth-side auth-side-right">
          <p className="auth-side-label">Agricultores en la Granja</p>
          <p className="auth-side-count">
            <CountUp target={12847} />
          </p>
          <p className="auth-side-note">cultivando en este momento</p>
        </aside>
      </div>
      </main>

      {/* Frase motivacional rotatoria */}
      <footer className="auth-quote" aria-live="polite">
        <span className="auth-quote-text">{QUOTES[quoteIndex]}</span>
        <i />
        <i />
        <i />
      </footer>

      {/* ---------------- MODALES ---------------- */}
      {modal === "forgot" && (
        <div
          className="auth-modal-backdrop"
          onClick={() => setModal(null)}
          role="presentation"
        >
          <div
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="auth-modal-close" onClick={() => setModal(null)} aria-label="Cerrar">
              ✕
            </button>
            <h3 id="forgot-title">¿Olvidaste tu contraseña?</h3>
            <p>
              Escribe el correo de tu cuenta y te enviaremos un enlace seguro para recuperar el acceso.
            </p>
            <form onSubmit={submitForgot} className="auth-modal-form">
              <input
                type="email"
                placeholder="Tu correo de la granja"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                autoFocus
                aria-label="Correo electrónico"
              />
              <button type="submit" className="auth-submit gold">
                Enviar enlace
              </button>
            </form>
          </div>
        </div>
      )}

      {modal === "terms" && (
        <div className="auth-modal-backdrop" onClick={() => setModal(null)} role="presentation">
          <div
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="auth-modal-close" onClick={() => setModal(null)} aria-label="Cerrar">
              ✕
            </button>
            <h3 id="terms-title">Términos y condiciones</h3>
            <div className="auth-terms-body">
              <p>
                Bienvenido a la Granja Inmersiva, un ecosistema digital con fines educativos y de
                entretenimiento.
              </p>
              <p>
                <b>1. Cuentas.</b> La información de registro se almacena localmente en tu
                navegador únicamente para fines de demostración. No se transmite a ningún servidor.
              </p>
              <p>
                <b>2. Uso.</b> La aplicación simula una granja interactiva. Las monedas y cosechas
                no tienen valor real.
              </p>
              <p>
                <b>3. Privacidad.</b> No recopilamos datos personales fuera de lo descrito
                anteriormente. Puedes borrar tu cuenta eliminando los datos del navegador.
              </p>
              <p>
                <b>4. Responsabilidad.</b> El servicio se ofrece "tal cual". No garantizamos la
                disponibilidad continua de la aplicación.
              </p>
              <p>
                Al hacer clic en «Comenzar Experiencia» aceptas estos términos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TOASTS ---------------- */}
      <div className="auth-toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`auth-toast is-${t.type}`}>
            <span className="auth-toast-icon">{TOAST_ICON[t.type]}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
