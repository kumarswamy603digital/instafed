import { VideosClient } from "@/components/VideosClient";

export default function AccountVideosPage({
  params,
}: {
  params: { username: string };
}) {
  const username = decodeURIComponent(params.username);
  return <VideosClient username={username} />;
}
