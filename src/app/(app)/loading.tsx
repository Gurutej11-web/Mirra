export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-12 w-64 rounded-2xl bg-surface" />
      <div className="mt-3 h-4 w-80 max-w-full rounded-full bg-surface" />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] rounded-2xl bg-surface" />
            <div className="mt-2 h-3 w-3/4 rounded-full bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
