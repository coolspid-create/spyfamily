# 가족 X 스케줄러 프로덕션 릴리스 1.1.6

## Play Console 업로드 파일

- 트랙: 프로덕션
- 버전 이름: 1.1.6
- 버전 코드: 17
- AAB 파일: `play-store/aab/family-scheduler-1.1.6-code17.aab`
- 파일 크기: 17,068,820 bytes
- SHA-256: `1520E7FE8D9898B7208835FDA48FC6B094B5EEE7195063C3C468F7D2EB6C8344`

## 릴리스 노트

이번 업데이트에서는 Android 앱 실행 시 상단에 불필요한 흰색 영역이 남아 메인 헤더가 가려질 수 있던 문제를 수정했습니다.

엣지투엣지 화면 처리 이후에도 앱의 네이비 헤더가 정상적으로 유지되도록 Android 상태바, 런치 테마, WebView 안전영역 처리를 정리했습니다.

## 반영 내용

- Android 엣지투엣지 환경에서 상단 흰색 네이티브/스플래시 잔상 제거
- 네이티브 타이틀바 및 ActionBar 비활성화 보강
- 상태바/내비게이션바 투명 처리 및 안전영역 inset 적용 개선
- 앱 실행 후 메인 네이비 헤더가 정상 표시되도록 앱 쉘 높이 처리 개선
- Android 네이티브 테마 색상 정리

## 검증

- `npm run lint`
- `npm run build`
- `npx cap sync android`
- `gradlew :app:bundleRelease`

## Play Console 입력 위치

프로덕션 > 새 버전 만들기 > App Bundle 업로드 후, 릴리스 세부정보의 릴리스 노트에 위 문구를 입력합니다.
