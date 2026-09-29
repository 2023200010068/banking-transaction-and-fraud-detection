"use client";

import { useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type AuditLog = {
  log_id: number;
  employee_id: number;
  employee_name: string;
  designation: string | null;
  branch_id: number;
  branch_name: string;
  branch_city: string | null;
  action_type: string;
  table_name: string;
  record_id: number | null;
  action_time: string;
  description: string | null;
};

type Employee = {
  employee_id: number;
  employee_name: string;
  designation: string | null;
  branch_id: number;
  branch_name: string;
};

type Branch = {
  branch_id: number;
  branch_name: string;
  city: string | null;
};

const emptyForm = {
  employee_id: "",
  action_type: "",
  table_name: "",
  record_id: "",
  action_time: "",
  description: "",
};

function escapeSqlString(value: string) {
  return value.replace(/'/g, "''");
}

function sqlValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "NULL";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return `'${escapeSqlString(value)}'`;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [actionType, setActionType] = useState("");
  const [tableName, setTableName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [showSql, setShowSql] = useState(false);
  const [sqlOperation, setSqlOperation] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");

  const fetchLogs = async (showQuery = false) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search) params.set("search", search);
      if (employeeId) params.set("employeeId", employeeId);
      if (branchId) params.set("branchId", branchId);
      if (actionType) params.set("actionType", actionType);
      if (tableName) params.set("tableName", tableName);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(
        `/api/audit-logs?${params.toString()}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch audit logs"
        );
      }

      setLogs(result.data);

      if (showQuery) {
        const conditions: string[] = [];

        if (employeeId) {
          conditions.push(
            `al.employee_id = ${Number(employeeId)}`
          );
        }

        if (branchId) {
          conditions.push(
            `e.branch_id = ${Number(branchId)}`
          );
        }

        if (actionType) {
          conditions.push(
            `al.action_type = ${sqlValue(actionType)}`
          );
        }

        if (tableName) {
          conditions.push(
            `al.table_name = ${sqlValue(tableName)}`
          );
        }

        if (startDate) {
          conditions.push(
            `al.action_time >= ${sqlValue(startDate)}::date`
          );
        }

        if (endDate) {
          conditions.push(
            `al.action_time < (${sqlValue(endDate)}::date + INTERVAL '1 day')`
          );
        }

        if (search) {
          const searchValue = sqlValue(`%${search}%`);

          conditions.push(`
            (
              e.employee_name ILIKE ${searchValue}
              OR e.designation ILIKE ${searchValue}
              OR b.branch_name ILIKE ${searchValue}
              OR al.action_type ILIKE ${searchValue}
              OR al.table_name ILIKE ${searchValue}
              OR al.description ILIKE ${searchValue}
            )
          `);
        }

        const whereClause =
          conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const displayQuery = `
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

        setSqlOperation("SELECT");
        setSqlQuery(displayQuery);
        setShowSql(true);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [employeesResponse, branchesResponse] =
        await Promise.all([
          fetch("/api/employees"),
          fetch("/api/branches"),
        ]);

      const employeesResult = await employeesResponse.json();
      const branchesResult = await branchesResponse.json();

      if (!employeesResponse.ok || !employeesResult.success) {
        throw new Error(
          employeesResult.message ||
            "Failed to fetch employees"
        );
      }

      if (!branchesResponse.ok || !branchesResult.success) {
        throw new Error(
          branchesResult.message ||
            "Failed to fetch branches"
        );
      }

      setEmployees(employeesResult.data);
      setBranches(branchesResult.data);
    } catch (err: any) {
      setError(err.message || "Failed to load form data");
    }
  };

  useEffect(() => {
    fetchLogs(false);
    fetchFormData();
  }, []);

  const handleSearch = () => {
    fetchLogs(true);
  };

  const handleReset = () => {
    setSearch("");
    setEmployeeId("");
    setBranchId("");
    setActionType("");
    setTableName("");
    setStartDate("");
    setEndDate("");

    setTimeout(() => {
      fetchLogs(true);
    }, 0);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setFormLoading(true);
      setError("");

      const payload = {
        employee_id: Number(formData.employee_id),
        action_type: formData.action_type,
        table_name: formData.table_name,
        record_id: formData.record_id
          ? Number(formData.record_id)
          : null,
        action_time: formData.action_time || null,
        description: formData.description || null,
      };

      const response = await fetch("/api/audit-logs", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId
            ? {
                log_id: editingId,
                ...payload,
              }
            : payload
        ),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to save audit log"
        );
      }

      if (editingId) {
        const query = `
          UPDATE audit_log
          SET
            employee_id = ${payload.employee_id},
            action_type = ${sqlValue(payload.action_type)},
            table_name = ${sqlValue(payload.table_name)},
            record_id = ${
              payload.record_id === null
                ? "NULL"
                : payload.record_id
            },
            action_time = ${sqlValue(payload.action_time)},
            description = ${sqlValue(payload.description)}
          WHERE log_id = ${editingId}
          RETURNING *;
        `;

        setSqlOperation("UPDATE");
        setSqlQuery(query);
      } else {
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
          VALUES
          (
            ${payload.employee_id},
            ${sqlValue(payload.action_type)},
            ${sqlValue(payload.table_name)},
            ${
              payload.record_id === null
                ? "NULL"
                : payload.record_id
            },
            ${sqlValue(payload.action_time)},
            ${sqlValue(payload.description)}
          )
          RETURNING *;
        `;

        setSqlOperation("INSERT");
        setSqlQuery(query);
      }

      setShowSql(true);
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);

      await fetchLogs(false);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (log: AuditLog) => {
    setEditingId(log.log_id);

    const actionDate = log.action_time
      ? new Date(log.action_time)
      : null;

    const formattedDate = actionDate
      ? `${actionDate.getFullYear()}-${String(
          actionDate.getMonth() + 1
        ).padStart(2, "0")}-${String(
          actionDate.getDate()
        ).padStart(2, "0")}T${String(
          actionDate.getHours()
        ).padStart(2, "0")}:${String(
          actionDate.getMinutes()
        ).padStart(2, "0")}`
      : "";

    setFormData({
      employee_id: String(log.employee_id),
      action_type: log.action_type,
      table_name: log.table_name,
      record_id:
        log.record_id !== null
          ? String(log.record_id)
          : "",
      action_time: formattedDate,
      description: log.description || "",
    });

    setShowForm(true);
  };

  const handleDelete = async (log: AuditLog) => {
    const confirmed = window.confirm(
      `Delete audit log #${log.log_id}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/audit-logs?id=${log.log_id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete audit log"
        );
      }

      const query = `
        DELETE FROM audit_log
        WHERE log_id = ${log.log_id}
        RETURNING *;
      `;

      setSqlOperation("DELETE");
      setSqlQuery(query);
      setShowSql(true);

      await fetchLogs(false);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">
              Audit Logs
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Track employee actions and database activity.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Add Audit Log
          </button>
        </div>

        {showSql && (
          <SqlQueryDisplay
            operation={sqlOperation}
            query={sqlQuery}
            onClose={() => setShowSql(false)}
          />
        )}

        {error && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-4 text-lg leading-none text-red-500 hover:text-red-700"
              title="Close"
            >
              ×
            </button>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Search
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search employee, branch, action or description"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Employee
              </label>

              <select
                value={employeeId}
                onChange={(e) =>
                  setEmployeeId(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              >
                <option value="">All Employees</option>

                {employees.map((employee) => (
                  <option
                    key={employee.employee_id}
                    value={employee.employee_id}
                  >
                    {employee.employee_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Branch
              </label>

              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              >
                <option value="">All Branches</option>

                {branches.map((branch) => (
                  <option
                    key={branch.branch_id}
                    value={branch.branch_id}
                  >
                    {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Action Type
              </label>

              <input
                type="text"
                value={actionType}
                onChange={(e) =>
                  setActionType(e.target.value)
                }
                placeholder="e.g. INSERT"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Table Name
              </label>

              <input
                type="text"
                value={tableName}
                onChange={(e) =>
                  setTableName(e.target.value)
                }
                placeholder="e.g. account"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                From Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                To Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={handleSearch}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Search
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-black">
                  {editingId
                    ? "Edit Audit Log"
                    : "Add Audit Log"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the audit activity information below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-md px-2 py-1 text-xl leading-none text-gray-500 hover:bg-gray-100 hover:text-black"
                title="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Employee
                  </label>

                  <select
                    required
                    value={formData.employee_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employee_id: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">
                      Select employee
                    </option>

                    {employees.map((employee) => (
                      <option
                        key={employee.employee_id}
                        value={employee.employee_id}
                      >
                        {employee.employee_name} —{" "}
                        {employee.branch_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Action Type
                  </label>

                  <input
                    required
                    type="text"
                    value={formData.action_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        action_type: e.target.value,
                      })
                    }
                    placeholder="e.g. INSERT, UPDATE, DELETE"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Table Name
                  </label>

                  <input
                    required
                    type="text"
                    value={formData.table_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        table_name: e.target.value,
                      })
                    }
                    placeholder="e.g. account"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Record ID
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={formData.record_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        record_id: e.target.value,
                      })
                    }
                    placeholder="e.g. 25"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Action Time
                  </label>

                  <input
                    type="datetime-local"
                    value={formData.action_time}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        action_time: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Description
                  </label>

                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the action performed"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {formLoading
                    ? "Saving..."
                    : editingId
                    ? "Update Log"
                    : "Add Log"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    ID
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Employee
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Designation
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Branch
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Action
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Table
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Record ID
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Action Time
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Description
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.log_id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-black">
                        #{log.log_id}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {log.employee_name}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {log.designation || "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        <div>
                          <div>{log.branch_name}</div>

                          {log.branch_city && (
                            <div className="text-xs text-gray-400">
                              {log.branch_city}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {log.action_type}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {log.table_name}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {log.record_id ?? "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {log.action_time
                          ? new Date(
                              log.action_time
                            ).toLocaleString()
                          : "—"}
                      </td>

                      <td className="max-w-[280px] px-4 py-3 text-gray-700">
                        {log.description || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(log)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(log)}
                            className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}