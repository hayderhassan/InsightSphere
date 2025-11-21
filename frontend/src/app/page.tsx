async function getHealth() {
  const res = await fetch("http://localhost:8000/api/health/", {
    // for dev only, no auth/cards yet
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch health");
  }

  return res.json();
}

export default async function Home() {
  const health = await getHealth();

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="p-6 rounded-lg border">
        <h1 className="text-2xl font-bold mb-2">InsightSphere</h1>
        <p>Backend status: {health.status}</p>
      </div>
    </main>
  );
}
