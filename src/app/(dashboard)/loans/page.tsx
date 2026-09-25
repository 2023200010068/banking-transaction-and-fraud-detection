"use client";

import { useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type Loan = {
  loan_id: number;
  account_holder_id: number;
  account_holder_name: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  start_date: string;
  end_date: string | null;
  status: string;
  payment_count: number;
  total_paid: number;
  remaining_balance: number;
};

type AccountHolder = {
  account_holder_id: number;
  account_holder_name: string;
};

const emptyForm = {
  account_holder_id: "",
  loan_type: "",
  principal_amount: "",
  interest_rate: "",
  start_date: "",
  end_date: "",
  status: "active",
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

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [accountHolders, setAccountHolders] = useState<AccountHolder[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loanType, setLoanType] = useState("");
  const [minPrincipal, setMinPrincipal] = useState("");
  const [maxPrincipal, setMaxPrincipal] = useState("");
  const [minInterest, setMinInterest] = useState("");
  const [maxInterest, setMaxInterest] = useState("");

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [showSql, setShowSql] = useState(false);
  const [sqlOperation, setSqlOperation] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");

  const fetchLoans = async (showQuery = false) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (loanType) params.set("loanType", loanType);
      if (minPrincipal) params.set("minPrincipal", minPrincipal);
      if (maxPrincipal) params.set("maxPrincipal", maxPrincipal);
      if (minInterest) params.set("minInterest", minInterest);
      if (maxInterest) params.set("maxInterest", maxInterest);

      const response = await fetch(`/api/loans?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch loans");
      }

      setLoans(result.data);

      if (showQuery) {
        const conditions: string[] = [];

        if (status) {
          conditions.push(`l.status = ${sqlValue(status)}`);
        }

        if (loanType) {
          conditions.push(`l.loan_type = ${sqlValue(loanType)}`);
        }

        if (minPrincipal) {
          conditions.push(
            `l.principal_amount >= ${Number(minPrincipal)}`
          );
        }

        if (maxPrincipal) {
          conditions.push(
            `l.principal_amount <= ${Number(maxPrincipal)}`
          );
        }

        if (minInterest) {
          conditions.push(
            `l.interest_rate >= ${Number(minInterest)}`
          );
        }

        if (maxInterest) {
          conditions.push(
            `l.interest_rate <= ${Number(maxInterest)}`
          );
        }

        if (search) {
          conditions.push(
            `(ah.account_holder_name ILIKE ${sqlValue(
              `%${search}%`
            )} OR l.loan_type ILIKE ${sqlValue(`%${search}%`)})`
          );
        }

        const whereClause =
          conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const displayQuery = `
          SELECT
            l.loan_id,
            l.account_holder_id,
            ah.account_holder_name,
            l.loan_type,
            l.principal_amount,
            l.interest_rate,
            l.start_date,
            l.end_date,
            l.status,
            COUNT(lp.payment_id)::int AS payment_count,
            COALESCE(SUM(lp.payment_amount), 0) AS total_paid,
            GREATEST(
              l.principal_amount - COALESCE(SUM(lp.payment_amount), 0),
              0
            ) AS remaining_balance
          FROM loan l
          INNER JOIN account_holder ah
            ON l.account_holder_id = ah.account_holder_id
          LEFT JOIN loan_payment lp
            ON l.loan_id = lp.loan_id
          ${whereClause}
          GROUP BY
            l.loan_id,
            l.account_holder_id,
            ah.account_holder_name,
            l.loan_type,
            l.principal_amount,
            l.interest_rate,
            l.start_date,
            l.end_date,
            l.status
          ORDER BY l.loan_id;
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

  const fetchAccountHolders = async () => {
    try {
      const response = await fetch("/api/account-holders");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch account holders"
        );
      }

      setAccountHolders(result.data);
    } catch (err: any) {
      setError(err.message || "Failed to load account holders");
    }
  };

  useEffect(() => {
    fetchLoans(false);
    fetchAccountHolders();
  }, []);

  const handleSearch = () => {
    fetchLoans(true);
  };

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setLoanType("");
    setMinPrincipal("");
    setMaxPrincipal("");
    setMinInterest("");
    setMaxInterest("");

    setTimeout(() => {
      fetchLoans(true);
    }, 0);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setFormLoading(true);
      setError("");

      const payload = {
        account_holder_id: Number(formData.account_holder_id),
        loan_type: formData.loan_type,
        principal_amount: Number(formData.principal_amount),
        interest_rate: Number(formData.interest_rate),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        status: formData.status,
      };

      const response = await fetch("/api/loans", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId
            ? {
                loan_id: editingId,
                ...payload,
              }
            : payload
        ),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save loan");
      }

      if (editingId) {
        const query = `
          UPDATE loan
          SET
            account_holder_id = ${payload.account_holder_id},
            loan_type = ${sqlValue(payload.loan_type)},
            principal_amount = ${payload.principal_amount},
            interest_rate = ${payload.interest_rate},
            start_date = ${sqlValue(payload.start_date)},
            end_date = ${sqlValue(payload.end_date)},
            status = ${sqlValue(payload.status)}
          WHERE loan_id = ${editingId}
          RETURNING *;
        `;

        setSqlOperation("UPDATE");
        setSqlQuery(query);
      } else {
        const query = `
          INSERT INTO loan
          (
            account_holder_id,
            loan_type,
            principal_amount,
            interest_rate,
            start_date,
            end_date,
            status
          )
          VALUES
          (
            ${payload.account_holder_id},
            ${sqlValue(payload.loan_type)},
            ${payload.principal_amount},
            ${payload.interest_rate},
            ${sqlValue(payload.start_date)},
            ${sqlValue(payload.end_date)},
            ${sqlValue(payload.status)}
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

      await fetchLoans(false);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditingId(loan.loan_id);

    setFormData({
      account_holder_id: String(loan.account_holder_id),
      loan_type: loan.loan_type,
      principal_amount: String(loan.principal_amount),
      interest_rate: String(loan.interest_rate),
      start_date: loan.start_date
        ? loan.start_date.split("T")[0]
        : "",
      end_date: loan.end_date
        ? loan.end_date.split("T")[0]
        : "",
      status: loan.status,
    });

    setShowForm(true);
  };

  const handleDelete = async (loan: Loan) => {
    const confirmed = window.confirm(
      `Delete loan #${loan.loan_id} for ${loan.account_holder_name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/loans?id=${loan.loan_id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete loan");
      }

      const query = `
        DELETE FROM loan
        WHERE loan_id = ${loan.loan_id}
        RETURNING *;
      `;

      setSqlOperation("DELETE");
      setSqlQuery(query);
      setShowSql(true);

      await fetchLoans(false);
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
              Loans
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage customer loans and payment balances.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Add Loan
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
                placeholder="Search holder or loan type"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Loan Type
              </label>

              <input
                type="text"
                value={loanType}
                onChange={(e) => setLoanType(e.target.value)}
                placeholder="e.g. Home Loan"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="defaulted">Defaulted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Min Principal
              </label>

              <input
                type="number"
                value={minPrincipal}
                onChange={(e) => setMinPrincipal(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Max Principal
              </label>

              <input
                type="number"
                value={maxPrincipal}
                onChange={(e) => setMaxPrincipal(e.target.value)}
                placeholder="1000000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Min Interest
              </label>

              <input
                type="number"
                step="0.01"
                value={minInterest}
                onChange={(e) => setMinInterest(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Max Interest
              </label>

              <input
                type="number"
                step="0.01"
                value={maxInterest}
                onChange={(e) => setMaxInterest(e.target.value)}
                placeholder="20"
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
                  {editingId ? "Edit Loan" : "Add Loan"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the loan information below.
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
                    Account Holder
                  </label>

                  <select
                    required
                    value={formData.account_holder_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        account_holder_id: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">Select account holder</option>

                    {accountHolders.map((holder) => (
                      <option
                        key={holder.account_holder_id}
                        value={holder.account_holder_id}
                      >
                        {holder.account_holder_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Loan Type
                  </label>

                  <input
                    required
                    type="text"
                    value={formData.loan_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        loan_type: e.target.value,
                      })
                    }
                    placeholder="e.g. Home Loan"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Principal Amount
                  </label>

                  <input
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={formData.principal_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        principal_amount: e.target.value,
                      })
                    }
                    placeholder="e.g. 500000"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Interest Rate (%)
                  </label>

                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={formData.interest_rate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        interest_rate: e.target.value,
                      })
                    }
                    placeholder="e.g. 8.5"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Start Date
                  </label>

                  <input
                    required
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        start_date: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    End Date
                  </label>

                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        end_date: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <select
                    required
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="defaulted">Defaulted</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
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
                    ? "Update Loan"
                    : "Add Loan"}
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
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    ID
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Account Holder
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Loan Type
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Principal
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Interest
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Start Date
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    End Date
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Status
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Total Paid
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Remaining
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Payments
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
                      colSpan={12}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      Loading loans...
                    </td>
                  </tr>
                ) : loans.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      No loans found.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => (
                    <tr
                      key={loan.loan_id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-black">
                        #{loan.loan_id}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {loan.account_holder_name}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {loan.loan_type}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {Number(loan.principal_amount).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {Number(loan.interest_rate).toFixed(2)}%
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {loan.start_date?.split("T")[0]}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {loan.end_date
                          ? loan.end_date.split("T")[0]
                          : "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                          {loan.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {Number(loan.total_paid).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 font-medium text-black">
                        {Number(
                          loan.remaining_balance
                        ).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {loan.payment_count}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(loan)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(loan)}
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