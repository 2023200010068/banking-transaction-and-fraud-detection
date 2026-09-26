import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const loanId = searchParams.get("loanId") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const minAmount = searchParams.get("minAmount") || "";
    const maxAmount = searchParams.get("maxAmount") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const search = searchParams.get("search") || "";

    const values: (string | number)[] = [];
    const conditions: string[] = [];

    if (loanId) {
      values.push(Number(loanId));
      conditions.push(`lp.loan_id = $${values.length}`);
    }

    if (paymentStatus) {
      values.push(paymentStatus);
      conditions.push(`lp.payment_status = $${values.length}`);
    }

    if (minAmount) {
      values.push(Number(minAmount));
      conditions.push(`lp.payment_amount >= $${values.length}`);
    }

    if (maxAmount) {
      values.push(Number(maxAmount));
      conditions.push(`lp.payment_amount <= $${values.length}`);
    }

    if (startDate) {
      values.push(startDate);
      conditions.push(`lp.payment_date >= $${values.length}`);
    }

    if (endDate) {
      values.push(endDate);
      conditions.push(`lp.payment_date <= $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          ah.account_holder_name ILIKE $${values.length}
          OR l.loan_type ILIKE $${values.length}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const query = `
      SELECT
        lp.payment_id,
        lp.loan_id,
        l.account_holder_id,
        ah.account_holder_name,
        l.loan_type,
        l.principal_amount,
        lp.payment_amount,
        lp.payment_date,
        lp.payment_status,

        SUM(lp.payment_amount) OVER (
          PARTITION BY lp.loan_id
        ) AS loan_total_paid,

        COUNT(lp.payment_id) OVER (
          PARTITION BY lp.loan_id
        )::int AS loan_payment_count,

        GREATEST(
          l.principal_amount -
          SUM(lp.payment_amount) OVER (
            PARTITION BY lp.loan_id
          ),
          0
        ) AS loan_remaining_balance

      FROM loan_payment lp

      INNER JOIN loan l
        ON lp.loan_id = l.loan_id

      INNER JOIN account_holder ah
        ON l.account_holder_id = ah.account_holder_id

      ${whereClause}

      ORDER BY lp.payment_id;
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
        message: "Failed to fetch loan payments",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      loan_id,
      payment_amount,
      payment_date,
      payment_status,
    } = body;

    const query = `
      INSERT INTO loan_payment
      (
        loan_id,
        payment_amount,
        payment_date,
        payment_status
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [
      loan_id,
      payment_amount,
      payment_date || null,
      payment_status || "paid",
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
          message: "Selected loan does not exist",
        },
        { status: 400 }
      );
    }

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment data. Please check the entered values.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create loan payment",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      payment_id,
      loan_id,
      payment_amount,
      payment_date,
      payment_status,
    } = body;

    const query = `
      UPDATE loan_payment
      SET
        loan_id = $1,
        payment_amount = $2,
        payment_date = $3,
        payment_status = $4
      WHERE payment_id = $5
      RETURNING *;
    `;

    const values = [
      loan_id,
      payment_amount,
      payment_date || null,
      payment_status,
      payment_id,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Loan payment not found",
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
          message: "Selected loan does not exist",
        },
        { status: 400 }
      );
    }

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment data. Please check the entered values.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update loan payment",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment ID is required",
        },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM loan_payment
      WHERE payment_id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [paymentId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Loan payment not found",
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
        message: "Failed to delete loan payment",
      },
      { status: 500 }
    );
  }
}