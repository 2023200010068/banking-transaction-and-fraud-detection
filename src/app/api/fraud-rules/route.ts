import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const severity = searchParams.get("severity") || "";
    const search = searchParams.get("search") || "";
    const minThreshold = searchParams.get("minThreshold") || "";
    const maxThreshold = searchParams.get("maxThreshold") || "";

    const values: (string | number)[] = [];
    const conditions: string[] = [];

    if (severity) {
      values.push(severity);
      conditions.push(
        `fr.severity = $${values.length}`
      );
    }

    if (minThreshold) {
      values.push(Number(minThreshold));
      conditions.push(
        `fr.threshold_value >= $${values.length}`
      );
    }

    if (maxThreshold) {
      values.push(Number(maxThreshold));
      conditions.push(
        `fr.threshold_value <= $${values.length}`
      );
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          fr.fraud_rule_name ILIKE $${values.length}
          OR fr.description ILIKE $${values.length}
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
          fr.fraud_rule_id,
          fr.fraud_rule_name,
          fr.description,
          fr.severity,
          fr.threshold_value,
          COUNT(fa.fraud_alert_id)::int AS alert_count
        FROM fraud_rule fr

        LEFT JOIN fraud_alert fa
          ON fr.fraud_rule_id = fa.fraud_rule_id

        ${whereClause}

        GROUP BY
          fr.fraud_rule_id,
          fr.fraud_rule_name,
          fr.description,
          fr.severity,
          fr.threshold_value

        ORDER BY fr.fraud_rule_id
      `,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch fraud rules",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      fraud_rule_name,
      description,
      severity,
      threshold_value,
    } = body;

    if (
      !fraud_rule_name ||
      !fraud_rule_name.trim() ||
      !severity
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Fraud rule name and severity are required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        INSERT INTO fraud_rule
        (
          fraud_rule_name,
          description,
          severity,
          threshold_value
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [
        fraud_rule_name.trim(),
        description || null,
        severity,
        threshold_value === "" ||
        threshold_value === null ||
        threshold_value === undefined
          ? null
          : Number(threshold_value),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Fraud rule created successfully",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(error);

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid severity or threshold value.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create fraud rule",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      fraud_rule_id,
      fraud_rule_name,
      description,
      severity,
      threshold_value,
    } = body;

    if (
      !fraud_rule_id ||
      !fraud_rule_name ||
      !fraud_rule_name.trim() ||
      !severity
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Rule ID, rule name and severity are required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        UPDATE fraud_rule
        SET
          fraud_rule_name = $1,
          description = $2,
          severity = $3,
          threshold_value = $4
        WHERE fraud_rule_id = $5
        RETURNING *
      `,
      [
        fraud_rule_name.trim(),
        description || null,
        severity,
        threshold_value === "" ||
        threshold_value === null ||
        threshold_value === undefined
          ? null
          : Number(threshold_value),
        Number(fraud_rule_id),
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Fraud rule not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Fraud rule updated successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid severity or threshold value.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update fraud rule",
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
          message: "Fraud rule ID is required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        DELETE FROM fraud_rule
        WHERE fraud_rule_id = $1
        RETURNING *
      `,
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Fraud rule not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Fraud rule deleted successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This fraud rule cannot be deleted because it is used by existing fraud alerts.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete fraud rule",
      },
      { status: 500 }
    );
  }
}