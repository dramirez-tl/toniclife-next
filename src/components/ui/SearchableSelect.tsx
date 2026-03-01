'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronUpDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allLabel?: string;
  showAllOption?: boolean;
  allValue?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  allLabel = 'Todos',
  showAllOption = true,
  allValue = '',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const isAllSelected = value === allValue;
  const selectedOption = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, search]);

  // Build flat list of selectable values (including "all" if shown)
  const selectableItems = useMemo(() => {
    const items: { value: string; label: string }[] = [];
    if (showAllOption) {
      items.push({ value: allValue, label: allLabel });
    }
    items.push(...filtered);
    return items;
  }, [filtered, showAllOption, allLabel, allValue]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [filtered]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
        setHighlightIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-option-index]');
    const target = items[highlightIndex] as HTMLElement | undefined;
    target?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearch('');
    setHighlightIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
    setHighlightIndex(-1);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < selectableItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : selectableItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < selectableItems.length) {
          handleSelect(selectableItems[highlightIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearch('');
        setHighlightIndex(-1);
        break;
    }
  }, [isOpen, highlightIndex, selectableItems, handleSelect]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`flex items-center gap-2 w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
      >
        <span className={`flex-1 truncate ${isAllSelected && !selectedOption ? 'text-gray-500' : 'text-gray-900'}`}>
          {isAllSelected ? allLabel : selectedOption?.label || allLabel}
        </span>
        {showAllOption && !isAllSelected ? (
          <XMarkIcon
            className="h-4 w-4 text-gray-400 hover:text-gray-600 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onChange(allValue);
            }}
          />
        ) : (
          <ChevronUpDownIcon className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D] outline-none"
            />
          </div>

          {/* Options list */}
          <ul ref={listRef} className="max-h-60 overflow-y-auto py-1">
            {/* "All" option */}
            {showAllOption && (
              <li data-option-index={0}>
                <button
                  type="button"
                  onClick={() => handleSelect(allValue)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    highlightIndex === 0
                      ? 'bg-[#3E667D]/10 text-[#3E667D]'
                      : isAllSelected
                        ? 'bg-[#C8DDF2]/30 text-[#3E667D] font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {allLabel}
                </button>
              </li>
            )}

            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">Sin resultados</li>
            )}

            {filtered.map((option, idx) => {
              const itemIndex = showAllOption ? idx + 1 : idx;
              return (
                <li key={option.value} data-option-index={itemIndex}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      highlightIndex === itemIndex
                        ? 'bg-[#3E667D]/10 text-[#3E667D]'
                        : value === option.value
                          ? 'bg-[#C8DDF2]/30 text-[#3E667D] font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
