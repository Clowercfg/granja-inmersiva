import { PanelShell, PanelSection } from "./PanelShell";

interface InvItem {
  name: string;
  count: number;
}

const CATEGORIES: Array<{ name: string; icon: string; items: InvItem[] }> = [
  {
    name: "Materiales",
    icon: "🪵",
    items: [
      { name: "Madera", count: 0 },
      { name: "Piedra", count: 0 },
      { name: "Metal", count: 0 },
    ],
  },
  {
    name: "Alimentos",
    icon: "🥛",
    items: [
      { name: "Leche", count: 0 },
      { name: "Huevos", count: 0 },
      { name: "Trigo", count: 0 },
    ],
  },
  {
    name: "Semillas",
    icon: "🌱",
    items: [{ name: "Semillas de trigo", count: 0 }],
  },
  {
    name: "Herramientas",
    icon: "🔧",
    items: [
      { name: "Azada", count: 0 },
      { name: "Rastrillo", count: 0 },
    ],
  },
  {
    name: "Recursos",
    icon: "💰",
    items: [{ name: "Oro", count: 0 }],
  },
];

export function InventoryPanel() {
  return (
    <PanelShell icon="📦" title="Inventario" subtitle="Materiales, alimentos y herramientas">
      {CATEGORIES.map((cat) => (
        <PanelSection key={cat.name} icon={cat.icon} title={cat.name}>
          {cat.items.map((it) => (
            <div className="inventory-row" key={it.name}>
              <span>{it.name}</span>
              <span className="inventory-count">{it.count}</span>
            </div>
          ))}
        </PanelSection>
      ))}
      <div className="hint">
        El inventario almacenará los recursos recolectados y la producción de la granja.
      </div>
    </PanelShell>
  );
}
