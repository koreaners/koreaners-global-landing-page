// 크리에이터 정산 화면 문구(볼트 261028-설계-크리에이터-정산포털). 미정 건 문구는 Leo 261028
export type Lang = 'ja' | 'en' | 'ko'
export const LANGS: Lang[] = ['ja', 'en', 'ko']
export const pick = (v?: string | null): Lang | undefined => (LANGS as string[]).includes(v ?? '') ? (v as Lang) : undefined
export const LOCALE: Record<Lang, string> = { ja: 'ja-JP', en: 'en-US', ko: 'ko-KR' }

export const T = {
  ja: {
    title: 'お支払い状況', next: '次回のお振込', items: (n: number) => `${n}件`, none: '予定なし', year: (y: number) => `${y}年のお振込累計`,
    list: '案件ごとの内訳', empty: '表示できるお支払いはまだありません。', noCase: '（案件名なし）',
    status: { '송금 완료': '振込済み', '송금 예정': '振込予定', '미정': '次回以降（確定次第ご案内）' },
    content: 'コンテンツ', amount: '報酬額', deduction: '源泉徴収', vat: '消費税（付加価値税）', net: 'お振込額', receipt: '振込証明書の送付日',
    email: 'メールアドレス', send: 'ログインリンクを送る', sent: 'ご登録のメールアドレスであれば、ログインリンクをお送りしました。メールをご確認ください。',
    login: 'ご登録のメールアドレスにログインリンクをお送りします。', logout: 'ログアウト', expired: 'リンクの有効期限が切れています。もう一度お送りください。',
  },
  en: {
    title: 'Your payouts', next: 'Next payout', items: (n: number) => `${n} item${n === 1 ? '' : 's'}`, none: 'Nothing scheduled', year: (y: number) => `Paid in ${y}`,
    list: 'By campaign', empty: 'There are no payouts to show yet.', noCase: '(no campaign name)',
    status: { '송금 완료': 'Paid', '송금 예정': 'Scheduled', '미정': "Next round or later (we'll let you know once confirmed)" },
    content: 'Content', amount: 'Fee', deduction: 'Withholding tax', vat: 'VAT', net: 'Amount transferred', receipt: 'Transfer receipt sent',
    email: 'Email address', send: 'Send login link', sent: "If this email is registered with us, we've sent a login link. Please check your inbox.",
    login: "We'll send a login link to your registered email address.", logout: 'Log out', expired: 'This link has expired. Please request a new one.',
  },
  ko: {
    title: '정산 현황', next: '다음 송금', items: (n: number) => `${n}건`, none: '예정 없음', year: (y: number) => `${y}년 송금 누적`,
    list: '안건별 내역', empty: '아직 보여 드릴 정산 내역이 없습니다.', noCase: '(안건명 없음)',
    status: { '송금 완료': '송금 완료', '송금 예정': '송금 예정', '미정': '다음 회차 이후(확정되면 안내)' },
    content: '콘텐츠', amount: '지급액', deduction: '원천징수', vat: '부가세', net: '실지급액', receipt: '송금확인증 보낸 날',
    email: '이메일 주소', send: '로그인 링크 받기', sent: '등록된 이메일이면 로그인 링크를 보냈습니다. 메일함을 확인해 주십시오.',
    login: '등록된 이메일로 로그인 링크를 보내 드립니다.', logout: '로그아웃', expired: '링크가 만료됐습니다. 다시 받아 주십시오.',
  },
}
