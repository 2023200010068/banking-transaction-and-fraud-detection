"use client";

import { useEffect, useState } from "react";
import SqlQueryDisplay from "@/components/SqlQueryDisplay";

type AccountHolder = {
  account_holder_id: number;
  account_holder_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  occupation: string | null;
  address: string | null;
};

type FormData = {
  account_holder_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  occupation: string;
  address: string;
};

const emptyForm: FormData = {
  account_holder_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  occupation: "",
  address: "",
};

const escapeSqlString = (value: string) => {
  return value.replace(/'/g, "''");
};

const sqlValue = (value: string) => {
  if (!value || value.trim() === "") {
    return "NULL";
  }

  return `'${escapeSqlString(value.trim())}'`;
};

export default function AccountHoldersPage() {
  const [holders, setHolders] = useState<AccountHolder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [showSql, setShowSql] = useState(false);
  const [sqlOperation, setSqlOperation] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");

  const fetchHolders = async (
    showQuery = false,
    searchValue = ""
  ) => {
    try {
      setLoading(true);
      setError("");

      const trimmedSearch = searchValue.trim();
      const params = new URLSearchParams();

      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }

      const queryString = params.toString();

      const response = await fetch(
        `/api/account-holders${queryString ? `?${queryString}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch account holders."
        );
      }

      setHolders(data.data || []);

      if (showQuery) {
        if (trimmedSearch) {
          const escapedSearch = escapeSqlString(trimmedSearch);

          setSqlOperation("SEARCH");
          setSqlQuery(
            `SELECT account_holder_id, account_holder_name, email, phone, date_of_birth, occupation, address FROM account_holder WHERE account_holder_name ILIKE '%${escapedSearch}%' OR email ILIKE '%${escapedSearch}%' OR phone ILIKE '%${escapedSearch}%' OR occupation ILIKE '%${escapedSearch}%' ORDER BY account_holder_id;`
          );
        } else {
          setSqlOperation("SELECT");
          setSqlQuery(
            `SELECT account_holder_id, account_holder_name, email, phone, date_of_birth, occupation, address FROM account_holder ORDER BY account_holder_id;`
          );
        }

        setShowSql(true);
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolders(false, "");
  }, []);

  const handleSearch = async () => {
    setError("");
    await fetchHolders(true, search);
  };

  const handleClearSearch = async () => {
    setSearch("");
    setError("");
    await fetchHolders(true, "");
  };

  const handleAddClick = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setError("");
    setShowForm(true);
  };

  const handleEditClick = (holder: AccountHolder) => {
    setEditingId(holder.account_holder_id);

    setFormData({
      account_holder_name: holder.account_holder_name || "",
      email: holder.email || "",
      phone: holder.phone || "",
      date_of_birth: holder.date_of_birth
        ? holder.date_of_birth.substring(0, 10)
        : "",
      occupation: holder.occupation || "",
      address: holder.address || "",
    });

    setError("");
    setShowForm(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    const isEditing = editingId !== null;

    try {
      setFormLoading(true);

      const payload = {
        ...(isEditing ? { id: editingId } : {}),
        account_holder_name: formData.account_holder_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        date_of_birth: formData.date_of_birth || null,
        occupation: formData.occupation.trim(),
        address: formData.address.trim(),
      };

      const response = await fetch("/api/account-holders", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to ${
              isEditing ? "update" : "add"
            } account holder.`
        );
      }

      if (isEditing) {
        setSqlOperation("UPDATE");
        setSqlQuery(
          `UPDATE account_holder SET account_holder_name = ${sqlValue(
            formData.account_holder_name
          )}, email = ${sqlValue(
            formData.email
          )}, phone = ${sqlValue(
            formData.phone
          )}, date_of_birth = ${sqlValue(
            formData.date_of_birth
          )}, occupation = ${sqlValue(
            formData.occupation
          )}, address = ${sqlValue(
            formData.address
          )} WHERE account_holder_id = ${editingId} RETURNING *;`
        );
      } else {
        setSqlOperation("INSERT");
        setSqlQuery(
          `INSERT INTO account_holder (account_holder_name, email, phone, date_of_birth, occupation, address) VALUES (${sqlValue(
            formData.account_holder_name
          )}, ${sqlValue(
            formData.email
          )}, ${sqlValue(
            formData.phone
          )}, ${sqlValue(
            formData.date_of_birth
          )}, ${sqlValue(
            formData.occupation
          )}, ${sqlValue(
            formData.address
          )}) RETURNING *;`
        );
      }

      setShowSql(true);
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);

      await fetchHolders(false, search);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this account holder?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `/api/account-holders?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete account holder."
        );
      }

      setSqlOperation("DELETE");
      setSqlQuery(
        `DELETE FROM account_holder WHERE account_holder_id = ${id} RETURNING *;`
      );
      setShowSql(true);

      await fetchHolders(false, search);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">
              Account Holders
            </h1>
            <p className="mt-1 text-gray-600">
              Manage bank customers
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddClick}
            className="rounded-lg bg-black px-5 py-2.5 font-medium text-white transition hover:bg-gray-800"
          >
            + Add Customer
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
          <div className="relative w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <p className="pr-10 text-left">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xl leading-none text-red-600 transition hover:bg-red-100 hover:text-red-900"
              title="Close error"
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Search by name, email, phone or occupation..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
            />

            <button
              type="button"
              onClick={handleSearch}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Search
            </button>

            <button
              type="button"
              onClick={handleClearSearch}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Clear
            </button>
          </div>
        </div>

        {showForm && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-black">
                  {editingId !== null
                    ? "Edit Account Holder"
                    : "Add Account Holder"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingId !== null
                    ? "Update account holder information"
                    : "Enter the new account holder information"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseForm}
                className="rounded-md px-2 py-1 text-2xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-black"
                title="Close form"
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="account_holder_name"
                    value={
                      formData.account_holder_name
                    }
                    onChange={handleChange}
                    placeholder="e.g. Rahim Ahmed"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. rahim@gmail.com"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Phone
                  </label>

                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. 01712345678"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>

                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Occupation
                  </label>

                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    placeholder="e.g. Software Engineer"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Address
                  </label>

                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. Dhaka, Bangladesh"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
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
                    : editingId !== null
                    ? "Update Customer"
                    : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-5 py-4 font-semibold text-gray-700">
                    ID
                  </th>
                  <th className="px-5 py-4 font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-5 py-4 font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-5 py-4 font-semibold text-gray-700">
                    Phone
                  </th>
                  <th className="px-5 py-4 font-semibold text-gray-700">
                    Date of Birth
                  </th>
                  <th className="px-5 py-4 font-semibold text-gray-700">
                    Occupation
                  </th>
                  <th className="px-5 py-4 font-semibold text-gray-700">
                    Address
                  </th>
                  <th className="px-5 py-4 text-right font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      Loading account holders...
                    </td>
                  </tr>
                ) : holders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      No account holders found.
                    </td>
                  </tr>
                ) : (
                  holders.map((holder) => (
                    <tr
                      key={holder.account_holder_id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 text-gray-600">
                        {holder.account_holder_id}
                      </td>

                      <td className="px-5 py-4 font-medium text-black">
                        {holder.account_holder_name}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {holder.email || "-"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {holder.phone || "-"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {holder.date_of_birth
                          ? new Date(
                              holder.date_of_birth
                            ).toLocaleDateString()
                          : "-"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {holder.occupation || "-"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {holder.address || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleEditClick(holder)
                            }
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                holder.account_holder_id
                              )
                            }
                            className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800"
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
