"use client";

import { useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type FraudRule = {
  fraud_rule_id: number;
  fraud_rule_name: string;
  description: string | null;
  severity: string;
  threshold_value: number | null;
  alert_count: number;
};

type FormData = {
  fraud_rule_name: string;
  description: string;
  severity: string;
  threshold_value: string;
};

const emptyForm: FormData = {
  fraud_rule_name: "",
  description: "",
  severity: "medium",
  threshold_value: "",
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

export default function FraudRulesPage() {
  const [rules, setRules] = useState<FraudRule[]>(
    []
  );

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] =
    useState("");
  const [minThreshold, setMinThreshold] =
    useState("");
  const [maxThreshold, setMaxThreshold] =
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

  const fetchRules = async (
    showQuery = false,
    customFilters?: {
      search?: string;
      severity?: string;
      minThreshold?: string;
      maxThreshold?: string;
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

        severity:
          customFilters?.severity !== undefined
            ? customFilters.severity
            : severityFilter,

        minThreshold:
          customFilters?.minThreshold !==
          undefined
            ? customFilters.minThreshold
            : minThreshold,

        maxThreshold:
          customFilters?.maxThreshold !==
          undefined
            ? customFilters.maxThreshold
            : maxThreshold,
      };

      const params = new URLSearchParams();

      if (filters.search) {
        params.set(
          "search",
          filters.search
        );
      }

      if (filters.severity) {
        params.set(
          "severity",
          filters.severity
        );
      }

      if (filters.minThreshold) {
        params.set(
          "minThreshold",
          filters.minThreshold
        );
      }

      if (filters.maxThreshold) {
        params.set(
          "maxThreshold",
          filters.maxThreshold
        );
      }

      const response = await fetch(
        `/api/fraud-rules?${params.toString()}`
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to fetch fraud rules"
        );
      }

      setRules(result.data);

      if (showQuery) {
        const conditions: string[] = [];

        if (filters.severity) {
          conditions.push(
            `fr.severity = ${sqlValue(
              filters.severity
            )}`
          );
        }

        if (filters.minThreshold) {
          conditions.push(
            `fr.threshold_value >= ${sqlValue(
              Number(filters.minThreshold)
            )}`
          );
        }

        if (filters.maxThreshold) {
          conditions.push(
            `fr.threshold_value <= ${sqlValue(
              Number(filters.maxThreshold)
            )}`
          );
        }

        if (filters.search) {
          const searchValue =
            `%${filters.search}%`;

          conditions.push(`
            (
              fr.fraud_rule_name ILIKE ${sqlValue(
                searchValue
              )}
              OR fr.description ILIKE ${sqlValue(
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
            fr.fraud_rule_id,
            fr.fraud_rule_name,
            fr.description,
            fr.severity,
            fr.threshold_value,
            COUNT(fa.fraud_alert_id)::int AS alert_count
          FROM fraud_rule fr
          LEFT JOIN fraud_alert fa
            ON fr.fraud_rule_id = fa.fraud_rule_id
          ${whereClause}
          GROUP BY
            fr.fraud_rule_id,
            fr.fraud_rule_name,
            fr.description,
            fr.severity,
            fr.threshold_value
          ORDER BY fr.fraud_rule_id;
        `;

        setSqlOperation(
          filters.search ||
            filters.severity ||
            filters.minThreshold ||
            filters.maxThreshold
            ? "SEARCH"
            : "SELECT"
        );

        setSqlQuery(query);
        setShowSql(true);
      }
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to fetch fraud rules"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules(false);
  }, []);

  const handleSearch = () => {
    fetchRules(true);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSeverityFilter("");
    setMinThreshold("");
    setMaxThreshold("");

    fetchRules(true, {
      search: "",
      severity: "",
      minThreshold: "",
      maxThreshold: "",
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
    rule: FraudRule
  ) => {
    setEditingId(
      rule.fraud_rule_id
    );

    setFormData({
      fraud_rule_name:
        rule.fraud_rule_name,
      description:
        rule.description || "",
      severity: rule.severity,
      threshold_value:
        rule.threshold_value !== null
          ? String(rule.threshold_value)
          : "",
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
        !formData.fraud_rule_name.trim()
      ) {
        setError(
          "Fraud rule name is required."
        );
        return;
      }

      if (!formData.severity) {
        setError(
          "Severity is required."
        );
        return;
      }

      if (
        formData.threshold_value !==
          "" &&
        Number(formData.threshold_value) < 0
      ) {
        setError(
          "Threshold value cannot be negative."
        );
        return;
      }

      const payload = {
        ...(editingId
          ? {
              fraud_rule_id:
                editingId,
            }
          : {}),

        fraud_rule_name:
          formData.fraud_rule_name.trim(),

        description:
          formData.description || null,

        severity:
          formData.severity,

        threshold_value:
          formData.threshold_value === ""
            ? null
            : Number(
                formData.threshold_value
              ),
      };

      const response = await fetch(
        "/api/fraud-rules",
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
            "Failed to save fraud rule"
        );
      }

      if (editingId) {
        setSqlOperation("UPDATE");

        setSqlQuery(`
          UPDATE fraud_rule
          SET
            fraud_rule_name = ${sqlValue(
              formData.fraud_rule_name
            )},
            description = ${sqlValue(
              formData.description
            )},
            severity = ${sqlValue(
              formData.severity
            )},
            threshold_value = ${
              formData.threshold_value
                ? sqlValue(
                    Number(
                      formData.threshold_value
                    )
                  )
                : "NULL"
            }
          WHERE fraud_rule_id = ${sqlValue(
            editingId
          )}
          RETURNING *;
        `);
      } else {
        setSqlOperation("INSERT");

        setSqlQuery(`
          INSERT INTO fraud_rule
          (
            fraud_rule_name,
            description,
            severity,
            threshold_value
          )
          VALUES
          (
            ${sqlValue(
              formData.fraud_rule_name
            )},
            ${sqlValue(
              formData.description
            )},
            ${sqlValue(
              formData.severity
            )},
            ${
              formData.threshold_value
                ? sqlValue(
                    Number(
                      formData.threshold_value
                    )
                  )
                : "NULL"
            }
          )
          RETURNING *;
        `);
      }

      setShowSql(true);

      closeForm();

      await fetchRules(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to save fraud rule"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (
    rule: FraudRule
  ) => {
    const confirmed =
      window.confirm(
        `Delete fraud rule #${rule.fraud_rule_id}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/fraud-rules?id=${rule.fraud_rule_id}`,
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
            "Failed to delete fraud rule"
        );
      }

      setSqlOperation("DELETE");

      setSqlQuery(`
        DELETE FROM fraud_rule
        WHERE fraud_rule_id = ${sqlValue(
          rule.fraud_rule_id
        )}
        RETURNING *;
      `);

      setShowSql(true);

      await fetchRules(false);
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to delete fraud rule"
      );
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Fraud Rules
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage rules used to detect suspicious transactions
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Add Fraud Rule
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
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Filter Fraud Rules
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
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Search rule name or description"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            />

            <select
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(
                  event.target.value
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            >
              <option value="">
                All Severities
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

              <option value="critical">
                Critical
              </option>
            </select>

            <input
              type="number"
              value={minThreshold}
              onChange={(event) =>
                setMinThreshold(
                  event.target.value
                )
              }
              placeholder="Minimum threshold"
              min="0"
              step="0.01"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            />

            <input
              type="number"
              value={maxThreshold}
              onChange={(event) =>
                setMaxThreshold(
                  event.target.value
                )
              }
              placeholder="Maximum threshold"
              min="0"
              step="0.01"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
            />

            <div className="flex gap-2 md:col-span-2 lg:col-span-4">
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
                    ? "Edit Fraud Rule"
                    : "Add Fraud Rule"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter fraud detection rule information
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
                    Rule Name
                  </label>

                  <input
                    type="text"
                    value={
                      formData.fraud_rule_name
                    }
                    onChange={(event) =>
                      handleInputChange(
                        "fraud_rule_name",
                        event.target.value
                      )
                    }
                    placeholder="Enter fraud rule name"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Severity
                  </label>

                  <select
                    value={
                      formData.severity
                    }
                    onChange={(event) =>
                      handleInputChange(
                        "severity",
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
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

                    <option value="critical">
                      Critical
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Threshold Value
                  </label>

                  <input
                    type="number"
                    value={
                      formData.threshold_value
                    }
                    onChange={(event) =>
                      handleInputChange(
                        "threshold_value",
                        event.target.value
                      )
                    }
                    placeholder="Enter threshold value"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Description
                  </label>

                  <textarea
                    value={
                      formData.description
                    }
                    onChange={(event) =>
                      handleInputChange(
                        "description",
                        event.target.value
                      )
                    }
                    placeholder="Describe when this fraud rule should trigger"
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
                    ? "Update Fraud Rule"
                    : "Add Fraud Rule"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Fraud Rule Records
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {rules.length} rule
                {rules.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">
                    ID
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Rule Name
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Description
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Severity
                  </th>

                  <th className="px-5 py-3 text-right font-semibold text-gray-700">
                    Threshold
                  </th>

                  <th className="px-5 py-3 text-right font-semibold text-gray-700">
                    Alerts
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
                      colSpan={7}
                      className="px-5 py-10 text-center text-sm text-gray-500"
                    >
                      Loading fraud rules...
                    </td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-sm text-gray-500"
                    >
                      No fraud rules found.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr
                      key={rule.fraud_rule_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {rule.fraud_rule_id}
                      </td>

                      <td className="px-5 py-3 font-medium text-gray-900">
                        {rule.fraud_rule_name}
                      </td>

                      <td className="max-w-md px-5 py-3 text-gray-700">
                        {rule.description ||
                          "-"}
                      </td>

                      <td className="px-5 py-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                          {rule.severity}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {rule.threshold_value !==
                        null
                          ? Number(
                              rule.threshold_value
                            ).toLocaleString(
                              "en-BD",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )
                          : "-"}
                      </td>

                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {rule.alert_count}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                rule
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
                                rule
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