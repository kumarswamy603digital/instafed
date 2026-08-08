import type { PlaylistItemDTO } from "./types";

/** Build the DB snapshot columns from an incoming video + channel payload. */
export function buildSnapshot(
  v: Record<string, any>,
  c: Record<string, any>,
) {
  return {
    videoKey: String(v.id),
    shortCode: v.shortCode ?? null,
    url: String(v.url ?? ""),
    caption: v.caption ?? null,
    thumbnailUrl: v.thumbnailUrl ?? null,
    videoUrl: v.videoUrl ?? null,
    durationSeconds: v.durationSeconds ?? null,
    viewsCount: v.viewsCount ?? null,
    likesCount: v.likesCount ?? null,
    commentsCount: v.commentsCount ?? null,
    timestamp: v.timestamp ?? null,
    channelUsername: String(c.username),
    channelFullName: c.fullName ?? null,
    channelProfilePic: c.profilePic ?? null,
    channelIsVerified: Boolean(c.isVerified),
  };
}

/** Map a snapshot DB row to the shared PlaylistItemDTO shape. */
export function snapshotToDTO(row: Record<string, any>): PlaylistItemDTO {
  return {
    id: row.id,
    videoKey: row.videoKey,
    shortCode: row.shortCode ?? null,
    url: row.url,
    caption: row.caption ?? null,
    thumbnailUrl: row.thumbnailUrl ?? null,
    videoUrl: row.videoUrl ?? null,
    durationSeconds: row.durationSeconds ?? null,
    viewsCount: row.viewsCount ?? null,
    likesCount: row.likesCount ?? null,
    commentsCount: row.commentsCount ?? null,
    timestamp: row.timestamp ?? null,
    channel: {
      username: row.channelUsername,
      fullName: row.channelFullName ?? null,
      profilePic: row.channelProfilePic ?? null,
      isVerified: Boolean(row.channelIsVerified),
    },
  };
}
