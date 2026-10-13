import { Mail } from "lucide-react";
import { PressLink } from "@/components/app/press-link";

const EMAIL = "ztzyrant@gmail.com";

export function WorkCta() {
  return (
    <section className="px-4 py-24 md:py-36">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Work with me
        </p>

        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground md:text-5xl md:leading-[1.1]">
          Need components built for your product?
        </h2>
        <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
          Custom motion components and frontend systems, built to spec. Drop a
          line and tell me what you need.
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <PressLink
            href={`mailto:${EMAIL}`}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Mail className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
            Email me
          </PressLink>
        </div>
      </div>
    </section>
  );
}
