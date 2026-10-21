"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BottomCTA } from "@/components/BottomCTA";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Header } from "@/components/Header";
import { Input } from "@/components/Input";
import { ListRow } from "@/components/ListRow";
import { useSelection } from "@/components/useSelection";
import {
  buildApplication,
  hasApplicantErrors,
  saveApplication,
  validateApplicant,
  type ApplicantErrors,
} from "@/lib/application";
import { findPlan } from "@/lib/data";
import { formatWon, priceBreakdown } from "@/lib/pricing";
import { contractLabel, customerTypeOptions, isUsageStepComplete } from "@/lib/selection";

// 화면 05 신청 확인 (저장) (route: /apply)
// states: 기본 · change 고객(첫 달 청구 금액 줄) · 이전 선택 없음(01로 보냄)
//         · 입력 오류: 이름 비움 / 이메일 비움 / 이메일 형식 틀림 · 동의 안 함
//         · 저장 중(신청하기 Disabled) · 저장 실패(안내, 입력 유지, 다시 시도) · 저장 성공(06으로)
// 입력칸은 이름 · 이메일 · 동의 3개뿐이다 (R15). 저장은 이 브라우저에만 한다 (F5, C1).
// [기획] 신청 확인 화면: 04에서 이 요금제로 신청을 누르면 보인다. 고른 내용을 다시 보여 주고 이름·이메일·동의를 받아 신청을 저장한다.
// [기획] 받는 정보는 이름과 이메일뿐이다. 저장은 이 브라우저 안에만 하고 서버로 보내지 않는다.
export default function ApplyPage() {
  const router = useRouter();
  const { selection, hydrated } = useSelection();
  const plan = findPlan(selection.planId);
  const ready = isUsageStepComplete(selection) && plan !== null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [errors, setErrors] = useState<ApplicantErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const savingRef = useRef(false);

  const uid = useId();
  const consentId = `${uid}-consent`;
  const consentLabelId = `${uid}-consent-label`;
  const consentErrorId = `${uid}-consent-error`;

  // 01~04를 거치지 않고 들어오면 01로 보낸다
  // [기획] 가입 형태·약정·요금제를 고르지 않은 채 들어오면 가입 형태 선택(01)으로 돌려보낸다.
  useEffect(() => {
    if (hydrated && !ready) router.replace("/");
  }, [hydrated, ready, router]);

  const backHref = selection.planId ? `/plans/${selection.planId}` : "/plans";
  const header = <Header type="default" title="신청 확인" backHref={backHref} />;

  if (!hydrated || !ready || !plan || !selection.customerType || selection.contractMonths === null) {
    return header;
  }

  const customerType = selection.customerType;
  const contractMonths = selection.contractMonths;
  const purpose = selection.purpose;
  const isChange = customerType === "change";
  const price = priceBreakdown(plan, { customerType, contractMonths });
  const customerTypeTitle = customerTypeOptions.find((o) => o.value === customerType)?.title ?? "";

  const onNameChange = (v: string) => {
    setName(v);
    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
  };
  const onEmailChange = (v: string) => {
    setEmail(v);
    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
  };
  const onConsentChange = (checked: boolean) => {
    setPrivacyConsent(checked);
    if (checked && errors.privacyConsent) setErrors((prev) => ({ ...prev, privacyConsent: undefined }));
  };

  // [기획] 신청하기 버튼 동작: 이름 비움·이메일 비움·이메일 형식 틀림·동의 안 함을 먼저 확인하고, 하나라도 틀리면 저장하지 않고 그 칸 아래에 안내를 띄운다.
  // [기획] 모두 맞으면 신청 시점의 금액과 함께 저장하고, 성공하면 신청 완료(06)로 이동한다.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingRef.current) return;

    // 틀리면 저장하지 않고 해당 칸 아래에 안내한다
    const found = validateApplicant({ name, email, privacyConsent });
    setErrors(found);
    if (hasApplicantErrors(found)) return;

    savingRef.current = true;
    setSaving(true);
    setSaveFailed(false);

    // 저장 중 상태(신청하기 Disabled)가 먼저 그려지게 한 박자 뒤에 저장한다
    window.setTimeout(() => {
      let ok = false;
      try {
        const app = buildApplication({
          customerType,
          purpose: isChange ? purpose : null,
          contractMonths,
          planId: plan.id,
          name,
          email,
          privacyConsent,
        });
        ok = saveApplication(app).ok;
      } catch {
        ok = false;
      }
      if (ok) {
        router.push("/complete");
        return;
      }
      // 저장 실패: 입력은 그대로 두고 다시 누를 수 있게 한다
      savingRef.current = false;
      setSaving(false);
      setSaveFailed(true);
    });
  };

  return (
    <>
      {/* [기획] 상단 헤더: 뒤로가기를 누르면 고른 요금제의 상세 화면(04)으로 돌아간다. */}
      {header}

      <form noValidate onSubmit={onSubmit} className="flex w-full flex-1 flex-col">
        <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-24">
          {/* [기획] 신청 내용 요약: 가입 형태, 요금제, 약정, 둘째 달부터 청구 금액. 첫 달 청구 금액은 요금제 변경 고객에게만 보인다. */}
          <section className="flex w-full flex-col gap-8">
            <h2 className="text-subtitle-bold text-text-primary">신청 내용</h2>
            <dl className="flex w-full flex-col">
              <ListRow label="고객 유형" value={customerTypeTitle} />
              <ListRow label="요금제" value={plan.name} />
              <ListRow label="약정" value={contractLabel(contractMonths)} />
              {isChange ? <ListRow label="첫 달 청구 금액" value={formatWon(price.firstMonthAmount)} /> : null}
              <ListRow label="둘째 달부터 청구 금액" value={formatWon(price.monthlyAmount)} />
            </dl>
          </section>

          {/* [기획] 신청자 정보 입력: 이름 칸, 이메일 칸, 개인정보 동의 체크 3개뿐이다. 틀린 칸은 밑줄이 빨갛게 바뀌고 칸 아래에 안내 문구가 뜬다. */}
          <section className="flex w-full flex-col gap-16">
            <h2 className="text-subtitle-bold text-text-primary">신청자 정보</h2>

            <Input
              name="name"
              type="text"
              label="이름"
              placeholder="이름을 입력해 주세요"
              autoComplete="name"
              value={name}
              onValueChange={onNameChange}
              error={errors.name}
            />

            <Input
              name="email"
              type="email"
              label="이메일"
              placeholder="이메일을 입력해 주세요"
              autoComplete="email"
              value={email}
              onValueChange={onEmailChange}
              error={errors.email}
            />

            {/* [기획] 개인정보 동의(필수): 체크하지 않고 신청하면 체크 아래에 동의해 달라는 안내가 빨간 글자로 뜬다. */}
            <div className="flex w-full flex-col gap-12">
              <div className="flex w-full items-start gap-8">
                <Checkbox
                  name="privacyConsent"
                  id={consentId}
                  checked={privacyConsent}
                  onCheckedChange={onConsentChange}
                  invalid={Boolean(errors.privacyConsent)}
                  describedBy={errors.privacyConsent ? consentErrorId : consentLabelId}
                />
                <label htmlFor={consentId} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-4">
                  <span className="text-body-small-strong text-text-primary">
                    [필수] 개인정보(이름·이메일) 수집·이용에 동의합니다
                  </span>
                  <span id={consentLabelId} className="text-caption-medium text-text-secondary">
                    신청 확인에만 쓰고 이 브라우저에만 저장돼요.
                  </span>
                </label>
              </div>
              {errors.privacyConsent ? (
                <p id={consentErrorId} className="w-full text-body-small-medium text-text-error">
                  {errors.privacyConsent}
                </p>
              ) : null}
            </div>
          </section>

          {/* [기획] 저장 실패 안내: 저장이 안 됐을 때만 보인다. 입력한 내용은 지우지 않고, 신청하기를 다시 누를 수 있다. */}
          {saveFailed ? (
            <p role="alert" className="w-full text-body-small-medium text-text-error">
              신청을 저장하지 못했어요. 입력한 내용은 그대로 있어요. 다시 시도해 주세요.
            </p>
          ) : null}
        </main>

        {/* [기획] 하단 신청하기 버튼: 저장하는 동안에는 꺼져서 두 번 누를 수 없다. */}
        <BottomCTA>
          <Button variant="primary" size="xl" fullWidth htmlType="submit" disabled={saving}>
            신청하기
          </Button>
        </BottomCTA>
      </form>
    </>
  );
}
