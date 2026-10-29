import { createClient } from '@/lib/supabase/server'
import { REPORTS_BUCKET, TREND_KEY, type FunnelTrend } from '@/lib/reports'
import { TrendChart, type TrendPoint } from './charts'

// 재무 탭 「퍼널 추이」: brain-weekly 가 주간 리포트 신호등과 같은 계산으로 올린 월별 값(설계: 볼트 work/261028-정리-퍼널신호등-지표)
const C1 = '#3b82f6'
const C2 = '#ea580c' // C1 과 다크 표면에서 dataviz 검증 통과(밝기, 색각 이상 구분)
const rate = (a: number, k: number) => (k ? (100 * a) / k : null)

function Panel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
        <p className="text-xs leading-relaxed text-neutral-500">{note}</p>
      </div>
      {children}
    </section>
  )
}

export async function FunnelTrendTab() {
  const supabase = await createClient()
  const { data } = await supabase.storage.from(REPORTS_BUCKET).download(TREND_KEY)
  let t: FunnelTrend | null = null
  try {
    const j = data ? JSON.parse(await data.text()) : null
    if (j?.version === 1) t = j
  } catch {}
  if (!t) return <p className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">퍼널 추이 파일이 아직 없습니다. 주간 잡(brain-weekly)이 한 번 돌면 생깁니다.</p>
  return <FunnelTrendView t={t} />
}

// 주별: 월~일 13주, 축은 그 주 월요일. 달을 걸친 주도 자르지 않아 월별 값과 합이 맞지 않을 수 있다
function WeeklyTrend({ w, goal }: { w: NonNullable<FunnelTrend['weeks']>; goal: number }) {
  const md = (iso: string) => `${+iso.slice(5, 7)}/${+iso.slice(8)}`
  const pts = (f: (i: number) => Omit<TrendPoint, 'label'>) => w.start.map((s, i) => ({ label: md(s), title: `${md(s)}~${md(w.end[i])}`, ...f(i) }))
  const leads = w.leads ? Object.entries(w.leads) : null
  const wgoal = +((goal * 12) / 52).toFixed(1)
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-neutral-100">주별 (최근 {w.start.length}주)</h2>
        <p className="text-xs text-neutral-500">월~일 주 단위, 축은 그 주 월요일. 계산은 위 월별과 같고 기간만 주입니다</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="안건 수" note={`주 목표 ${wgoal}건(월 ${goal}건 × 12 ÷ 52)`}>
          <TrendChart
            unit="건"
            goal={wgoal}
            series={[
              { key: 'new', name: '신규 고객 첫 계약', color: C1, kind: 'bar', stack: 'd' },
              { key: 'repeat', name: '재계약', color: C2, kind: 'bar', stack: 'd' },
            ]}
            data={pts((i) => ({ new: w.deals.new[i], repeat: w.deals.repeat[i] }))}
          />
        </Panel>
        <Panel title="입금, 송금" note="기한 내 입금률: 예정일이 그 주인 회차. 송금 처리율: 그 주 일요일 기준(90일 창)">
          <TrendChart
            unit="%"
            goal={100}
            series={[
              { key: 'on', name: '기한 내 입금률', color: C1, kind: 'line' },
              { key: 're', name: '송금 처리율', color: C2, kind: 'line' },
            ]}
            data={pts((i) => ({
              on: rate(w.ontime.a[i], w.ontime.k[i]), on_t: `${w.ontime.a[i]}/${w.ontime.k[i]}건`,
              re: rate(w.remit.a[i], w.remit.k[i]), re_t: `${w.remit.a[i]}/${w.remit.k[i]}건`,
            }))}
          />
        </Panel>
        {leads && (
          <Panel title="신규 리드" note="Lead Status 최초 컨택일이 그 주인 고객사 수">
            <TrendChart
              unit="곳"
              series={leads.map(([ch], j) => ({ key: `l${j}`, name: ch, color: j ? C2 : C1, kind: 'bar' as const }))}
              data={pts((i) => Object.fromEntries(leads.map(([, v], j) => [`l${j}`, v[i]])))}
            />
          </Panel>
        )}
      </div>
    </div>
  )
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
        <h1 className="text-xl font-semibold text-neutral-50">퍼널 추이</h1>
        <p className="text-xs text-neutral-500">
          경영진 보고서 주간 잡이 신호등과 같은 계산으로 만든 월별, 주별 값입니다. 매주 월 07:00 갱신,{' '}
          {new Date(t.generated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 계산{closed ? '' : `. 이번 달은 ${upto}까지`}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="안건 수" note={`계약 기준일(계약일자, 없으면 시작일, 없으면 첫 입금일)의 달. 목표 ${d.goal}건은 신규 ${+(d.goal - d.repeat_goal).toFixed(1)}건과 재계약 ${d.repeat_goal}건(4~9월 평균 유지 가정)`}>
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

        <Panel title="입금, 송금" note="기한 내 입금률: 입금 예정일이 그 달인 회차 중 예정일까지 입금. 송금 처리율: 그 달 말일 기준, 고객 전액 입금 뒤 30일 지난 지급(그 앞 90일) 중 송금 완료">
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
          <p className="text-sm text-neutral-500 lg:col-span-2">Lead Status 읽기 실패로 영업 추이가 없습니다.</p>
        )}
      </div>

      {t.weeks && <WeeklyTrend w={t.weeks} goal={d.goal} />}

      {t.health ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-neutral-100">건전성</h2>
            <p className="text-xs text-neutral-500">월간파이낸스 정본(손으로 매달 갱신)의 달별 값. 정본이 아직 없는 달은 비움. 안건당 공헌이익은 정본의 입금 기준 안건</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {t.health.map((h) => (
              <Panel key={h.label} title={h.label} note={h.low ? '낮을수록 좋음' : '높을수록 좋음'}>
                <TrendChart
                  unit={h.unit}
                  goal={h.unit === '%' ? h.goal * 100 : h.goal}
                  series={[{ key: 'v', name: h.label, color: C1, kind: 'line' }]}
                  data={pts((i) => ({ v: h.v[i] == null ? null : h.unit === '%' ? h.v[i]! * 100 : h.v[i] }))}
                />
              </Panel>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">월간파이낸스 정본 읽기 실패로 건전성 추이가 없습니다.</p>
      )}
    </div>
  )
}
