CREATE TABLE IF NOT EXISTS Notice (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    is_checked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Turn on Realtime for Notice table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notice'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE Notice;
  END IF;
END
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE Notice ENABLE ROW LEVEL SECURITY;

-- Create Policies (Only Authenticated users can select, insert, update, delete)
DROP POLICY IF EXISTS "Allow authenticated full access to Notice" ON Notice;
CREATE POLICY "Allow authenticated full access to Notice" ON Notice FOR ALL USING (auth.role() = 'authenticated');
