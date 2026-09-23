"use client";

import { useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type Merchant = {
  merchant_id: number;
  merchant_name: string;
  category: string | null;
  city: string | null;
  risk_level: string;
  contact_number: string | null;
  registration_date: string;

  transaction_count: number;
  total_transaction_volume: string;
  average_transaction_amount: string;
  highest_transaction_amount: string;
  completed_transaction_count: number;
  fraud_alert_count: number;
  maximum_risk_score: string;
};

const emptyForm = {
  merchant_name: "",
  category: "",
  city: "",
  risk_level: "low",
  contact_number: "",
  registration_date: "",
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

export default function MerchantsPage() {
  const [merchants, setMerchants] =
    useState<Merchant[]>([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] =
    useState("");
  const [riskLevel, setRiskLevel] =
    useState("");
  const [minAmount, setMinAmount] =
    useState("");
  const [maxAmount, setMaxAmount] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [formLoading, setFormLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [formData, setFormData] =
    useState(emptyForm);

  const [showSql, setShowSql] =
    useState(false);

  const [sqlOperation, setSqlOperation] =
    useState("");

  const [sqlQuery, setSqlQuery] =
    useState("");

  const fetchMerchants = async (
    showQuery = false
  ) => {
    try {
      setLoading(true);
      setError("");

      const params =
        new URLSearchParams();

      if (search) {
        params.set("search", search);
      }

      if (category) {
        params.set("category", category);
      }

      if (riskLevel) {
        params.set(
          "riskLevel",
          riskLevel
        );
      }

      if (minAmount) {
        params.set(
          "minAmount",
          minAmount
        );
      }

      if (maxAmount) {
        params.set(
          "maxAmount",
          maxAmount
        );
      }

      const response = await fetch(
        `/api/merchants?${params.toString()}`
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to fetch merchants"
        );
      }

      setMerchants(result.data);

      if (showQuery) {
        const conditions: string[] =
          [];

        if (search) {
          conditions.push(`
            (
              m.merchant_name ILIKE ${sqlValue(
                `%${search}%`
              )}
              OR m.category ILIKE ${sqlValue(
                `%${search}%`
              )}
              OR m.city ILIKE ${sqlValue(
                `%${search}%`
              )}
              OR m.contact_number ILIKE ${sqlValue(
                `%${search}%`
              )}
            )
          `);
        }

        if (category) {
          conditions.push(
            `m.category = ${sqlValue(
              category
            )}`
          );
        }

        if (riskLevel) {
          conditions.push(
            `m.risk_level = ${sqlValue(
              riskLevel
            )}`
          );
        }

        if (minAmount) {
          conditions.push(`
            COALESCE(
              SUM(bt.amount),
              0
            ) >= ${Number(minAmount)}
          `);
        }

        if (maxAmount) {
          conditions.push(`
            COALESCE(
              SUM(bt.amount),
              0
            ) <= ${Number(maxAmount)}
          `);
        }

        const whereClause =
          conditions.length > 0
            ? `WHERE ${conditions.join(
                " AND "
              )}`
            : "";

        const query = `
          SELECT
            m.merchant_id,
            m.merchant_name,
            m.category,
            m.city,
            m.risk_level,
            m.contact_number,
            m.registration_date,

            COUNT(
              DISTINCT bt.transaction_id
            ) AS transaction_count,

            COALESCE(
              SUM(bt.amount),
              0
            ) AS total_transaction_volume,

            COALESCE(
              AVG(bt.amount),
              0
            ) AS average_transaction_amount,

            COALESCE(
              MAX(bt.amount),
              0
            ) AS highest_transaction_amount,

            COUNT(
              DISTINCT CASE
                WHEN bt.status = 'completed'
                THEN bt.transaction_id
              END
            ) AS completed_transaction_count,

            COUNT(
              DISTINCT fa.fraud_alert_id
            ) AS fraud_alert_count,

            COALESCE(
              MAX(fa.risk_score),
              0
            ) AS maximum_risk_score

          FROM merchant m

          LEFT JOIN bank_transaction bt
            ON m.merchant_id =
               bt.merchant_id

          LEFT JOIN fraud_alert fa
            ON bt.transaction_id =
               fa.transaction_id

          ${whereClause}

          GROUP BY
            m.merchant_id,
            m.merchant_name,
            m.category,
            m.city,
            m.risk_level,
            m.contact_number,
            m.registration_date

          ORDER BY
            total_transaction_volume DESC,
            m.merchant_id ASC;
        `;

        setSqlOperation("SELECT");
        setSqlQuery(query);
        setShowSql(true);
      }
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to fetch merchants"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants(false);
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
      registration_date: new Date()
        .toISOString()
        .split("T")[0],
    });

    setShowForm(true);
  };

  const openEditForm = (
    merchant: Merchant
  ) => {
    setEditingId(
      merchant.merchant_id
    );

    setFormData({
      merchant_name:
        merchant.merchant_name,
      category:
        merchant.category || "",
      city: merchant.city || "",
      risk_level:
        merchant.risk_level,
      contact_number:
        merchant.contact_number ||
        "",
      registration_date:
        merchant.registration_date
          ? merchant.registration_date.split(
              "T"
            )[0]
          : "",
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
        "/api/merchants",
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
                  merchant_id:
                    editingId,
                }
              : formData
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
            "Failed to save merchant"
        );
      }

      const operation =
        editingId
          ? "UPDATE"
          : "INSERT";

      const query = editingId
        ? `
          UPDATE merchant
          SET
            merchant_name = ${sqlValue(
              formData.merchant_name
            )},
            category = ${sqlValue(
              formData.category
            )},
            city = ${sqlValue(
              formData.city
            )},
            risk_level = ${sqlValue(
              formData.risk_level
            )},
            contact_number = ${sqlValue(
              formData.contact_number
            )},
            registration_date = ${sqlValue(
              formData.registration_date
            )}
          WHERE merchant_id = ${editingId};
        `
        : `
          INSERT INTO merchant (
            merchant_name,
            category,
            city,
            risk_level,
            contact_number,
            registration_date
          )
          VALUES (
            ${sqlValue(
              formData.merchant_name
            )},
            ${sqlValue(
              formData.category
            )},
            ${sqlValue(
              formData.city
            )},
            ${sqlValue(
              formData.risk_level
            )},
            ${sqlValue(
              formData.contact_number
            )},
            ${sqlValue(
              formData.registration_date
            )}
          );
        `;

      setSqlOperation(operation);
      setSqlQuery(query);
      setShowSql(true);

      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);

      await fetchMerchants(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to save merchant"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (
    merchant: Merchant
  ) => {
    const confirmed =
      window.confirm(
        `Delete merchant "${merchant.merchant_name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/merchants?id=${merchant.merchant_id}`,
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
            "Failed to delete merchant"
        );
      }

      const query = `
        DELETE FROM merchant
        WHERE merchant_id = ${merchant.merchant_id};
      `;

      setSqlOperation("DELETE");
      setSqlQuery(query);
      setShowSql(true);

      await fetchMerchants(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to delete merchant"
      );
    }
  };

  const formatMoney = (
    value: string | number
  ) => {
    return Number(
      value || 0
    ).toLocaleString();
  };

  const riskClass = (
    level: string
  ) => {
    switch (level) {
      case "high":
        return "bg-black text-white";

      case "medium":
        return "bg-gray-200 text-gray-800";

      case "low":
        return "bg-gray-100 text-gray-700";

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
              Merchants
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage merchants and analyze their
              transaction activity.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Add Merchant
          </button>
        </div>

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

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
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
                  setSearch(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    fetchMerchants(true);
                  }
                }}
                placeholder="Merchant, category, city or phone"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Category
              </label>

              <input
                type="text"
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value
                  )
                }
                placeholder="e.g. Electronics"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Risk Level
              </label>

              <select
                value={riskLevel}
                onChange={(e) =>
                  setRiskLevel(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              >
                <option value="">
                  All Risk Levels
                </option>

                <option value="low">
                  Low
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="high">
                  High
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Minimum Transaction Volume
              </label>

              <input
                type="number"
                min="0"
                value={minAmount}
                onChange={(e) =>
                  setMinAmount(
                    e.target.value
                  )
                }
                placeholder="e.g. 100000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Maximum Transaction Volume
              </label>

              <input
                type="number"
                min="0"
                value={maxAmount}
                onChange={(e) =>
                  setMaxAmount(
                    e.target.value
                  )
                }
                placeholder="e.g. 1000000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() =>
                fetchMerchants(true)
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
                setCategory("");
                setRiskLevel("");
                setMinAmount("");
                setMaxAmount("");

                setTimeout(() => {
                  fetchMerchants(true);
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
                    ? "Edit Merchant"
                    : "Add Merchant"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter merchant information below.
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
                    Merchant Name
                  </label>

                  <input
                    required
                    type="text"
                    value={
                      formData.merchant_name
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "merchant_name",
                        e.target.value
                      )
                    }
                    placeholder="e.g. ABC Electronics"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Category
                  </label>

                  <input
                    type="text"
                    value={
                      formData.category
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "category",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Electronics"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    City
                  </label>

                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      handleInputChange(
                        "city",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Dhaka"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Risk Level
                  </label>

                  <select
                    required
                    value={
                      formData.risk_level
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "risk_level",
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="low">
                      Low
                    </option>

                    <option value="medium">
                      Medium
                    </option>

                    <option value="high">
                      High
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Contact Number
                  </label>

                  <input
                    type="text"
                    value={
                      formData.contact_number
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "contact_number",
                        e.target.value
                      )
                    }
                    placeholder="e.g. 01712345678"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Registration Date
                  </label>

                  <input
                    type="date"
                    value={
                      formData.registration_date
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "registration_date",
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
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
                      ? "Update Merchant"
                      : "Add Merchant"}
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
              Merchant Records
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {merchants.length} merchant
              {merchants.length !== 1
                ? "s"
                : ""}{" "}
              found.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1600px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    ID
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Merchant
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Category
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    City
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Risk
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Transactions
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Total Volume
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Average
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Highest
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Completed
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Fraud Alerts
                  </th>

                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Max Risk Score
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
                      colSpan={13}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      Loading merchants...
                    </td>
                  </tr>
                ) : merchants.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      No merchants found.
                    </td>
                  </tr>
                ) : (
                  merchants.map(
                    (merchant) => (
                      <tr
                        key={
                          merchant.merchant_id
                        }
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 font-medium text-black">
                          {
                            merchant.merchant_id
                          }
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">
                            {
                              merchant.merchant_name
                            }
                          </div>

                          <div className="text-xs text-gray-400">
                            {
                              merchant.contact_number ||
                              "No contact"
                            }
                          </div>
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {merchant.category ||
                            "—"}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {merchant.city ||
                            "—"}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${riskClass(
                              merchant.risk_level
                            )}`}
                          >
                            {
                              merchant.risk_level
                            }
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {
                            merchant.transaction_count
                          }
                        </td>

                        <td className="px-4 py-3 font-medium text-gray-800">
                          ৳{" "}
                          {formatMoney(
                            merchant.total_transaction_volume
                          )}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          ৳{" "}
                          {formatMoney(
                            merchant.average_transaction_amount
                          )}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          ৳{" "}
                          {formatMoney(
                            merchant.highest_transaction_amount
                          )}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {
                            merchant.completed_transaction_count
                          }
                        </td>

                        <td className="px-4 py-3 font-medium text-gray-800">
                          {
                            merchant.fraud_alert_count
                          }
                        </td>

                        <td className="px-4 py-3 font-semibold text-black">
                          {Number(
                            merchant.maximum_risk_score ||
                              0
                          ).toFixed(2)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  merchant
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
                                  merchant
                                )
                              }
                              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800"
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