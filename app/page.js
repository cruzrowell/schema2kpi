"use client";

import { useState, useMemo } from "react";
import { 
  Database, 
  BarChart3, 
  Copy, 
  Check, 
  Sparkles, 
  Layers, 
  PieChart, 
  Code2,
  RefreshCw,
  AlertCircle,
  Search,
  Download,
  FileCode
} from "lucide-react";

const SQL_DIALECTS = [
  { value: "PostgreSQL", label: "PostgreSQL" },
  { value: "MySQL", label: "MySQL" },
  { value: "BigQuery", label: "BigQuery" },
  { value: "Snowflake", label: "Snowflake" },
  { value: "SQL Server (T-SQL)", label: "SQL Server (T-SQL)" },
];

const SCHEMA_PLACEHOLDER = `e.g.
Table: customers
Columns: id, created_at, country, acquisition_channel

Table: orders
Columns: id, customer_id, order_date, total_amount, payment_method, order_status

Table: order_items
Columns: id, order_id, product_id, quantity, unit_price

Table: products
Columns: id, name, category, cost_price, retail_price, stock_quantity

Or paste raw CREATE TABLE DDL statements directly here...`;

const GOAL_PLACEHOLDER = "e.g. Maximize Customer Lifetime Value (CLV), identify order drop-offs, and track margin performance";

export default function Home() {
  const [schemaText, setSchemaText] = useState("");
  const [businessGoal, setBusinessGoal] = useState("");
  const [dialect, setDialect] = useState("PostgreSQL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [bulkCopiedType, setBulkCopiedType] = useState(null);

  const safeCopyToClipboard = async (text) => {
    if (typeof window === "undefined") return false;

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn("navigator.clipboard.writeText failed, using fallback:", err);
      }
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      textArea.setAttribute("readonly", "");
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("Fallback copy failed:", err);
      return false;
    }
  };

  const handleGenerate = async () => {
    if (!schemaText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSearchQuery("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaText, dialect, businessGoal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to formulate metrics.");
    } finally {
      setLoading(false);
    }
  };

  const copySQL = async (sql, index) => {
    await safeCopyToClipboard(sql);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const copyAllSQL = async () => {
    if (!result?.kpis) return;
    const combined = result.kpis
      .map(
        (kpi, i) =>
          `-- Metric ${i + 1}: ${kpi.kpiName} [${kpi.category}]\n-- Recommended Chart: ${kpi.chartType}\n-- Business Rationale: ${kpi.description}\n${kpi.sqlQuery.trim()};\n`
      )
      .join("\n\n");
    await safeCopyToClipboard(combined);
    triggerBulkCopy("sql");
  };

  const downloadSQL = () => {
    if (!result?.kpis) return;
    const headerComment = `-- Schema2KPI Generated SQL Queries (${dialect})\n-- Domain: ${result.detectedDomain || "General Analytics"}\n-- Scope: ${result.summary || ""}\n\n`;
    const queries = result.kpis
      .map(
        (kpi, i) =>
          `-- Metric ${i + 1}: ${kpi.kpiName} [${kpi.category}]\n-- Recommended Chart: ${kpi.chartType}\n-- Business Rationale: ${kpi.description}\n${kpi.sqlQuery.trim()};\n`
      )
      .join("\n\n");
    const fullContent = headerComment + queries;
    const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const domainSlug = (result.detectedDomain || "metrics").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const dialectSlug = dialect.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.download = `${domainSlug}-kpis-${dialectSlug}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const triggerBulkCopy = (type) => {
    setBulkCopiedType(type);
    setTimeout(() => setBulkCopiedType(null), 2000);
  };

  const resetAll = () => {
    setSchemaText("");
    setBusinessGoal("");
    setResult(null);
    setError(null);
    setSearchQuery("");
  };

  const filteredKpis = useMemo(() => {
    if (!result?.kpis) return [];
    if (!searchQuery.trim()) return result.kpis;
    const q = searchQuery.toLowerCase();
    return result.kpis.filter(
      (k) =>
        k.kpiName?.toLowerCase().includes(q) ||
        k.category?.toLowerCase().includes(q) ||
        k.chartType?.toLowerCase().includes(q) ||
        k.description?.toLowerCase().includes(q)
    );
  }, [result, searchQuery]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-4 lg:py-5 lg:h-screen lg:max-h-screen lg:overflow-hidden flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-3.5 mb-4 border-b border-slate-200 gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            Schema2KPI{" "}
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
              BI Copilot
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Turn raw database schemas & table definitions into executive dashboard KPIs, chart specs, and production SQL.
          </p>
        </div>

        {result && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs w-fit cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            New Schema
          </button>
        )}
      </header>

      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 text-sm shrink-0">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start lg:items-stretch lg:flex-1 lg:min-h-0 lg:overflow-hidden pb-4 lg:pb-0">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 lg:p-5 shadow-xs flex flex-col lg:h-full lg:overflow-hidden justify-between space-y-3 shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Database Schema & Objectives
            </h2>
          </div>

          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex justify-between items-center mb-1.5 shrink-0">
              <label className="text-xs font-semibold text-slate-700">
                Database Schema / DDL:
              </label>
              <span className="text-[11px] text-slate-400">DDL or list of tables</span>
            </div>
            <textarea
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              placeholder={SCHEMA_PLACEHOLDER}
              className="w-full flex-1 min-h-[160px] lg:min-h-0 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 font-mono text-xs p-3 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-2xs leading-relaxed resize-none overflow-y-auto"
            />
          </div>

          <div className="shrink-0">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target SQL Dialect:
            </label>
            <select
              value={dialect}
              onChange={(e) => setDialect(e.target.value)}
              className="w-full bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-2xs font-medium cursor-pointer"
            >
              {SQL_DIALECTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="shrink-0">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Strategic Business Objective (Optional):
            </label>
            <input
              type="text"
              value={businessGoal}
              onChange={(e) => setBusinessGoal(e.target.value)}
              placeholder={GOAL_PLACEHOLDER}
              className="w-full bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-2xs"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !schemaText.trim()}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm hover:shadow shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                Formulating Metrics & {dialect} Queries...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate KPIs & {dialect} SQL
              </>
            )}
          </button>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col min-h-[460px] lg:min-h-0 lg:h-full lg:overflow-hidden">
          <div className="flex flex-wrap items-center justify-between p-3.5 lg:p-4 border-b border-slate-200 gap-3 bg-slate-50/50 rounded-t-xl shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                KPI Dashboard Metrics
              </div>
              {result?.kpis?.length > 0 && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[11px] font-semibold">
                  {result.kpis.length} Metrics
                </span>
              )}
            </div>

            {result && !loading && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copyAllSQL}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition shadow-2xs cursor-pointer"
                  title="Copy all SQL queries combined"
                >
                  {bulkCopiedType === "sql" ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  {bulkCopiedType === "sql" ? "Copied!" : "Copy All SQL"}
                </button>

                <button
                  onClick={downloadSQL}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition shadow-2xs cursor-pointer"
                  title="Download all queries as a single .sql file"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  Download .sql
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 flex-1 overflow-hidden">
              <RefreshCw className="w-9 h-9 animate-spin text-indigo-600" />
              <p className="text-sm font-semibold text-slate-700">
                Formulating metrics & synthesizing {dialect} SQL...
              </p>
              <p className="text-xs text-slate-400 max-w-md text-center">
                Analyzing relational cardinality, window aggregations, and executive visualization patterns.
              </p>
            </div>
          )}

          {!result && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 lg:p-12 text-center flex flex-col items-center justify-center w-full max-w-lg">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <FileCode className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  No Metrics Generated Yet
                </h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Paste your database schema definitions or CREATE TABLE DDL statements on the left, then click Generate to synthesize business metrics and {dialect} queries.
                </p>
              </div>
            </div>
          )}

          {!loading && result && (
            <div className="p-4 lg:p-5 flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 lg:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded">
                      Domain
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {result.detectedDomain}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {result.summary}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap self-start sm:self-auto bg-white/80 border border-slate-200/80 px-2.5 py-1 rounded-md shadow-2xs">
                  <span className="font-semibold text-indigo-600">{result.kpis?.length || 0}</span> metrics designed
                </div>
              </div>

              <div className="relative mb-3.5 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter KPIs by metric name, category, or chart type..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-3.5 overflow-y-auto flex-1 min-h-0 pr-1.5">
                {filteredKpis.map((kpi, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col space-y-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {kpi.category}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          {kpi.kpiName}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <PieChart className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{kpi.chartType}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {kpi.description}
                    </p>

                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-900 text-slate-100">
                      <div className="flex justify-between items-center px-3 py-1.5 bg-slate-800 border-b border-slate-700 text-[11px] text-slate-300 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                          {dialect} Query
                        </span>
                        <button
                          onClick={() => copySQL(kpi.sqlQuery, idx)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium transition cursor-pointer ${
                            copiedIndex === idx
                              ? "bg-green-600/30 text-green-300 border border-green-500/40"
                              : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                          }`}
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy SQL</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 text-xs font-mono text-indigo-200 overflow-x-auto leading-relaxed max-h-48">
                        <code>{kpi.sqlQuery}</code>
                      </pre>
                    </div>
                  </div>
                ))}

                {filteredKpis.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No metrics match your search "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}