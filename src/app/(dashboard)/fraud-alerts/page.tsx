"use client";

import { useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type FraudAlert = {
  fraud_alert_id: number;
  transaction_id: number;
  fraud_rule_id: number;
  risk_score: number;
  alert_reason: string | null;
  detected_at: string;
  status: string;

  transaction_type: string;
  amount: number;
  transaction_date: string;
  transaction_status: string;

  account_number: string;

  account_holder_id: number;
  account_holder_name: string;

  merchant_name: string | null;

  fraud_rule_name: string;
  rule_severity: string;
  threshold_value: number | null;
};

type TransactionOption = {
  transaction_id: number;
  account_number: string;
  account_holder_name: string;
  amount: number;
  transaction_type: string;
};

type FraudRuleOption = {
  fraud_rule_id: number;
  fraud_rule_name: string;
  severity: string;
};

type FormData = {
  transaction_id: string;
  fraud_rule_id: string;
  risk_score: string;
  alert_reason: string;
  status: string;
};

const emptyForm: FormData = {
  transaction_id: "",
  fraud_rule_id: "",
  risk_score: "",
  alert_reason: "",
  status: "open",
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

  return `'${escapeSqlString(String(value))}'`;
}

export default function FraudAlertsPage() {
  const [alerts, setAlerts] = useState<FraudAlert[]>(
    []
  );

  const [transactions, setTransactions] =
    useState<TransactionOption[]>([]);

  const [fraudRules, setFraudRules] =
    useState<FraudRuleOption[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("");
  const [ruleFilter, setRuleFilter] =
    useState("");
  const [minRiskScore, setMinRiskScore] =
    useState("");
  const [maxRiskScore, setMaxRiskScore] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [formData, setFormData] =
    useState<FormData>(emptyForm);

  const [showSql, setShowSql] =
    useState(false);

  const [sqlOperation, setSqlOperation] =
    useState("");

  const [sqlQuery, setSqlQuery] =
    useState("");

  const fetchAlerts = async (
    showQuery = false,
    customFilters?: {
      search?: string;
      status?: string;
      ruleId?: string;
      minRiskScore?: string;
      maxRiskScore?: string;
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

        status:
          customFilters?.status !== undefined
            ? customFilters.status
            : statusFilter,

        ruleId:
          customFilters?.ruleId !== undefined
            ? customFilters.ruleId
            : ruleFilter,

        minRiskScore:
          customFilters?.minRiskScore !==
          undefined
            ? customFilters.minRiskScore
            : minRiskScore,

        maxRiskScore:
          customFilters?.maxRiskScore !==
          undefined
            ? customFilters.maxRiskScore
            : maxRiskScore,
      };

      const params = new URLSearchParams();

      if (filters.search) {
        params.set(
          "search",
          filters.search
        );
      }

      if (filters.status) {
        params.set(
          "status",
          filters.status
        );
      }

      if (filters.ruleId) {
        params.set(
          "ruleId",
          filters.ruleId
        );
      }

      if (filters.minRiskScore) {
        params.set(
          "minRiskScore",
          filters.minRiskScore
        );
      }

      if (filters.maxRiskScore) {
        params.set(
          "maxRiskScore",
          filters.maxRiskScore
        );
      }

      const response = await fetch(
        `/api/fraud-alerts?${params.toString()}`
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to fetch fraud alerts"
        );
      }

      setAlerts(result.data);

      if (showQuery) {
        const conditions: string[] = [];

        if (filters.status) {
          conditions.push(
            `fa.status = ${sqlValue(
              filters.status
            )}`
          );
        }

        if (filters.ruleId) {
          conditions.push(
            `fa.fraud_rule_id = ${sqlValue(
              Number(filters.ruleId)
            )}`
          );
        }

        if (filters.minRiskScore) {
          conditions.push(
            `fa.risk_score >= ${sqlValue(
              Number(filters.minRiskScore)
            )}`
          );
        }

        if (filters.maxRiskScore) {
          conditions.push(
            `fa.risk_score <= ${sqlValue(
              Number(filters.maxRiskScore)
            )}`
          );
        }

        if (filters.search) {
          const searchValue =
            `%${filters.search}%`;

          conditions.push(`
            (
              ah.account_holder_name ILIKE ${sqlValue(
                searchValue
              )}
              OR m.merchant_name ILIKE ${sqlValue(
                searchValue
              )}
              OR fr.fraud_rule_name ILIKE ${sqlValue(
                searchValue
              )}
              OR fa.alert_reason ILIKE ${sqlValue(
                searchValue
              )}
            )
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
            fa.fraud_alert_id,
            fa.transaction_id,
            fa.fraud_rule_id,
            fa.risk_score,
            fa.alert_reason,
            fa.detected_at,
            fa.status,
            bt.transaction_type,
            bt.amount,
            bt.transaction_date,
            bt.status AS transaction_status,
            a.account_number,
            ah.account_holder_id,
            ah.account_holder_name,
            m.merchant_name,
            fr.fraud_rule_name,
            fr.severity AS rule_severity,
            fr.threshold_value
          FROM fraud_alert fa
          INNER JOIN bank_transaction bt
            ON fa.transaction_id = bt.transaction_id
          INNER JOIN account a
            ON bt.account_id = a.account_id
          INNER JOIN account_holder ah
            ON a.account_holder_id = ah.account_holder_id
          LEFT JOIN merchant m
            ON bt.merchant_id = m.merchant_id
          INNER JOIN fraud_rule fr
            ON fa.fraud_rule_id = fr.fraud_rule_id
          ${whereClause}
          ORDER BY fa.fraud_alert_id DESC;
        `;

        setSqlOperation(
          filters.search ||
            filters.status ||
            filters.ruleId ||
            filters.minRiskScore ||
            filters.maxRiskScore
            ? "SEARCH"
            : "SELECT"
        );

        setSqlQuery(query);
        setShowSql(true);
      }
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to fetch fraud alerts"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    try {
      const [
        transactionsResponse,
        rulesResponse,
      ] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/fraud-rules"),
      ]);

      const transactionsResult =
        await transactionsResponse.json();

      const rulesResult =
        await rulesResponse.json();

      if (
        transactionsResponse.ok &&
        transactionsResult.success
      ) {
        setTransactions(
          transactionsResult.data.map(
            (transaction: any) => ({
              transaction_id:
                transaction.transaction_id,
              account_number:
                transaction.account_number,
              account_holder_name:
                transaction.account_holder_name,
              amount:
                Number(
                  transaction.amount
                ),
              transaction_type:
                transaction.transaction_type,
            })
          )
        );
      }

      if (
        rulesResponse.ok &&
        rulesResult.success
      ) {
        setFraudRules(
          rulesResult.data.map(
            (rule: any) => ({
              fraud_rule_id:
                rule.fraud_rule_id,
              fraud_rule_name:
                rule.fraud_rule_name,
              severity:
                rule.severity,
            })
          )
        );
      }
    } catch (err) {
      console.error(
        "Failed to load form data:",
        err
      );
    }
  };

  useEffect(() => {
    fetchAlerts(false);
    loadFormData();
  }, []);

  const handleSearch = () => {
    fetchAlerts(true);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setRuleFilter("");
    setMinRiskScore("");
    setMaxRiskScore("");

    fetchAlerts(true, {
      search: "",
      status: "",
      ruleId: "",
      minRiskScore: "",
      maxRiskScore: "",
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
    setFormData(emptyForm);
    setShowForm(true);
    setError("");
  };

  const openEditForm = (
    alert: FraudAlert
  ) => {
    setEditingId(
      alert.fraud_alert_id
    );

    setFormData({
      transaction_id: String(
        alert.transaction_id
      ),
      fraud_rule_id: String(
        alert.fraud_rule_id
      ),
      risk_score: String(
        alert.risk_score
      ),
      alert_reason:
        alert.alert_reason || "",
      status: alert.status,
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

      if (!formData.transaction_id) {
        setError(
          "Transaction is required."
        );
        return;
      }

      if (!formData.fraud_rule_id) {
        setError(
          "Fraud rule is required."
        );
        return;
      }

      if (formData.risk_score === "") {
        setError(
          "Risk score is required."
        );
        return;
      }

      const riskScore =
        Number(formData.risk_score);

      if (
        riskScore < 0 ||
        riskScore > 100
      ) {
        setError(
          "Risk score must be between 0 and 100."
        );
        return;
      }

      const payload = {
        ...(editingId
          ? {
              fraud_alert_id:
                editingId,
            }
          : {}),

        transaction_id:
          Number(
            formData.transaction_id
          ),

        fraud_rule_id:
          Number(
            formData.fraud_rule_id
          ),

        risk_score: riskScore,

        alert_reason:
          formData.alert_reason || null,

        status: formData.status,
      };

      const response = await fetch(
        "/api/fraud-alerts",
        {
          method: editingId
            ? "PUT"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(payload),
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
            "Failed to save fraud alert"
        );
      }

      if (editingId) {
        setSqlOperation("UPDATE");

        setSqlQuery(`
          UPDATE fraud_alert
          SET
            transaction_id = ${sqlValue(
              Number(
                formData.transaction_id
              )
            )},
            fraud_rule_id = ${sqlValue(
              Number(
                formData.fraud_rule_id
              )
            )},
            risk_score = ${sqlValue(
              riskScore
            )},
            alert_reason = ${sqlValue(
              formData.alert_reason
            )},
            status = ${sqlValue(
              formData.status
            )}
          WHERE fraud_alert_id = ${sqlValue(
            editingId
          )}
          RETURNING *;
        `);
      } else {
        setSqlOperation("INSERT");

        setSqlQuery(`
          INSERT INTO fraud_alert
          (
            transaction_id,
            fraud_rule_id,
            risk_score,
            alert_reason,
            status
          )
          VALUES
          (
            ${sqlValue(
              Number(
                formData.transaction_id
              )
            )},
            ${sqlValue(
              Number(
                formData.fraud_rule_id
              )
            )},
            ${sqlValue(
              riskScore
            )},
            ${sqlValue(
              formData.alert_reason
            )},
            ${sqlValue(
              formData.status
            )}
          )
          RETURNING *;
        `);
      }

      setShowSql(true);

      closeForm();

      await fetchAlerts(false);
      await loadFormData();
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to save fraud alert"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (
    alert: FraudAlert
  ) => {
    const confirmed =
      window.confirm(
        `Delete fraud alert #${alert.fraud_alert_id}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/fraud-alerts?id=${alert.fraud_alert_id}`,
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
            "Failed to delete fraud alert"
        );
      }

      setSqlOperation("DELETE");

      setSqlQuery(`
        DELETE FROM fraud_alert
        WHERE fraud_alert_id = ${sqlValue(
          alert.fraud_alert_id
        )}
        RETURNING *;
      `);

      setShowSql(true);

      await fetchAlerts(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to delete fraud alert"
      );
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Fraud Alerts
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Monitor and manage suspicious transaction alerts
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Add Fraud Alert
          </button>
        </div>

        {showSql && (
          <SqlQueryDisplay
            operation={sqlOperation}
            query={sqlQuery}
            onClose={() =>
              setShowSql(false)
            }
          />
        )}

        {error && (
          <div className="relative rounded-lg border border-red-200 bg-red-50 px-4 py-3 pr-10 text-sm text-red-700">
            {error}

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-red-500 hover:text-red-700"
              title="Close error"
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Filter Fraud Alerts
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Search customer, merchant, rule"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            >
              <option value="">
                All Alert Statuses
              </option>

              <option value="open">
                Open
              </option>

              <option value="investigating">
                Investigating
              </option>

              <option value="confirmed">
                Confirmed
              </option>

              <option value="false_positive">
                False Positive
              </option>

              <option value="resolved">
                Resolved
              </option>
            </select>

            <select
              value={ruleFilter}
              onChange={(event) =>
                setRuleFilter(
                  event.target.value
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            >
              <option value="">
                All Fraud Rules
              </option>

              {fraudRules.map((rule) => (
                <option
                  key={
                    rule.fraud_rule_id
                  }
                  value={
                    rule.fraud_rule_id
                  }
                >
                  {rule.fraud_rule_name}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={minRiskScore}
              onChange={(event) =>
                setMinRiskScore(
                  event.target.value
                )
              }
              placeholder="Minimum risk score"
              min="0"
              max="100"
              step="0.01"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            />

            <input
              type="number"
              value={maxRiskScore}
              onChange={(event) =>
                setMaxRiskScore(
                  event.target.value
                )
              }
              placeholder="Maximum risk score"
              min="0"
              max="100"
              step="0.01"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            />

            <div className="flex gap-2 md:col-span-2 lg:col-span-5">
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Search
              </button>

              <button
                type="button"
                onClick={
                  handleClearFilters
                }
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
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
                    ? "Edit Fraud Alert"
                    : "Add Fraud Alert"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter suspicious transaction alert information
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
                    Transaction
                  </label>

                  <select
                    value={
                      formData.transaction_id
                    }
                    onChange={(event) =>
                      handleInputChange(
                        "transaction_id",
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">
                      Select transaction
                    </option>

                    {transactions.map(
                      (transaction) => (
                        <option
                          key={
                            transaction.transaction_id
                          }
                          value={
                            transaction.transaction_id
                          }
                        >
                          #
                          {
                            transaction.transaction_id
                          }{" "}
                          -{" "}
                          {
                            transaction.account_holder_name
                          }{" "}
                          -{" "}
                          {
                            transaction.transaction_type
                          }{" "}
                          -{" "}
                          {Number(
                            transaction.amount
                          ).toLocaleString(
                            "en-BD"
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Fraud Rule
                  </label>

                  <select
                    value={
                      formData.fraud_rule_id
                    }
                    onChange={(event) =>
                      handleInputChange(
                        "fraud_rule_id",
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">
                      Select fraud rule
                    </option>

                    {fraudRules.map(
                      (rule) => (
                        <option
                          key={
                            rule.fraud_rule_id
                          }
                          value={
                            rule.fraud_rule_id
                          }
                        >
                          {
                            rule.fraud_rule_name
                          }{" "}
                          (
                          {
                            rule.severity
                          }
                          )
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Risk Score
                  </label>

                  <input
                    type="number"
                    value={
                      formData.risk_score
                    }
                    onChange={(event) =>
                      handleInputChange(
                        "risk_score",
                        event.target.value
                      )
                    }
                    placeholder="Enter risk score (0-100)"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <select
                    value={
                      formData.status
                    }
                    onChange={(event) =>
                      handleInputChange(
                        "status",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="open">
                      Open
                    </option>

                    <option value="investigating">
                      Investigating
                    </option>

                    <option value="confirmed">
                      Confirmed
                    </option>

                    <option value="false_positive">
                      False Positive
                    </option>

                    <option value="resolved">
                      Resolved
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Alert Reason
                  </label>

                  <textarea
                    value={
                      formData.alert_reason
                    }
                    onChange={(event) =>
                      handleInputChange(
                        "alert_reason",
                        event.target.value
                      )
                    }
                    placeholder="Describe why this transaction was flagged"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
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
                    ? "Update Fraud Alert"
                    : "Add Fraud Alert"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Fraud Alert Records
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {alerts.length} alert
                {alerts.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">
                    ID
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Transaction
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Account Holder
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Merchant
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Fraud Rule
                  </th>

                  <th className="px-5 py-3 text-right font-semibold text-gray-700">
                    Amount
                  </th>

                  <th className="px-5 py-3 text-right font-semibold text-gray-700">
                    Risk Score
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Status
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Detected
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
                      colSpan={10}
                      className="px-5 py-10 text-center text-sm text-gray-500"
                    >
                      Loading fraud alerts...
                    </td>
                  </tr>
                ) : alerts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-10 text-center text-sm text-gray-500"
                    >
                      No fraud alerts found.
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr
                      key={
                        alert.fraud_alert_id
                      }
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {alert.fraud_alert_id}
                      </td>

                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">
                          #{alert.transaction_id}
                        </div>

                        <div className="text-xs capitalize text-gray-500">
                          {
                            alert.transaction_type
                          }
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">
                          {
                            alert.account_holder_name
                          }
                        </div>

                        <div className="text-xs text-gray-500">
                          {
                            alert.account_number
                          }
                        </div>
                      </td>

                      <td className="px-5 py-3 text-gray-700">
                        {alert.merchant_name ||
                          "-"}
                      </td>

                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">
                          {
                            alert.fraud_rule_name
                          }
                        </div>

                        <div className="text-xs capitalize text-gray-500">
                          {
                            alert.rule_severity
                          }
                        </div>
                      </td>

                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {Number(
                          alert.amount
                        ).toLocaleString(
                          "en-BD",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </td>

                      <td className="px-5 py-3 text-right font-semibold text-gray-900">
                        {Number(
                          alert.risk_score
                        ).toFixed(2)}
                      </td>

                      <td className="px-5 py-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                          {alert.status.replace(
                            "_",
                            " "
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap text-gray-600">
                        {new Date(
                          alert.detected_at
                        ).toLocaleDateString(
                          "en-BD"
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                alert
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
                                alert
                              )
                            }
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
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