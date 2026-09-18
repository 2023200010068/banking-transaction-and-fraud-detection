"use client";

import { useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type Card = {
  card_id: number;
  card_number: string;
  card_type: string;
  issue_date: string;
  expire_date: string;
  status: string;

  account_id: number;
  account_number: string;
  account_type: string;
  balance: string;
  account_status: string;

  account_holder_id: number;
  account_holder_name: string;

  branch_id: number;
  branch_name: string;
  branch_city: string;
};

type Account = {
  account_id: number;
  account_number: string;
  account_type: string;
  account_holder_name: string;
};

const emptyForm = {
  account_id: "",
  card_number: "",
  card_type: "debit",
  issue_date: "",
  expire_date: "",
  status: "active",
};

function escapeSqlString(value: string) {
  return value.replace(/'/g, "''");
}

function sqlValue(
  value: string | number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "NULL";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return `'${escapeSqlString(value)}'`;
}

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [search, setSearch] = useState("");
  const [cardType, setCardType] = useState("");
  const [status, setStatus] = useState("");
  const [accountId, setAccountId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [formData, setFormData] =
    useState(emptyForm);

  const [showSql, setShowSql] = useState(false);
  const [sqlOperation, setSqlOperation] =
    useState("");
  const [sqlQuery, setSqlQuery] =
    useState("");

  const fetchCards = async (
    showQuery = false
  ) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search) {
        params.set("search", search);
      }

      if (cardType) {
        params.set("cardType", cardType);
      }

      if (status) {
        params.set("status", status);
      }

      if (accountId) {
        params.set("accountId", accountId);
      }

      if (startDate) {
        params.set("startDate", startDate);
      }

      if (endDate) {
        params.set("endDate", endDate);
      }

      const response = await fetch(
        `/api/cards?${params.toString()}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to fetch cards"
        );
      }

      setCards(result.data);

      if (showQuery) {
        const conditions: string[] = [];

        if (search) {
          conditions.push(`
            (
              c.card_number ILIKE ${sqlValue(
                `%${search}%`
              )}
              OR ah.account_holder_name ILIKE ${sqlValue(
                `%${search}%`
              )}
              OR a.account_number ILIKE ${sqlValue(
                `%${search}%`
              )}
              OR b.branch_name ILIKE ${sqlValue(
                `%${search}%`
              )}
            )
          `);
        }

        if (cardType) {
          conditions.push(
            `c.card_type = ${sqlValue(
              cardType
            )}`
          );
        }

        if (status) {
          conditions.push(
            `c.status = ${sqlValue(status)}`
          );
        }

        if (accountId) {
          conditions.push(
            `c.account_id = ${Number(
              accountId
            )}`
          );
        }

        if (startDate) {
          conditions.push(
            `c.issue_date >= ${sqlValue(
              startDate
            )}`
          );
        }

        if (endDate) {
          conditions.push(
            `c.issue_date <= ${sqlValue(
              endDate
            )}`
          );
        }

        const whereClause =
          conditions.length > 0
            ? `WHERE ${conditions.join(
                " AND "
              )}`
            : "";

        const query = `
          SELECT
            c.card_id,
            c.card_number,
            c.card_type,
            c.issue_date,
            c.expire_date,
            c.status,
            a.account_number,
            a.account_type,
            ah.account_holder_name,
            b.branch_name,
            b.city AS branch_city
          FROM card c
          INNER JOIN account a
            ON c.account_id = a.account_id
          INNER JOIN account_holder ah
            ON a.account_holder_id =
               ah.account_holder_id
          INNER JOIN branch b
            ON a.branch_id = b.branch_id
          ${whereClause}
          ORDER BY c.card_id ASC;
        `;

        setSqlOperation("SELECT");
        setSqlQuery(query);
        setShowSql(true);
      }
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to fetch cards"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch(
        "/api/accounts"
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setAccounts(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCards(false);
    fetchAccounts();
  }, []);

  const handleInputChange = (
    field: string,
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
      issue_date: new Date()
        .toISOString()
        .split("T")[0],
    });

    setShowForm(true);
  };

  const openEditForm = (card: Card) => {
    setEditingId(card.card_id);

    setFormData({
      account_id: String(card.account_id),
      card_number: card.card_number,
      card_type: card.card_type,
      issue_date: card.issue_date
        ? card.issue_date.split("T")[0]
        : "",
      expire_date: card.expire_date
        ? card.expire_date.split("T")[0]
        : "",
      status: card.status,
    });

    setShowForm(true);
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    try {
      setFormLoading(true);
      setError("");

      const method = editingId
        ? "PUT"
        : "POST";

      const response = await fetch(
        "/api/cards",
        {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            editingId
              ? {
                  ...formData,
                  card_id: editingId,
                }
              : formData
          ),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to save card"
        );
      }

      const operation =
        editingId ? "UPDATE" : "INSERT";

      const query = editingId
        ? `
          UPDATE card
          SET
            account_id = ${Number(
              formData.account_id
            )},
            card_number = ${sqlValue(
              formData.card_number
            )},
            card_type = ${sqlValue(
              formData.card_type
            )},
            issue_date = ${sqlValue(
              formData.issue_date
            )},
            expire_date = ${sqlValue(
              formData.expire_date
            )},
            status = ${sqlValue(
              formData.status
            )}
          WHERE card_id = ${editingId};
        `
        : `
          INSERT INTO card (
            account_id,
            card_number,
            card_type,
            issue_date,
            expire_date,
            status
          )
          VALUES (
            ${Number(formData.account_id)},
            ${sqlValue(
              formData.card_number
            )},
            ${sqlValue(
              formData.card_type
            )},
            ${sqlValue(
              formData.issue_date
            )},
            ${sqlValue(
              formData.expire_date
            )},
            ${sqlValue(
              formData.status
            )}
          );
        `;

      setSqlOperation(operation);
      setSqlQuery(query);
      setShowSql(true);

      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);

      await fetchCards(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to save card"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (
    card: Card
  ) => {
    const confirmed = window.confirm(
      `Delete card ${card.card_number}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/cards?id=${card.card_id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to delete card"
        );
      }

      const query = `
        DELETE FROM card
        WHERE card_id = ${card.card_id};
      `;

      setSqlOperation("DELETE");
      setSqlQuery(query);
      setShowSql(true);

      await fetchCards(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to delete card"
      );
    }
  };

  const formatMoney = (
    value: string | number
  ) => {
    return Number(value || 0).toLocaleString();
  };

  const statusClass = (
    value: string
  ) => {
    switch (value) {
      case "active":
        return "bg-black text-white";

      case "blocked":
        return "bg-gray-800 text-white";

      case "expired":
        return "bg-gray-200 text-gray-800";

      case "cancelled":
        return "bg-gray-100 text-gray-600";

      default:
        return "bg-gray-50 text-gray-500";
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-black">
              Cards
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage bank cards and their associated
              accounts.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Add Card
          </button>
        </div>

        {/* SQL */}
        {showSql && (
          <SqlQueryDisplay
            operation={sqlOperation}
            query={sqlQuery}
            onClose={() => setShowSql(false)}
          />
        )}

        {/* Error */}
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

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Search
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Card number, customer, account or branch"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Card Type
              </label>

              <select
                value={cardType}
                onChange={(e) =>
                  setCardType(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              >
                <option value="">
                  All Card Types
                </option>

                <option value="debit">
                  Debit
                </option>

                <option value="credit">
                  Credit
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              >
                <option value="">
                  All Statuses
                </option>

                <option value="active">
                  Active
                </option>

                <option value="blocked">
                  Blocked
                </option>

                <option value="expired">
                  Expired
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Account
              </label>

              <select
                value={accountId}
                onChange={(e) =>
                  setAccountId(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              >
                <option value="">
                  All Accounts
                </option>

                {accounts.map((account) => (
                  <option
                    key={account.account_id}
                    value={account.account_id}
                  >
                    {account.account_number} —{" "}
                    {
                      account.account_holder_name
                    }
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Issue Date From
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
                Issue Date To
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
              onClick={() =>
                fetchCards(true)
              }
              disabled={loading}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Loading..."
                : "Search"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCardType("");
                setStatus("");
                setAccountId("");
                setStartDate("");
                setEndDate("");

                setTimeout(() => {
                  fetchCards(true);
                }, 0);
              }}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-black">
                  {editingId
                    ? "Edit Card"
                    : "Add Card"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the card information below.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="rounded-md px-2 text-xl text-gray-500 hover:bg-gray-100 hover:text-black"
                title="Close"
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
                    required
                    value={formData.account_id}
                    onChange={(e) =>
                      handleInputChange(
                        "account_id",
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">
                      Select account
                    </option>

                    {accounts.map(
                      (account) => (
                        <option
                          key={
                            account.account_id
                          }
                          value={
                            account.account_id
                          }
                        >
                          {
                            account.account_number
                          }{" "}
                          —{" "}
                          {
                            account.account_holder_name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Card Number
                  </label>

                  <input
                    required
                    type="text"
                    value={
                      formData.card_number
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "card_number",
                        e.target.value
                      )
                    }
                    placeholder="e.g. 4216123456789012"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Card Type
                  </label>

                  <select
                    required
                    value={
                      formData.card_type
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "card_type",
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="debit">
                      Debit
                    </option>

                    <option value="credit">
                      Credit
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Issue Date
                  </label>

                  <input
                    required
                    type="date"
                    value={
                      formData.issue_date
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "issue_date",
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Expiry Date
                  </label>

                  <input
                    required
                    type="date"
                    value={
                      formData.expire_date
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "expire_date",
                        e.target.value
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
                    required
                    value={formData.status}
                    onChange={(e) =>
                      handleInputChange(
                        "status",
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="blocked">
                      Blocked
                    </option>

                    <option value="expired">
                      Expired
                    </option>

                    <option value="cancelled">
                      Cancelled
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {formLoading
                    ? "Saving..."
                    : editingId
                      ? "Update Card"
                      : "Add Card"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-black">
              Card Records
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {cards.length} card
              {cards.length !== 1
                ? "s"
                : ""}{" "}
              found.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    ID
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Card Number
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Type
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Customer
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Account
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Balance
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Branch
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Issue Date
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Expiry Date
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Status
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
                      colSpan={11}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      Loading cards...
                    </td>
                  </tr>
                ) : cards.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      No cards found.
                    </td>
                  </tr>
                ) : (
                  cards.map((card) => (
                    <tr
                      key={card.card_id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-black">
                        {card.card_id}
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-800">
                        {card.card_number}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                          {card.card_type}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {
                            card.account_holder_name
                          }
                        </div>

                        <div className="text-xs text-gray-400">
                          ID:{" "}
                          {
                            card.account_holder_id
                          }
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {
                            card.account_number
                          }
                        </div>

                        <div className="text-xs capitalize text-gray-400">
                          {
                            card.account_type
                          }
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        ৳{" "}
                        {formatMoney(
                          card.balance
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-gray-800">
                          {card.branch_name}
                        </div>

                        <div className="text-xs text-gray-400">
                          {card.branch_city}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {card.issue_date?.split(
                          "T"
                        )[0]}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {card.expire_date?.split(
                          "T"
                        )[0]}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(
                            card.status
                          )}`}
                        >
                          {card.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                card
                              )
                            }
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                card
                              )
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