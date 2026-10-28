export default function StudentsLoading() {
  return (
    <main
      role="status"
      className="min-h-screen bg-[#0d0d11] px-4 py-8 text-slate-400 sm:px-7"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-sm">Loading student records…</p>
        <div className="mt-5 h-64 animate-pulse rounded-lg border border-white/10 bg-[#15151b]" />
      </div>
    </main>
  );
}
