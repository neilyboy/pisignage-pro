export type DeviceStatus = 'pending' | 'active' | 'offline';
export type AssetType = 'image' | 'video' | 'webpage' | 'youtube' | 'text' | 'html' | 'clock' | 'weather' | 'planner' | 'planner-day' | 'week-glance' | 'job-pipeline';
export type Transition = 'fade' | 'slide' | 'zoom' | 'none';

export interface Device {
  id: string;
  name: string | null;
  location: string | null;
  pairing_code: string | null;
  status: DeviceStatus;
  ip_address: string | null;
  last_seen: number | null;
  current_playlist_id: string | null;
  current_asset_index: number;
  orientation: 'landscape' | 'portrait';
  brightness: number;
  resolution: string | null;
  version: string | null;
  notes: string | null;
  created_at: number;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url: string | null;
  file_path: string | null;
  thumbnail_path: string | null;
  duration: number;
  metadata: Record<string, unknown>;
  tags: string[];
  created_at: number;
  updated_at: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  loop: boolean;
  shuffle: boolean;
  transition: Transition;
  items: PlaylistItem[];
  created_at: number;
  updated_at: number;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  asset_id: string;
  position: number;
  duration_override: number | null;
  asset?: Asset;
}

export interface Schedule {
  id: string;
  name: string;
  device_id: string | null;
  playlist_id: string;
  start_time: string;
  end_time: string;
  days: number[];
  recurrence: 'daily' | 'weekly' | 'once';
  active: boolean;
  priority: number;
  created_at: number;
  playlist?: Playlist;
}

export interface Announcement {
  id: string;
  text: string;
  color: string;
  bg_color: string;
  speed: number;
  device_ids: string[];
  active: boolean;
  expires_at: number | null;
  created_at: number;
}

export interface AnalyticsEvent {
  id: string;
  device_id: string;
  asset_id: string | null;
  playlist_id: string | null;
  event: string;
  duration: number | null;
  created_at: number;
}

export interface PlannerEvent {
  id: string;
  title: string;
  notes: string | null;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  completed: boolean;
  created_at: number;
  updated_at: number;
}

export interface KpiItem {
  id: string;
  title: string;
  type: 'progress' | 'number' | 'countdown' | 'chart';
  value: number;
  target: number;
  unit: string;
  color: string;
  data: Array<{ label: string; value: number }>;
  notes: string | null;
  position: number;
  created_at: number;
  updated_at: number;
}

export type PipelineStage = 'walkthru-req' | 'quote' | 'forecast' | 'won' | 'on-hold';

export interface JobCard {
  id: string;
  week_start: string;
  day: string;
  job_name: string;
  location: string;
  description: string;
  techs: string[];
  color: string;
  position: number;
  created_at: number;
  updated_at: number;
}

export interface JobPipelineItem {
  id: string;
  job_name: string;
  client: string;
  location: string;
  stage: PipelineStage;
  hours: number;
  notes: string;
  color: string;
  position: number;
  created_at: number;
  updated_at: number;
}

export interface DeviceState {
  deviceId: string;
  playlistId: string | null;
  assetIndex: number;
  announcement: string | null;
}
