"use client";

import { ContactForm } from "@/components/motion/contact-form";

export function ContactFormPreview() {
  return (
    <div className="flex w-full justify-center">
      <ContactForm
        className="max-w-[40rem]"
        description='Messages containing "fail" are rejected so you can see the error.'
        onSubmit={async (values) => {
          await new Promise((resolve) => setTimeout(resolve, 1100));
          if (values.message.toLowerCase().includes("fail")) {
            throw new Error("Our inbox is busy — please try again.");
          }
        }}
      />
    </div>
  );
}
