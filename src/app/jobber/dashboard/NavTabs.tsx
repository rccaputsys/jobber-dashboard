"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/jobber/dashboard" },
  { label: "Sales", href: "/jobber/sales" },
  { label: "Capacity", href: "/jobber/capacity" },
  { label: "Invoices", href: "/jobber/invoices" },
];

export function NavTabs({ adminConnectionId }: { adminConnectionId?: string }) {
  const pathname = usePathname();

  return (
    <nav className="nav-tabs">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const href = adminConnectionId
          ? `${tab.href}?admin_connection_id=${adminConnectionId}`
          : tab.href;
        return (
          <Link
            key={tab.href}
            href={href}
            className={`nav-tab${isActive ? " active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
