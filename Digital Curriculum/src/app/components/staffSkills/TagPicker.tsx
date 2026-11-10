import { useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { cleanLabel } from "../../lib/staffSkills";

type TagPickerProps = {
  id: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Called when the person adds something that isn't in `options`. */
  onCreate?: (label: string) => void;
  placeholder?: string;
  max?: number;
};

const MAX_RESULTS = 40;

/**
 * Searchable multi-select with "add your own". Type to filter a long list;
 * Enter picks the highlighted result, or adds the typed text as a new entry
 * when nothing matches exactly.
 */
export function TagPicker({ id, options, value, onChange, onCreate, placeholder, max = 30 }: TagPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLower = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value]);
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    const pool = options.filter((o) => !selectedLower.has(o.toLowerCase()));
    if (!q) return pool.slice(0, MAX_RESULTS);
    const starts: string[] = [];
    const contains: string[] = [];
    for (const o of pool) {
      const l = o.toLowerCase();
      if (l.startsWith(q) || l.split(/[\s/(&-]+/).some((w) => w.startsWith(q))) starts.push(o);
      else if (l.includes(q)) contains.push(o);
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [options, selectedLower, q]);

  const typed = cleanLabel(query);
  const exactExists =
    !typed ||
    options.some((o) => o.toLowerCase() === typed.toLowerCase()) ||
    selectedLower.has(typed.toLowerCase());
  const canAddNew = !exactExists;
  const atMax = value.length >= max;

  const add = (label: string, isNew = false) => {
    const clean = cleanLabel(label);
    if (!clean || atMax || selectedLower.has(clean.toLowerCase())) return;
    onChange([...value, clean]);
    if (isNew) onCreate?.(clean);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };

  const remove = (label: string) => onChange(value.filter((v) => v !== label));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const total = results.length + (canAddNew ? 1 : 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(total - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < results.length && results[active]) add(results[active]);
      else if (canAddNew) add(typed, true);
    } else if (e.key === "Backspace" && !query && value.length) {
      remove(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const listId = `${id}-listbox`;

  return (
    <div className="relative">
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Selected">
          {value.map((v) => (
            <li
              key={v}
              className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 py-1 pl-3 pr-1 text-sm text-foreground"
            >
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-accent/20 hover:text-foreground"
                aria-label={`Remove ${v}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="flex h-10 w-full min-w-0 rounded-md border border-input bg-input-background py-1 pl-9 pr-3 text-base text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 md:text-sm"
          value={query}
          disabled={atMax}
          placeholder={atMax ? `You've picked the maximum of ${max}` : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && !atMax && (results.length > 0 || canAddNew) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-sm shadow-lg"
        >
          {results.map((r, i) => (
            <li
              key={r}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                add(r);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded px-3 py-2 ${
                i === active ? "bg-accent/15 text-foreground" : "text-foreground/90"
              }`}
            >
              {r}
            </li>
          ))}
          {canAddNew && (
            <li
              role="option"
              aria-selected={active === results.length}
              onMouseDown={(e) => {
                e.preventDefault();
                add(typed, true);
              }}
              onMouseEnter={() => setActive(results.length)}
              className={`flex cursor-pointer items-center gap-2 rounded px-3 py-2 font-medium text-accent ${
                active === results.length ? "bg-accent/15" : ""
              }`}
            >
              <Plus className="h-4 w-4" />
              Add “{typed}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
