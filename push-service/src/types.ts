// Cloudflare Worker Environment bindings
export interface Env {
  DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  API_KEY: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
}

// Push Subscription
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Database models
export interface Subscription {
  id: string;
  wallet_address: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: number;
  updated_at: number;
  last_notified_at: number | null;
}

export interface NotificationLog {
  id: string;
  wallet_address: string;
  subscription_id: string;
  title: string;
  body: string | null;
  status: 'sent' | 'failed' | 'expired';
  error_message: string | null;
  created_at: number;
}

// API Request/Response types
export interface SubscribeRequest {
  walletAddress: string;
  subscription: PushSubscription;
}

export interface SubscribeResponse {
  success: boolean;
  subscriptionId?: string;
  error?: string;
}

export interface UnsubscribeRequest {
  walletAddress: string;
  endpoint: string;
}

export interface UnsubscribeResponse {
  success: boolean;
  error?: string;
}

export interface NotificationPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

export interface NotifyRequest {
  walletAddress: string;
  notification: NotificationPayload;
}

export interface NotifyResponse {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

export interface HealthResponse {
  status: 'ok' | 'error';
  version: string;
  timestamp: number;
  database?: 'connected' | 'error';
}

// Error response
export interface ErrorResponse {
  error: string;
  message?: string;
}
