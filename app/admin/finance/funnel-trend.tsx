import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { REPORTS_BUCKET, TREND_KEY, type FunnelTrend } from '@/lib/reports'
import { TrendChart, type TrendPoint } from './charts'
import { Info } from './ui'

// 재무 탭 「지표 모니터링」(구 퍼널 추이, 탭 키 funnel 유지): brain-weekly 가 주간 리포트 신호등과 같은 계산으로 올린 월별 값(설계: 볼트 work/261028-정리-퍼널신호등-지표)
const C1 = '#3b82f6'
const C2 = '#ea580c' // C1 과 다크 표면에서 dataviz 검증 통과(밝기, 색각 이상 구분)
const rate = (a: number, k: number) => (k ? (100 * a) / k : null)

// 카드 하나. href 가 있으면 카드 전체가 그 상세 화면 링크(상세 화면이 있는 지표만), info 는 제목 옆 ⓘ 설명
function Panel({ title, note, info, href, children }: { title: string; note: string; info?: string; href?: string; children: React.ReactNode }) {
  const card = (
    <section className={`h-full space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5${href ? ' transition-colors group-hover/card:border-neutral-600' : ''}`}>
      <div className="space-y-1">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-neutral-100">
          {title}
          {info && <Info text={info} />}
          {href && <span className="ml-auto text-xs font-normal text-neutral-500 group-hover/card:text-neutral-200">자세히 →</span>}
        </h2>
        <p className="text-xs leading-relaxed text-neutral-500">{note}</p>
      </div>
      {children}
    </section>
  )
  return href ? <Link href={href} className="group/card block h-full">{card}</Link> : card
}

const CASH_TIMING = '공헌이익은 현금 기준: 매출은 고객이 입금한 달, 크리에이터 지급은 송금한 달에 잡힘. 송금이 입금보다 몇 달 늦게 나가서 입금이 몰린 달은 좋아 보이고 송금이 몰린 달은 나빠 보임. 주황 선은 그 달까지 3개월을 합쳐 낸 보정값(정본 숫자 그대로, 출렁임만 줄임)'

export async function FunnelTrendTab() {
  const supabase = await createClient()
  const { data } = await supabase.storage.from(REPORTS_BUCKET).download(TREND_KEY)
  let t: FunnelTrend | null = null
  try {
    const j = data ? JSON.parse(await data.text()) : null
    if (j?.version === 1) t = j
  } catch {}
  if (!t) return <p className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">지표 모니터링 파일이 아직 없습니다. 주간 잡(brain-weekly)이 한 번 돌면 생깁니다.</p>
  return <FunnelTrendView t={t} />
}

export function FunnelTrendView({ t }: { t: FunnelTrend }) {
  const cur = t.today.slice(0, 7)
  const upto = `${+t.today.slice(5, 7)}/${+t.today.slice(8)}`
  // 축은 짧게, 이번 달이 진행 중이라는 표시는 툴팁 머리에
  const label = (i: number) => `${+t.months[i].slice(5)}월`
  const closed = new Date(Date.UTC(+t.today.slice(0, 4), +t.today.slice(5, 7), 0)).getUTCDate() === +t.today.slice(8) // 기간 끝이 말일(마감 회차)
  const full = (i: number) => (t.months[i] === cur && !closed ? `${label(i)} (${upto}까지)` : label(i))
  const pts = (f: (i: number) => Omit<TrendPoint, 'label'>) => t.months.map((_, i) => ({ label: label(i), title: full(i), ...f(i) }))
  const d = t.deals
  const leads = t.leads ? Object.entries(t.leads) : null

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-50">지표 모니터링</h1>
        <p className="text-xs text-neutral-500">
          경영진 보고서 주간 잡이 신호등과 같은 계산으로 만든 월별 값입니다. 매주 월 07:00 갱신,{' '}
          {new Date(t.generated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 계산{closed ? '' : `. 이번 달은 ${upto}까지`}. 건전성 4개는 월간파이낸스 정본(손으로 매달 갱신) 값이라 정본이 없는 달은 비움
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title="안건 수" href="/admin/finance?tab=contracts" note={`계약 기준일(계약일자, 없으면 시작일, 없으면 첫 입금일)의 달. 목표 ${d.goal}건은 신규 ${+(d.goal - d.repeat_goal).toFixed(1)}건과 재계약 ${d.repeat_goal}건(4~9월 평균 유지 가정)`}>
          <TrendChart
            unit="건"
            goal={d.goal}
            series={[
              { key: 'new', name: '신규 고객 첫 계약', color: C1, kind: 'bar', stack: 'd' },
              { key: 'repeat', name: '재계약', color: C2, kind: 'bar', stack: 'd' },
            ]}
            data={pts((i) => ({ new: d.new[i], repeat: d.repeat[i], title: `${full(i)} 합계 ${d.new[i] + d.repeat[i]}건` }))}
          />
        </Panel>

        <Panel title="입금, 송금" href="/admin/finance?tab=calendar" note="기한 내 입금률: 입금 예정일이 그 달인 회차 중 예정일까지 입금. 송금 처리율: 그 달 말일 기준, 고객 전액 입금 뒤 30일 지난 지급(그 앞 90일) 중 송금 완료">
          <TrendChart
            unit="%"
            goal={100}
            series={[
              { key: 'on', name: '기한 내 입금률', color: C1, kind: 'line' },
              { key: 're', name: '송금 처리율', color: C2, kind: 'line' },
            ]}
            data={pts((i) => ({
              on: rate(t.ontime.a[i], t.ontime.k[i]), on_t: `${t.ontime.a[i]}/${t.ontime.k[i]}건`,
              re: rate(t.remit.a[i], t.remit.k[i]), re_t: `${t.remit.a[i]}/${t.remit.k[i]}건`,
            }))}
          />
        </Panel>

        {leads ? (
          <>
            <Panel title="신규 리드" note="Lead Status 최초 컨택일이 그 달인 고객사 수. 시트, 슬랙, 드라이브에서 처음 잡힌 곳(계약이 먼저인 곳)은 뺌">
              <TrendChart
                unit="곳"
                series={leads.map(([ch], j) => ({ key: `l${j}`, name: ch, color: j ? C2 : C1, kind: 'bar' as const }))}
                data={pts((i) => Object.fromEntries(leads.map(([, v], j) => [`l${j}`, v.n[i]])))}
              />
            </Panel>
            <Panel title="수주율 (컨택월 코호트)" note="그 달에 처음 컨택한 고객사 중 지금까지 확정, 정산 단계이거나 계약이 연결된 곳. 말일이 60일 안 지난 달은 덜 익어 비우고, 오래된 달일수록 시간이 더 지나 높게 나옴">
              <TrendChart
                unit="%"
                series={leads.map(([ch], j) => ({ key: `w${j}`, name: ch, color: j ? C2 : C1, kind: 'line' as const }))}
                data={pts((i) => Object.fromEntries(leads.flatMap(([, v], j) => [
                  [`w${j}`, v.ripe[i] ? rate(v.won[i], v.n[i]) : null],
                  [`w${j}_t`, `${v.won[i]}/${v.n[i]}곳`],
                ])))}
              />
            </Panel>
          </>
        ) : (
          <p className="col-span-full text-sm text-neutral-500">Lead Status 읽기 실패로 영업 추이가 없습니다.</p>
        )}
        {t.health ? (
          t.health.map((h) => (
            <Panel key={h.label} title={h.label} note={`${h.low ? '낮을수록 좋음' : '높을수록 좋음'}. 월간파이낸스 정본${h.label === '안건당 공헌이익' ? ', 안건은 정본의 입금 기준' : ''}`} info={h.adj ? CASH_TIMING : undefined}>
              <TrendChart
                unit={h.unit}
                goal={h.unit === '%' ? h.goal * 100 : h.goal}
                series={[{ key: 'v', name: h.adj ? '그 달' : h.label, color: C1, kind: 'line' }, ...(h.adj ? [{ key: 'a', name: '3개월 합 보정', color: C2, kind: 'line' as const }] : [])]}
                data={pts((i) => {
                  const f = (x: number | null | undefined) => (x == null ? null : h.unit === '%' ? x * 100 : x)
                  return { v: f(h.v[i]), a: f(h.adj?.[i]) }
                })}
              />
            </Panel>
          ))
        ) : (
          <p className="col-span-full text-sm text-neutral-500">월간파이낸스 정본 읽기 실패로 건전성 추이가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
