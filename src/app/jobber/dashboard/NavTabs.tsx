"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/jobber/dashboard" },
  { label: "Sales & Capacity", href: "/jobber/sales" },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="nav-tabs" style={{ marginTop: 16, marginBottom: 4 }}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`nav-tab${isActive ? " active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
