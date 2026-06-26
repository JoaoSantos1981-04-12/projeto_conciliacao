/** Skeleton da listagem de books (Rule 5: loading com formato do conteúdo). */
export default function LoadingBooks() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
