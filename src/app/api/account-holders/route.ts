import { NextResponse } from "next/server";
import pool from "@/lib/db";

// =========================================================
// GET
// =========================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";

    let query = `
      SELECT
        account_holder_id,
        account_holder_name,
        email,
        phone,
        date_of_birth,
        occupation,
        address
      FROM account_holder
    `;

    const values: string[] = [];

    if (search) {
      query += `
        WHERE
          account_holder_name ILIKE $1
          OR email ILIKE $1
          OR phone ILIKE $1
          OR occupation ILIKE $1
      `;

      values.push(`%${search}%`);
    }

    query += `
      ORDER BY account_holder_id
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
    console.error(
      "GET /api/account-holders error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch account holders.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// POST
// =========================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      account_holder_name,
      email,
      phone,
      date_of_birth,
      occupation,
      address,
    } = body;

    if (!account_holder_name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name is required.",
        },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO account_holder (
        account_holder_name,
        email,
        phone,
        date_of_birth,
        occupation,
        address
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        account_holder_id,
        account_holder_name,
        email,
        phone,
        date_of_birth,
        occupation,
        address
    `;

    const values = [
      account_holder_name.trim(),
      email?.trim() || null,
      phone?.trim() || null,
      date_of_birth || null,
      occupation?.trim() || null,
      address?.trim() || null,
    ];

    const result = await pool.query(
      query,
      values
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Account holder added successfully.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "POST /api/account-holders error:",
      error
    );

    // PostgreSQL unique violation
    if (error?.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message:
            "An account holder with this email already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to add account holder.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// PUT
// =========================================================

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const {
      id,
      account_holder_name,
      email,
      phone,
      date_of_birth,
      occupation,
      address,
    } = body;

    // -------------------------------------------------------
    // Validate ID
    // -------------------------------------------------------

    if (
      id === undefined ||
      id === null ||
      Number.isNaN(Number(id))
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid account holder ID is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // Validate name
    // -------------------------------------------------------

    if (!account_holder_name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    const query = `
      UPDATE account_holder
      SET
        account_holder_name = $1,
        email = $2,
        phone = $3,
        date_of_birth = $4,
        occupation = $5,
        address = $6
      WHERE account_holder_id = $7
      RETURNING
        account_holder_id,
        account_holder_name,
        email,
        phone,
        date_of_birth,
        occupation,
        address
    `;

    const values = [
      account_holder_name.trim(),
      email?.trim() || null,
      phone?.trim() || null,
      date_of_birth || null,
      occupation?.trim() || null,
      address?.trim() || null,
      Number(id),
    ];

    const result = await pool.query(
      query,
      values
    );

    // -------------------------------------------------------
    // ID DOES NOT EXIST
    // -------------------------------------------------------

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Account holder not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Account holder updated successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(
      "PUT /api/account-holders error:",
      error
    );

    if (error?.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message:
            "An account holder with this email already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update account holder.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// DELETE
// =========================================================

export async function DELETE(
  request: Request
) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id || Number.isNaN(Number(id))) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid account holder ID is required.",
        },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM account_holder
      WHERE account_holder_id = $1
      RETURNING
        account_holder_id,
        account_holder_name,
        email,
        phone,
        date_of_birth,
        occupation,
        address
    `;

    const result = await pool.query(
      query,
      [Number(id)]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Account holder not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Account holder deleted successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(
      "DELETE /api/account-holders error:",
      error
    );

    // Foreign key violation
    if (error?.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This account holder cannot be deleted because related records exist.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to delete account holder.",
      },
      { status: 500 }
    );
  }
}