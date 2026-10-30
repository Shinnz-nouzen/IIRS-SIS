import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "./page-header";
import { EmptyState, Panel } from "./sis-ui";

export async function PlaceholderPage({
  title,
  message,
}: {
  title: (t: Awaited<ReturnType<typeof getI18n>>["t"]) => string;
  message: (t: Awaited<ReturnType<typeof getI18n>>["t"]) => string;
}) {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader eyebrow={t.brand.school} title={title(t)} detail={t.notImplemented.detail} />
      <Panel>
        <EmptyState title={t.common.notImplemented} detail={message(t)} />
      </Panel>
    </>
  );
}
