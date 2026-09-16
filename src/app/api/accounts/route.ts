import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const minBalance = searchParams.get("minBalance")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";

    const values: (string | number)[] = [];
    const conditions: string[] = [];

    if (type) {
      values.push(type);
      conditions.push(`a.account_type = $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`a.status = $${values.length}`);
    }

    if (minBalance) {
      const balanceValue = Number(minBalance);

      if (Number.isNaN(balanceValue) || balanceValue < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Minimum balance must be a valid non-negative number.",
          },
          { status: 400 }
        );
      }

      values.push(balanceValue);
      conditions.push(`a.balance >= $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          ah.account_holder_name ILIKE $${values.length}
          OR a.account_number ILIKE $${values.length}
          OR b.branch_name ILIKE $${values.length}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const query = `
      SELECT
        a.account_id,
        a.account_holder_id,
        a.branch_id,
        ah.account_holder_name,
        a.account_number,
        a.account_type,
        a.balance,
        a.opening_date,
        a.status,
        b.branch_name,
        b.city
      FROM account a
      INNER JOIN account_holder ah
        ON a.account_holder_id = ah.account_holder_id
      INNER JOIN branch b
        ON a.branch_id = b.branch_id
      ${whereClause}
      ORDER BY a.account_id
    `;

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET /api/accounts error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch accounts.",
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
      branch_id,
      account_number,
      account_type,
      balance,
      opening_date,
      status,
    } = body;

    const holderId = Number(account_holder_id);
    const branchId = Number(branch_id);

    if (
      !Number.isInteger(holderId) ||
      holderId <= 0 ||
      !Number.isInteger(branchId) ||
      branchId <= 0 ||
      !account_number?.trim() ||
      !account_type?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Account holder, branch, account number and account type are required.",
        },
        { status: 400 }
      );
    }

    const accountBalance =
      balance === "" ||
      balance === null ||
      balance === undefined
        ? 0
        : Number(balance);

    if (Number.isNaN(accountBalance) || accountBalance < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Balance must be a valid non-negative number.",
        },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO account
      (
        account_holder_id,
        branch_id,
        account_number,
        account_type,
        balance,
        opening_date,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      holderId,
      branchId,
      account_number.trim(),
      account_type.trim(),
      accountBalance,
      opening_date || null,
      status?.trim() || "active",
    ];

    const result = await pool.query(query, values);

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/accounts error:", error);

    if (error?.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "Account number already exists.",
        },
        { status: 409 }
      );
    }

    if (error?.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected account holder or branch does not exist.",
        },
        { status: 400 }
      );
    }

    if (error?.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid account data. Please check the account type, status and balance.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create account.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      account_id,
      account_holder_id,
      branch_id,
      account_number,
      account_type,
      balance,
      opening_date,
      status,
    } = body;

    const accountId = Number(account_id);
    const holderId = Number(account_holder_id);
    const branchId = Number(branch_id);

    if (
      !Number.isInteger(accountId) ||
      accountId <= 0 ||
      !Number.isInteger(holderId) ||
      holderId <= 0 ||
      !Number.isInteger(branchId) ||
      branchId <= 0 ||
      !account_number?.trim() ||
      !account_type?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Account ID, holder, branch, number and type are required.",
        },
        { status: 400 }
      );
    }

    const accountBalance =
      balance === "" ||
      balance === null ||
      balance === undefined
        ? 0
        : Number(balance);

    if (Number.isNaN(accountBalance) || accountBalance < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Balance must be a valid non-negative number.",
        },
        { status: 400 }
      );
    }

    const query = `
      UPDATE account
      SET
        account_holder_id = $1,
        branch_id = $2,
        account_number = $3,
        account_type = $4,
        balance = $5,
        opening_date = $6,
        status = $7
      WHERE account_id = $8
      RETURNING *
    `;

    const values = [
      holderId,
      branchId,
      account_number.trim(),
      account_type.trim(),
      accountBalance,
      opening_date || null,
      status?.trim() || "active",
      accountId,
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Account not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account updated successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("PUT /api/accounts error:", error);

    if (error?.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "Account number already exists.",
        },
        { status: 409 }
      );
    }

    if (error?.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected account holder or branch does not exist.",
        },
        { status: 400 }
      );
    }

    if (error?.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid account data. Please check the account type, status and balance.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update account.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const accountId = Number(id);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid account ID is required.",
        },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM account
      WHERE account_id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [accountId]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Account not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("DELETE /api/accounts error:", error);

    if (error?.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This account cannot be deleted because it has related transactions, cards or other records.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete account.",
      },
      { status: 500 }
    );
  }
}