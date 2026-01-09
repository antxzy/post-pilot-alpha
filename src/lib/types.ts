export type Platform =
  | "tiktok"
  | "youtube"
  | "instagram"
  | "facebook"
  | "snapchat"
  | "pinterest";

export type Status =
  | "idea"
  | "script"
  | "filming"
  | "editing"
  | "scheduled"
  | "posted";

export type View = "calendar" | "pipeline";
export type CalendarMode = "month" | "week";

export type DayEntry = {
  dateString: string; // YYYY-MM-DD
  title: string;
  hook: string;
  notes: string;
  format: string;
  status: Status;

  platforms: Record<Platform, boolean>;
  primaryPlatform: Platform;

  repurpose: {
    filmed: boolean;
    adapted: boolean;
    captioned: boolean;
    ctaSwapped: boolean;
    crossPosted: boolean;
  };

  updatedAt: number;
};

export const ALL_PLATFORMS: Platform[] = [
  "tiktok",
  "youtube",
  "instagram",
  "facebook",
  "snapchat",
  "pinterest",
];

export const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  snapchat: "Snapchat",
  pinterest: "Pinterest",
};

export const PLATFORM_SHORT: Record<Platform, string> = {
  tiktok: "TT",
  youtube: "YT",
  instagram: "IG",
  facebook: "FB",
  snapchat: "SC",
  pinterest: "PT",
};

export const STATUS_LABEL: Record<Status, string> = {
  idea: "Idea",
  script: "Script",
  filming: "Filming",
  editing: "Editing",
  scheduled: "Scheduled",
  posted: "Posted",
};
