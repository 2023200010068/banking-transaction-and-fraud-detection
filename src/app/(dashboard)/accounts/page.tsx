"use client";

import { FormEvent, useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type Account = {
  account_id: number;
  account_holder_id: number;
  branch_id: number;
  account_holder_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  opening_date: string | null;
  status: string;
  branch_name: string;
  city: string;
};

type AccountHolder = {
  account_holder_id: number;
  account_holder_name: string;
};

type Branch = {
  branch_id: number;
  branch_name: string;
  city: string;
};

type FormData = {
  account_holder_id: string;
  branch_id: string;
  account_number: string;
  account_type: string;
  balance: string;
  opening_date: string;
  status: string;
};

const emptyForm: FormData = {
  account_holder_id: "",
  branch_id: "",
  account_number: "",
  account_type: "savings",
  balance: "",
  opening_date: "",
  status: "active",
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
    return "0";
  }

  return value.trim();
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountHolders, setAccountHolders] = useState<AccountHolder[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minBalance, setMinBalance] = useState("");

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<FormData>(emptyForm);

  const [showSql, setShowSql] = useState(false);
  const [sqlOperation, setSqlOperation] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");

  const displaySql = (operation: string, query: string) => {
    setSqlOperation(operation);
    setSqlQuery(query);
    setShowSql(true);
  };

  const buildSelectQuery = () => {
    const conditions: string[] = [];

    if (typeFilter) {
      conditions.push(
        `a.account_type = ${sqlValue(typeFilter)}`
      );
    }

    if (statusFilter) {
      conditions.push(
        `a.status = ${sqlValue(statusFilter)}`
      );
    }

    if (minBalance) {
      conditions.push(
        `a.balance >= ${sqlNumber(minBalance)}`
      );
    }

    if (search) {
      const searchValue = `%${search}%`;

      conditions.push(`
        (
          ah.account_holder_name ILIKE ${sqlValue(searchValue)}
          OR a.account_number ILIKE ${sqlValue(searchValue)}
          OR b.branch_name ILIKE ${sqlValue(searchValue)}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    return `
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
      ORDER BY a.account_id;
    `
      .replace(/\s+/g, " ")
      .trim();
  };

  const fetchAccounts = async (showQuery = false) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (typeFilter) {
        params.set("type", typeFilter);
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (minBalance) {
        params.set("minBalance", minBalance);
      }

      if (search) {
        params.set("search", search);
      }

      const response = await fetch(
        `/api/accounts?${params.toString()}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch accounts"
        );
      }

      setAccounts(result.data);

      if (showQuery) {
        displaySql("SELECT", buildSelectQuery());
      }
    } catch (err: any) {
      setError(
        err.message || "Failed to fetch accounts"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const response = await fetch(
        "/api/account-form-data"
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to load account form data"
        );
      }

      setAccountHolders(result.accountHolders || []);
      setBranches(result.branches || []);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to load account form data"
      );
    }
  };

  useEffect(() => {
    fetchAccounts(false);
    fetchFormData();
  }, []);

  const handleSearch = async () => {
    await fetchAccounts(true);
  };

  const handleClearFilters = async () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setMinBalance("");

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/accounts");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch accounts"
        );
      }

      setAccounts(result.data);

      displaySql(
        "SELECT",
        `
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
          ORDER BY a.account_id;
        `
          .replace(/\s+/g, " ")
          .trim()
      );
    } catch (err: any) {
      setError(
        err.message || "Failed to clear filters"
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

  const openEditForm = (account: Account) => {
    setEditingId(account.account_id);

    setFormData({
      account_holder_id:
        String(account.account_holder_id),
      branch_id: String(account.branch_id),
      account_number: account.account_number,
      account_type: account.account_type,
      balance: String(account.balance),
      opening_date: account.opening_date
        ? account.opening_date.substring(0, 10)
        : "",
      status: account.status,
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
          ? { account_id: editingId }
          : {}),
        account_holder_id: Number(
          formData.account_holder_id
        ),
        branch_id: Number(formData.branch_id),
        account_number:
          formData.account_number.trim(),
        account_type: formData.account_type,
        balance: formData.balance
          ? Number(formData.balance)
          : 0,
        opening_date:
          formData.opening_date || null,
        status: formData.status,
      };

      const response = await fetch("/api/accounts", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `Failed to ${
              isEditing ? "update" : "create"
            } account`
        );
      }

      const accountHolderId = Number(
        formData.account_holder_id
      );

      const branchId = Number(formData.branch_id);

      const balance = formData.balance
        ? formData.balance.trim()
        : "0";

      const openingDate = formData.opening_date
        ? sqlValue(formData.opening_date)
        : "NULL";

      if (isEditing) {
        displaySql(
          "UPDATE",
          `
            UPDATE account
            SET
              account_holder_id = ${accountHolderId},
              branch_id = ${branchId},
              account_number = ${sqlValue(
                formData.account_number
              )},
              account_type = ${sqlValue(
                formData.account_type
              )},
              balance = ${balance},
              opening_date = ${openingDate},
              status = ${sqlValue(
                formData.status
              )}
            WHERE account_id = ${editingId}
            RETURNING *;
          `
            .replace(/\s+/g, " ")
            .trim()
        );
      } else {
        displaySql(
          "INSERT",
          `
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
            VALUES
            (
              ${accountHolderId},
              ${branchId},
              ${sqlValue(
                formData.account_number
              )},
              ${sqlValue(
                formData.account_type
              )},
              ${balance},
              ${openingDate},
              ${sqlValue(
                formData.status
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

      await fetchAccounts(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to save account"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (account: Account) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete account "${account.account_number}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/accounts?id=${account.account_id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to delete account"
        );
      }

      displaySql(
        "DELETE",
        `
          DELETE FROM account
          WHERE account_id = ${account.account_id}
          RETURNING *;
        `
          .replace(/\s+/g, " ")
          .trim()
      );

      await fetchAccounts(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to delete account"
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
              Accounts
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage bank accounts and account information.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + Add Account
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

        {/* SQL Query */}
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
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
              placeholder="Search holder, account or branch"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-black"
            />

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black"
            >
              <option value="">
                All Account Types
              </option>
              <option value="savings">Savings</option>
              <option value="current">Current</option>
              <option value="business">Business</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black"
            >
              <option value="">
                All Statuses
              </option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
              <option value="closed">Closed</option>
            </select>

            <input
              type="number"
              min="0"
              value={minBalance}
              onChange={(event) =>
                setMinBalance(event.target.value)
              }
              placeholder="Minimum balance"
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
                    ? "Edit Account"
                    : "Add New Account"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter the account information below.
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
                {/* Account Holder */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Account Holder
                  </label>

                  <select
                    required
                    value={formData.account_holder_id}
                    onChange={(event) =>
                      handleFormChange(
                        "account_holder_id",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">
                      Select account holder
                    </option>

                    {accountHolders.map(
                      (holder) => (
                        <option
                          key={
                            holder.account_holder_id
                          }
                          value={
                            holder.account_holder_id
                          }
                        >
                          {holder.account_holder_name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Branch
                  </label>

                  <select
                    required
                    value={formData.branch_id}
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

                    {branches.map((branch) => (
                      <option
                        key={branch.branch_id}
                        value={branch.branch_id}
                      >
                        {branch.branch_name} -{" "}
                        {branch.city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account Number */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Account Number
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.account_number}
                    onChange={(event) =>
                      handleFormChange(
                        "account_number",
                        event.target.value
                      )
                    }
                    placeholder="Enter account number"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Account Type */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Account Type
                  </label>

                  <select
                    required
                    value={formData.account_type}
                    onChange={(event) =>
                      handleFormChange(
                        "account_type",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="savings">
                      Savings
                    </option>
                    <option value="current">
                      Current
                    </option>
                    <option value="business">
                      Business
                    </option>
                  </select>
                </div>

                {/* Balance */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Balance
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.balance}
                    onChange={(event) =>
                      handleFormChange(
                        "balance",
                        event.target.value
                      )
                    }
                    placeholder="Enter account balance"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Opening Date */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Opening Date
                  </label>

                  <input
                    type="date"
                    value={formData.opening_date}
                    onChange={(event) =>
                      handleFormChange(
                        "opening_date",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <select
                    required
                    value={formData.status}
                    onChange={(event) =>
                      handleFormChange(
                        "status",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="active">
                      Active
                    </option>
                    <option value="inactive">
                      Inactive
                    </option>
                    <option value="blocked">
                      Blocked
                    </option>
                    <option value="closed">
                      Closed
                    </option>
                  </select>
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
                    ? "Update Account"
                    : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Accounts Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Account List
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {accounts.length} account
                {accounts.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              No accounts found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-gray-700">
                      ID
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Account Holder
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Account Number
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Type
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Balance
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Branch
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Opening Date
                    </th>

                    <th className="px-5 py-3 font-semibold text-gray-700">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {accounts.map((account) => (
                    <tr
                      key={account.account_id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {account.account_id}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">
                          {account.account_holder_name}
                        </div>

                        <div className="text-xs text-gray-500">
                          Holder ID:{" "}
                          {account.account_holder_id}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-gray-700">
                        {account.account_number}
                      </td>

                      <td className="px-5 py-4">
                        <span className="capitalize text-gray-700">
                          {account.account_type}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium text-gray-900">
                        ৳{" "}
                        {Number(
                          account.balance
                        ).toLocaleString(
                          "en-BD",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">
                          {account.branch_name}
                        </div>

                        <div className="text-xs text-gray-500">
                          {account.city}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {account.opening_date
                          ? new Date(
                              account.opening_date
                            ).toLocaleDateString(
                              "en-GB"
                            )
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            account.status ===
                            "active"
                              ? "bg-green-100 text-green-700"
                              : account.status ===
                                "blocked"
                              ? "bg-red-100 text-red-700"
                              : account.status ===
                                "closed"
                              ? "bg-gray-200 text-gray-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {account.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(account)
                            }
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(account)
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