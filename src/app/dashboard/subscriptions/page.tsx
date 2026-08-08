import { SubscriptionsClient } from "@/components/SubscriptionsClient";

export default function SubscriptionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Your subscriptions</h1>
      <p className="text-neutral-400 text-sm mt-1">
        Open an account to browse all of its videos.
      </p>
      <div className="mt-6">
        <SubscriptionsClient />
      </div>
    </div>
  );
}
