# Antigravity to Codex Handoff

**Date:** 2026-06-01
**Topic:** 계정 관리 및 가족 공유 기능 도입 계획 고도화 (Codex 재검토안 완벽 병합 완료)

---

## 1. Goal
사용자의 "승인할테니 진행해" 요청에 맞춰, 데이터베이스 마이그레이션 SQL(`migration_family_share_v2.sql`) 구축을 완료하였습니다.

이어서 **Phase 3(Zustand 스토어 가족 컨텍스트 구현)**와 **Phase 4(다이어리 DB/Storage 비공개 연동)**를 프론트엔드에 완벽하게 안착시키기 위해, UX 및 스토어 연동 사양을 구체적인 예시 코드와 함께 명세화하여 Codex에게 전달합니다.

---

## 2. Phase 3: Zustand Store (`useStore.js`) 확장 명세

`useStore.js`에 가족 멤버십 상태와 액션을 안전하게 구현하기 위해 Codex가 적용할 코드 스키마입니다.

### 2.1 상태(State) 및 초기값 정의
```javascript
// useStore.js 내부에 추가할 상태
currentFamilyId: null,
familyMembers: [],
familyInviteCode: null,
diaries: [], // 다이어리 목록 전역 저장
isFamilyLoading: false,
```

### 2.2 가족 관리 액션 구현 스니펫
```javascript
// useStore.js 액션 정의 영역에 추가

// 1. 현재 사용자의 가족 컨텍스트 패치
fetchFamilyContext: async () => {
    const { session } = get();
    if (!session) return;

    set({ isFamilyLoading: true });
    try {
        // 본인의 family_id 조회
        const { data: memberData, error: memberError } = await supabase
            .from('family_members')
            .select('family_id, role, display_name')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (memberError) throw memberError;

        if (memberData) {
            // 가족 정보 및 초대 코드 패치
            const { data: familyData, error: familyError } = await supabase
                .from('families')
                .select('name, invite_code')
                .eq('id', memberData.family_id)
                .single();

            if (familyError) throw familyError;

            // 동일 가족의 구성원 목록 패치
            const { data: membersList, error: listError } = await supabase
                .from('family_members')
                .select('user_id, role, display_name'); // RLS에 의해 같은 가족만 필터링됨

            if (listError) throw listError;

            set({
                currentFamilyId: memberData.family_id,
                familyInviteCode: familyData.invite_code,
                familyMembers: membersList || [],
                isGuestMode: false
            });
        } else {
            // 소속된 가족이 없음
            set({
                currentFamilyId: null,
                familyInviteCode: null,
                familyMembers: []
            });
        }
    } catch (err) {
        console.error('fetchFamilyContext error:', err);
    } finally {
        set({ isFamilyLoading: false });
    }
},

// 2. 신규 가족 그룹 생성
createFamily: async (familyName) => {
    const { session } = get();
    if (!session) return;

    set({ isFamilyLoading: true });
    try {
        // 무작위 8자리 고유 초대 코드 생성 (예: FA-XXXX-XXXX)
        const randCode = 'FA-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000);

        // 1. families 테이블 삽입
        const { data: famData, error: famError } = await supabase
            .from('families')
            .insert([{ name: familyName, invite_code: randCode, created_by: session.user.id }])
            .select()
            .single();

        if (famError) throw famError;

        // 2. family_members 테이블 본인 추가 (owner)
        const { error: memError } = await supabase
            .from('family_members')
            .insert([{ user_id: session.user.id, family_id: famData.id, role: 'owner', display_name: '보호자' }]);

        if (memError) throw memError;

        await get().fetchFamilyContext();
        await get().fetchDataFromDB(); // 가족 데이터 패치 가동
    } catch (err) {
        alert('가족 생성 실패: ' + err.message);
    } finally {
        set({ isFamilyLoading: false });
    }
},

// 3. 초대 코드를 통한 가족 합류 (RPC 사용)
joinFamily: async (inviteCode) => {
    set({ isFamilyLoading: true });
    try {
        // 안전하게 기획된 join_family_by_code RPC 실행
        const { data, error } = await supabase.rpc('join_family_by_code', { code_input: inviteCode });

        if (error) throw error;

        alert('성공적으로 가족 그룹에 합류하였습니다!');
        await get().fetchFamilyContext();
        await get().fetchDataFromDB();
    } catch (err) {
        alert('합류 실패: ' + err.message);
    } finally {
        set({ isFamilyLoading: false });
    }
},

// 4. 가족 탈퇴
leaveFamily: async () => {
    const { session, currentFamilyId } = get();
    if (!session || !currentFamilyId) return;

    if (!confirm('정말로 가족 그룹에서 탈퇴하시겠습니까? 공유된 데이터에 더 이상 접근할 수 없습니다.')) return;

    set({ isFamilyLoading: true });
    try {
        const { error } = await supabase
            .from('family_members')
            .delete()
            .eq('user_id', session.user.id);

        if (error) throw error;

        set({
            currentFamilyId: null,
            familyInviteCode: null,
            familyMembers: [],
            weeklyData: INITIAL_WEEKLY,
            diaries: [],
            isGuestMode: true // 탈퇴 시 로컬 게스트 모드로 복귀
        });
        await get().fetchDataFromDB();
    } catch (err) {
        alert('탈퇴 실패: ' + err.message);
    } finally {
        set({ isFamilyLoading: false });
    }
}
```

---

## 3. Phase 4: 다이어리 비공개 Storage 및 Signed URL 연동 명세 (`FamilyDiaryTab.jsx`)

`FamilyDiaryTab.jsx`가 완전한 보안 격리 상태에서 이미지를 관리하기 위한 구현 가이드라인입니다.

### 3.1 다이어리 CRUD 비동기 스토어 액션 추가 (`useStore.js`)
로컬 스토리지 동기화 흐름을 Supabase DB 연동으로 전환하기 위해 다음 전역 비동기 액션을 정의합니다.

```javascript
fetchDiariesFromDB: async () => {
    const { currentFamilyId, isGuestMode } = get();
    if (isGuestMode || !currentFamilyId) {
        // 게스트 모드 시 로컬스토리지 복구
        const saved = localStorage.getItem('family-diary-records-v1');
        if (saved) set({ diaries: normalizeDiaryRecords(JSON.parse(saved)) });
        return;
    }

    const { data, error } = await supabase
        .from('diary')
        .select('*, diary_comments(*)')
        .eq('family_id', currentFamilyId)
        .order('date', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    if (data) {
        set({ diaries: data });
    }
},

addDiary: async (diaryData) => {
    const { currentFamilyId, session } = get();
    if (!currentFamilyId) return;

    const { error } = await supabase
        .from('diary')
        .insert([{
            family_id: currentFamilyId,
            user_id: session.user.id,
            child: diaryData.child,
            date: diaryData.date,
            time: diaryData.time,
            mood: diaryData.mood,
            title: diaryData.title,
            text: diaryData.text,
            image_paths: diaryData.imagePaths // 비공개 상대 경로 배열 저장
        }]);

    if (error) throw error;
    await get().fetchDiariesFromDB();
}
```

### 3.2 다이어리 탭 내 이미지 비공개 로딩 처리 (`FamilyDiaryTab.jsx`)
다이어리 사진 렌더링 시, 보안 강화를 위해 **Signed URL**을 동적 발급하여 로딩합니다.

- **Signed URL 캐싱 커스텀 훅 예시**
```javascript
// FamilyDiaryTab.jsx 내부에 추가하여 렌더링 시 만료 제한 URL 자동 교체
function useSignedUrl(imagePath) {
    const [signedUrl, setSignedUrl] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!imagePath) return;

        // 게스트 모드 base64 이미지인 경우 즉시 패스
        if (imagePath.startsWith('data:image/')) {
            setSignedUrl(imagePath);
            return;
        }

        let isMounted = true;
        const getUrl = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.storage
                    .from('diary-photos')
                    .createSignedUrl(imagePath, 1800); // 30분 만료 서명 발행

                if (error) throw error;
                if (isMounted && data) {
                    setSignedUrl(data.signedUrl);
                }
            } catch (err) {
                console.error('Signed URL 발급 실패:', err);
            } finally {
                setLoading(false);
            }
        };

        getUrl();
        return () => { isMounted = false; };
    }, [imagePath]);

    return { signedUrl, loading };
}
```
다이어리 목록을 순회하여 이미지를 보여줄 때, `<img src={imageUrl} />` 대신 위의 `useSignedUrl(imagePath)` 훅을 경유하여 `<img src={signedUrl} />`을 바인딩하면, 외부 유출이 불가능한 격리 렌더링이 완성됩니다.

---

## 4. Codex 연동 권장 지침
1. **마이그레이션 적용**: `migration_family_share_v2.sql`을 Supabase CLI 혹은 DB Editor에서 차례대로 무오류 가동합니다.
2. **점진적 구현**: `useStore.js`에서 가족 정보 동기화 로직을 우선 완비하고, `Login.jsx`에 가족 셋업 시트(sheet) UI를 구성하여 합류/생성이 가능한지 순차 검증합니다.
3. **다이어리 안전 마이그레이션**: 사용자가 동기화를 수락하기 전까지는 게스트 데이터를 유실하지 않도록 보장합니다.

## 5. Files to be Modified
- [App.jsx](file:///c:/Users/KPSA/Documents/Codex/FamilyScheduler/app/src/App.jsx)
- [useStore.js](file:///c:/Users/KPSA/Documents/Codex/FamilyScheduler/app/src/store/useStore.js)
- [FamilyDiaryTab.jsx](file:///c:/Users/KPSA/Documents/Codex/FamilyScheduler/app/src/components/FamilyDiaryTab.jsx)
- [Login.jsx](file:///c:/Users/KPSA/Documents/Codex/FamilyScheduler/app/src/components/Login.jsx)

---
*Antigravity의 가족 공유 및 다이어리 Storage 격리 탐색 연동 기획안 작성을 마치고, Codex에게 무결성 개발 릴레이를 전달합니다.*
