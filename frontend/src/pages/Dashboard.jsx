import { useEffect, useState } from "react";
import apiClient from "../api/client";
import Layout from "../components/Layout";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "object" && value.$numberDecimal !== undefined) {
    const parsed = parseFloat(value.$numberDecimal);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatInr(value) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatCompactInr(value) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
}

function buildAgingBuckets(invoices) {
  const buckets = [
    { label: "Current", value: 0, color: "bg-emerald-500" },
    { label: "0-30", value: 0, color: "bg-sky-500" },
    { label: "31-60", value: 0, color: "bg-amber-500" },
    { label: "61-90", value: 0, color: "bg-orange-500" },
    { label: "90+", value: 0, color: "bg-red-500" },
  ];
  const now = Date.now();

  invoices.forEach((invoice) => {
    const balance = toNumber(invoice.balanceInr);
    if (balance <= 0) return;

    const due = toDate(invoice.dueDate || invoice.invoiceDate || invoice.createdAt);
    if (!due) {
      buckets[1].value += balance;
      return;
    }

    const daysPastDue = Math.floor((now - due.getTime()) / MS_PER_DAY);
    if (daysPastDue <= 0) buckets[0].value += balance;
    else if (daysPastDue <= 30) buckets[1].value += balance;
    else if (daysPastDue <= 60) buckets[2].value += balance;
    else if (daysPastDue <= 90) buckets[3].value += balance;
    else buckets[4].value += balance;
  });

  return buckets;
}

function buildMonthlyPayments(payments, monthCount = 6) {
  const now = new Date();
  const months = [];

  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString("en-IN", { month: "short" }),
      value: 0,
    });
  }

  payments.forEach((payment) => {
    const date = toDate(
      payment.paymentDate || payment.receivedDate || payment.valueDate || payment.createdAt
    );
    if (!date) return;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const month = months.find((m) => m.key === key);
    if (month) month.value += toNumber(payment.amountInr ?? payment.amount);
  });

  return months;
}

function buildMatchStatus(payments, exceptionCount) {
  let matched = 0;
  let unmatched = 0;

  payments.forEach((payment) => {
    const status = String(payment.status || payment.matchStatus || "").toLowerCase();
    if (status.includes("unmatch") || status === "pending" || status === "unapplied") {
      unmatched += 1;
    } else if (status.includes("match") || status.includes("applied")) {
      matched += 1;
    }
  });

  return [
    { label: "Matched", value: matched, color: "#10b981" },
    { label: "Needs review", value: exceptionCount, color: "#f59e0b" },
    { label: "Unmatched", value: unmatched, color: "#ef4444" },
  ];
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-gray-400">{message}</div>
  );
}

function AgingChart({ buckets }) {
  const max = Math.max(...buckets.map((b) => b.value), 0);

  if (max === 0) return <EmptyState message="No open balances" />;

  return (
    <div className="flex items-end justify-between gap-2 h-48">
      {buckets.map((bucket) => {
        const heightPercent = (bucket.value / max) * 100;
        return (
          <div key={bucket.label} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <span className="text-[10px] sm:text-xs text-gray-600 mb-1 truncate max-w-full">
              {bucket.value > 0 ? formatCompactInr(bucket.value) : ""}
            </span>
            <div
              className={`w-full rounded-t ${bucket.color}`}
              style={{ height: `${Math.max(heightPercent, bucket.value > 0 ? 3 : 0)}%` }}
              title={`${bucket.label} days: ${formatInr(bucket.value)}`}
            />
            <span className="text-[10px] sm:text-xs text-gray-500 mt-2">{bucket.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function PaymentsLineChart({ months }) {
  const width = 400;
  const height = 180;
  const padding = { top: 16, right: 16, bottom: 28, left: 16 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(...months.map((m) => m.value), 0);

  if (max === 0) return <EmptyState message="No payments in the last 6 months" />;

  const points = months.map((month, index) => {
    const x = padding.left + (months.length === 1 ? innerWidth / 2 : (index / (months.length - 1)) * innerWidth);
    const y = padding.top + innerHeight - (month.value / max) * innerHeight;
    return { x, y, ...month };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padding.top + innerHeight} L${points[0].x},${
    padding.top + innerHeight
  } Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Payments received per month">
      <line
        x1={padding.left}
        y1={padding.top + innerHeight}
        x2={width - padding.right}
        y2={padding.top + innerHeight}
        stroke="#e5e7eb"
        strokeWidth="1"
      />
      <path d={areaPath} fill="#0f172a" fillOpacity="0.08" />
      <path d={linePath} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p) => (
        <g key={p.key}>
          <circle cx={p.x} cy={p.y} r="4" fill="#0f172a">
            <title>{`${p.label}: ${formatInr(p.value)}`}</title>
          </circle>
          <text x={p.x} y={height - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
            {p.label}
          </text>
          {p.value > 0 && (
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fill="#374151">
              {formatCompactInr(p.value)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function MatchDonut({ segments }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) return <EmptyState message="No payments yet" />;

  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
      <svg viewBox="0 0 140 140" className="w-40 h-40 shrink-0" role="img" aria-label="Match status breakdown">
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="18" />
          {segments.map((segment) => {
            if (segment.value === 0) return null;
            const length = (segment.value / total) * circumference;
            const dashOffset = -offset;
            offset += length;
            return (
              <circle
                key={segment.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="18"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
              >
                <title>{`${segment.label}: ${segment.value}`}</title>
              </circle>
            );
          })}
        </g>
        <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">
          {total}
        </text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#6b7280">
          total
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="text-gray-600">{segment.label}</span>
            <span className="font-semibold text-slate-900">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ invoices: 0, payments: 0, exceptions: 0, openBalance: 0 });
  const [aging, setAging] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [matchStatus, setMatchStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [invRes, payRes, excRes] = await Promise.all([
          apiClient.get("/invoices"),
          apiClient.get("/payments"),
          apiClient.get("/exceptions"),
        ]);

        const invoices = Array.isArray(invRes.data) ? invRes.data : [];
        const payments = Array.isArray(payRes.data) ? payRes.data : [];
        const exceptions = Array.isArray(excRes.data) ? excRes.data : [];

        const openBalance = invoices.reduce((sum, inv) => sum + toNumber(inv.balanceInr), 0);

        setStats({
          invoices: invoices.length,
          payments: payments.length,
          exceptions: exceptions.length,
          openBalance,
        });
        setAging(buildAgingBuckets(invoices));
        setMonthly(buildMonthlyPayments(payments));
        setMatchStatus(buildMatchStatus(payments, exceptions.length));
        setError("");
      } catch (err) {
        console.error(err);
        setError("Could not load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    { label: "Total Invoices", value: stats.invoices },
    { label: "Total Payments", value: stats.payments },
    { label: "Needs Review", value: stats.exceptions, highlight: stats.exceptions > 0 },
    { label: "Total Open Balance", value: formatInr(stats.openBalance) },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`bg-white p-5 rounded-lg shadow border ${card.highlight ? "border-red-400" : "border-gray-200"}`}
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.highlight ? "text-red-600" : "text-slate-900"}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading charts...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <ChartCard title="Invoice aging" subtitle="Open balance by days past due">
            <AgingChart buckets={aging} />
          </ChartCard>

          <ChartCard title="Payments received" subtitle="Total amount per month, last 6 months">
            <PaymentsLineChart months={monthly} />
          </ChartCard>

          <div className="lg:col-span-2">
            <ChartCard title="Match status" subtitle="How payments were reconciled">
              <MatchDonut segments={matchStatus} />
            </ChartCard>
          </div>
        </div>
      )}
    </Layout>
  );
}