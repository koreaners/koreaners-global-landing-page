import type { Metadata } from 'next'
import Image from 'next/image'

const LOGIN_URL = 'https://cockpit.koreaners.co/login'

const SUBTITLE =
  '콕핏은 Meta 광고 계정을 읽고 손실을 진단해 고칠 것 한 가지를 제안합니다. 승인하면 바로 반영되고 24시간 안에 되돌릴 수 있습니다.'

export const metadata: Metadata = {
  title: '콕핏 | 소상공인을 위한 메타 광고 자동 관리',
  description: SUBTITLE,
}

const HERO_CAPTIONS = ['매주 한 줄 요약', '손실 진단 카드 한 장', '승인 한 번으로 반영']

const TIERS = [
  {
    name: 'Starter',
    price: '월 9.9만원',
    range: '월 광고비 300만원 미만',
    who: '광고를 처음 켜 보는 사장님, 한 달에 몇 번만 확인하고 싶은 분',
    recommended: false,
  },
  {
    name: 'Growth',
    price: '월 29만원',
    range: '월 광고비 300만~1,000만원',
    who: '광고는 돌아가는데 성과가 들쭉날쭉한 가게, 대행사 없이 직접 운영하는 분',
    recommended: true,
  },
  {
    name: 'Pro',
    price: '월 69만원',
    range: '월 광고비 1,000만~3,000만원',
    who: '소재를 자주 바꾸는 브랜드, 대행사 수수료가 부담스러운 분',
    recommended: false,
  },
]

const TABLE_ROWS = [
  ['Starter', '300만원 미만', '9.9만원'],
  ['Growth', '300만~1,000만원', '29만원'],
  ['Pro', '1,000만~3,000만원', '69만원'],
  ['Scale', '3,000만~1억원', '149만원'],
  ['Enterprise', '1억원 이상', '협의(광고비의 1.5%)'],
]

const css = `
.ckp {
  --ckp-bg: #0A0A0A;
  --ckp-surface: #1A1A1A;
  --ckp-hairline: rgba(255,255,255,0.09);
  --ckp-text: #EDEDED;
  --ckp-muted: #A1A1A1;
  --ckp-accent: #52A8FF;
  --ckp-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  background: var(--ckp-bg);
  color: var(--ckp-text);
  min-height: 100vh;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
}
.ckp a { color: var(--ckp-accent); text-decoration: none; }
.ckp-wrap { max-width: 1000px; margin: 0 auto; padding: 0 24px; }
.ckp-section { padding: 120px 0; }
.ckp-section--hero { padding: 140px 0 120px; }
.ckp-bar { width: 40px; height: 2px; background: var(--ckp-accent); margin-bottom: 28px; }
.ckp-label {
  font-family: var(--ckp-mono);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: var(--ckp-muted);
  margin: 0;
}
.ckp-h1 {
  font-size: 48px;
  font-weight: 600;
  letter-spacing: -2.28px;
  line-height: 1.18;
  margin: 20px 0 0;
  max-width: 18ch;
}
.ckp-h2 {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -1.28px;
  line-height: 1.25;
  margin: 0;
}
.ckp-lead {
  font-size: 17px;
  line-height: 1.75;
  color: var(--ckp-muted);
  margin: 24px 0 0;
  max-width: 56ch;
}
.ckp-note {
  font-size: 14px;
  line-height: 1.7;
  color: var(--ckp-muted);
  margin: 0;
}
.ckp-btn {
  display: inline-block;
  border-radius: 6px;
  padding: 14px 22px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
}
.ckp-btn--primary { background: var(--ckp-accent); color: #0A0A0A; }
.ckp-btn--ghost {
  color: var(--ckp-text);
  box-shadow: 0 0 0 1px var(--ckp-hairline);
  text-align: center;
  padding: 12px 18px;
  font-size: 14px;
}
.ckp-shot {
  margin: 56px 0 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 0 1px var(--ckp-hairline);
  background: var(--ckp-surface);
}
.ckp-shot img { display: block; width: 100%; height: auto; }
.ckp-shot--card { max-width: 720px; margin: 40px 0 0; }
.ckp-pills { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0 0; padding: 0; list-style: none; }
.ckp-pill {
  font-family: var(--ckp-mono);
  font-size: 12px;
  color: var(--ckp-muted);
  border-radius: 9999px;
  padding: 7px 14px;
  box-shadow: 0 0 0 1px var(--ckp-hairline);
}
.ckp-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 48px 0 0; }
.ckp-card {
  background: var(--ckp-surface);
  border-radius: 12px;
  padding: 28px 24px;
  box-shadow: 0 0 0 1px var(--ckp-hairline);
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.ckp-card--rec { box-shadow: 0 0 0 1px var(--ckp-accent); }
.ckp-card-name { font-size: 15px; font-weight: 500; margin: 0; }
.ckp-card-price { font-size: 32px; font-weight: 600; letter-spacing: -1.28px; margin: 0; }
.ckp-card-range { font-size: 13px; color: var(--ckp-muted); margin: -8px 0 0; }
.ckp-card-who { font-size: 14px; line-height: 1.7; color: var(--ckp-muted); margin: 0; flex: 1; }
.ckp-rec {
  font-family: var(--ckp-mono);
  font-size: 12px;
  color: var(--ckp-accent);
}
.ckp-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ckp-table { width: 100%; border-collapse: collapse; margin: 64px 0 0; }
.ckp-table th, .ckp-table td {
  text-align: left;
  padding: 16px 12px;
  font-size: 14px;
  font-weight: 400;
  box-shadow: inset 0 -1px 0 var(--ckp-hairline);
}
.ckp-table th { font-family: var(--ckp-mono); font-size: 12px; color: var(--ckp-muted); }
.ckp-table td:first-child { font-weight: 500; }
.ckp-table td:not(:first-child) { color: var(--ckp-muted); }
.ckp-fineprint { margin: 24px 0 0; display: flex; flex-direction: column; gap: 6px; }
.ckp-close { display: flex; flex-direction: column; align-items: flex-start; gap: 32px; }
@media (max-width: 860px) {
  .ckp-section { padding: 80px 0; }
  .ckp-section--hero { padding: 96px 0 80px; }
  .ckp-h1 { font-size: 34px; letter-spacing: -1.4px; }
  .ckp-h2 { font-size: 26px; letter-spacing: -0.9px; }
  .ckp-cards { grid-template-columns: 1fr; }
}
`

export default function CockpitPage() {
  return (
    <main className="ckp">
      <style>{css}</style>

      {/* 1. 히어로 */}
      <section className="ckp-section ckp-section--hero">
        <div className="ckp-wrap">
          <div className="ckp-bar" />
          <p className="ckp-label">소상공인을 위한 메타 광고 자동 관리</p>
          <h1 className="ckp-h1">광고관리자를 열지 않아도 돈이 새는 곳을 매주 알려드립니다</h1>
          <p className="ckp-lead">{SUBTITLE}</p>
          <p style={{ margin: '40px 0 0' }}>
            <a className="ckp-btn ckp-btn--primary" href={LOGIN_URL}>
              계정 연결하고 첫 진단 받기
            </a>
          </p>
          <div className="ckp-shot">
            <Image
              src="/cockpit/home.png"
              alt="콕핏 홈 화면, 한 줄 요약과 지표 4개"
              width={2880}
              height={1800}
              priority
            />
          </div>
          <ul className="ckp-pills">
            {HERO_CAPTIONS.map((c) => (
              <li key={c} className="ckp-pill">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2. 증명 */}
      <section className="ckp-section">
        <div className="ckp-wrap">
          <h2 className="ckp-h2">이런 문장으로 알려드립니다</h2>
          <p className="ckp-lead">전문 용어 대신 날짜와 금액으로 말합니다. 근거는 접혀 있고, 버튼은 하나입니다.</p>
          <div className="ckp-shot ckp-shot--card">
            <Image src="/cockpit/diagnosis-card.png" alt="손실 진단 카드" width={1440} height={1540} />
          </div>
          <p className="ckp-note" style={{ margin: '20px 0 0' }}>
            새 광고는 항상 꺼진 상태로 만들어지고, 켜는 것은 사장님의 결정입니다.
          </p>
        </div>
      </section>

      {/* 3. 요금 */}
      <section className="ckp-section">
        <div className="ckp-wrap">
          <h2 className="ckp-h2">요금</h2>
          <p className="ckp-lead">
            월 광고비 구간에 따라 정해지는 정액 요금입니다. 광고비는 사장님 카드에서 Meta로 직접 결제되고 콕핏은
            소프트웨어 요금만 받습니다.
          </p>

          <div className="ckp-cards">
            {TIERS.map((t) => (
              <div key={t.name} className={t.recommended ? 'ckp-card ckp-card--rec' : 'ckp-card'}>
                <div className="ckp-card-head">
                  <p className="ckp-card-name">{t.name}</p>
                  {t.recommended && <span className="ckp-rec">추천</span>}
                </div>
                <p className="ckp-card-price">{t.price}</p>
                <p className="ckp-card-range">{t.range}</p>
                <div>
                  <p className="ckp-label" style={{ marginBottom: '8px' }}>
                    이런 분께
                  </p>
                  <p className="ckp-card-who">{t.who}</p>
                </div>
                <a className="ckp-btn ckp-btn--ghost" href={LOGIN_URL}>
                  시작하기
                </a>
              </div>
            ))}
          </div>

          <table className="ckp-table">
            <thead>
              <tr>
                <th>티어</th>
                <th>월 광고비</th>
                <th>월 요금</th>
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((r) => (
                <tr key={r[0]}>
                  <td>{r[0]}</td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ckp-fineprint">
            <p className="ckp-note">
              티어는 직전 3개월 평균 광고비로 정해집니다. 상향은 다음 달부터, 하향은 3개월 유지 후 적용됩니다.
            </p>
            <p className="ckp-note">요금은 출시 전 초안이며 확정 시 이 페이지가 갱신됩니다.</p>
          </div>
        </div>
      </section>

      {/* 4. 마무리 */}
      <section className="ckp-section">
        <div className="ckp-wrap ckp-close">
          <p className="ckp-h2" style={{ maxWidth: '24ch' }}>
            지금 광고비가 어디로 새는지 궁금하시면 계정을 연결해 첫 진단을 받아 보세요.
          </p>
          <a className="ckp-btn ckp-btn--primary" href={LOGIN_URL}>
            계정 연결하고 첫 진단 받기
          </a>
        </div>
      </section>
    </main>
  )
}
