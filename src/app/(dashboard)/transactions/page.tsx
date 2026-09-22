"use client";

import { useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type Transaction = {
  transaction_id: number;
  account_id: number;
  merchant_id: number | null;
  account_number: string;
  account_holder_name: string;
  merchant_name: string | null;
  transaction_type: string;
  amount: number;
  transaction_date: string;
  status: string;
};

type Account = {
  account_id: number;
  account_number: string;
  account_holder_name: string;
};

type Merchant = {
  merchant_id: number;
  merchant_name: string;
};

type FormData = {
  account_id: string;
  merchant_id: string;
  transaction_type: string;
  amount: string;
  transaction_date: string;
  status: string;
};

const emptyForm: FormData = {
  account_id: "",
  merchant_id: "",
  transaction_type: "deposit",
  amount: "",
  transaction_date: "",
  status: "completed",
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

  return `'${escapeSqlString(String(value))}'`;
}

function formatDateTime(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDateForInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const fetchTransactions = async (
    showQuery = false,
    customFilters?: {
      search?: string;
      transactionType?: string;
      status?: string;
      minAmount?: string;
      maxAmount?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ) => {
    try {
      setLoading(true);
      setError("");

      const filters = {
        search:
          customFilters?.search !== undefined
            ? customFilters.search
            : search,
        transactionType:
          customFilters?.transactionType !== undefined
            ? customFilters.transactionType
            : typeFilter,
        status:
          customFilters?.status !== undefined
            ? customFilters.status
            : statusFilter,
        minAmount:
          customFilters?.minAmount !== undefined
            ? customFilters.minAmount
            : minAmount,
        maxAmount:
          customFilters?.maxAmount !== undefined
            ? customFilters.maxAmount
            : maxAmount,
        dateFrom:
          customFilters?.dateFrom !== undefined
            ? customFilters.dateFrom
            : dateFrom,
        dateTo:
          customFilters?.dateTo !== undefined
            ? customFilters.dateTo
            : dateTo,
      };

      const params = new URLSearchParams();

      if (filters.search) {
        params.set("search", filters.search);
      }

      if (filters.transactionType) {
        params.set(
          "transactionType",
          filters.transactionType
        );
      }

      if (filters.status) {
        params.set("status", filters.status);
      }

      if (filters.minAmount) {
        params.set("minAmount", filters.minAmount);
      }

      if (filters.maxAmount) {
        params.set("maxAmount", filters.maxAmount);
      }

      if (filters.dateFrom) {
        params.set("dateFrom", filters.dateFrom);
      }

      if (filters.dateTo) {
        params.set("dateTo", filters.dateTo);
      }

      const response = await fetch(
        `/api/transactions?${params.toString()}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch transactions"
        );
      }

      setTransactions(result.data);

      if (showQuery) {
        const conditions: string[] = [];

        if (filters.transactionType) {
          conditions.push(
            `bt.transaction_type = ${sqlValue(
              filters.transactionType
            )}`
          );
        }

        if (filters.status) {
          conditions.push(
            `bt.status = ${sqlValue(filters.status)}`
          );
        }

        if (filters.minAmount) {
          conditions.push(
            `bt.amount >= ${sqlValue(
              Number(filters.minAmount)
            )}`
          );
        }

        if (filters.maxAmount) {
          conditions.push(
            `bt.amount <= ${sqlValue(
              Number(filters.maxAmount)
            )}`
          );
        }

        if (filters.dateFrom) {
          conditions.push(
            `bt.transaction_date::date >= ${sqlValue(
              filters.dateFrom
            )}`
          );
        }

        if (filters.dateTo) {
          conditions.push(
            `bt.transaction_date::date <= ${sqlValue(
              filters.dateTo
            )}`
          );
        }

        if (filters.search) {
          const searchValue = `%${filters.search}%`;

          conditions.push(`
            (
              a.account_number ILIKE ${sqlValue(searchValue)}
              OR ah.account_holder_name ILIKE ${sqlValue(searchValue)}
              OR m.merchant_name ILIKE ${sqlValue(searchValue)}
            )
          `);
        }

        const whereClause =
          conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const query = `
          SELECT
            bt.transaction_id,
            bt.account_id,
            bt.merchant_id,
            a.account_number,
            ah.account_holder_name,
            m.merchant_name,
            bt.transaction_type,
            bt.amount,
            bt.transaction_date,
            bt.status
          FROM bank_transaction bt
          INNER JOIN account a
            ON bt.account_id = a.account_id
          INNER JOIN account_holder ah
            ON a.account_holder_id = ah.account_holder_id
          LEFT JOIN merchant m
            ON bt.merchant_id = m.merchant_id
          ${whereClause}
          ORDER BY bt.transaction_id;
        `;

        setSqlOperation(
          filters.search ||
            filters.transactionType ||
            filters.status ||
            filters.minAmount ||
            filters.maxAmount ||
            filters.dateFrom ||
            filters.dateTo
            ? "SEARCH"
            : "SELECT"
        );

        setSqlQuery(query);
        setShowSql(true);
      }
    } catch (err: any) {
      setError(
        err.message || "Failed to fetch transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [accountsResponse, merchantsResponse] =
        await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/merchants"),
        ]);

      const accountsResult =
        await accountsResponse.json();

      const merchantsResult =
        await merchantsResponse.json();

      if (
        !accountsResponse.ok ||
        !accountsResult.success
      ) {
        throw new Error(
          accountsResult.message ||
            "Failed to load accounts"
        );
      }

      if (
        !merchantsResponse.ok ||
        !merchantsResult.success
      ) {
        throw new Error(
          merchantsResult.message ||
            "Failed to load merchants"
        );
      }

      setAccounts(accountsResult.data);
      setMerchants(merchantsResult.data);
    } catch (err: any) {
      setError(
        err.message || "Failed to load form data"
      );
    }
  };

  useEffect(() => {
    fetchTransactions(false);
    fetchFormData();
  }, []);

  const handleSearch = () => {
    fetchTransactions(true);
  };

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setMinAmount("");
    setMaxAmount("");
    setDateFrom("");
    setDateTo("");

    fetchTransactions(true, {
      search: "",
      transactionType: "",
      status: "",
      minAmount: "",
      maxAmount: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const handleInputChange = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData({
      ...emptyForm,
      transaction_date: "",
    });
    setShowForm(true);
    setError("");
  };

  const openEditForm = (transaction: Transaction) => {
    setEditingId(transaction.transaction_id);

    setFormData({
      account_id: String(transaction.account_id),
      merchant_id:
        transaction.merchant_id !== null
          ? String(transaction.merchant_id)
          : "",
      transaction_type: transaction.transaction_type,
      amount: String(transaction.amount),
      transaction_date: formatDateForInput(
        transaction.transaction_date
      ),
      status: transaction.status,
    });

    setShowForm(true);
    setError("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    try {
      setFormLoading(true);
      setError("");

      if (
        !formData.account_id ||
        !formData.transaction_type ||
        !formData.amount
      ) {
        setError(
          "Account, transaction type and amount are required."
        );
        return;
      }

      const payload = {
        ...(editingId
          ? { transaction_id: editingId }
          : {}),
        account_id: Number(formData.account_id),
        merchant_id: formData.merchant_id
          ? Number(formData.merchant_id)
          : null,
        transaction_type:
          formData.transaction_type,
        amount: Number(formData.amount),
        transaction_date:
          formData.transaction_date || null,
        status: formData.status || "completed",
      };

      const response = await fetch(
        "/api/transactions",
        {
          method: editingId ? "PUT" : "POST",
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
            "Failed to save transaction"
        );
      }

      const account = accounts.find(
        (item) =>
          item.account_id ===
          Number(formData.account_id)
      );

      const merchant = merchants.find(
        (item) =>
          item.merchant_id ===
          Number(formData.merchant_id)
      );

      if (editingId) {
        setSqlOperation("UPDATE");

        setSqlQuery(`
          UPDATE bank_transaction
          SET
            account_id = ${sqlValue(
              Number(formData.account_id)
            )},
            merchant_id = ${
              formData.merchant_id
                ? sqlValue(
                    Number(formData.merchant_id)
                  )
                : "NULL"
            },
            transaction_type = ${sqlValue(
              formData.transaction_type
            )},
            amount = ${sqlValue(
              Number(formData.amount)
            )},
            transaction_date = ${
              formData.transaction_date
                ? sqlValue(
                    formData.transaction_date
                  )
                : "NULL"
            },
            status = ${sqlValue(
              formData.status
            )}
          WHERE transaction_id = ${sqlValue(
            editingId
          )}
          RETURNING *;
        `);
      } else {
        setSqlOperation("INSERT");

        setSqlQuery(`
          INSERT INTO bank_transaction
          (
            account_id,
            merchant_id,
            transaction_type,
            amount,
            transaction_date,
            status
          )
          VALUES
          (
            ${sqlValue(
              Number(formData.account_id)
            )},
            ${
              formData.merchant_id
                ? sqlValue(
                    Number(formData.merchant_id)
                  )
                : "NULL"
            },
            ${sqlValue(
              formData.transaction_type
            )},
            ${sqlValue(
              Number(formData.amount)
            )},
            ${
              formData.transaction_date
                ? sqlValue(
                    formData.transaction_date
                  )
                : "NULL"
            },
            ${sqlValue(
              formData.status
            )}
          )
          RETURNING *;
        `);
      }

      setShowSql(true);

      if (!account) {
        console.warn(
          "Selected account not found in form data"
        );
      }

      if (
        formData.merchant_id &&
        !merchant
      ) {
        console.warn(
          "Selected merchant not found in form data"
        );
      }

      closeForm();

      await fetchTransactions(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to save transaction"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (
    transaction: Transaction
  ) => {
    const confirmed = window.confirm(
      `Delete transaction #${transaction.transaction_id}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/transactions?id=${transaction.transaction_id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to delete transaction"
        );
      }

      setSqlOperation("DELETE");

      setSqlQuery(`
        DELETE FROM bank_transaction
        WHERE transaction_id = ${sqlValue(
          transaction.transaction_id
        )}
        RETURNING *;
      `);

      setShowSql(true);

      await fetchTransactions(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to delete transaction"
      );
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bank Transactions
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage and analyze banking transactions
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Add Transaction
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
          <div className="relative rounded-lg border border-red-200 bg-red-50 px-4 py-3 pr-10 text-sm text-red-700">
            {error}

            <button
              type="button"
              onClick={() => setError("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-red-500 hover:text-red-700"
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Filter Transactions
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
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
              placeholder="Search account, customer or merchant"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            />

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            >
              <option value="">
                All Transaction Types
              </option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">
                Withdrawal
              </option>
              <option value="transfer">Transfer</option>
              <option value="payment">Payment</option>
              <option value="purchase">Purchase</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">
                Completed
              </option>
              <option value="failed">Failed</option>
              <option value="cancelled">
                Cancelled
              </option>
              <option value="reversed">Reversed</option>
            </select>

            <input
              type="number"
              value={minAmount}
              onChange={(event) =>
                setMinAmount(event.target.value)
              }
              placeholder="Minimum amount"
              min="0"
              step="0.01"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            />

            <input
              type="number"
              value={maxAmount}
              onChange={(event) =>
                setMaxAmount(event.target.value)
              }
              placeholder="Maximum amount"
              min="0"
              step="0.01"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            />

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Date From
              </label>

              <input
                type="date"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Date To
              </label>

              <input
                type="date"
                value={dateTo}
                onChange={(event) =>
                  setDateTo(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleSearch}
                className="flex-1 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Search
              </button>

              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId
                    ? "Edit Transaction"
                    : "Add Transaction"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter transaction information
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-md px-2 py-1 text-xl text-gray-500 hover:bg-gray-100 hover:text-black"
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Account
                  </label>

                  <select
                    value={formData.account_id}
                    onChange={(event) =>
                      handleInputChange(
                        "account_id",
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">
                      Select account
                    </option>

                    {accounts.map((account) => (
                      <option
                        key={account.account_id}
                        value={account.account_id}
                      >
                        {account.account_number} —{" "}
                        {account.account_holder_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Merchant
                  </label>

                  <select
                    value={formData.merchant_id}
                    onChange={(event) =>
                      handleInputChange(
                        "merchant_id",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">
                      No merchant
                    </option>

                    {merchants.map((merchant) => (
                      <option
                        key={merchant.merchant_id}
                        value={merchant.merchant_id}
                      >
                        {merchant.merchant_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Transaction Type
                  </label>

                  <select
                    value={
                      formData.transaction_type
                    }
                    onChange={(event) =>
                      handleInputChange(
                        "transaction_type",
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="deposit">
                      Deposit
                    </option>
                    <option value="withdrawal">
                      Withdrawal
                    </option>
                    <option value="transfer">
                      Transfer
                    </option>
                    <option value="payment">
                      Payment
                    </option>
                    <option value="purchase">
                      Purchase
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Amount
                  </label>

                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(event) =>
                      handleInputChange(
                        "amount",
                        event.target.value
                      )
                    }
                    placeholder="Enter transaction amount"
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Transaction Date
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      formData.transaction_date
                    }
                    onChange={(event) =>
                      handleInputChange(
                        "transaction_date",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <select
                    value={formData.status}
                    onChange={(event) =>
                      handleInputChange(
                        "status",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="pending">
                      Pending
                    </option>
                    <option value="completed">
                      Completed
                    </option>
                    <option value="failed">
                      Failed
                    </option>
                    <option value="cancelled">
                      Cancelled
                    </option>
                    <option value="reversed">
                      Reversed
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {formLoading
                    ? "Saving..."
                    : editingId
                    ? "Update Transaction"
                    : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Transaction Records
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {transactions.length} transaction
                {transactions.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">
                    ID
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Account
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Customer
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Merchant
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Type
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Amount
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Date
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
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-10 text-center text-sm text-gray-500"
                    >
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-10 text-center text-sm text-gray-500"
                    >
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map(
                    (transaction) => (
                      <tr
                        key={
                          transaction.transaction_id
                        }
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {transaction.transaction_id}
                        </td>

                        <td className="px-5 py-3 text-gray-700">
                          {transaction.account_number}
                        </td>

                        <td className="px-5 py-3 text-gray-700">
                          {
                            transaction.account_holder_name
                          }
                        </td>

                        <td className="px-5 py-3 text-gray-700">
                          {transaction.merchant_name ||
                            "-"}
                        </td>

                        <td className="px-5 py-3">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                            {
                              transaction.transaction_type
                            }
                          </span>
                        </td>

                        <td className="px-5 py-3 font-medium text-gray-900">
                          ৳{" "}
                          {Number(
                            transaction.amount
                          ).toLocaleString(
                            "en-BD",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </td>

                        <td className="px-5 py-3 text-gray-700">
                          {formatDateTime(
                            transaction.transaction_date
                          )}
                        </td>

                        <td className="px-5 py-3">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                            {transaction.status}
                          </span>
                        </td>

                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  transaction
                                )
                              }
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  transaction
                                )
                              }
                              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}