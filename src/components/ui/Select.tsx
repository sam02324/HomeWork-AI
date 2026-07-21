'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  placeholder?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** Branded listbox that avoids operating-system select menus while preserving form values. */
export function Select({
  id,
  name,
  value,
  defaultValue = '',
  options,
  placeholder = 'Select an option',
  onValueChange,
  disabled = false,
  className,
  ariaLabel,
}: SelectProps) {
  const generatedId = useId().replaceAll(':', '');
  const controlId = id ?? `select-${generatedId}`;
  const listboxId = `${controlId}-listbox`;
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = controlled ? value : internalValue;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 190,
    above: false,
  });

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue]
  );

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePress(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function closeOnViewportChange() {
      setOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsidePress);
    window.addEventListener('resize', closeOnViewportChange);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      window.removeEventListener('resize', closeOnViewportChange);
    };
  }, [open]);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const estimatedHeight = Math.min(options.length * 38 + 10, 290);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const above = spaceBelow < Math.min(estimatedHeight, 180) && rect.top > spaceBelow;
      const width = Math.min(Math.max(rect.width, 190), window.innerWidth - 16);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const top = above
        ? Math.max(8, rect.top - estimatedHeight - 7)
        : Math.min(rect.bottom + 7, window.innerHeight - 48);
      setMenuPosition({ top, left, width, above });
    }

    const selectedIndex = options.findIndex(
      (option) => option.value === selectedValue && !option.disabled
    );
    const firstEnabled = options.findIndex((option) => !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled);
    setOpen(true);
  }

  function choose(nextValue: string) {
    if (!controlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  function moveActive(direction: 1 | -1) {
    if (!options.length) return;

    let next = activeIndex;
    for (let checked = 0; checked < options.length; checked += 1) {
      next = (next + direction + options.length) % options.length;
      if (!options[next]?.disabled) {
        setActiveIndex(next);
        return;
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openMenu();
      else moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(options.findIndex((option) => !option.disabled));
      return;
    }

    if (event.key === 'End' && open) {
      event.preventDefault();
      for (let index = options.length - 1; index >= 0; index -= 1) {
        if (!options[index]?.disabled) {
          setActiveIndex(index);
          break;
        }
      }
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      const active = options[activeIndex];
      if (active && !active.disabled) choose(active.value);
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ''}`}>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <motion.button
        ref={buttonRef}
        id={controlId}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? `${controlId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={handleKeyDown}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      >
        <span className={selectedOption ? styles.value : styles.placeholder}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={styles.chevron} size={16} aria-hidden="true" />
      </motion.button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              id={listboxId}
              className={styles.menu}
              role="listbox"
              aria-labelledby={controlId}
              style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
              initial={{ opacity: 0, y: menuPosition.above ? 6 : -6, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: menuPosition.above ? 4 : -4, scale: 0.99 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.options}>
                {options.map((option, index) => {
                  const selected = option.value === selectedValue;
                  const active = index === activeIndex;
                  return (
                    <button
                      key={`${option.value}-${index}`}
                      id={`${controlId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={option.disabled}
                      className={`${styles.option} ${active ? styles.optionActive : ''}`}
                      onPointerMove={() => !option.disabled && setActiveIndex(index)}
                      onClick={() => choose(option.value)}
                    >
                      <span>{option.label}</span>
                      {selected && <Check size={15} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
