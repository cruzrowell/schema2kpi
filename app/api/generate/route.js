import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const { schemaText, dialect = "PostgreSQL", businessGoal } = await req.json();

    if (!schemaText || !schemaText.trim()) {
      return NextResponse.json({ error: "Schema text is required." }, { status: 400 });
    }

    const systemInstruction = `You are a Principal Analytics Engineer & BI Architect.
Your task is to design 3 to 5 actionable, mathematically sound business metrics based on the provided schema.

STRICT METRIC & SQL LOGIC RULES:
1. Chart-to-Query Dimensional Contract:
   - If chartType is a Line Chart or Trend, the query MUST group by a time bucket (e.g., DATE_TRUNC('month', ...)) and order by date. Never return a single scalar row for a trend chart.
   - If chartType is a Breakdown or Comparison, include the categorical dimension in the SELECT and GROUP BY.
   - If chartType is a KPI Card or Single Value, output exactly one scalar summary value.

2. Correct Business Math:
   - MRR/Normalized Recurring Revenue: Annual plans must be divided by 12 (or annual_price / 12.0), NOT multiplied.
   - ARPU (Average Revenue Per User): Calculate as (Total Normalized Revenue) / (Distinct Active Users), not an average over individual subscription rows.
   - Churn Rate: Standard churn divides cancellations in a period by the active user baseline at the START of that period.
   - Log & Event Aggregation: Never directly average log rows (e.g., usage/events). First aggregate (SUM/COUNT) by user/entity per period, then compute the average across users.

3. Schema Grounding:
   - Use ONLY tables and columns explicitly declared in the schema.
   - Factor in cancellations, returns, and refunds (e.g., subtract refund amounts, filter out cancelled statuses) if those columns exist.
   - Write standard, production-ready ${dialect} SQL.`;

    const userPrompt = `Database Schema:
${schemaText}

Strategic Focus / Business Goal:
${businessGoal || "Overall Business Health and Performance"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedDomain: {
              type: Type.STRING,
              description: "e.g., E-Commerce, Logistics, SaaS, FinTech",
            },
            summary: {
              type: Type.STRING,
              description: "Analytical scope and data capabilities enabled by this schema.",
            },
            kpis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  kpiName: { type: Type.STRING },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  chartType: { 
                    type: Type.STRING,
                    description: "Explicit chart type: 'Monthly Line Chart', 'Categorical Bar Chart', or 'Single Value KPI Card'" 
                  },
                  sqlQuery: { type: Type.STRING },
                },
                required: ["kpiName", "category", "description", "chartType", "sqlQuery"],
              },
            },
          },
          required: ["detectedDomain", "summary", "kpis"],
        },
      },
    });

    const parsedData = JSON.parse(response.text);
    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate analytics metrics." },
      { status: 500 }
    );
  }
}