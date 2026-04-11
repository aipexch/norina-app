-- Prevent multiple running timers per user
CREATE UNIQUE INDEX idx_one_open_timer_per_user ON time_records (user_id) WHERE clock_out IS NULL;
