import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const employeeId = searchParams.get("employeeId") || "";
    const branchId = searchParams.get("branchId") || "";
    const actionType = searchParams.get("actionType") || "";
    const tableName = searchParams.get("tableName") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const search = searchParams.get("search") || "";

    const values: (string | number)[] = [];
    const conditions: string[] = [];

    if (employeeId) {
      values.push(Number(employeeId));
      conditions.push(`al.employee_id = $${values.length}`);
    }

    if (branchId) {
      values.push(Number(branchId));
      conditions.push(`e.branch_id = $${values.length}`);
    }

    if (actionType) {
      values.push(actionType);
      conditions.push(`al.action_type = $${values.length}`);
    }

    if (tableName) {
      values.push(tableName);
      conditions.push(`al.table_name = $${values.length}`);
    }

    if (startDate) {
      values.push(startDate);
      conditions.push(`al.action_time >= $${values.length}::date`);
    }

    if (endDate) {
      values.push(endDate);
      conditions.push(
        `al.action_time < ($${values.length}::date + INTERVAL '1 day')`
      );
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          e.employee_name ILIKE $${values.length}
          OR e.designation ILIKE $${values.length}
          OR b.branch_name ILIKE $${values.length}
          OR al.action_type ILIKE $${values.length}
          OR al.table_name ILIKE $${values.length}
          OR al.description ILIKE $${values.length}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const query = `
      SELECT
        al.log_id,
        al.employee_id,
        e.employee_name,
        e.designation,
        e.branch_id,
        b.branch_name,
        b.city AS branch_city,
        al.action_type,
        al.table_name,
        al.record_id,
        al.action_time,
        al.description
      FROM audit_log al
      INNER JOIN employee e
        ON al.employee_id = e.employee_id
      INNER JOIN branch b
        ON e.branch_id = b.branch_id
      ${whereClause}
      ORDER BY al.action_time DESC, al.log_id DESC;
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
        message: "Failed to fetch audit logs",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      employee_id,
      action_type,
      table_name,
      record_id,
      action_time,
      description,
    } = body;

    const query = `
      INSERT INTO audit_log
      (
        employee_id,
        action_type,
        table_name,
        record_id,
        action_time,
        description
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      employee_id,
      action_type,
      table_name,
      record_id || null,
      action_time || null,
      description || null,
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
          message: "Selected employee does not exist",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create audit log",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      log_id,
      employee_id,
      action_type,
      table_name,
      record_id,
      action_time,
      description,
    } = body;

    const query = `
      UPDATE audit_log
      SET
        employee_id = $1,
        action_type = $2,
        table_name = $3,
        record_id = $4,
        action_time = $5,
        description = $6
      WHERE log_id = $7
      RETURNING *;
    `;

    const values = [
      employee_id,
      action_type,
      table_name,
      record_id || null,
      action_time || null,
      description || null,
      log_id,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Audit log not found",
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
          message: "Selected employee does not exist",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update audit log",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get("id");

    if (!logId) {
      return NextResponse.json(
        {
          success: false,
          message: "Log ID is required",
        },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM audit_log
      WHERE log_id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [logId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Audit log not found",
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
        message: "Failed to delete audit log",
      },
      { status: 500 }
    );
  }
}