import { PlaceholderPage } from "../placeholder-page";

export const instant = false;

export default function Page() {
  return <PlaceholderPage title={(t) => t.nav.reports} message={(t) => t.notImplemented.reports} />;
}
