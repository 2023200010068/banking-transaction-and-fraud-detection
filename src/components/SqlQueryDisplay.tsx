type SqlQueryDisplayProps = {
  operation: string;
  query: string;
  onClose: () => void;
};

export default function SqlQueryDisplay({
  operation,
  query,
  onClose,
}: SqlQueryDisplayProps) {
  return (
    <div className="relative w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col items-center gap-1">
        <span className="shrink-0 rounded bg-black px-2.5 py-1 text-[10px] font-semibold text-white">
          {operation}
        </span>

        <div className="min-w-0 flex-1">
          <code className="block whitespace-normal break-words text-xs leading-5 text-black">
            {query.replace(/\s+/g, " ").trim()}
          </code>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-1.5 text-lg leading-none text-gray-500 transition hover:bg-gray-100 hover:text-black"
        title="Hide SQL"
        aria-label="Hide SQL"
      >
        ×
      </button>
    </div>
  );
}