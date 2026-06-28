import { useState, useEffect, useCallback, type ChangeEvent } from "react";

/**
 * A controlled money input that stores a raw string so the user can clear the
 * field without it snapping back to "0". The parent works in centavos; this
 * component handles the string↔centavos conversion.
 *
 * Usage:
 *   <CurrencyInput
 *     centavos={valueInCentavos}
 *     onChangeCentavos={(c) => setCentavos(c)}
 *     label="Unit cost"
 *   />
 */
export function CurrencyInput({
  centavos,
  onChangeCentavos,
  label,
  placeholder,
  disabled,
  autoFocus,
  className = "",
}: {
  centavos: number;
  onChangeCentavos: (centavos: number) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const [raw, setRaw] = useState("");

  // Sync external centavos → raw string (only when the input is NOT focused)
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) {
      setRaw(centavos === 0 ? "" : (centavos / 100).toFixed(2).replace(/\.?0+$/, ""));
    }
  }, [centavos, focused]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      // Allow empty, digits, one decimal point, up to 2 decimal places
      if (next !== "" && !/^\d*\.?\d{0,2}$/.test(next)) return;
      setRaw(next);
      const parsed = parseFloat(next);
      onChangeCentavos(Number.isFinite(parsed) ? Math.round(parsed * 100) : 0);
    },
    [onChangeCentavos],
  );

  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <div className="flex min-h-10 items-center border border-border bg-card px-2 focus-within:ring-1 focus-within:ring-accent/50">
        <span className="mr-1 text-[12px] text-muted-foreground">₱</span>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            // Re-format on blur: strip trailing dot, show 2 decimals if non-empty
            const parsed = parseFloat(raw);
            if (raw !== "" && Number.isFinite(parsed)) {
              setRaw(parsed.toFixed(2).replace(/\.?0+$/, ""));
            }
          }}
          placeholder={placeholder ?? "0.00"}
          disabled={disabled}
          autoFocus={autoFocus}
          className="w-full bg-transparent text-[11px] outline-none tabular-nums"
        />
      </div>
    </label>
  );
}

/**
 * A controlled numeric quantity input (supports decimals for fractional units
 * like grams or carats). Stores a raw string so the user can clear the field.
 */
export function QuantityInput({
  value: numericValue,
  onChange: onChangeNumeric,
  label,
  unit,
  placeholder,
  disabled,
  autoFocus,
  step,
  min,
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  step?: string;
  min?: number;
  className?: string;
}) {
  const [raw, setRaw] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setRaw(numericValue === 0 ? "" : String(numericValue));
    }
  }, [numericValue, focused]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      // Allow empty, digits, one decimal point
      if (next !== "" && !/^\d*\.?\d*$/.test(next)) return;
      setRaw(next);
      const parsed = parseFloat(next);
      onChangeNumeric(Number.isFinite(parsed) ? parsed : 0);
    },
    [onChangeNumeric],
  );

  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
        {unit ? ` (${unit})` : ""}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const parsed = parseFloat(raw);
          if (raw !== "" && Number.isFinite(parsed)) {
            setRaw(String(parsed));
          }
        }}
        placeholder={placeholder ?? "0"}
        disabled={disabled}
        autoFocus={autoFocus}
        step={step}
        min={min}
        className="min-h-10 w-full border border-border bg-card px-2 text-[11px] outline-none tabular-nums focus:ring-1 focus:ring-accent/50"
      />
    </label>
  );
}
