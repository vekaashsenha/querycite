"use client";

import { useEffect } from "react";
import { clearIimaCouponDraft } from "@/lib/coupon-storage";

export function PaymentSuccessCouponCleanup() {
  useEffect(() => {
    clearIimaCouponDraft();
  }, []);

  return null;
}