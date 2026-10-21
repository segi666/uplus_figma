import { PlanDetail } from "@/components/PlanDetail";
import { plans } from "@/lib/data";

// 화면 04 요금제 상세 · 청구 금액 내역 (route: /plans/[id])
// cacheComponents가 켜져 있어 샘플 요금제 id를 미리 알려 준다 (빌드 때 params를 알 수 있게).
// 목록에 없는 id도 요청 때 렌더되고, 화면 안에서 03으로 보낸다.
// [기획] 요금제 상세 화면의 입구: 주소 끝의 요금제 번호를 읽어 화면 내용(PlanDetail)에 넘긴다. 실제 화면 구성은 PlanDetail 파일에 있다.
// [기획] 샘플에 없는 요금제 번호로 들어오면 추천 결과(03)로 돌려보낸다.
export async function generateStaticParams() {
  return plans.map((p) => ({ id: p.id }));
}

export default async function PlanDetailPage({ params }: PageProps<"/plans/[id]">) {
  const { id } = await params;
  return <PlanDetail id={id} />;
}
