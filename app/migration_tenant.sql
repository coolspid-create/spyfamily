-- ==========================================
-- 1. 테이블에 개인별 식별자(user_id) 컬럼 추가
-- ==========================================
-- 기존에 데이터가 있을 수 있으므로 최초에는 NULL 허용으로 컬럼을 생성합니다.
ALTER TABLE Schedule ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE Payment ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE Asset ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE Ops ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE OpsChecklist ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE OpsParticipant ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE TransactionHistory ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- notice 테이블의 경우 존재 여부 확인 후 별도 스키마에 따라 적용하세요. 
-- 에러가 나더라도 무시되도록 별도로 분리합니다.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'notice') THEN
    ALTER TABLE Notice ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
  END IF;
END
$$;

-- ==========================================
-- 2. 기존의 포괄적인 RLS(Row Level Security) 정책 삭제
-- ==========================================
-- "Allow authenticated full access to [TableName]" 형태의 지난 정책을 모두 제거합니다.
DROP POLICY IF EXISTS "Allow authenticated full access to Schedule" ON Schedule;
DROP POLICY IF EXISTS "Allow authenticated full access to Payment" ON Payment;
DROP POLICY IF EXISTS "Allow authenticated full access to Asset" ON Asset;
DROP POLICY IF EXISTS "Allow authenticated full access to Ops" ON Ops;
DROP POLICY IF EXISTS "Allow authenticated full access to OpsChecklist" ON OpsChecklist;
DROP POLICY IF EXISTS "Allow authenticated full access to OpsParticipant" ON OpsParticipant;
DROP POLICY IF EXISTS "Allow authenticated full access to TransactionHistory" ON TransactionHistory;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'notice') THEN
    DROP POLICY IF EXISTS "Allow authenticated full access to Notice" ON Notice;
  END IF;
END
$$;

-- ==========================================
-- 3. 계정별 격리(Multi-tenant) 정책 생성 (자신의 데이터만 읽기/쓰기 가능)
-- ==========================================
-- Schedule
CREATE POLICY "Users can only access their own Schedule" ON Schedule FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Payment
CREATE POLICY "Users can only access their own Payment" ON Payment FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Asset
CREATE POLICY "Users can only access their own Asset" ON Asset FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Ops
CREATE POLICY "Users can only access their own Ops" ON Ops FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- OpsChecklist
CREATE POLICY "Users can only access their own OpsChecklist" ON OpsChecklist FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- OpsParticipant
CREATE POLICY "Users can only access their own OpsParticipant" ON OpsParticipant FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- TransactionHistory
CREATE POLICY "Users can only access their own TransactionHistory" ON TransactionHistory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notice
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'notice') THEN
    CREATE POLICY "Users can only access their own Notice" ON Notice FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
