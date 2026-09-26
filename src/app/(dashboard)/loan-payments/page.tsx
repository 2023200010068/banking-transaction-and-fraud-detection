"use client";

import { useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type LoanPayment = {
  payment_id: number;
  loan_id: number;
  account_holder_id: number;
  account_holder_name: string;
  loan_type: string;
  principal_amount: number;
  payment_amount: number;
  payment_date: string;
  payment_status: string;
  loan_total_paid: number;
  loan_payment_count: number;
  loan_remaining_balance: number;
};

type Loan = {
  loan_id: number;
  account_holder_name: string;
  loan_type: string;
  principal_amount: number;
};

const emptyForm = {
  loan_id: "",
  payment_amount: "",
  payment_date: "",
  payment_status: "paid",
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

export default function LoanPaymentsPage() {
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  const [search, setSearch] = useState("");
  const [loanId, setLoanId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
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

  const fetchPayments = async (showQuery = false) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search) params.set("search", search);
      if (loanId) params.set("loanId", loanId);
      if (paymentStatus) {
        params.set("paymentStatus", paymentStatus);
      }
      if (minAmount) params.set("minAmount", minAmount);
      if (maxAmount) params.set("maxAmount", maxAmount);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(
        `/api/loan-payments?${params.toString()}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch loan payments"
        );
      }

      setPayments(result.data);

      if (showQuery) {
        const conditions: string[] = [];

        if (loanId) {
          conditions.push(`lp.loan_id = ${Number(loanId)}`);
        }

        if (paymentStatus) {
          conditions.push(
            `lp.payment_status = ${sqlValue(paymentStatus)}`
          );
        }

        if (minAmount) {
          conditions.push(
            `lp.payment_amount >= ${Number(minAmount)}`
          );
        }

        if (maxAmount) {
          conditions.push(
            `lp.payment_amount <= ${Number(maxAmount)}`
          );
        }

        if (startDate) {
          conditions.push(
            `lp.payment_date >= ${sqlValue(startDate)}`
          );
        }

        if (endDate) {
          conditions.push(
            `lp.payment_date <= ${sqlValue(endDate)}`
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
            lp.payment_id,
            lp.loan_id,
            l.account_holder_id,
            ah.account_holder_name,
            l.loan_type,
            l.principal_amount,
            lp.payment_amount,
            lp.payment_date,
            lp.payment_status,
            SUM(lp.payment_amount) OVER (
              PARTITION BY lp.loan_id
            ) AS loan_total_paid,
            COUNT(lp.payment_id) OVER (
              PARTITION BY lp.loan_id
            )::int AS loan_payment_count,
            GREATEST(
              l.principal_amount -
              SUM(lp.payment_amount) OVER (
                PARTITION BY lp.loan_id
              ),
              0
            ) AS loan_remaining_balance
          FROM loan_payment lp
          INNER JOIN loan l
            ON lp.loan_id = l.loan_id
          INNER JOIN account_holder ah
            ON l.account_holder_id = ah.account_holder_id
          ${whereClause}
          ORDER BY lp.payment_id;
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

  const fetchLoans = async () => {
    try {
      const response = await fetch("/api/loans");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch loans"
        );
      }

      setLoans(result.data);
    } catch (err: any) {
      setError(err.message || "Failed to load loans");
    }
  };

  useEffect(() => {
    fetchPayments(false);
    fetchLoans();
  }, []);

  const handleSearch = () => {
    fetchPayments(true);
  };

  const handleReset = () => {
    setSearch("");
    setLoanId("");
    setPaymentStatus("");
    setMinAmount("");
    setMaxAmount("");
    setStartDate("");
    setEndDate("");

    setTimeout(() => {
      fetchPayments(true);
    }, 0);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setFormLoading(true);
      setError("");

      const payload = {
        loan_id: Number(formData.loan_id),
        payment_amount: Number(formData.payment_amount),
        payment_date: formData.payment_date || null,
        payment_status: formData.payment_status,
      };

      const response = await fetch("/api/loan-payments", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId
            ? {
                payment_id: editingId,
                ...payload,
              }
            : payload
        ),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to save loan payment"
        );
      }

      if (editingId) {
        const query = `
          UPDATE loan_payment
          SET
            loan_id = ${payload.loan_id},
            payment_amount = ${payload.payment_amount},
            payment_date = ${sqlValue(payload.payment_date)},
            payment_status = ${sqlValue(payload.payment_status)}
          WHERE payment_id = ${editingId}
          RETURNING *;
        `;

        setSqlOperation("UPDATE");
        setSqlQuery(query);
      } else {
        const query = `
          INSERT INTO loan_payment
          (
            loan_id,
            payment_amount,
            payment_date,
            payment_status
          )
          VALUES
          (
            ${payload.loan_id},
            ${payload.payment_amount},
            ${sqlValue(payload.payment_date)},
            ${sqlValue(payload.payment_status)}
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

      await fetchPayments(false);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (payment: LoanPayment) => {
    setEditingId(payment.payment_id);

    setFormData({
      loan_id: String(payment.loan_id),
      payment_amount: String(payment.payment_amount),
      payment_date: payment.payment_date
        ? payment.payment_date.split("T")[0]
        : "",
      payment_status: payment.payment_status,
    });

    setShowForm(true);
  };

  const handleDelete = async (payment: LoanPayment) => {
    const confirmed = window.confirm(
      `Delete payment #${payment.payment_id} for ${payment.account_holder_name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/loan-payments?id=${payment.payment_id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete loan payment"
        );
      }

      const query = `
        DELETE FROM loan_payment
        WHERE payment_id = ${payment.payment_id}
        RETURNING *;
      `;

      setSqlOperation("DELETE");
      setSqlQuery(query);
      setShowSql(true);

      await fetchPayments(false);
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
              Loan Payments
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage loan payments and track repayment balances.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Add Payment
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
                placeholder="Search account holder or loan type"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Loan
              </label>

              <select
                value={loanId}
                onChange={(e) => setLoanId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              >
                <option value="">All Loans</option>

                {loans.map((loan) => (
                  <option
                    key={loan.loan_id}
                    value={loan.loan_id}
                  >
                    #{loan.loan_id} - {loan.account_holder_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Payment Status
              </label>

              <select
                value={paymentStatus}
                onChange={(e) =>
                  setPaymentStatus(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="late">Late</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Min Amount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Max Amount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="500000"
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
                onChange={(e) => setStartDate(e.target.value)}
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
                onChange={(e) => setEndDate(e.target.value)}
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
                    ? "Edit Loan Payment"
                    : "Add Loan Payment"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the payment information below.
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
                    Loan
                  </label>

                  <select
                    required
                    value={formData.loan_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        loan_id: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">Select loan</option>

                    {loans.map((loan) => (
                      <option
                        key={loan.loan_id}
                        value={loan.loan_id}
                      >
                        #{loan.loan_id} -{" "}
                        {loan.account_holder_name} -{" "}
                        {loan.loan_type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Payment Amount
                  </label>

                  <input
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={formData.payment_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_amount: e.target.value,
                      })
                    }
                    placeholder="e.g. 25000"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Payment Date
                  </label>

                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_date: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Payment Status
                  </label>

                  <select
                    required
                    value={formData.payment_status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_status: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="late">Late</option>
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
                    ? "Update Payment"
                    : "Add Payment"}
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
                    Loan
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
                    Payment
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Payment Date
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Status
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Loan Paid
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
                      Loading loan payments...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      No loan payments found.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr
                      key={payment.payment_id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-black">
                        #{payment.payment_id}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        #{payment.loan_id}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {payment.account_holder_name}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {payment.loan_type}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {Number(
                          payment.principal_amount
                        ).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 font-medium text-black">
                        {Number(
                          payment.payment_amount
                        ).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {payment.payment_date?.split("T")[0]}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                          {payment.payment_status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {Number(
                          payment.loan_total_paid
                        ).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 font-medium text-black">
                        {Number(
                          payment.loan_remaining_balance
                        ).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {payment.loan_payment_count}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(payment)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(payment)
                            }
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