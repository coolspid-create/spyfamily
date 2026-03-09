-- ==========================================
-- 매일 갱신되는 체크리스트 (오늘할일) 테이블 생성
-- ==========================================

DROP TABLE IF EXISTS DailyTasks CASCADE;

CREATE TABLE DailyTasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_name TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    assigned_date DATE NOT NULL,
    child_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Turn on Realtime for DailyTasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'dailytasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE DailyTasks;
  END IF;
END
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE DailyTasks ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can only access their own DailyTasks" ON DailyTasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
