export interface BroadcastMessage {
  id: string;
  content: string;
  image_url: string | null;
  link: string | null;
  send_push: boolean;
  created_at: string;
}

export interface BroadcastFormData {
  content: string;
  image_url: string;
  link: string;
  send_push: boolean;
}
