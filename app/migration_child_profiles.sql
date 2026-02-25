-- ==========================================
-- 다자녀 관리를 위한 계정별 식별자(child_id) 추가
-- ==========================================
-- Schedule, Payment, Ops, TransactionHistory 테이블에 child_id 컬럼을 추가합니다.
-- 기본값은 'child1'로 설정하여 기존 데이터들이 첫째 아이의 데이터로 귀속되도록 합니다.

ALTER TABLE Schedule ADD COLUMN IF NOT EXISTS child_id VARCHAR(50) DEFAULT 'child1';
ALTER TABLE Payment ADD COLUMN IF NOT EXISTS child_id VARCHAR(50) DEFAULT 'child1';
ALTER TABLE Ops ADD COLUMN IF NOT EXISTS child_id VARCHAR(50) DEFAULT 'child1';
ALTER TABLE TransactionHistory ADD COLUMN IF NOT EXISTS child_id VARCHAR(50) DEFAULT 'child1';

-- 참고: Asset(자가 자산), Notice(공지사항) 데이터는 가족(프로필/계정) 공통으로 사용하므로 child_id를 추가하지 않습니다.
