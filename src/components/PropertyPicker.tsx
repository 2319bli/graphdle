import { useEffect, useId, useRef, useState } from "react";
import { Hash, Search, X } from "lucide-react";
import {
  getPropertyTag,
  searchPropertyTags,
  type PropertyTag,
} from "../math/propertyTags";

export function PropertyPicker({
  selected,
  onChange,
  disabled = false,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0),
    [announcement, setAnnouncement] = useState("");
  const id = useId(),
    inputRef = useRef<HTMLInputElement>(null),
    optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const matches = searchPropertyTags(query, selected);
  const expanded = open && !disabled;
  const activeIndex = Math.min(active, Math.max(0, matches.length - 1));
  useEffect(() => {
    if (expanded)
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, query, expanded]);
  const add = (tag: PropertyTag) => {
    if (disabled || selected.includes(tag.id)) return;
    onChange([...selected, tag.id]);
    setQuery("");
    setActive(0);
    setOpen(false);
    setAnnouncement(`Added ${tag.label}.`);
    inputRef.current?.focus();
  };
  const remove = (tag: PropertyTag) => {
    if (disabled) return;
    onChange(selected.filter((id) => id !== tag.id));
    setAnnouncement(`Removed ${tag.label}.`);
    inputRef.current?.focus();
  };
  return (
    <section className="property-picker" aria-labelledby={`${id}-label`}>
      <div className="property-picker-heading">
        <label id={`${id}-label`} htmlFor={`${id}-input`}>
          Additional properties
        </label>
        <span>Two verified properties earn full credit.</span>
      </div>
      {selected.length > 0 && (
        <ul className="selected-properties" aria-label="Selected properties">
          {selected.map((id) => {
            const tag = getPropertyTag(id);
            return tag ? (
              <li className="property-chip" key={id}>
                <Hash aria-hidden="true" size={12} />
                <span>{tag.label}</span>
                {!disabled && (
                  <button
                    type="button"
                    aria-label={`Remove ${tag.label}`}
                    onClick={() => remove(tag)}
                  >
                    <X size={13} />
                  </button>
                )}
              </li>
            ) : null;
          })}
        </ul>
      )}
      {!disabled ? (
        <div
          className="property-search"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null))
              setOpen(false);
          }}
        >
          <div className="property-search-input">
            <Search size={16} aria-hidden="true" />
            <input
              ref={inputRef}
              id={`${id}-input`}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={expanded}
              aria-controls={expanded ? `${id}-list` : undefined}
              aria-activedescendant={
                expanded && matches.length
                  ? `${id}-option-${activeIndex}`
                  : undefined
              }
              aria-describedby={`${id}-help`}
              placeholder="Search property tags…"
              value={query}
              autoComplete="off"
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setOpen(true);
                  setActive(
                    !expanded
                      ? 0
                      : (activeIndex +
                          (e.key === "ArrowDown" ? 1 : -1) +
                          matches.length) %
                          Math.max(1, matches.length),
                  );
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (expanded && matches[activeIndex])
                    add(matches[activeIndex]);
                  else setOpen(true);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                }
              }}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear property search"
                onClick={() => {
                  setQuery("");
                  setActive(0);
                  setOpen(true);
                  inputRef.current?.focus();
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
          {expanded && (
            <div className="property-suggestions-panel">
              <div className="property-search-caption">
                {matches.length
                  ? `${matches.length} ${matches.length === 1 ? "property" : "properties"} · choose what applies`
                  : "No matching tags"}
              </div>
              <ul
                id={`${id}-list`}
                role="listbox"
                aria-label="Property suggestions"
              >
                {matches.map((tag, i) => (
                  <li
                    key={tag.id}
                    id={`${id}-option-${i}`}
                    ref={(element) => {
                      optionRefs.current[i] = element;
                    }}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => add(tag)}
                  >
                    <span>{tag.label}</span>
                    <small>{tag.description}</small>
                  </li>
                ))}
              </ul>
              {!matches.length && (
                <p className="property-no-match">
                  {searchPropertyTags(query).some((tag) =>
                    selected.includes(tag.id),
                  )
                    ? "That property is already selected."
                    : "Try a property such as “even”, “bounded”, “one-to-one”, or “period”."}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        selected.length === 0 && (
          <p className="no-selected-properties">No properties selected.</p>
        )
      )}
      <p id={`${id}-help`} className="property-picker-help">
        {disabled
          ? "These are the properties you submitted."
          : "Search and select tags. Only selected tags are submitted; correctness is checked with your answer."}
      </p>
      <span className="visually-hidden" role="status">
        {announcement}
      </span>
    </section>
  );
}
