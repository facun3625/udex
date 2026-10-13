import { Boxes, ChartColumn, History, LayoutDashboard, Package, Receipt, ScanBarcode, Settings, Truck, Wallet } from "lucide-react";
import type { MenuIcon } from "@/modules/core/menu";

export const MENU_ICONS: Record<MenuIcon, React.ComponentType<{ className?: string }>> = {
  home: LayoutDashboard,
  pos: ScanBarcode,
  sales: Receipt,
  stock: Boxes,
  products: Package,
  purchasing: Truck,
  treasury: Wallet,
  reports: ChartColumn,
  settings: Settings,
  audit: History,
};
