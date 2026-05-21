export type CityNoticeDetail = {
  title: string;
  body?: string;
  delta?: string;
  href?: string;
};

export function cityNotice(detail: CityNoticeDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("freelon:city-notice", { detail }));
}
