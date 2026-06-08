# 가족일정 Play Console 업데이트 체크리스트

기준 버전 후보: `1.2.0` / `versionCode 18` 이상
작성 기준일: 2026-06-04

이 문서는 현재 앱 상태 기준으로 Play Console에서 다시 확인해야 할 항목을 정리합니다. 기존 `1.1.6` 등록 당시에는 계정 생성, 가족 공유, Supabase 클라우드 저장 기능이 노출되지 않은 상태였으므로 이번 업데이트에서는 앱 콘텐츠 신고 내용이 바뀌어야 합니다.

## 반드시 수정해야 할 항목

### 1. Data safety

현재 앱은 가족 공유를 켜면 Supabase Auth, Database, Storage, Realtime을 사용합니다. 따라서 사용자 데이터가 기기 밖으로 전송되고 클라우드에 저장됩니다.

Data safety에서 신고해야 할 가능성이 높은 데이터:

- Personal info
  - Email address: 가입/로그인 이메일
  - User IDs: Supabase Auth 사용자 식별자
  - Name: 가족 구성원 표시 이름, 자녀 프로필 이름처럼 사용자가 직접 입력한 이름
- Photos and videos
  - Photos: 다이어리 첨부 사진
- Calendar
  - Calendar events: 주간 일정, 월간 일정, 가족 일정
- Financial info
  - Other financial info: 사용자가 직접 입력한 결제처, 금액, 결제수단, 결제일, 자산/결제 기록
- Messages
  - Other in-app messages: 다이어리 댓글
- App activity
  - User-generated content: 다이어리 글, 일정 메모, 체크리스트, 알림장, 반응
- Contacts
  - Other contact info: 담당자, 연락처 메모, 전화번호성 정보를 사용자가 입력하고 가족 공유로 저장하는 경우

권장 신고 목적:

- App functionality
- Account management

현재 코드에서 광고, 맞춤형 광고, 광고 ID, 앱 분석 SDK, crash reporting SDK는 확인되지 않았습니다.

### 2. Account deletion / Data deletion

계정 생성이 가능하므로 Play Console의 Data deletion 항목에 공개 URL을 등록해야 합니다.

- 앱 안 삭제 경로: 가족 공유 설정 > 회원 탈퇴
- 앱 밖 삭제 안내 URL: `https://coolspid-create.github.io/family-scheduler-policy/delete-account.html`
- 개인정보처리방침 URL: `https://coolspid-create.github.io/family-scheduler-policy/privacy.html`

현재 반영한 보강:

- 정책 문서 앱 이름을 `가족일정` 기준으로 정리
- 계정 삭제 요청 메일 제목을 `가족일정` 기준으로 정리
- 가족 공유 콘텐츠 개별 삭제 및 신고 안내 추가

### 3. App access

리뷰팀이 로그인 후 기능을 확인할 수 있도록 테스트 계정을 입력해야 합니다.

권장 입력:

- 테스트 이메일
- 테스트 비밀번호
- 가족 공유 확인 방법
  - 로그인 후 가족 그룹 생성 가능
  - 또는 이미 생성된 가족 그룹과 초대 코드 제공
- 2FA, OTP, 이메일 인증 대기 없이 접근 가능해야 함

### 4. User-generated content

다이어리 글, 댓글, 사진, 일정 메모는 가족 그룹 안에서 공유되는 사용자 작성 콘텐츠입니다. 공개 SNS는 아니지만 가족 구성원 사이에 공유되므로 UGC 관련 질문에서 보수적으로 설명하는 것을 권장합니다.

현재 반영한 보강:

- 공개 URL: `https://coolspid-create.github.io/family-scheduler-policy/community-guidelines.html`
- 앱 하단 정책 링크에 `콘텐츠 신고/정책` 추가
- 회원가입 화면에 개인정보처리방침 및 가족 공유 콘텐츠 정책 동의 안내 추가
- 신고 이메일: `coolspid@gmail.com`

Play Console 설명 후보:

```text
앱의 사용자 작성 콘텐츠는 초대 코드를 받은 가족 구성원 사이에서만 공유됩니다. 공개 피드나 불특정 사용자 검색 기능은 없습니다. 부적절한 가족 공유 콘텐츠는 앱 하단의 콘텐츠 신고/정책 링크 또는 이메일(coolspid@gmail.com)을 통해 신고 및 삭제 요청할 수 있습니다.
```

### 5. Target audience and content

앱에 아이 프로필과 가족 다이어리가 있지만, 앱의 대상 사용자는 보호자/성인으로 설정하는 것을 권장합니다. 어린이를 타깃으로 포함하면 Families 정책 요구사항이 커질 수 있습니다.

권장 방향:

- 타깃 연령: 성인 보호자 중심
- 앱 설명: 보호자가 가족 일정과 다이어리를 관리하는 앱
- 어린이 대상 앱 또는 어린이용 콘텐츠 앱처럼 표현하지 않기

## 권장 확인 항목

### Payments policy

현재 후원 버튼은 `VITE_ENABLE_SUPPORT=true`일 때만 노출됩니다. 기본 릴리스에서 해당 플래그가 꺼져 있으면 Play Billing 이슈 가능성은 낮습니다.

릴리스 빌드 전 확인:

- `VITE_ENABLE_SUPPORT`가 켜져 있지 않은지 확인
- 후원 기능을 켜서 배포할 경우, 외부 계좌 이체가 앱 기능/디지털 콘텐츠 구매처럼 보이지 않도록 정책 검토 필요

### Permissions

현재 Android Manifest 권한:

- `android.permission.INTERNET`

현재 앱은 별도 위험 권한을 요청하지 않습니다. 사진 선택은 브라우저/WebView 파일 선택 흐름을 사용하고, 클립보드는 Capacitor 네이티브 플러그인으로 처리됩니다.

### Versioning

현재 `app/android/app/build.gradle`은 1.2.0 업데이트용으로 다음 값이 반영되어 있습니다.

- `versionCode 18`
- `versionName "1.2.0"`

다음 Play Store 업데이트에서는 이보다 큰 `versionCode`를 사용해야 합니다.

## 내부 테스트 트랙 전 점검

1. 정책 페이지 공개 URL 3개가 모두 200으로 열리는지 확인
2. `npm run lint`
3. `npm run build`
4. `npx cap sync android`
5. `.\gradlew.bat bundleRelease`
6. 릴리스 AAB 서명 확인
7. 내부 테스트 트랙에 먼저 업로드
8. 사전 출시 보고서 확인

## 릴리스 노트 후보

```text
1.2.0은 가족 공유, 클라우드 저장, 다이어리 기능을 중심으로 한 대규모 업데이트입니다.
초대 코드로 가족을 연결하고, 일정과 할 일/결제/가족일정을 계정 기반으로 저장·공유할 수 있습니다.
새 다이어리에서 글과 사진, 댓글, 반응으로 가족의 순간을 함께 기록할 수 있습니다.
```
