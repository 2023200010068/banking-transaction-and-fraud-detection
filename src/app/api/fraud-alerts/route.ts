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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      transaction_id,
      fraud_rule_id,
      risk_score,
      alert_reason,
      status,
    } = body;

    if (
      transaction_id === undefined ||
      transaction_id === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction is required",
        },
        { status: 400 }
      );
    }

    if (
      fraud_rule_id === undefined ||
      fraud_rule_id === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Fraud rule is required",
        },
        { status: 400 }
      );
    }

    if (
      risk_score === undefined ||
      risk_score === null ||
      Number.isNaN(Number(risk_score))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid risk score is required",
        },
        { status: 400 }
      );
    }

    if (
      Number(risk_score) < 0 ||
      Number(risk_score) > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Risk score must be between 0 and 100",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        INSERT INTO fraud_alert
        (
          transaction_id,
          fraud_rule_id,
          risk_score,
          alert_reason,
          status
        )
        VALUES
        ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        Number(transaction_id),
        Number(fraud_rule_id),
        Number(risk_score),
        alert_reason || null,
        status || "open",
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Fraud alert created successfully",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fraud alerts POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create fraud alert",
        error:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      fraud_alert_id,
      transaction_id,
      fraud_rule_id,
      risk_score,
      alert_reason,
      status,
    } = body;

    if (
      fraud_alert_id === undefined ||
      fraud_alert_id === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Fraud alert ID is required",
        },
        { status: 400 }
      );
    }

    if (
      transaction_id === undefined ||
      transaction_id === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction is required",
        },
        { status: 400 }
      );
    }

    if (
      fraud_rule_id === undefined ||
      fraud_rule_id === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Fraud rule is required",
        },
        { status: 400 }
      );
    }

    if (
      risk_score === undefined ||
      risk_score === null ||
      Number.isNaN(Number(risk_score))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid risk score is required",
        },
        { status: 400 }
      );
    }

    if (
      Number(risk_score) < 0 ||
      Number(risk_score) > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Risk score must be between 0 and 100",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        UPDATE fraud_alert
        SET
          transaction_id = $1,
          fraud_rule_id = $2,
          risk_score = $3,
          alert_reason = $4,
          status = $5
        WHERE fraud_alert_id = $6
        RETURNING *
      `,
      [
        Number(transaction_id),
        Number(fraud_rule_id),
        Number(risk_score),
        alert_reason || null,
        status || "open",
        Number(fraud_alert_id),
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Fraud alert not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Fraud alert updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Fraud alerts PUT error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update fraud alert",
        error:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Fraud alert ID is required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        DELETE FROM fraud_alert
        WHERE fraud_alert_id = $1
        RETURNING *
      `,
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Fraud alert not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Fraud alert deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Fraud alerts DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete fraud alert",
        error:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      { status: 500 }
    );
  }
}