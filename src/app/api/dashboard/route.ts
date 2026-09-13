import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM account_holder) AS account_holders,
        (SELECT COUNT(*)::int FROM account) AS accounts,
        (SELECT COUNT(*)::int FROM branch) AS branches,
        (SELECT COUNT(*)::int FROM employee) AS employees,
        (SELECT COUNT(*)::int FROM bank_transaction) AS transactions,
        (SELECT COUNT(*)::int FROM card) AS cards,
        (SELECT COUNT(*)::int FROM loan) AS loans,
        (SELECT COUNT(*)::int FROM loan_payment) AS loan_payments,
        (SELECT COUNT(*)::int FROM merchant) AS merchants,
        (SELECT COUNT(*)::int FROM fraud_alert) AS fraud_alerts,
        (SELECT COUNT(*)::int FROM fraud_rule) AS fraud_rules,
        (SELECT COUNT(*)::int FROM audit_log) AS audit_logs
    `);

    const row = result.rows[0];

    return NextResponse.json({
      success: true,

      accountHolders: row.account_holders,
      accounts: row.accounts,
      branches: row.branches,
      employees: row.employees,
      transactions: row.transactions,
      cards: row.cards,
      loans: row.loans,
      loanPayments: row.loan_payments,
      merchants: row.merchants,
      fraudAlerts: row.fraud_alerts,
      fraudRules: row.fraud_rules,
      auditLogs: row.audit_logs,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load dashboard statistics.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      { status: 500 }
    );
  }
}