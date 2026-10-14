"use client";

import { ChevronDown, Search } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDismiss } from "@/lib/hooks/use-dismiss";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type PhoneCountry = {
  /** ISO 3166-1 alpha-2 code, e.g. "ID". */
  code: string;
  name: string;
  /** Dial code digits without "+", e.g. "62". */
  dial: string;
  /** Grouping for the national number: `#` is a digit, anything else a separator. */
  pattern: string;
  /** Valid national (significant) number length, `[min, max]` digits. */
  length: [number, number];
  /** Keep a leading 0 instead of treating it as the trunk prefix (Italy). */
  keepLeadingZero?: boolean;
};

export type PhoneValueMeta = {
  country: PhoneCountry;
  /** National significant number, digits only. */
  national: string;
  valid: boolean;
};

/** Compact built-in list. Patterns cover the common mobile format per country. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "ID", name: "Indonesia", dial: "62", pattern: "### #### #####", length: [9, 12] },
  { code: "US", name: "United States", dial: "1", pattern: "(###) ###-####", length: [10, 10] },
  { code: "GB", name: "United Kingdom", dial: "44", pattern: "#### ######", length: [9, 10] },
  { code: "IN", name: "India", dial: "91", pattern: "##### #####", length: [10, 10] },
  { code: "SG", name: "Singapore", dial: "65", pattern: "#### ####", length: [8, 8] },
  { code: "MY", name: "Malaysia", dial: "60", pattern: "##-#### ####", length: [9, 10] },
  { code: "JP", name: "Japan", dial: "81", pattern: "##-####-####", length: [9, 10] },
  { code: "DE", name: "Germany", dial: "49", pattern: "### ########", length: [7, 12] },
  { code: "BR", name: "Brazil", dial: "55", pattern: "(##) #####-####", length: [10, 11] },
  { code: "AU", name: "Australia", dial: "61", pattern: "### ### ###", length: [9, 9] },
  { code: "CA", name: "Canada", dial: "1", pattern: "(###) ###-####", length: [10, 10] },
  { code: "MX", name: "Mexico", dial: "52", pattern: "## #### ####", length: [10, 10] },
  { code: "FR", name: "France", dial: "33", pattern: "# ## ## ## ##", length: [9, 9] },
  { code: "IT", name: "Italy", dial: "39", pattern: "### ### ####", length: [6, 11], keepLeadingZero: true },
  { code: "ES", name: "Spain", dial: "34", pattern: "### ## ## ##", length: [9, 9] },
  { code: "NL", name: "Netherlands", dial: "31", pattern: "# ########", length: [9, 9] },
  { code: "BE", name: "Belgium", dial: "32", pattern: "### ## ## ##", length: [8, 9] },
  { code: "CH", name: "Switzerland", dial: "41", pattern: "## ### ## ##", length: [9, 9] },
  { code: "SE", name: "Sweden", dial: "46", pattern: "## ### ## ##", length: [7, 9] },
  { code: "NO", name: "Norway", dial: "47", pattern: "### ## ###", length: [8, 8] },
  { code: "DK", name: "Denmark", dial: "45", pattern: "## ## ## ##", length: [8, 8] },
  { code: "IE", name: "Ireland", dial: "353", pattern: "## ### ####", length: [7, 9] },
  { code: "PT", name: "Portugal", dial: "351", pattern: "### ### ###", length: [9, 9] },
  { code: "PL", name: "Poland", dial: "48", pattern: "### ### ###", length: [9, 9] },
  { code: "RU", name: "Russia", dial: "7", pattern: "### ###-##-##", length: [10, 10] },
  { code: "TR", name: "Türkiye", dial: "90", pattern: "### ### ## ##", length: [10, 10] },
  { code: "CN", name: "China", dial: "86", pattern: "### #### ####", length: [11, 11] },
  { code: "HK", name: "Hong Kong", dial: "852", pattern: "#### ####", length: [8, 8] },
  { code: "TW", name: "Taiwan", dial: "886", pattern: "### ### ###", length: [9, 9] },
  { code: "KR", name: "South Korea", dial: "82", pattern: "##-####-####", length: [9, 10] },
  { code: "TH", name: "Thailand", dial: "66", pattern: "## ### ####", length: [8, 9] },
  { code: "VN", name: "Vietnam", dial: "84", pattern: "## ### ## ##", length: [9, 10] },
  { code: "PH", name: "Philippines", dial: "63", pattern: "### ### ####", length: [10, 10] },
  { code: "PK", name: "Pakistan", dial: "92", pattern: "### #######", length: [10, 10] },
  { code: "BD", name: "Bangladesh", dial: "880", pattern: "####-######", length: [10, 10] },
  { code: "AE", name: "United Arab Emirates", dial: "971", pattern: "## ### ####", length: [8, 9] },
  { code: "SA", name: "Saudi Arabia", dial: "966", pattern: "## ### ####", length: [9, 9] },
  { code: "EG", name: "Egypt", dial: "20", pattern: "### ### ####", length: [10, 10] },
  { code: "NG", name: "Nigeria", dial: "234", pattern: "### ### ####", length: [10, 10] },
  { code: "ZA", name: "South Africa", dial: "27", pattern: "## ### ####", length: [9, 9] },
  { code: "KE", name: "Kenya", dial: "254", pattern: "### ######", length: [9, 9] },
  { code: "AR", name: "Argentina", dial: "54", pattern: "## ####-####", length: [10, 11] },
  { code: "CO", name: "Colombia", dial: "57", pattern: "### ### ####", length: [10, 10] },
  { code: "CL", name: "Chile", dial: "56", pattern: "# #### ####", length: [9, 9] },
  { code: "NZ", name: "New Zealand", dial: "64", pattern: "## ### ####", length: [8, 10] },
];

/** Emoji flag from an ISO alpha-2 code via regional indicator symbols. */
export function countryFlag(code: string) {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return String.fromCodePoint(
    ...[...upper].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

/** Groups national digits by the country pattern; overflow digits trail ungrouped. */
export function formatNational(digits: string, pattern: string) {
  let out = "";
  let index = 0;
  for (const char of pattern) {
    if (index >= digits.length) break;
    if (char === "#") {
      out += digits[index];
      index += 1;
    } else {
      out += char;
    }
  }
  return out + digits.slice(index);
}

function normalizeNational(digits: string, country: PhoneCountry) {
  const trimmed =
    !country.keepLeadingZero && digits.startsWith("0") ? digits.slice(1) : digits;
  return trimmed.slice(0, country.length[1]);
}

/** Finds the country for a full international number (longest dial code wins). */
export function detectCountry(
  international: string,
  countries: PhoneCountry[],
  prefer?: string,
): { country: PhoneCountry; national: string } | null {
  const digits = international.replace(/\D/g, "");
  let best: PhoneCountry | null = null;
  for (const country of countries) {
    if (!digits.startsWith(country.dial)) continue;
    if (
      !best ||
      country.dial.length > best.dial.length ||
      (country.dial === best.dial && country.code === prefer)
    )
      best = country;
  }
  if (!best) return null;
  return {
    country: best,
    national: normalizeNational(digits.slice(best.dial.length), best),
  };
}

function isValidNational(national: string, country: PhoneCountry) {
  return (
    national.length >= country.length[0] && national.length <= country.length[1]
  );
}

function toE164(national: string, country: PhoneCountry) {
  return national ? `+${country.dial}${national}` : "";
}

const SHAKE = { x: [0, -6, 6, -4, 4, -2, 0] };

export interface PhoneInputProps {
  /** Controlled E.164 value, e.g. "+6281234567890". Empty string for none. */
  value?: string;
  defaultValue?: string;
  /** E.164 string (empty when there are no digits) plus parsed details. */
  onChange?: (e164: string, meta: PhoneValueMeta) => void;
  /** Controlled ISO country code. */
  country?: string;
  /** Initial ISO country code. Default "ID". */
  defaultCountry?: string;
  onCountryChange?: (country: PhoneCountry) => void;
  /** Replace the built-in country list. */
  countries?: PhoneCountry[];
  label?: string;
  placeholder?: string;
  /** Override the built-in "invalid number" message, or force an error. */
  error?: string | boolean;
  hint?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  "aria-label"?: string;
  onBlur?: () => void;
  className?: string;
}

/**
 * International phone field: searchable country picker with emoji flags, a
 * national number formatted as you type (caret preserved), E.164 output, and a
 * blur-time length check that shakes the field when the number is invalid.
 */
export function PhoneInput({
  value: valueProp,
  defaultValue,
  onChange,
  country: countryProp,
  defaultCountry = "ID",
  onCountryChange,
  countries = PHONE_COUNTRIES,
  label,
  placeholder,
  error: errorProp,
  hint,
  disabled = false,
  name,
  id: idProp,
  "aria-label": ariaLabel,
  onBlur,
  className,
}: PhoneInputProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const inputId = idProp ?? `${uid}-input`;
  const messageId = `${uid}-message`;

  const fallback = countries[0] ?? PHONE_COUNTRIES[0];
  const findCountry = useCallback(
    (code: string | undefined) =>
      countries.find((c) => c.code === code?.toUpperCase()),
    [countries],
  );

  const [internalCountry, setInternalCountry] = useState(() => {
    const initial = defaultValue
      ? detectCountry(defaultValue, countries, defaultCountry)?.country.code
      : undefined;
    return initial ?? defaultCountry;
  });
  const countryCode = countryProp ?? internalCountry;
  const country = findCountry(countryCode) ?? fallback;

  const [internalNational, setInternalNational] = useState(() =>
    defaultValue
      ? (detectCountry(defaultValue, countries, defaultCountry)?.national ?? "")
      : "",
  );
  const controlled = valueProp !== undefined;
  const national = controlled
    ? valueProp
      ? (detectCountry(valueProp, [country], country.code)?.national ??
        detectCountry(valueProp, countries, country.code)?.national ??
        "")
      : ""
    : internalNational;

  const formatted = formatNational(national, country.pattern);
  const valid = isValidNational(national, country);

  const [touched, setTouched] = useState(false);
  const builtInError =
    touched && national.length > 0 && !valid
      ? `Enter a valid ${country.name} number`
      : null;
  const errorMessage =
    typeof errorProp === "string" ? errorProp : builtInError;
  const hasError = Boolean(errorProp) || Boolean(builtInError);

  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);

  // Restore the caret after the formatted value re-renders: the caret sits
  // after the same count of digits it was after before formatting.
  useLayoutEffect(() => {
    const digitsBefore = pendingCaret.current;
    const input = inputRef.current;
    if (digitsBefore === null || !input) return;
    pendingCaret.current = null;
    let position = 0;
    let seen = 0;
    while (position < formatted.length && seen < digitsBefore) {
      if (/\d/.test(formatted[position])) seen += 1;
      position += 1;
    }
    if (document.activeElement === input)
      input.setSelectionRange(position, position);
  });

  const shake = useCallback(() => {
    if (fieldRef.current && !reduce)
      animate(fieldRef.current, SHAKE, { duration: 0.4, ease: EASE_OUT });
  }, [reduce]);

  const emit = (nextNational: string, nextCountry: PhoneCountry) => {
    if (!controlled) setInternalNational(nextNational);
    onChange?.(toE164(nextNational, nextCountry), {
      country: nextCountry,
      national: nextNational,
      valid: isValidNational(nextNational, nextCountry),
    });
  };

  const changeCountry = (next: PhoneCountry) => {
    if (countryProp === undefined) setInternalCountry(next.code);
    onCountryChange?.(next);
  };

  const commitDigits = (
    rawDigits: string,
    digitsBeforeCaret: number,
    target: PhoneCountry,
  ) => {
    const next = normalizeNational(rawDigits, target);
    const stripped =
      !target.keepLeadingZero && rawDigits.startsWith("0") ? 1 : 0;
    pendingCaret.current = Math.min(
      Math.max(0, digitsBeforeCaret - stripped),
      next.length,
    );
    emit(next, target);
  };

  const applyInternational = (text: string) => {
    const detected = detectCountry(text, countries, country.code);
    if (!detected) {
      shake();
      return;
    }
    if (detected.country.code !== country.code) changeCountry(detected.country);
    pendingCaret.current = detected.national.length;
    emit(detected.national, detected.country);
  };

  const onInputChange = (raw: string, caret: number) => {
    if (raw.trim().startsWith("+")) {
      applyInternational(raw);
      return;
    }
    const digitsBefore = raw.slice(0, caret).replace(/\D/g, "").length;
    commitDigits(raw.replace(/\D/g, ""), digitsBefore, country);
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text").trim();
    if (!text.startsWith("+") && !text.startsWith("00")) return;
    event.preventDefault();
    applyInternational(text.startsWith("00") ? `+${text.slice(2)}` : text);
  };

  // Backspace/Delete next to a separator removes the neighbouring digit
  // instead of the separator (which formatting would just put back).
  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (start !== end) return;
    if (event.key === "Backspace" && start > 0 && /\D/.test(formatted[start - 1])) {
      event.preventDefault();
      const digitsBefore = formatted.slice(0, start).replace(/\D/g, "").length;
      if (digitsBefore === 0) return;
      const next =
        national.slice(0, digitsBefore - 1) + national.slice(digitsBefore);
      pendingCaret.current = digitsBefore - 1;
      emit(next, country);
    } else if (
      event.key === "Delete" &&
      start < formatted.length &&
      /\D/.test(formatted[start])
    ) {
      event.preventDefault();
      const digitsBefore = formatted.slice(0, start).replace(/\D/g, "").length;
      const next =
        national.slice(0, digitsBefore) + national.slice(digitsBefore + 1);
      pendingCaret.current = digitsBefore;
      emit(next, country);
    }
  };

  const message = errorMessage ?? hint;
  const examplePlaceholder =
    placeholder ?? formatNational("1".repeat(country.length[1]), country.pattern).replace(/1/g, "0");

  return (
    <div className={cn("relative flex w-full flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={inputId}
          className="px-1 text-sm font-medium text-foreground"
        >
          {label}
        </label>
      ) : null}

      <div
        ref={fieldRef}
        data-state={hasError ? "error" : "idle"}
        className={cn(
          "flex h-11 w-full items-center rounded-full border border-border bg-background transition-colors duration-200",
          "focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-ring/40",
          hasError &&
            "border-destructive ring-2 ring-destructive/25 focus-within:border-destructive focus-within:ring-destructive/25",
          disabled && "opacity-60",
        )}
      >
        <CountryPicker
          countries={countries}
          country={country}
          disabled={disabled}
          reduce={Boolean(reduce)}
          onSelect={(next) => {
            changeCountry(next);
            const renormalized = normalizeNational(national, next);
            if (renormalized !== national || next.code !== country.code)
              emit(renormalized, next);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        />
        <span
          aria-hidden
          className="pl-2 text-sm tabular-nums text-muted-foreground"
        >
          +{country.dial}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={formatted}
          disabled={disabled}
          placeholder={examplePlaceholder}
          aria-label={label ? undefined : (ariaLabel ?? "Phone number")}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? messageId : undefined}
          onChange={(event) =>
            onInputChange(
              event.target.value,
              event.target.selectionStart ?? event.target.value.length,
            )
          }
          onKeyDown={onInputKeyDown}
          onPaste={onPaste}
          onBlur={() => {
            setTouched(true);
            if (national.length > 0 && !valid) shake();
            onBlur?.();
          }}
          className="h-full min-w-0 flex-1 bg-transparent pr-4 pl-1.5 text-base tabular-nums text-foreground caret-foreground outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed"
        />
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {message ? (
          <motion.p
            key={errorMessage ? "error" : "hint"}
            id={messageId}
            role={errorMessage ? "alert" : undefined}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.1 } }
                : { opacity: 0, y: -4, transition: { duration: 0.12 } }
            }
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className={cn(
              "px-1 text-xs",
              errorMessage ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {message}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CountryPicker({
  countries,
  country,
  disabled,
  reduce,
  onSelect,
}: {
  countries: PhoneCountry[];
  country: PhoneCountry;
  disabled: boolean;
  reduce: boolean;
  onSelect: (country: PhoneCountry) => void;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q ||
        c.dial.startsWith(q),
    );
  }, [countries, query]);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    setQuery("");
    if (restoreFocus) buttonRef.current?.focus();
  }, []);
  const dismiss = useCallback(() => close(false), [close]);
  useDismiss(open, dismiss, rootRef, { escape: false });

  const openList = () => {
    if (disabled) return;
    const index = countries.findIndex((c) => c.code === country.code);
    setActive(Math.max(0, index));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  const activeIndex = Math.min(active, filtered.length - 1);
  const activeCountry = filtered[activeIndex];

  useEffect(() => {
    if (!open || !activeCountry) return;
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(
      `[data-code="${activeCountry.code}"]`,
    );
    if (!list || !item) return;
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop - 4;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight + 4;
  }, [activeCountry, open]);

  const pick = (next: PhoneCountry) => {
    close(false);
    onSelect(next);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((a) => (filtered.length ? (Math.min(a, filtered.length - 1) + 1) % filtered.length : 0));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActive((a) =>
          filtered.length
            ? (Math.min(a, filtered.length - 1) - 1 + filtered.length) % filtered.length
            : 0,
        );
        return;
      case "Home":
        event.preventDefault();
        setActive(0);
        return;
      case "End":
        event.preventDefault();
        setActive(Math.max(0, filtered.length - 1));
        return;
      case "Enter":
        event.preventDefault();
        if (activeCountry) pick(activeCountry);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      case "Tab":
        close(false);
        return;
    }
  };

  return (
    <div ref={rootRef} className="relative h-full shrink-0">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country: ${country.name} (+${country.dial})`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openList();
          }
        }}
        className="flex h-full items-center gap-1 rounded-l-full border-r border-border pr-2 pl-3.5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted disabled:cursor-not-allowed"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={country.code}
            aria-hidden
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.08 } }
                : { opacity: 0, y: -10, transition: { duration: 0.1 } }
            }
            transition={reduce ? { duration: 0.12 } : SPRING_SWAP}
            className="text-lg leading-none"
          >
            {countryFlag(country.code)}
          </motion.span>
        </AnimatePresence>
        <motion.span
          aria-hidden
          animate={{ rotate: open && !reduce ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : SPRING_SWAP}
          className="grid text-muted-foreground"
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.1 } }
                : {
                    opacity: 0,
                    y: -4,
                    scale: 0.98,
                    transition: { duration: 0.12, ease: EASE_OUT },
                  }
            }
            transition={reduce ? { duration: 0.15 } : SPRING_SWAP}
            style={{ transformOrigin: "top left" }}
            className="absolute top-full left-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg"
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-label="Search countries"
                aria-autocomplete="list"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={
                  activeCountry ? `${listId}-${activeCountry.code}` : undefined
                }
                autoComplete="off"
                spellCheck={false}
                value={query}
                placeholder="Search country or code…"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onSearchKeyDown}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Countries"
              className="relative isolate max-h-56 overflow-y-auto overscroll-contain p-1 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No countries found.
                </p>
              ) : (
                filtered.map((item, index) => {
                  const isActive = index === activeIndex;
                  const selected = item.code === country.code;
                  return (
                    <button
                      key={item.code}
                      id={`${listId}-${item.code}`}
                      data-code={item.code}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={selected}
                      onMouseDown={(event) => event.preventDefault()}
                      onPointerMove={() => setActive(index)}
                      onClick={() => pick(item)}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-sm outline-none",
                        isActive ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {isActive ? (
                        <motion.span
                          aria-hidden
                          layoutId={`${uid}-active`}
                          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                          className="absolute inset-0 -z-10 rounded-xl bg-muted"
                        />
                      ) : null}
                      <span aria-hidden className="text-base leading-none">
                        {countryFlag(item.code)}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          selected && "font-medium text-foreground",
                        )}
                      >
                        {item.name}
                      </span>
                      <span className="tabular-nums text-xs text-muted-foreground">
                        +{item.dial}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
