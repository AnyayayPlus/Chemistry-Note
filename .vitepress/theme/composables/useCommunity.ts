import { computed, onMounted, onUnmounted, shallowRef } from "vue";

interface CommunityData {
  members: {
    name: string;
    avatar: string;
    title: string;
    links: { icon: string; link: string }[];
  }[];
  feedbackers: { name: string }[];
  appreciators: { name: string; amount: string; date: string; message?: string | null }[];
}

type ApiCommunityData = {
  members: {
    name: string;
    avatar: string | null;
    title: string | null;
    links: { icon: string; link: string }[];
  }[];
  feedbackers: { name: string }[];
  appreciators: { name: string; amount: string; date: string | null; message?: string | null }[];
};

const COMMUNITY_API = "https://chemistry-community.seeridia.top/api/public";

function isCommunityData(value: unknown): value is ApiCommunityData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    Array.isArray(data.members) &&
    data.members.every(
      (item) =>
        item &&
        typeof item.name === "string" &&
        (item.avatar == null || typeof item.avatar === "string") &&
        (item.title == null || typeof item.title === "string") &&
        Array.isArray(item.links) &&
        item.links.every(
          (link: unknown) =>
            link &&
            typeof link === "object" &&
            typeof (link as Record<string, unknown>).icon === "string" &&
            typeof (link as Record<string, unknown>).link === "string",
        ),
    ) &&
    Array.isArray(data.feedbackers) &&
    data.feedbackers.every((item) => item && typeof item.name === "string") &&
    Array.isArray(data.appreciators) &&
    data.appreciators.every(
      (item) =>
        item &&
        typeof item.name === "string" &&
        typeof item.amount === "string" &&
        /^\d+\.\d{2} CNY$/.test(item.amount) &&
        (item.date == null || typeof item.date === "string") &&
        (item.message == null || typeof item.message === "string"),
    )
  );
}

export function useCommunity() {
  const community = shallowRef<CommunityData>({ members: [], feedbackers: [], appreciators: [] });
  const status = shallowRef<"loading" | "ready" | "error">("loading");
  let controller: AbortController | undefined;
  let disposed = false;

  async function loadCommunity() {
    controller?.abort();
    controller = new AbortController();
    const current = controller;
    const timeout = setTimeout(() => current.abort(), 10000);
    status.value = "loading";
    try {
      const response = await fetch(COMMUNITY_API, { cache: "no-store", signal: current.signal });
      if (!response.ok) throw new Error("Community API request failed");
      const data: unknown = await response.json();
      if (!isCommunityData(data)) throw new Error("Invalid community API response");
      if (disposed || controller !== current) return;
      community.value = {
        members: data.members.map(({ name, avatar, title, links }) => ({
          name,
          avatar: avatar ?? "",
          title: title ?? "",
          links: links.map(({ icon, link }) => ({ icon, link })),
        })),
        feedbackers: data.feedbackers.map(({ name }) => ({ name })),
        appreciators: data.appreciators.map(({ name, amount, date, message }) => ({
          name,
          amount,
          date: date ?? "",
          message,
        })),
      };
      status.value = "ready";
    } catch {
      if (!disposed && controller === current) status.value = "error";
    } finally {
      clearTimeout(timeout);
    }
  }

  onMounted(loadCommunity);
  onUnmounted(() => {
    disposed = true;
    controller?.abort();
  });

  const totalCny = computed(() => {
    const cents = community.value.appreciators.reduce((sum, item) => {
      const [whole, decimal] = item.amount.split(" ")[0].split(".");
      return sum + Number(whole) * 100 + Number(decimal);
    }, 0);
    return (cents / 100).toFixed(2);
  });

  return { community, status, loadCommunity, totalAppreciation: totalCny };
}
