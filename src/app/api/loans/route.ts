import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || "";
    const loanType = searchParams.get("loanType") || "";
    const minPrincipal = searchParams.get("minPrincipal") || "";
    const maxPrincipal = searchParams.get("maxPrincipal") || "";
    const minInterest = searchParams.get("minInterest") || "";
    const maxInterest = searchParams.get("maxInterest") || "";
    const search = searchParams.get("search") || "";

    const values: (string | number)[] = [];
    const conditions: string[] = [];

    if (status) {
      values.push(status);
      conditions.push(`l.status = $${values.length}`);
    }

    if (loanType) {
      values.push(loanType);
      conditions.push(`l.loan_type = $${values.length}`);
    }

    if (minPrincipal) {
      values.push(Number(minPrincipal));
      conditions.push(`l.principal_amount >= $${values.length}`);
    }

    if (maxPrincipal) {
      values.push(Number(maxPrincipal));
      conditions.push(`l.principal_amount <= $${values.length}`);
    }

    if (minInterest) {
      values.push(Number(minInterest));
      conditions.push(`l.interest_rate >= $${values.length}`);
    }

    if (maxInterest) {
      values.push(Number(maxInterest));
      conditions.push(`l.interest_rate <= $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(ah.account_holder_name ILIKE $${values.length}
          OR l.loan_type ILIKE $${values.length})`
      );
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const query = `
      SELECT
        l.loan_id,
        l.account_holder_id,
        ah.account_holder_name,
        l.loan_type,
        l.principal_amount,
        l.interest_rate,
        l.start_date,
        l.end_date,
        l.status,
        COUNT(lp.payment_id)::int AS payment_count,
        COALESCE(SUM(lp.payment_amount), 0) AS total_paid,
        GREATEST(
          l.principal_amount - COALESCE(SUM(lp.payment_amount), 0),
          0
        ) AS remaining_balance
      FROM loan l
      INNER JOIN account_holder ah
        ON l.account_holder_id = ah.account_holder_id
      LEFT JOIN loan_payment lp
        ON l.loan_id = lp.loan_id
      ${whereClause}
      GROUP BY
        l.loan_id,
        l.account_holder_id,
        ah.account_holder_name,
        l.loan_type,
        l.principal_amount,
        l.interest_rate,
        l.start_date,
        l.end_date,
        l.status
      ORDER BY l.loan_id;
    `;

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch loans",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      account_holder_id,
      loan_type,
      principal_amount,
      interest_rate,
      start_date,
      end_date,
      status,
    } = body;

    const query = `
      INSERT INTO loan
      (
        account_holder_id,
        loan_type,
        principal_amount,
        interest_rate,
        start_date,
        end_date,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [
      account_holder_id,
      loan_type,
      principal_amount,
      interest_rate,
      start_date,
      end_date || null,
      status || "active",
    ];

    const result = await pool.query(query, values);

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
          message: "Selected account holder does not exist",
        },
        { status: 400 }
      );
    }

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid loan data. Please check the entered values.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create loan",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      loan_id,
      account_holder_id,
      loan_type,
      principal_amount,
      interest_rate,
      start_date,
      end_date,
      status,
    } = body;

    const query = `
      UPDATE loan
      SET
        account_holder_id = $1,
        loan_type = $2,
        principal_amount = $3,
        interest_rate = $4,
        start_date = $5,
        end_date = $6,
        status = $7
      WHERE loan_id = $8
      RETURNING *;
    `;

    const values = [
      account_holder_id,
      loan_type,
      principal_amount,
      interest_rate,
      start_date,
      end_date || null,
      status,
      loan_id,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Loan not found",
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
          message: "Selected account holder does not exist",
        },
        { status: 400 }
      );
    }

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid loan data. Please check the entered values.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update loan",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get("id");

    if (!loanId) {
      return NextResponse.json(
        {
          success: false,
          message: "Loan ID is required",
        },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM loan
      WHERE loan_id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [loanId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Loan not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete loan",
      },
      { status: 500 }
    );
  }
}