# 가족 X 스케줄러 Play Store 출시 준비

> 현재 파일은 `1.1.6` 로컬 전용/간소화 출시 기준의 기록입니다. Supabase 계정, 가족 공유, 다이어리 사진 저장 기능이 켜진 현재 업데이트 준비에는 `play-store/play-console-update-1.2.0-checklist.md`를 우선 기준으로 사용하세요.

## 현재 처리 완료

- `codex/play-store-readiness` 브랜치에서 출시 준비 작업 진행
- Capacitor Android 프로젝트 생성: `app/android`
- 앱 ID 확정: `com.coolspid.familyxscheduler`
- 앱 이름 설정: `가족 × 스케줄러`
- Android target SDK: 36
- Android App Bundle 생성 확인: `app/android/app/build/outputs/bundle/release/app-release.aab`
- JDK 21, Android SDK command-line tools, Android SDK Platform 36, Build Tools 설치 확인
- Vite production build 통과
- ESLint 통과
- npm audit 취약점 0건 확인
- PWA 서비스워커 등록/해제 충돌 제거
- 로그인 없이 첫 실행부터 일정 추가 가능하도록 로컬 저장을 기본값으로 변경
- 가족 공유와 Supabase 로그인 UI는 첫 출시 빌드에서 숨김 (`VITE_ENABLE_FAMILY_SHARING=true`일 때만 노출)
- Supabase 환경변수가 없어도 로컬 전용 앱으로 빌드/실행 가능하도록 변경
- 첫 출시 개인정보처리방침과 데이터 삭제 안내를 로컬 저장 전용 기준으로 정리
- 직접 계좌 후원 버튼을 기본 빌드에서 숨김 (`VITE_ENABLE_SUPPORT=true`일 때만 표시)
- 앱 내 개인정보처리방침, 계정 삭제 요청 링크 추가
- 개발자 운영 이메일 반영: `coolspid@gmail.com`
- 정사각형 앱 아이콘 `app-icon-192.png`, `app-icon-512.png` 추가
- Android 런처 아이콘 리소스 생성
- 개발 템플릿 기본 아이콘과 불필요한 콘솔 로그 제거
- 개인정보처리방침과 계정 삭제 요청 링크를 앱 화면 하단에 상시 노출
- Play Console 업로드용 릴리스 키스토어 생성 및 AAB 서명 확인
- 업로드 인증서 파일 생성: `app/android/upload_certificate.pem`

## 현재 빌드 산출물

- AAB 파일: `app/android/app/build/outputs/bundle/release/app-release.aab`
- SHA-256: `891B9D329656F91C3E1975DC0322721B2FB2A91A43365DC8D208EA8200F5A785`
- 상태: 빌드 성공, 업로드 키스토어로 릴리스 서명 완료, `jarsigner -verify` 통과
- 업로드 키 별칭: `familyxscheduler`
- 업로드 인증서 SHA-256 지문: `00:0D:63:07:C3:A7:E8:8D:F9:80:72:CF:AC:4B:83:D8:40:96:76:A7:D8:20:04:77:60:44:2B:AE:DC:2C:09:70`

## 도메인 필요 여부

- 앱 자체는 Capacitor 방식으로 패키징했기 때문에 별도 운영 웹 도메인 없이 Play Store용 `.aab`를 만들 수 있습니다.
- 다만 Play Console에는 개인정보처리방침 URL과 계정 삭제 안내 URL이 필요합니다.
- 이 URL은 Vercel, Netlify, GitHub Pages, Supabase Storage 같은 공개 HTTPS 주소면 충분하며, 반드시 별도 구매한 커스텀 도메인일 필요는 없습니다.
- TWA 방식으로 바꾸는 경우에는 운영 HTTPS 도메인과 `assetlinks.json` 배포가 필요합니다.

## 로컬 검증 명령

```powershell
cd app
npm.cmd run lint
npm.cmd run build
npm.cmd audit --omit=dev
npm.cmd exec cap sync android
cd android
.\gradlew.bat bundleRelease
```

빌드 도구 경로:

- JDK 21: `C:\tmp\family-scheduler-tools\jdk21\jdk-21.0.11+10`
- Android SDK: `C:\tmp\family-scheduler-tools\android-sdk`

## Play Store 업로드 전 남은 필수 항목

1. 릴리스 서명 키 백업 및 Play Console 등록
   - 업로드 키스토어 생성 완료: `app/android/release-upload-key.jks`
   - 로컬 서명 설정 생성 완료: `app/android/keystore.properties`
   - 두 파일은 Git에 커밋하지 않도록 제외했습니다.
   - 키스토어 파일과 비밀번호를 별도 안전한 장소에 백업해야 합니다. 이 키를 잃어버리면 이후 앱 업데이트 업로드가 막힐 수 있습니다.
   - Play Console에서 업로드 키 인증서를 요구하면 `app/android/upload_certificate.pem`을 사용합니다.

2. Supabase 운영 보안 확인
   - 첫 출시 빌드는 가족 공유를 숨긴 로컬 전용 MVP로 유지합니다.
   - 가족 공유 기능을 나중에 켜려면 `VITE_ENABLE_FAMILY_SHARING=true`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 필요합니다.
   - `migration_tenant.sql` 기준으로 `user_id = auth.uid()` RLS가 실제 운영 DB에 적용되어 있어야 합니다.
   - `supabase_schema.sql`만 단독 적용하면 모든 인증 사용자가 모든 데이터를 볼 수 있는 정책이 생성될 수 있으므로 운영 DB 초기화에는 사용하지 마세요.

3. 계정 삭제 처리 방식 결정
   - 첫 출시 버전은 계정 생성 기능을 제공하지 않습니다.
   - 현재 공개 페이지는 로컬 데이터 삭제 안내와 문의 이메일을 제공합니다.
   - 가족 공유 계정을 나중에 켜면 Supabase Edge Function 또는 별도 관리자 API로 실제 계정 삭제 흐름을 구현하는 것을 권장합니다.

4. 공개 정책 URL 준비
   - 개인정보처리방침: `app/public/privacy.html`
   - 계정 삭제 안내: `app/public/delete-account.html`
   - Play Console 입력용 개인정보처리방침 URL: `https://coolspid-create.github.io/family-scheduler-policy/privacy.html`
   - Play Console 입력용 데이터 삭제 안내 URL: `https://coolspid-create.github.io/family-scheduler-policy/delete-account.html`

5. 실제 기기 테스트
   - Capacitor WebView에서 일정/할 일 저장, localStorage 기반 상태, 네트워크 오류 화면을 확인해야 합니다.
   - Play Console 내부 테스트 트랙 업로드 후 사전 출시 보고서를 확인합니다.

## Play Console 입력 후보

- 앱 이름: 가족 × 스케줄러
- 앱/게임: 앱
- 가격: 무료 권장
- 카테고리: 생산성 또는 라이프스타일 후보
- 개발자 연락처 이메일: `coolspid@gmail.com`
- 개인정보처리방침 URL: `https://coolspid-create.github.io/family-scheduler-policy/privacy.html`
- 계정 삭제/데이터 삭제 안내 URL: `https://coolspid-create.github.io/family-scheduler-policy/delete-account.html`
- 앱 액세스: 로그인 없이 바로 일정 관리 가능
- Data Safety: 첫 출시 기준으로 사용자가 입력한 일정/할 일/결제 관리 데이터는 기기 로컬 저장 중심으로 선언. 문의 이메일을 받는 경우 이메일 주소와 문의 내용을 별도 구분
- 새 개인 개발자 계정이면 폐쇄 테스트 12명/14일 요건 확인

## 서명 파일 준비 후 빌드 순서

1. `app/android/release-upload-key.jks`와 `app/android/keystore.properties`가 로컬에 있는지 확인합니다.
2. 다시 빌드합니다.

```powershell
cd app
npm.cmd run build
npm.cmd exec cap sync android
cd android
.\gradlew.bat bundleRelease
```

3. `jarsigner -verify` 결과가 `jar verified`인지 확인합니다.
4. 생성된 `app-release.aab`를 Play Console 내부 테스트 트랙에 먼저 업로드합니다.
