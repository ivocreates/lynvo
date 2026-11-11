/** Success / error banner driven by ?saved=1, ?error=... style query flags. */
export default function Flash({
  success,
  error,
}: {
  success?: string | null | false;
  error?: string | null | false;
}) {
  return (
    <>
      {success && (
        <p role="status" className="mb-4 rounded-card border border-success/40 bg-success/10 px-4 py-2 text-sm text-success">
          {success}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-card border border-error/40 bg-error/10 px-4 py-2 text-sm text-error">
          {error}
        </p>
      )}
    </>
  );
}

const ERROR_CODES: Record<string, string> = {
  missing: "That record no longer exists.",
  status: "Could not change the status.",
  delete: "Could not delete that record.",
};

export function errorText(value: string | undefined) {
  if (!value) return null;
  return ERROR_CODES[value] ?? value;
}
