import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const city = searchParams.get("city") || "";
    const search = searchParams.get("search") || "";

    const values: (string | number)[] = [];
    const conditions: string[] = [];

    if (city) {
      values.push(city);
      conditions.push(`b.city = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          b.branch_name ILIKE $${values.length}
          OR b.city ILIKE $${values.length}
          OR b.address ILIKE $${values.length}
          OR b.phone ILIKE $${values.length}
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
          b.branch_id,
          b.branch_name,
          b.city,
          b.address,
          b.phone,
          COUNT(DISTINCT a.account_id)::int AS account_count,
          COUNT(DISTINCT e.employee_id)::int AS employee_count
        FROM branch b

        LEFT JOIN account a
          ON b.branch_id = a.branch_id

        LEFT JOIN employee e
          ON b.branch_id = e.branch_id

        ${whereClause}

        GROUP BY
          b.branch_id,
          b.branch_name,
          b.city,
          b.address,
          b.phone

        ORDER BY b.branch_id
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
        message: "Failed to fetch branches",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      branch_name,
      city,
      address,
      phone,
    } = body;

    if (!branch_name || !branch_name.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Branch name is required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        INSERT INTO branch
        (
          branch_name,
          city,
          address,
          phone
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [
        branch_name.trim(),
        city?.trim() || null,
        address?.trim() || null,
        phone?.trim() || null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Branch created successfully",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create branch",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      branch_id,
      branch_name,
      city,
      address,
      phone,
    } = body;

    if (!branch_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Branch ID is required",
        },
        { status: 400 }
      );
    }

    if (!branch_name || !branch_name.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Branch name is required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        UPDATE branch
        SET
          branch_name = $1,
          city = $2,
          address = $3,
          phone = $4
        WHERE branch_id = $5
        RETURNING *
      `,
      [
        branch_name.trim(),
        city?.trim() || null,
        address?.trim() || null,
        phone?.trim() || null,
        branch_id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Branch not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Branch updated successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update branch",
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
          message: "Branch ID is required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        DELETE FROM branch
        WHERE branch_id = $1
        RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Branch not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Branch deleted successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This branch cannot be deleted because it has related accounts or employees.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete branch",
      },
      { status: 500 }
    );
  }
}