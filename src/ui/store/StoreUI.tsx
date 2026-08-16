import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ShopResult } from "../../store/shopStore";
import { useT } from "../../store/languageStore";

/** Notificación de resultado de compra: resultado + icono del producto. */
export type NotifyFn = (r: ShopResult, icon: string) => void;

/** Formatea un número como precio de la tienda (USD). */
export function fmtMoney(v: number): string {
  return "$" + v.toFixed(2);
}

/** Formatea una ganancia o precio por unidad mostrando decimales extra cuando no son un precio redondo de 2 decimales. */
export function fmtProfit(v: number): string {
  if (Math.abs(v - Math.round(v * 100) / 100) < 1e-9) return fmtMoney(v);
  return "$" + v.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

/** Anima un valor numérico hacia su objetivo (saldo de la tienda). */
export function useAnimatedNumber(target: number, duration = 450): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (Math.abs(from - target) < 0.001) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

/** Tarjeta de producto de la tienda. */
export function StoreCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`scard ${className}`}>{children}</div>;
}

/** Selector de cantidad [- n +]. */
export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 999,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const t = useT();
  return (
    <div className="qty">
      <button className="qty-btn" disabled={value <= min} onClick={() => onChange(clamp(value - 1))} aria-label={t("store.qty_decrease_aria")}>
        −
      </button>
      <span className="qty-value">{value}</span>
      <button className="qty-btn" disabled={value >= max} onClick={() => onChange(clamp(value + 1))} aria-label={t("store.qty_increase_aria")}>
        +
      </button>
    </div>
  );
}
