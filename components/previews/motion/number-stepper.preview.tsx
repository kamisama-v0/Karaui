"use client";

import { useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { NumberStepper } from "@/components/motion/number-stepper";

const PRICE = 24;
const USD: Intl.NumberFormatOptions = { style: "currency", currency: "USD" };
const usd = new Intl.NumberFormat("en-US", USD);

export function NumberStepperPreview() {
  const [guests, setGuests] = useState(2);
  const [quantity, setQuantity] = useState(1);
  const [tip, setTip] = useState(5);

  return (
    <div className="flex w-full max-w-xs flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Guests</p>
          <p className="text-xs text-muted-foreground">Up to 12</p>
        </div>
        <NumberStepper
          aria-label="Guests"
          className="w-40 shrink-0"
          value={guests}
          onChange={setGuests}
          min={1}
          max={12}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Tickets</p>
          <p className="text-xs text-muted-foreground">
            {usd.format(PRICE)} each · hold to repeat
          </p>
        </div>
        <NumberStepper
          aria-label="Tickets"
          className="w-40 shrink-0"
          value={quantity}
          onChange={setQuantity}
          min={0}
          max={99}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Tip</p>
          <p className="text-xs text-muted-foreground">Type or use ↑ ↓</p>
        </div>
        <NumberStepper
          aria-label="Tip"
          className="w-40 shrink-0"
          value={tip}
          onChange={setTip}
          min={0}
          max={50}
          formatOptions={USD}
        />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm text-muted-foreground">Total</span>
        <AnimatedNumber
          value={PRICE * quantity + tip}
          startOnView={false}
          duration={0.5}
          format={(n) => usd.format(Math.round(n))}
          className="text-lg font-semibold text-foreground"
        />
      </div>
    </div>
  );
}
