# 가족 X 스케줄러 프로덕션 릴리스 1.2.4

## Play Console 업로드 파일

- 트랙: 프로덕션
- 버전 이름: 1.2.4
- 버전 코드: 22
- AAB 파일: `artifacts/aab/FamilyScheduler-1.2.4-release.aab`
- AAB 크기: 3,928,784 bytes
- SHA-256: `86FC558BDCE40E92A2C41BC8206B593F2E368725DDA63AE3494B070361BCF6F3`

## 릴리즈 노트

다이어리 사진과 기록이 저장 직후 사라졌다가 다시 보이는 문제를 안정화했습니다.
사진 업로드나 서버 저장이 지연되어도 새 다이어리가 화면에서 유지되도록 개선했습니다.
가족 공유 설정의 재저장 안내 문구를 더 이해하기 쉽게 정리했습니다.

## 반영 내용

- 다이어리 저장 직후 로컬 임시 상태와 Supabase 재조회 결과가 서로 덮어쓰지 않도록 병합 로직 보강
- 클라우드 재저장 대기 항목을 다이어리 로컬 ID 기준으로 중복 방지
- Supabase 저장 성공 후 pending 상태를 즉시 정리하도록 보강
- 가족 공유 설정의 `로컬 대기 항목` 문구를 `클라우드 재저장 대기`로 변경
- 앱 버전 1.2.4, Android versionCode 22로 업데이트

## 검증

- `npm run lint`
- `npm run build`
- `npx cap sync android`
- `./gradlew.bat bundleRelease`

## Play Console 입력 위치

프로덕션 > 새 버전 만들기 > App Bundle 업로드 후, 릴리스 세부정보의 릴리즈 노트에 위 문구를 입력합니다.
