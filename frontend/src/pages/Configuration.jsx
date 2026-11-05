import { useEffect, useState } from "react";
import apiClient from "../api/client";
import Layout from "../components/Layout";

export default function Configuration() {
  const [tdsRates, setTdsRates] = useState([]);
  const [reasonCodes, setReasonCodes] = useState([]);
  const [newRate, setNewRate] = useState({ section: "", ratePercent: "", description: "" });
  const [newReason, setNewReason] = useState({ code: "", description: "" });
  const [creditLookup, setCreditLookup] = useState("");
  const [creditResult, setCreditResult] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const [tdsRes, rcRes] = await Promise.all([
      apiClient.get("/settings/tds-rates"),
      apiClient.get("/reason-codes"),
    ]);
    setTdsRates(tdsRes.data);
    setReasonCodes(rcRes.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addTdsRate(e) {
    e.preventDefault();
    try {
      await apiClient.post("/settings/tds-rates", {
        section: newRate.section,
        ratePercent: parseFloat(newRate.ratePercent),
        description: newRate.description,
      });
      setNewRate({ section: "", ratePercent: "", description: "" });
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || "Error adding TDS rate");
    }
  }

  async function deleteTdsRate(id) {
    await apiClient.delete(`/settings/tds-rates/${id}`);
    load();
  }

  async function addReasonCode(e) {
    e.preventDefault();
    try {
      await apiClient.post("/reason-codes", newReason);
      setNewReason({ code: "", description: "" });
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || "Error adding reason code");
    }
  }

  async function deleteReasonCode(id) {
    await apiClient.delete(`/reason-codes/${id}`);
    load();
  }

  async function lookupCredit(e) {
    e.preventDefault();
    const res = await apiClient.get(`/customers/${encodeURIComponent(creditLookup)}`);
    const bal = res.data.balanceInr?.$numberDecimal || res.data.balanceInr || 0;
    setCreditResult(parseFloat(bal));
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Configuration</h1>
      {msg && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{msg}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* TDS Rates */}
        <div className="bg-white rounded-lg shadow border p-5">
          <h2 className="font-semibold mb-4">TDS Rate Config</h2>
          <form onSubmit={addTdsRate} className="flex flex-wrap gap-2 mb-4">
            <input
              placeholder="Section (e.g. 194C)"
              value={newRate.section}
              onChange={(e) => setNewRate({ ...newRate, section: e.target.value })}
              className="border rounded px-2 py-1 text-sm flex-1 min-w-[100px]"
              required
            />
            <input
              placeholder="Rate %"
              type="number"
              step="0.01"
              value={newRate.ratePercent}
              onChange={(e) => setNewRate({ ...newRate, ratePercent: e.target.value })}
              className="border rounded px-2 py-1 text-sm w-20"
              required
            />
            <input
              placeholder="Description"
              value={newRate.description}
              onChange={(e) => setNewRate({ ...newRate, description: e.target.value })}
              className="border rounded px-2 py-1 text-sm flex-1 min-w-[100px]"
            />
            <button className="bg-slate-900 text-white px-3 py-1 rounded text-sm">Add</button>
          </form>
          <ul className="space-y-1 text-sm">
            {tdsRates.map((r) => (
              <li key={r._id} className="flex justify-between border-t pt-1">
                <span>
                  {r.section} — {r.ratePercent?.$numberDecimal || r.ratePercent}% ({r.description})
                </span>
                <button onClick={() => deleteTdsRate(r._id)} className="text-red-600 text-xs hover:underline">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Reason Codes */}
        <div className="bg-white rounded-lg shadow border p-5">
          <h2 className="font-semibold mb-4">Deduction Reason Codes</h2>
          <form onSubmit={addReasonCode} className="flex flex-wrap gap-2 mb-4">
            <input
              placeholder="Code (e.g. DAMAGED_GOODS)"
              value={newReason.code}
              onChange={(e) => setNewReason({ ...newReason, code: e.target.value })}
              className="border rounded px-2 py-1 text-sm flex-1 min-w-[120px]"
              required
            />
            <input
              placeholder="Description"
              value={newReason.description}
              onChange={(e) => setNewReason({ ...newReason, description: e.target.value })}
              className="border rounded px-2 py-1 text-sm flex-1 min-w-[100px]"
              required
            />
            <button className="bg-slate-900 text-white px-3 py-1 rounded text-sm">Add</button>
          </form>
          <ul className="space-y-1 text-sm">
            {reasonCodes.map((rc) => (
              <li key={rc._id} className="flex justify-between border-t pt-1">
                <span>
                  {rc.code} — {rc.description}
                </span>
                <button onClick={() => deleteReasonCode(rc._id)} className="text-red-600 text-xs hover:underline">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Credit Balance Lookup */}
        <div className="bg-white rounded-lg shadow border p-5 md:col-span-2">
          <h2 className="font-semibold mb-4">Customer Credit Balance Lookup</h2>
          <form onSubmit={lookupCredit} className="flex gap-2">
            <input
              placeholder="Customer name (payerName)"
              value={creditLookup}
              onChange={(e) => setCreditLookup(e.target.value)}
              className="border rounded px-2 py-1 text-sm flex-1"
              required
            />
            <button className="bg-slate-900 text-white px-4 py-1 rounded text-sm">Check</button>
          </form>
          {creditResult !== null && (
            <p className="mt-3 text-sm">
              Credit balance for <strong>{creditLookup}</strong>: ₹{creditResult.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}