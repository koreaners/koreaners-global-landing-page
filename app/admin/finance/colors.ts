// 어드민 의미 색 한 벌. 화면마다 따로 정의하던 색을 모음(261116 슬롭 감사: 파랑이 개요에선 입금, 캘린더에선 출금이던 문제).
// 입금(받는 돈) 파랑, 출금(주는 돈) 주황, 예정 회색. in, out 은 다크 표면에서 dataviz 검증 통과(밝기, 색각 이상 구분)
export const COLOR = {
  in: '#3b82f6',
  out: '#ea580c',
  // 회색 셋은 테마 변수(globals.css [data-admin]): 라이트에서 흰 바탕 위 옅게 묻히던 문제(261117 QA). 다크 값은 그대로
  due: 'var(--admin-due)',
  good: '#3fae6a',
  bad: '#e66767',
  warn: '#e0a84f',
  fix: '#5aa9e6',
  // guess, unsigned 는 due 와 다른 밝기의 회색. 뜻은 범례 글자로 구분(261116 감사: 캘린더 범례 7색, 보라와 청록 금지).
  // 달력 칸(neutral-950)과 패널(neutral-900) 위 작은 글씨 대비 4.5:1 이상(#737373 은 약 4.2:1)
  guess: 'var(--admin-guess)', // 정산일을 몰라 임의로 넣은 날(계약 비고 「정산일 임의」)
  unsigned: 'var(--admin-unsigned)', // 봇 광고주 계약 서명 전(코드 없음)
} as const
