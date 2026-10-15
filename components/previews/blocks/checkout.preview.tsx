"use client";

import { Checkout, type CheckoutItem } from "@/components/motion/checkout";

const ITEMS: CheckoutItem[] = [
  { id: "tee", name: "Heavyweight tee", variant: "Black · M", price: 32, quantity: 2 },
  { id: "cap", name: "Washed cap", variant: "Sand", price: 24, quantity: 1 },
  { id: "tote", name: "Canvas tote", variant: "Natural", price: 18.5, quantity: 1 },
];

export function CheckoutPreview() {
  return (
    <div className="flex w-full justify-center">
      <Checkout
        className="max-w-[40rem]"
        defaultItems={ITEMS}
        onApplyPromo={async (code) => {
          await new Promise((resolve) => setTimeout(resolve, 700));
          if (code.toUpperCase() === "SAVE10") {
            return { code: "SAVE10", label: "10% off", percentOff: 10 };
          }
          throw new Error(`"${code}" isn't a valid code. Try SAVE10.`);
        }}
        onComplete={async () => {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          return "#KR-20481";
        }}
      />
    </div>
  );
}
