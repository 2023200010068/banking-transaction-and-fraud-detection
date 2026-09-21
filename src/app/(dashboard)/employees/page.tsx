"use client";

import { FormEvent, useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type Employee = {
  employee_id: number;
  branch_id: number;
  employee_name: string;
  designation: string | null;
  hiring_date: string | null;
  salary: number | null;
  branch_name: string;
  city: string | null;
};

type Branch = {
  branch_id: number;
  branch_name: string;
  city: string | null;
};

type FormData = {
  branch_id: string;
  employee_name: string;
  designation: string;
  hiring_date: string;
  salary: string;
};

const emptyForm: FormData = {
  branch_id: "",
  employee_name: "",
  designation: "",
  hiring_date: "",
  salary: "",
};

const escapeSqlString = (value: string) =>
  value.replace(/'/g, "''");

const sqlValue = (value: string) => {
  if (!value || value.trim() === "") {
    return "NULL";
  }

  return `'${escapeSqlString(value.trim())}'`;
};

const sqlNumber = (value: string) => {
  if (!value || value.trim() === "") {
    return "NULL";
  }

  return value.trim();
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(
    []
  );

  const [branches, setBranches] = useState<Branch[]>([]);

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [designationFilter, setDesignationFilter] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(
    null
  );

  const [formData, setFormData] =
    useState<FormData>(emptyForm);

  const [showSql, setShowSql] = useState(false);
  const [sqlOperation, setSqlOperation] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");

  const displaySql = (
    operation: string,
    query: string
  ) => {
    setSqlOperation(operation);
    setSqlQuery(query);
    setShowSql(true);
  };

  const buildSelectQuery = () => {
    const conditions: string[] = [];

    if (branchFilter) {
      conditions.push(
        `e.branch_id = ${Number(branchFilter)}`
      );
    }

    if (designationFilter) {
      conditions.push(
        `e.designation = ${sqlValue(
          designationFilter
        )}`
      );
    }

    if (search) {
      const searchValue = `%${search}%`;

      conditions.push(`
        (
          e.employee_name ILIKE ${sqlValue(
            searchValue
          )}
          OR e.designation ILIKE ${sqlValue(
            searchValue
          )}
          OR b.branch_name ILIKE ${sqlValue(
            searchValue
          )}
          OR b.city ILIKE ${sqlValue(
            searchValue
          )}
          OR e.employee_id::text ILIKE ${sqlValue(
            searchValue
          )}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    return `
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
      ORDER BY e.employee_id;
    `
      .replace(/\s+/g, " ")
      .trim();
  };

  const fetchEmployees = async (
    showQuery = false
  ) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (branchFilter) {
        params.set("branchId", branchFilter);
      }

      if (designationFilter) {
        params.set(
          "designation",
          designationFilter
        );
      }

      if (search) {
        params.set("search", search);
      }

      const queryString = params.toString();

      const response = await fetch(
        `/api/employees${
          queryString
            ? `?${queryString}`
            : ""
        }`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to fetch employees"
        );
      }

      setEmployees(result.data);

      if (showQuery) {
        displaySql(
          "SELECT",
          buildSelectQuery()
        );
      }
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to fetch employees"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(
        "/api/branches"
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to fetch branches"
        );
      }

      setBranches(result.data);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to fetch branches"
      );
    }
  };

  useEffect(() => {
    fetchEmployees(false);
    fetchBranches();
  }, []);

  const handleSearch = async () => {
    await fetchEmployees(true);
  };

  const handleClearFilters = async () => {
    setSearch("");
    setBranchFilter("");
    setDesignationFilter("");

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/employees"
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to fetch employees"
        );
      }

      setEmployees(result.data);

      displaySql(
        "SELECT",
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
          ORDER BY e.employee_id;
        `
          .replace(/\s+/g, " ")
          .trim()
      );
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to clear filters"
      );
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (
    employee: Employee
  ) => {
    setEditingId(employee.employee_id);

    setFormData({
      branch_id: String(employee.branch_id),
      employee_name:
        employee.employee_name,
      designation:
        employee.designation || "",
      hiring_date: employee.hiring_date
        ? employee.hiring_date.substring(
            0,
            10
          )
        : "",
      salary:
        employee.salary !== null
          ? String(employee.salary)
          : "",
    });

    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (formLoading) return;

    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleFormChange = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setFormLoading(true);
      setError("");

      const isEditing =
        editingId !== null;

      const payload = {
        ...(isEditing
          ? {
              employee_id: editingId,
            }
          : {}),
        branch_id: Number(
          formData.branch_id
        ),
        employee_name:
          formData.employee_name.trim(),
        designation:
          formData.designation.trim(),
        hiring_date:
          formData.hiring_date || null,
        salary:
          formData.salary === ""
            ? null
            : Number(formData.salary),
      };

      const response = await fetch(
        "/api/employees",
        {
          method: isEditing
            ? "PUT"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload
          ),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            `Failed to ${
              isEditing
                ? "update"
                : "create"
            } employee`
        );
      }

      const branchId = Number(
        formData.branch_id
      );

      const hiringDate =
        formData.hiring_date
          ? sqlValue(
              formData.hiring_date
            )
          : "NULL";

      const salary =
        sqlNumber(formData.salary);

      if (isEditing) {
        displaySql(
          "UPDATE",
          `
            UPDATE employee
            SET
              branch_id = ${branchId},
              employee_name = ${sqlValue(
                formData.employee_name
              )},
              designation = ${sqlValue(
                formData.designation
              )},
              hiring_date = ${hiringDate},
              salary = ${salary}
            WHERE employee_id = ${editingId}
            RETURNING *;
          `
            .replace(/\s+/g, " ")
            .trim()
        );
      } else {
        displaySql(
          "INSERT",
          `
            INSERT INTO employee
            (
              branch_id,
              employee_name,
              designation,
              hiring_date,
              salary
            )
            VALUES
            (
              ${branchId},
              ${sqlValue(
                formData.employee_name
              )},
              ${sqlValue(
                formData.designation
              )},
              ${hiringDate},
              ${salary}
            )
            RETURNING *;
          `
            .replace(/\s+/g, " ")
            .trim()
        );
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);

      await fetchEmployees(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to save employee"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (
    employee: Employee
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${employee.employee_name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/employees?id=${employee.employee_id}`,
        {
          method: "DELETE",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to delete employee"
        );
      }

      displaySql(
        "DELETE",
        `
          DELETE FROM employee
          WHERE employee_id = ${employee.employee_id}
          RETURNING *;
        `
          .replace(/\s+/g, " ")
          .trim()
      );

      await fetchEmployees(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to delete employee"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Employees
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage bank employees and branch assignments.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + Add Employee
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="relative rounded-lg border border-red-200 bg-red-50 px-4 py-3 pr-10 text-sm text-red-700">
            {error}

            <button
              type="button"
              onClick={() => setError("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-1 text-lg leading-none text-red-500 hover:bg-red-100 hover:text-red-700"
              title="Close"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}

        {/* SQL */}
        {showSql && (
          <SqlQueryDisplay
            operation={sqlOperation}
            query={sqlQuery}
            onClose={() =>
              setShowSql(false)
            }
          />
        )}

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Search & Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  handleSearch();
                }
              }}
              placeholder="Search employee, ID, designation or branch"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-black"
            />

            <select
              value={branchFilter}
              onChange={(event) =>
                setBranchFilter(
                  event.target.value
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black"
            >
              <option value="">
                All Branches
              </option>

              {branches.map(
                (branch) => (
                  <option
                    key={
                      branch.branch_id
                    }
                    value={
                      branch.branch_id
                    }
                  >
                    {branch.branch_name}
                    {branch.city
                      ? ` - ${branch.city}`
                      : ""}
                  </option>
                )
              )}
            </select>

            <input
              type="text"
              value={designationFilter}
              onChange={(event) =>
                setDesignationFilter(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  handleSearch();
                }
              }}
              placeholder="Filter by designation"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-black"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={
                  handleSearch
                }
                className="flex-1 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Search
              </button>

              <button
                type="button"
                onClick={
                  handleClearFilters
                }
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Clear
              </button>
            </div>

          </div>
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId
                    ? "Edit Employee"
                    : "Add New Employee"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the employee information below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-md px-2 text-xl leading-none text-gray-500 transition hover:bg-gray-100 hover:text-black"
                title="Close"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

                {/* Branch */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Branch
                  </label>

                  <select
                    required
                    value={
                      formData.branch_id
                    }
                    onChange={(event) =>
                      handleFormChange(
                        "branch_id",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">
                      Select branch
                    </option>

                    {branches.map(
                      (branch) => (
                        <option
                          key={
                            branch.branch_id
                          }
                          value={
                            branch.branch_id
                          }
                        >
                          {branch.branch_name}
                          {branch.city
                            ? ` - ${branch.city}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Employee Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Employee Name
                  </label>

                  <input
                    type="text"
                    required
                    value={
                      formData.employee_name
                    }
                    onChange={(event) =>
                      handleFormChange(
                        "employee_name",
                        event.target.value
                      )
                    }
                    placeholder="Enter employee name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Designation
                  </label>

                  <input
                    type="text"
                    value={
                      formData.designation
                    }
                    onChange={(event) =>
                      handleFormChange(
                        "designation",
                        event.target.value
                      )
                    }
                    placeholder="Enter designation"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Hiring Date */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Hiring Date
                  </label>

                  <input
                    type="date"
                    value={
                      formData.hiring_date
                    }
                    onChange={(event) =>
                      handleFormChange(
                        "hiring_date",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Salary */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Salary
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      formData.salary
                    }
                    onChange={(event) =>
                      handleFormChange(
                        "salary",
                        event.target.value
                      )
                    }
                    placeholder="Enter employee salary"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={
                    formLoading
                  }
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    formLoading
                  }
                  className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {formLoading
                    ? "Saving..."
                    : editingId
                    ? "Update Employee"
                    : "Create Employee"}
                </button>

              </div>
            </form>
          </div>
        )}

        {/* Employee Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Employee List
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {employees.length} employee
                {employees.length !== 1
                  ? "s"
                  : ""}{" "}
                found
              </p>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              Loading employees...
            </div>
          ) : employees.length ===
            0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              No employees found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">

                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-gray-700">
                      ID
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Employee
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Designation
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Branch
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Hiring Date
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Salary
                    </th>

                    <th className="px-5 py-3 text-right font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {employees.map(
                    (employee) => (
                      <tr
                        key={
                          employee.employee_id
                        }
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {
                            employee.employee_id
                          }
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900">
                            {
                              employee.employee_name
                            }
                          </div>

                          <div className="text-xs text-gray-500">
                            Employee ID:{" "}
                            {
                              employee.employee_id
                            }
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {
                            employee.designation ||
                            "—"
                          }
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900">
                            {
                              employee.branch_name
                            }
                          </div>

                          <div className="text-xs text-gray-500">
                            {
                              employee.city ||
                              "—"
                            }
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {employee.hiring_date
                            ? new Date(
                                employee.hiring_date
                              ).toLocaleDateString(
                                "en-GB"
                              )
                            : "—"}
                        </td>

                        <td className="px-5 py-4 font-medium text-gray-900">
                          {employee.salary !==
                          null
                            ? `৳ ${Number(
                                employee.salary
                              ).toLocaleString(
                                "en-BD",
                                {
                                  minimumFractionDigits:
                                    2,
                                  maximumFractionDigits:
                                    2,
                                }
                              )}`
                            : "—"}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  employee
                                )
                              }
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  employee
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>

                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>

              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}