import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const cardType = searchParams.get("cardType") || "";
    const status = searchParams.get("status") || "";
    const accountId = searchParams.get("accountId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const values: (string | number)[] = [];
    const conditions: string[] = [];

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          c.card_number ILIKE $${values.length}
          OR ah.account_holder_name ILIKE $${values.length}
          OR a.account_number ILIKE $${values.length}
          OR b.branch_name ILIKE $${values.length}
        )
      `);
    }

    if (cardType) {
      values.push(cardType);

      conditions.push(
        `c.card_type = $${values.length}`
      );
    }

    if (status) {
      values.push(status);

      conditions.push(
        `c.status = $${values.length}`
      );
    }

    if (accountId) {
      values.push(Number(accountId));

      conditions.push(
        `c.account_id = $${values.length}`
      );
    }

    if (startDate) {
      values.push(startDate);

      conditions.push(
        `c.issue_date >= $${values.length}`
      );
    }

    if (endDate) {
      values.push(endDate);

      conditions.push(
        `c.issue_date <= $${values.length}`
      );
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const query = `
      SELECT
        c.card_id,
        c.card_number,
        c.card_type,
        c.issue_date,
        c.expire_date,
        c.status,

        a.account_id,
        a.account_number,
        a.account_type,
        a.balance,
        a.status AS account_status,

        ah.account_holder_id,
        ah.account_holder_name,

        b.branch_id,
        b.branch_name,
        b.city AS branch_city

      FROM card c

      INNER JOIN account a
        ON c.account_id = a.account_id

      INNER JOIN account_holder ah
        ON a.account_holder_id =
           ah.account_holder_id

      INNER JOIN branch b
        ON a.branch_id = b.branch_id

      ${whereClause}

      ORDER BY
        c.card_id ASC;
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
        message: "Failed to fetch cards",
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
      account_id,
      card_number,
      card_type,
      issue_date,
      expire_date,
      status,
    } = body;

    if (
      !account_id ||
      !card_number ||
      !card_type ||
      !issue_date ||
      !expire_date
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Account, card number, card type, issue date and expiry date are required",
        },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO card (
        account_id,
        card_number,
        card_type,
        issue_date,
        expire_date,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        COALESCE($6, 'active')
      )
      RETURNING *;
    `;

    const result = await pool.query(
      query,
      [
        Number(account_id),
        card_number,
        card_type,
        issue_date,
        expire_date,
        status || null,
      ]
    );

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
            "Selected account does not exist",
        },
        { status: 400 }
      );
    }

    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Card number already exists",
        },
        { status: 400 }
      );
    }

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid card type, status, or expiry date",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create card",
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
      card_id,
      account_id,
      card_number,
      card_type,
      issue_date,
      expire_date,
      status,
    } = body;

    if (
      !card_id ||
      !account_id ||
      !card_number ||
      !card_type ||
      !issue_date ||
      !expire_date ||
      !status
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "All required fields must be provided",
        },
        { status: 400 }
      );
    }

    const query = `
      UPDATE card
      SET
        account_id = $1,
        card_number = $2,
        card_type = $3,
        issue_date = $4,
        expire_date = $5,
        status = $6
      WHERE card_id = $7
      RETURNING *;
    `;

    const result = await pool.query(
      query,
      [
        Number(account_id),
        card_number,
        card_type,
        issue_date,
        expire_date,
        status,
        Number(card_id),
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Card not found",
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
            "Selected account does not exist",
        },
        { status: 400 }
      );
    }

    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Card number already exists",
        },
        { status: 400 }
      );
    }

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid card type, status, or expiry date",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update card",
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

    const cardId = searchParams.get("id");

    if (!cardId) {
      return NextResponse.json(
        {
          success: false,
          message: "Card ID is required",
        },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM card
      WHERE card_id = $1
      RETURNING *;
    `;

    const result = await pool.query(
      query,
      [Number(cardId)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Card not found",
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
        message: "Failed to delete card",
      },
      { status: 500 }
    );
  }
}