-- Supabase SQL Schema for SPY x FAMILY

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

-- Turn on Realtime for these tables
alter publication supabase_realtime add table Schedule;
alter publication supabase_realtime add table Payment;
alter publication supabase_realtime add table Asset;
alter publication supabase_realtime add table Ops;
alter publication supabase_realtime add table OpsChecklist;
alter publication supabase_realtime add table OpsParticipant;
