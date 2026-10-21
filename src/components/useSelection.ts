"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseSelection, readSelectionRaw, subscribeSelection, type Selection } from "@/lib/selection";

const serverSnapshot = () => null;

// 브라우저 저장소의 선택값을 읽는다. 서버 렌더와 첫 하이드레이션에서는 빈 선택(null)으로 시작한다.
// hydrated=false인 동안은 저장소를 아직 읽지 않은 상태다.
export function useSelection(): { selection: Selection; hydrated: boolean } {
  const raw = useSyncExternalStore(subscribeSelection, readSelectionRaw, serverSnapshot);
  const hydrated = useSyncExternalStore(subscribeNoop, clientTrue, serverFalse);
  const selection = useMemo(() => parseSelection(raw), [raw]);
  return { selection, hydrated };
}

const subscribeNoop = () => () => {};
const clientTrue = () => true;
const serverFalse = () => false;
