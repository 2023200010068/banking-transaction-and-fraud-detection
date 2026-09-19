"use client";

import { FormEvent, useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type Branch = {
  branch_id: number;
  branch_name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  account_count: number;
  employee_count: number;
};

type FormData = {
  branch_name: string;
  city: string;
  address: string;
  phone: string;
};

const emptyForm: FormData = {
  branch_name: "",
  city: "",
  address: "",
  phone: "",
};

const escapeSqlString = (value: string) =>
  value.replace(/'/g, "''");

const sqlValue = (value: string) => {
  if (!value || value.trim() === "") {
    return "NULL";
  }

  return `'${escapeSqlString(value.trim())}'`;
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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

    if (cityFilter) {
      conditions.push(
        `b.city = ${sqlValue(cityFilter)}`
      );
    }

    if (search) {
      const searchValue = `%${search}%`;

      conditions.push(`
        (
          b.branch_name ILIKE ${sqlValue(searchValue)}
          OR b.city ILIKE ${sqlValue(searchValue)}
          OR b.address ILIKE ${sqlValue(searchValue)}
          OR b.phone ILIKE ${sqlValue(searchValue)}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    return `
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
      ORDER BY b.branch_id;
    `
      .replace(/\s+/g, " ")
      .trim();
  };

  const fetchBranches = async (
    showQuery = false
  ) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (cityFilter) {
        params.set("city", cityFilter);
      }

      if (search) {
        params.set("search", search);
      }

      const queryString = params.toString();

      const response = await fetch(
        `/api/branches${
          queryString ? `?${queryString}` : ""
        }`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to fetch branches"
        );
      }

      setBranches(result.data);

      if (showQuery) {
        displaySql(
          "SELECT",
          buildSelectQuery()
        );
      }
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to fetch branches"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches(false);
  }, []);

  const handleSearch = async () => {
    await fetchBranches(true);
  };

  const handleClearFilters = async () => {
    setSearch("");
    setCityFilter("");

    try {
      setLoading(true);
      setError("");

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

      displaySql(
        "SELECT",
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
          GROUP BY
            b.branch_id,
            b.branch_name,
            b.city,
            b.address,
            b.phone
          ORDER BY b.branch_id;
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

  const openEditForm = (branch: Branch) => {
    setEditingId(branch.branch_id);

    setFormData({
      branch_name: branch.branch_name,
      city: branch.city || "",
      address: branch.address || "",
      phone: branch.phone || "",
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

      const isEditing = editingId !== null;

      const payload = {
        ...(isEditing
          ? { branch_id: editingId }
          : {}),
        branch_name:
          formData.branch_name.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
      };

      const response = await fetch(
        "/api/branches",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `Failed to ${
              isEditing
                ? "update"
                : "create"
            } branch`
        );
      }

      if (isEditing) {
        displaySql(
          "UPDATE",
          `
            UPDATE branch
            SET
              branch_name = ${sqlValue(
                formData.branch_name
              )},
              city = ${sqlValue(
                formData.city
              )},
              address = ${sqlValue(
                formData.address
              )},
              phone = ${sqlValue(
                formData.phone
              )}
            WHERE branch_id = ${editingId}
            RETURNING *;
          `
            .replace(/\s+/g, " ")
            .trim()
        );
      } else {
        displaySql(
          "INSERT",
          `
            INSERT INTO branch
            (
              branch_name,
              city,
              address,
              phone
            )
            VALUES
            (
              ${sqlValue(
                formData.branch_name
              )},
              ${sqlValue(
                formData.city
              )},
              ${sqlValue(
                formData.address
              )},
              ${sqlValue(
                formData.phone
              )}
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

      await fetchBranches(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to save branch"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (
    branch: Branch
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${branch.branch_name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/branches?id=${branch.branch_id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to delete branch"
        );
      }

      displaySql(
        "DELETE",
        `
          DELETE FROM branch
          WHERE branch_id = ${branch.branch_id}
          RETURNING *;
        `
          .replace(/\s+/g, " ")
          .trim()
      );

      await fetchBranches(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to delete branch"
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
              Branches
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage bank branches and branch information.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + Add Branch
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
            onClose={() => setShowSql(false)}
          />
        )}

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Search & Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Search branch, city, address or phone"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-black"
            />

            <input
              type="text"
              value={cityFilter}
              onChange={(event) =>
                setCityFilter(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Filter by city"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-black"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSearch}
                className="flex-1 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Search
              </button>

              <button
                type="button"
                onClick={handleClearFilters}
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
                    ? "Edit Branch"
                    : "Add New Branch"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the branch information below.
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                {/* Branch Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Branch Name
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.branch_name}
                    onChange={(event) =>
                      handleFormChange(
                        "branch_name",
                        event.target.value
                      )
                    }
                    placeholder="Enter branch name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    City
                  </label>

                  <input
                    type="text"
                    value={formData.city}
                    onChange={(event) =>
                      handleFormChange(
                        "city",
                        event.target.value
                      )
                    }
                    placeholder="Enter city"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Address
                  </label>

                  <input
                    type="text"
                    value={formData.address}
                    onChange={(event) =>
                      handleFormChange(
                        "address",
                        event.target.value
                      )
                    }
                    placeholder="Enter branch address"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Phone
                  </label>

                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(event) =>
                      handleFormChange(
                        "phone",
                        event.target.value
                      )
                    }
                    placeholder="Enter branch phone number"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={formLoading}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {formLoading
                    ? "Saving..."
                    : editingId
                    ? "Update Branch"
                    : "Create Branch"}
                </button>

              </div>
            </form>
          </div>
        )}

        {/* Branch Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Branch List
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {branches.length} branch
                {branches.length !== 1
                  ? "es"
                  : ""}{" "}
                found
              </p>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              Loading branches...
            </div>
          ) : branches.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              No branches found.
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
                      Branch Name
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      City
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Address
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Phone
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Accounts
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Employees
                    </th>

                    <th className="px-5 py-3 text-right font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {branches.map((branch) => (
                    <tr
                      key={branch.branch_id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {branch.branch_id}
                      </td>

                      <td className="px-5 py-4 font-medium text-gray-900">
                        {branch.branch_name}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {branch.city || "—"}
                      </td>

                      <td className="max-w-[260px] px-5 py-4 text-gray-600">
                        {branch.address || "—"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {branch.phone || "—"}
                      </td>

                      <td className="px-5 py-4 font-medium text-gray-900">
                        {branch.account_count}
                      </td>

                      <td className="px-5 py-4 font-medium text-gray-900">
                        {branch.employee_count}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(branch)
                            }
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(branch)
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}