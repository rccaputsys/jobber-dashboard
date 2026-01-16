export default function Home() {
  return (
    <main className="min-h-screen p-10">
      <div className="max-w-xl space-y-6">
        <h1 className="text-3xl font-bold">Jobber KPI Dashboard (MVP)</h1>
        <p className="text-gray-600">
          If you can see this page, Next.js is serving the correct file.
        </p>

        <a
          href="/api/jobber/connect"
          className="inline-block px-4 py-2 rounded bg-blue-600 text-white"
        >
          Connect Jobber
        </a>
      </div>
    </main>
  );
}
