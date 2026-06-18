CREATE INDEX IF NOT EXISTS realtime_events_channel_created_idx
  ON realtime_events (channel, created_at ASC, id ASC);
