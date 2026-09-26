import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || "";
    const ruleId = searchParams.get("ruleId") || "";
    const minRiskScore =
      searchParams.get("minRiskScore") || "";
    const maxRiskScore =
      searchParams.get("maxRiskScore") || "";
    const search = searchParams.get("search") || "";

    const values: (string | number)[] = [];
    const conditions: string[] = [];

    if (status) {
      values.push(status);

      conditions.push(
        `fa.status = $${values.length}`
      );
    }

    if (ruleId) {
      values.push(Number(ruleId));

      conditions.push(
        `fa.fraud_rule_id = $${values.length}`
      );
    }

    if (minRiskScore) {
      values.push(Number(minRiskScore));

      conditions.push(
        `fa.risk_score >= $${values.length}`
      );
    }

    if (maxRiskScore) {
      values.push(Number(maxRiskScore));

      conditions.push(
        `fa.risk_score <= $${values.length}`
      );
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          ah.account_holder_name ILIKE $${values.length}
          OR m.merchant_name ILIKE $${values.length}
          OR fr.fraud_rule_name ILIKE $${values.length}
          OR fa.alert_reason ILIKE $${values.length}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const result = await pool.query(
      `
        SELECT
          fa.fraud_alert_id,
          fa.transaction_id,
          fa.fraud_rule_id,
          fa.risk_score,
          fa.alert_reason,
          fa.detected_at,
          fa.status,

          bt.transaction_type,
          bt.amount,
          bt.transaction_date,
          bt.status AS transaction_status,

          a.account_number,

          ah.account_holder_id,
          ah.account_holder_name,

          m.merchant_name,

          fr.fraud_rule_name,
          fr.severity AS rule_severity,
          fr.threshold_value

        FROM fraud_alert fa

        INNER JOIN bank_transaction bt
          ON fa.transaction_id = bt.transaction_id

        INNER JOIN account a
          ON bt.account_id = a.account_id

        INNER JOIN account_holder ah
          ON a.account_holder_id = ah.account_holder_id

        LEFT JOIN merchant m
          ON bt.merchant_id = m.merchant_id

        INNER JOIN fraud_rule fr
          ON fa.fraud_rule_id = fr.fraud_rule_id

        ${whereClause}

        ORDER BY fa.fraud_alert_id DESC
      `,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Fraud alerts GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch fraud alerts",
        error:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      { status: 500 }
    );
  }
}