import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const branchId = searchParams.get("branchId") || "";
    const designation = searchParams.get("designation") || "";
    const search = searchParams.get("search") || "";

    const values: (string | number)[] = [];
    const conditions: string[] = [];

    if (branchId) {
      values.push(Number(branchId));
      conditions.push(`e.branch_id = $${values.length}`);
    }

    if (designation) {
      values.push(designation);
      conditions.push(
        `e.designation = $${values.length}`
      );
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          e.employee_name ILIKE $${values.length}
          OR e.designation ILIKE $${values.length}
          OR b.branch_name ILIKE $${values.length}
          OR b.city ILIKE $${values.length}
          OR e.employee_id::text ILIKE $${values.length}
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
          e.employee_id,
          e.branch_id,
          e.employee_name,
          e.designation,
          e.hiring_date,
          e.salary,
          b.branch_name,
          b.city
        FROM employee e

        INNER JOIN branch b
          ON e.branch_id = b.branch_id

        ${whereClause}

        ORDER BY e.employee_id
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
        message: "Failed to fetch employees",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      branch_id,
      employee_name,
      designation,
      hiring_date,
      salary,
    } = body;

    if (
      !branch_id ||
      !employee_name ||
      !employee_name.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Branch and employee name are required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        INSERT INTO employee
        (
          branch_id,
          employee_name,
          designation,
          hiring_date,
          salary
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        Number(branch_id),
        employee_name.trim(),
        designation?.trim() || null,
        hiring_date || null,
        salary === "" ||
        salary === null ||
        salary === undefined
          ? null
          : Number(salary),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Employee created successfully",
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
          message: "Selected branch does not exist",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create employee",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      employee_id,
      branch_id,
      employee_name,
      designation,
      hiring_date,
      salary,
    } = body;

    if (
      !employee_id ||
      !branch_id ||
      !employee_name ||
      !employee_name.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee ID, branch and employee name are required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        UPDATE employee
        SET
          branch_id = $1,
          employee_name = $2,
          designation = $3,
          hiring_date = $4,
          salary = $5
        WHERE employee_id = $6
        RETURNING *
      `,
      [
        Number(branch_id),
        employee_name.trim(),
        designation?.trim() || null,
        hiring_date || null,
        salary === "" ||
        salary === null ||
        salary === undefined
          ? null
          : Number(salary),
        Number(employee_id),
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "Selected branch does not exist",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update employee",
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
          message: "Employee ID is required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        DELETE FROM employee
        WHERE employee_id = $1
        RETURNING *
      `,
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);

    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This employee cannot be deleted because related audit logs exist.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete employee",
      },
      { status: 500 }
    );
  }
}