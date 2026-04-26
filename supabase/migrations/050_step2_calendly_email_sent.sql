-- Track when the Calendly invite email was sent after Step-2 submission.
alter table public.step2_applications
  add column if not exists calendly_email_sent_at timestamptz;
