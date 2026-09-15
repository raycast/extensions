export interface PinnedTabEntry {
  id: string;
  session: string;
  tabId: number;
  bridge: string;
  url: string;
  title: string;
}

export function searchPinnedTabs(tabs: PinnedTabEntry[], query = "") {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return tabs.filter((tab) => {
    const text = `${tab.title} ${tab.url}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
