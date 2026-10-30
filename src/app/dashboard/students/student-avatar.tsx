// Signed Storage URLs are short-lived and external, so a plain <img> is used.
export function StudentAvatar({
  url,
  name,
  size = "size-10",
  textSize = "text-sm",
}: {
  url: string | null | undefined;
  name: string;
  size?: string;
  textSize?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed URL
      <img src={url} alt="" className={`${size} shrink-0 rounded-full border border-slate-200 object-cover dark:border-white/15`} />
    );
  }
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  return (
    <span
      aria-hidden="true"
      className={`${size} ${textSize} flex shrink-0 items-center justify-center rounded-full bg-violet-500/10 font-semibold text-violet-800 dark:text-violet-200`}
    >
      {initial}
    </span>
  );
}
