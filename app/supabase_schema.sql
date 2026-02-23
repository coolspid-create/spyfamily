-- Supabase SQL Schema for SPY x FAMILY

DROP TABLE IF EXISTS TransactionHistory CASCADE;
DROP TABLE IF EXISTS OpsChecklist CASCADE;
DROP TABLE IF EXISTS OpsParticipant CASCADE;
DROP TABLE IF EXISTS Ops CASCADE;
DROP TABLE IF EXISTS Asset CASCADE;
DROP TABLE IF EXISTS Payment CASCADE;
DROP TABLE IF EXISTS Schedule CASCADE;

CREATE TABLE Schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT,
    day_of_week TEXT NOT NULL,
    start_time TIME NOT NULL,
    pickup_agent TEXT,
    drop_agent TEXT,
    is_urgent BOOLEAN DEFAULT false,
    is_early BOOLEAN DEFAULT false,
    location TEXT
);

CREATE TABLE Payment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    amount INTEGER NOT NULL,
    method TEXT NOT NULL,
    payment_day INTEGER NOT NULL,
    discount_info TEXT,
    is_completed BOOLEAN DEFAULT false
);

CREATE TABLE Asset (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    balance INTEGER NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE Ops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    execution_date DATE NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'MEDIUM',
    status TEXT DEFAULT 'PENDING'
);

CREATE TABLE OpsParticipant (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ops_id UUID REFERENCES Ops(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    is_assigned BOOLEAN DEFAULT false
);

CREATE TABLE OpsChecklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ops_id UUID REFERENCES Ops(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    is_checked BOOLEAN DEFAULT false
);

CREATE TABLE TransactionHistory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES Payment(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    date_formatted TEXT NOT NULL,
    source TEXT NOT NULL,
    amount INTEGER NOT NULL,
    method TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Turn on Realtime for these tables
-- Catch error if they are already in publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'schedule'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE Schedule, Payment, Asset, Ops, OpsChecklist, OpsParticipant, TransactionHistory;
  END IF;
END
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE Schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE Payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE Asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE Ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE OpsChecklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE OpsParticipant ENABLE ROW LEVEL SECURITY;
ALTER TABLE TransactionHistory ENABLE ROW LEVEL SECURITY;

-- Create Policies (Only Authenticated users can select, insert, update, delete)
CREATE POLICY "Allow authenticated full access to Schedule" ON Schedule FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to Payment" ON Payment FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to Asset" ON Asset FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to Ops" ON Ops FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to OpsChecklist" ON OpsChecklist FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to OpsParticipant" ON OpsParticipant FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to TransactionHistory" ON TransactionHistory FOR ALL USING (auth.role() = 'authenticated');
