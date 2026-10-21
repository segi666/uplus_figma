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
      {header}

      <form noValidate onSubmit={onSubmit} className="flex w-full flex-1 flex-col">
        <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-24">
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

          {saveFailed ? (
            <p role="alert" className="w-full text-body-small-medium text-text-error">
              신청을 저장하지 못했어요. 입력한 내용은 그대로 있어요. 다시 시도해 주세요.
            </p>
          ) : null}
        </main>

        <BottomCTA>
          <Button variant="primary" size="xl" fullWidth htmlType="submit" disabled={saving}>
            신청하기
          </Button>
        </BottomCTA>
      </form>
    </>
  );
}
