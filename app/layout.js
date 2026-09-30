import "./global.css";

export const metadata = {
  title: "Schema2KPI | BI Metrics & SQL Generator",
  description: "Turn raw database schemas and column names into executive dashboard KPIs, chart specs, and production SQL queries.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}