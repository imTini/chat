export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-0.5 py-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{
            background: "var(--text-muted)",
            animation: `streaming-dot 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}
