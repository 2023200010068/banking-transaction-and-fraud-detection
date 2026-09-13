"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type DashboardStats = {
  accountHolders: number;
  accounts: number;
  branches: number;
  employees: number;
  transactions: number;
  cards: number;
  loans: number;
  loanPayments: number;
  merchants: number;
  fraudAlerts: number;
  fraudRules: number;
  auditLogs: number;
};

const emptyStats: DashboardStats = {
  accountHolders: 0,
  accounts: 0,
  branches: 0,
  employees: 0,
  transactions: 0,
  cards: 0,
  loans: 0,
  loanPayments: 0,
  merchants: 0,
  fraudAlerts: 0,
  fraudRules: 0,
  auditLogs: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/dashboard");

        if (!response.ok) {
          throw new Error("Failed to load dashboard statistics.");
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(
            data.message || "Failed to load dashboard statistics."
          );
        }

        setStats({
          accountHolders: Number(data.accountHolders ?? 0),
          accounts: Number(data.accounts ?? 0),
          branches: Number(data.branches ?? 0),
          employees: Number(data.employees ?? 0),
          transactions: Number(data.transactions ?? 0),
          cards: Number(data.cards ?? 0),
          loans: Number(data.loans ?? 0),
          loanPayments: Number(data.loanPayments ?? 0),
          merchants: Number(data.merchants ?? 0),
          fraudAlerts: Number(data.fraudAlerts ?? 0),
          fraudRules: Number(data.fraudRules ?? 0),
          auditLogs: Number(data.auditLogs ?? 0),
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard statistics."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Banking Transaction and Fraud Detection System
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-4 text-lg leading-none text-red-500 hover:text-red-700"
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        {/* System Overview */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              System Overview
            </h2>

            <p className="mt-0.5 text-xs text-gray-500">
              Current records available in the banking system
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            <OverviewCard
              href="/account-holders"
              label="Account Holders"
              value={stats.accountHolders}
              loading={loading}
              icon="◉"
            />

            <OverviewCard
              href="/accounts"
              label="Accounts"
              value={stats.accounts}
              loading={loading}
              icon="◎"
            />

            <OverviewCard
              href="/branches"
              label="Branches"
              value={stats.branches}
              loading={loading}
              icon="⌂"
            />

            <OverviewCard
              href="/employees"
              label="Employees"
              value={stats.employees}
              loading={loading}
              icon="◉"
            />

            <OverviewCard
              href="/transactions"
              label="Transactions"
              value={stats.transactions}
              loading={loading}
              icon="↔"
            />

            <OverviewCard
              href="/cards"
              label="Cards"
              value={stats.cards}
              loading={loading}
              icon="▭"
            />

            <OverviewCard
              href="/loans"
              label="Loans"
              value={stats.loans}
              loading={loading}
              icon="$"
            />

            <OverviewCard
              href="/loan-payments"
              label="Loan Payments"
              value={stats.loanPayments}
              loading={loading}
              icon="↳"
            />

            <OverviewCard
              href="/merchants"
              label="Merchants"
              value={stats.merchants}
              loading={loading}
              icon="▣"
            />

            <OverviewCard
              href="/fraud-alerts"
              label="Fraud Alerts"
              value={stats.fraudAlerts}
              loading={loading}
              icon="!"
            />

            <OverviewCard
              href="/fraud-rules"
              label="Fraud Rules"
              value={stats.fraudRules}
              loading={loading}
              icon="◇"
            />

            <OverviewCard
              href="/audit-logs"
              label="Audit Logs"
              value={stats.auditLogs}
              loading={loading}
              icon="☷"
            />
          </div>
        </section>

        {/* Database ERD */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Database Structure
            </h2>

            <p className="mt-0.5 text-xs text-gray-500">
              Entity relationship diagram of the banking transaction and fraud detection database
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex w-full justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
              <Image
                src="/erd.svg"
                alt="Banking Transaction and Fraud Detection System Entity Relationship Diagram"
                className="h-auto w-full object-contain"
                width={1200}
                height={800}
                priority
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function OverviewCard({
  href,
  label,
  value,
  loading,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  loading: boolean;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-600 transition group-hover:bg-black group-hover:text-white">
          {icon}
        </div>

        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 transition group-hover:text-gray-700">
          Open →
        </span>
      </div>

      <div className="mt-3">
        <p className="text-xl font-bold text-gray-900">
          {loading ? "—" : value}
        </p>

        <p className="mt-0.5 text-xs text-gray-500">
          {label}
        </p>
      </div>
    </Link>
  );
}