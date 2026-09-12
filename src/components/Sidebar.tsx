"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navigation: NavGroup[] = [
  {
    title: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: "▣",
      },
    ],
  },
  {
    title: "Customers",
    items: [
      {
        label: "Account Holders",
        href: "/account-holders",
        icon: "◉",
      },
      {
        label: "Accounts",
        href: "/accounts",
        icon: "◎",
      },
      {
        label: "Cards",
        href: "/cards",
        icon: "▭",
      },
    ],
  },
  {
    title: "Banking",
    items: [
      {
        label: "Branches",
        href: "/branches",
        icon: "⌂",
      },
      {
        label: "Employees",
        href: "/employees",
        icon: "◉",
      },
      {
        label: "Transactions",
        href: "/transactions",
        icon: "↔",
      },
      {
        label: "Merchants",
        href: "/merchants",
        icon: "▣",
      },
    ],
  },
  {
    title: "Loans",
    items: [
      {
        label: "Loans",
        href: "/loans",
        icon: "$",
      },
      {
        label: "Loan Payments",
        href: "/loan-payments",
        icon: "↳",
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        label: "Fraud Alerts",
        href: "/fraud-alerts",
        icon: "!",
      },
      {
        label: "Fraud Rules",
        href: "/fraud-rules",
        icon: "◇",
      },
      {
        label: "Audit Logs",
        href: "/audit-logs",
        icon: "☷",
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-gray-200 bg-white lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-10 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
            BTFD
          </div>

          <div>
            <div className="text-sm font-bold text-gray-900">
              Banking Transaction
            </div>

            <div className="text-xs text-gray-500">
              and Fraud Detection System
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {navigation.map((group) => (
            <div key={group.title}>
              <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {group.title}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(`${item.href}/`));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? "bg-black text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-black"
                      }`}
                    >
                      <span
                        className={`flex w-5 shrink-0 items-center justify-center text-sm ${
                          isActive
                            ? "text-white"
                            : "text-gray-500"
                        }`}
                      >
                        {item.icon}
                      </span>

                      <span className="truncate">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-200 p-3">
        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <div className="text-xs font-semibold text-gray-800">
            Banking Transaction
          </div>

          <div className="mt-0.5 text-[11px] text-gray-500">
            & Fraud Detection System
          </div>
        </div>
      </div>
    </aside>
  );
}