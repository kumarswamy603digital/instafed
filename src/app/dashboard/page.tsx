import { SearchClient } from "@/components/SearchClient";

export default function DashboardSearchPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Find Instagram accounts</h1>
      <p className="text-neutral-400 text-sm mt-1">
        Search by name or username, then subscribe to start collecting their
        videos.
      </p>
      <div className="mt-6">
        <SearchClient />
      </div>
    </div>
  );
}
