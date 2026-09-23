import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const riskLevel = searchParams.get("riskLevel") || "";
    const minAmount = searchParams.get("minAmount") || "";
    const maxAmount = searchParams.get("maxAmount") || "";

    const values: (string | number)[] = [];
    const conditions: string[] = [];

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          m.merchant_name ILIKE $${values.length}
          OR m.category ILIKE $${values.length}
          OR m.city ILIKE $${values.length}
          OR m.contact_number ILIKE $${values.length}
        )
      `);
    }

    if (category) {
      values.push(category);

      conditions.push(
        `m.category = $${values.length}`
      );
    }

    if (riskLevel) {
      values.push(riskLevel);

      conditions.push(
        `m.risk_level = $${values.length}`
      );
    }

    if (minAmount) {
      values.push(Number(minAmount));

      conditions.push(`
        COALESCE(
          SUM(bt.amount),
          0
        ) >= $${values.length}
      `);
    }

    if (maxAmount) {
      values.push(Number(maxAmount));

      conditions.push(`
        COALESCE(
          SUM(bt.amount),
          0
        ) <= $${values.length}
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const query = `
      SELECT
        m.merchant_id,
        m.merchant_name,
        m.category,
        m.city,
        m.risk_level,
        m.contact_number,
        m.registration_date,

        COUNT(
          DISTINCT bt.transaction_id
        )::int AS transaction_count,

        COALESCE(
          SUM(bt.amount),
          0
        ) AS total_transaction_volume,

        COALESCE(
          AVG(bt.amount),
          0
        ) AS average_transaction_amount,

        COALESCE(
          MAX(bt.amount),
          0
        ) AS highest_transaction_amount,

        COUNT(
          DISTINCT CASE
            WHEN bt.status = 'completed'
            THEN bt.transaction_id
          END
        )::int AS completed_transaction_count,

        COUNT(
          DISTINCT CASE
            WHEN fa.fraud_alert_id IS NOT NULL
            THEN fa.fraud_alert_id
          END
        )::int AS fraud_alert_count,

        COALESCE(
          MAX(fa.risk_score),
          0
        ) AS maximum_risk_score

      FROM merchant m

      LEFT JOIN bank_transaction bt
        ON m.merchant_id =
           bt.merchant_id

      LEFT JOIN fraud_alert fa
        ON bt.transaction_id =
           fa.transaction_id

      ${whereClause}

      GROUP BY
        m.merchant_id,
        m.merchant_name,
        m.category,
        m.city,
        m.risk_level,
        m.contact_number,
        m.registration_date

      ORDER BY
        total_transaction_volume DESC,
        m.merchant_id ASC;
    `;

    const result = await pool.query(
      query,
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
        message: "Failed to fetch merchants",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const {
      merchant_name,
      category,
      city,
      risk_level,
      contact_number,
      registration_date,
    } = body;

    if (!merchant_name) {
      return NextResponse.json(
        {
          success: false,
          message: "Merchant name is required",
        },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO merchant (
        merchant_name,
        category,
        city,
        risk_level,
        contact_number,
        registration_date
      )
      VALUES (
        $1,
        $2,
        $3,
        COALESCE($4, 'low'),
        $5,
        COALESCE($6, CURRENT_DATE)
      )
      RETURNING *;
    `;

    const result = await pool.query(
      query,
      [
        merchant_name,
        category || null,
        city || null,
        risk_level || null,
        contact_number || null,
        registration_date || null,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid merchant risk level",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create merchant",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const {
      merchant_id,
      merchant_name,
      category,
      city,
      risk_level,
      contact_number,
      registration_date,
    } = body;

    if (
      !merchant_id ||
      !merchant_name
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Merchant ID and merchant name are required",
        },
        { status: 400 }
      );
    }

    const query = `
      UPDATE merchant
      SET
        merchant_name = $1,
        category = $2,
        city = $3,
        risk_level = $4,
        contact_number = $5,
        registration_date = $6
      WHERE merchant_id = $7
      RETURNING *;
    `;

    const result = await pool.query(
      query,
      [
        merchant_name,
        category || null,
        city || null,
        risk_level || null,
        contact_number || null,
        registration_date || null,
        Number(merchant_id),
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Merchant not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid merchant risk level",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update merchant",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const merchantId =
      searchParams.get("id");

    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          message: "Merchant ID is required",
        },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM merchant
      WHERE merchant_id = $1
      RETURNING *;
    `;

    const result = await pool.query(
      query,
      [Number(merchantId)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Merchant not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cannot delete this merchant because transactions are associated with it",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete merchant",
      },
      { status: 500 }
    );
  }
}