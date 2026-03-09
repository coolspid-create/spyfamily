-- ==========================================
-- 기존결제내역 삭제 시, 지난 달의 결제완료 기록(TransactionHistory)이 함께 삭제되는(CASCADE) 문제를 방지합니다.
-- ==========================================

DO $$
DECLARE
    fk_name TEXT;
BEGIN
    -- 현재 TransactionHistory 테이블이 Payment 테이블을 참조하는 외래키(ON DELETE CASCADE)의 이름을 동적으로 찾습니다.
    SELECT tc.constraint_name
    INTO fk_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'transactionhistory'
      AND kcu.column_name = 'payment_id';

    -- 외래키 제약조건이 존재하면 제거하고 ON DELETE SET NULL로 다시 추가합니다.
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE TransactionHistory DROP CONSTRAINT ' || fk_name;
        EXECUTE 'ALTER TABLE TransactionHistory ADD CONSTRAINT ' || fk_name || ' FOREIGN KEY (payment_id) REFERENCES Payment(id) ON DELETE SET NULL';
    END IF;
END $$;
