import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const transactionType = searchParams.get("transactionType") || "";
    const status = searchParams.get("status") || "";
    const minAmount = searchParams.get("minAmount") || "";
    const maxAmount = searchParams.get("maxAmount") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const search = searchParams.get("search") || "";

    const values: (string | number)[] = [];
    const conditions: string[] = [];

    if (transactionType) {
      values.push(transactionType);
      conditions.push(
        `bt.transaction_type = $${values.length}`
      );
    }

    if (status) {
      values.push(status);
      conditions.push(
        `bt.status = $${values.length}`
      );
    }

    if (minAmount) {
      values.push(Number(minAmount));
      conditions.push(
        `bt.amount >= $${values.length}`
      );
    }

    if (maxAmount) {
      values.push(Number(maxAmount));
      conditions.push(
        `bt.amount <= $${values.length}`
      );
    }

    if (dateFrom) {
      values.push(dateFrom);
      conditions.push(
        `bt.transaction_date::date >= $${values.length}`
      );
    }

    if (dateTo) {
      values.push(dateTo);
      conditions.push(
        `bt.transaction_date::date <= $${values.length}`
      );
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          a.account_number ILIKE $${values.length}
          OR ah.account_holder_name ILIKE $${values.length}
          OR m.merchant_name ILIKE $${values.length}
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
          bt.transaction_id,
          bt.account_id,
          bt.merchant_id,
          a.account_number,
          ah.account_holder_name,
          m.merchant_name,
          bt.transaction_type,
          bt.amount,
          bt.transaction_date,
          bt.status
        FROM bank_transaction bt

        INNER JOIN account a
          ON bt.account_id = a.account_id

        INNER JOIN account_holder ah
          ON a.account_holder_id = ah.account_holder_id

        LEFT JOIN merchant m
          ON bt.merchant_id = m.merchant_id

        ${whereClause}

        ORDER BY bt.transaction_id
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
        message: "Failed to fetch transactions",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      account_id,
      merchant_id,
      transaction_type,
      amount,
      transaction_date,
      status,
    } = body;

    if (
      !account_id ||
      !transaction_type ||
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Account, transaction type and amount are required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        INSERT INTO bank_transaction
        (
          account_id,
          merchant_id,
          transaction_type,
          amount,
          transaction_date,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        Number(account_id),
        merchant_id ? Number(merchant_id) : null,
        transaction_type,
        Number(amount),
        transaction_date || null,
        status || "completed",
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Transaction created successfully",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(error);

    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected account or merchant does not exist",
        },
        { status: 400 }
      );
    }

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid transaction data. Check amount, type and status.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create transaction",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      transaction_id,
      account_id,
      merchant_id,
      transaction_type,
      amount,
      transaction_date,
      status,
    } = body;

    if (
      !transaction_id ||
      !account_id ||
      !transaction_type ||
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Transaction ID, account, transaction type and amount are required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        UPDATE bank_transaction
        SET
          account_id = $1,
          merchant_id = $2,
          transaction_type = $3,
          amount = $4,
          transaction_date = $5,
          status = $6
        WHERE transaction_id = $7
        RETURNING *
      `,
      [
        Number(account_id),
        merchant_id ? Number(merchant_id) : null,
        transaction_type,
        Number(amount),
        transaction_date,
        status,
        Number(transaction_id),
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaction updated successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected account or merchant does not exist",
        },
        { status: 400 }
      );
    }

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid transaction data. Check amount, type and status.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update transaction",
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
          message: "Transaction ID is required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        DELETE FROM bank_transaction
        WHERE transaction_id = $1
        RETURNING *
      `,
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaction deleted successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete transaction",
      },
      { status: 500 }
    );
  }
}