import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "코리너스(KOREANERS) 개인정보처리방침",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-white/60">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="mb-10 text-3xl font-bold text-white">
          개인정보처리방침
        </h1>

        <p className="mb-8 text-sm text-white/60">최종 수정일: 2026년 2월 27일</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              1. 개인정보의 수집 및 이용 목적
            </h2>
            <p>
              코리너스(이하 &quot;회사&quot;)는 다음의 목적을 위하여 개인정보를
              처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는
              이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는
              등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>서비스 문의 및 상담 처리</li>
              <li>마케팅 서비스 제안 및 안내</li>
              <li>크리에이터 섭외 및 협업 관리</li>
              <li>웹사이트 이용 분석 및 서비스 개선</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              2. 수집하는 개인정보 항목
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-white/80">문의 폼:</strong> 이름, 이메일,
                회사명, 문의 내용
              </li>
              <li>
                <strong className="text-white/80">자동 수집:</strong> IP 주소,
                브라우저 유형, 방문 페이지, 쿠키
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              3. 개인정보의 보유 및 이용 기간
            </h2>
            <p>
              회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체
              없이 파기합니다. 단, 관련 법령에 따라 보존할 필요가 있는 경우
              해당 기간 동안 보관합니다.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
              <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
              <li>웹사이트 방문 기록: 3개월</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              4. 개인정보의 제3자 제공
            </h2>
            <p>
              회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
              다만, 아래의 경우에는 예외로 합니다.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 요청이 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              5. 쿠키 및 분석 도구
            </h2>
            <p>
              회사는 서비스 개선 및 마케팅 분석을 위해 다음의 도구를 사용합니다.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Google Analytics (웹사이트 이용 분석)</li>
              <li>Meta Pixel (광고 효과 측정)</li>
              <li>Microsoft Clarity (UX 분석)</li>
            </ul>
            <p className="mt-3">
              이용자는 브라우저 설정을 통해 쿠키를 거부할 수 있으며, 이 경우
              일부 서비스 이용에 제한이 있을 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              6. 개인정보 보호 책임자
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-white/80">책임자:</strong> 조인혁
              </li>
              <li>
                <strong className="text-white/80">이메일:</strong>{" "}
                <a
                  href="mailto:sales@koreaners.com"
                  className="text-blue-400 hover:underline"
                >
                  sales@koreaners.com
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              7. 개인정보처리방침의 변경
            </h2>
            <p>
              이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른
              변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행
              7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
