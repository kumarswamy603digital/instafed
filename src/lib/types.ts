// Shared domain types used across the app.

/** A single Instagram account returned by a search. */
export interface IgAccount {
  username: string;
  fullName: string | null;
  profilePicUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number | null;
}

/** A single video/reel scraped from an Instagram account. */
export interface IgVideo {
  id: string;
  shortCode: string;
  url: string;
  caption: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  likesCount: number | null;
  commentsCount: number | null;
  viewsCount: number | null;
  durationSeconds: number | null;
  timestamp: string | null;
}

/** A subscription record as returned to the client. */
export interface SubscriptionDTO {
  id: string;
  igUsername: string;
  igFullName: string | null;
  igProfilePic: string | null;
  igIsVerified: boolean;
  igIsPrivate: boolean;
  createdAt: string;
}
