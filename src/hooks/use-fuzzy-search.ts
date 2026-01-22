import { useMemo, useState, useCallback, useEffect, useRef } from 'react'

/**
 * Calculates Levenshtein distance between two strings
 * Optimized with early termination for better performance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length

  // Early termination for empty strings
  if (m === 0) return n
  if (n === 0) return m

  // Use single array for memory optimization
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array(n + 1)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        curr[j] = prev[j - 1]
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
      }
    }
    ;[prev, curr] = [curr, prev]
  }

  return prev[n]
}

/**
 * Calculate similarity percentage between two strings
 * Returns a value between 0 and 100
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1)
  const s2 = normalizeText(str2)

  if (s1 === s2) return 100
  if (s1.length === 0 || s2.length === 0) return 0

  // Check if one string contains the other (prefix/substring matching)
  if (s1.includes(s2) || s2.includes(s1)) {
    // Give higher score for prefix matches
    if (s1.startsWith(s2) || s2.startsWith(s1)) {
      return 95
    }
    return 85
  }

  // Check word-by-word matching for multi-word searches
  const words1 = s1.split(/\s+/)
  const words2 = s2.split(/\s+/)

  // If searching for multiple words, check if all search words are found
  if (words2.length > 1) {
    const allWordsFound = words2.every(searchWord =>
      words1.some(targetWord => targetWord.includes(searchWord) || searchWord.includes(targetWord))
    )
    if (allWordsFound) return 80
  }

  // Fall back to Levenshtein for fuzzy matching
  const maxLen = Math.max(s1.length, s2.length)
  const distance = levenshteinDistance(s1, s2)
  return Math.round((1 - distance / maxLen) * 100)
}

/**
 * Normalize text for comparison (remove accents, lowercase, trim)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export interface FuzzySearchOptions<T> {
  /** Array of items to search through */
  items: T[]
  /** Keys to search in each item (supports nested keys with dot notation) */
  keys: (keyof T | string)[]
  /** Minimum similarity threshold (0-100, default: 40) */
  threshold?: number
  /** Debounce delay in milliseconds (default: 150) */
  debounceMs?: number
}

export interface FuzzySearchResult<T> {
  /** The original item */
  item: T
  /** Similarity score (0-100) */
  score: number
  /** The key that matched best */
  matchedKey: string
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split('.')
  let value: unknown = obj
  for (const key of keys) {
    if (value === null || value === undefined) return ''
    value = (value as Record<string, unknown>)[key]
  }
  return String(value ?? '')
}

/**
 * Hook for fuzzy searching with debounce and instant feedback
 *
 * @example
 * ```tsx
 * const { query, setQuery, results, isSearching } = useFuzzySearch({
 *   items: providers,
 *   keys: ['name', 'email', 'nif'],
 *   threshold: 40,
 * })
 * ```
 */
export function useFuzzySearch<T>({
  items,
  keys,
  threshold = 40,
  debounceMs = 150,
}: FuzzySearchOptions<T>) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce the query updates
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (query.length === 0) {
      setDebouncedQuery('')
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query)
      setIsSearching(false)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [query, debounceMs])

  // Compute fuzzy search results
  const results = useMemo<FuzzySearchResult<T>[]>(() => {
    if (!debouncedQuery || debouncedQuery.length === 0) {
      return items.map(item => ({ item, score: 100, matchedKey: '' }))
    }

    const searchResults: FuzzySearchResult<T>[] = []

    for (const item of items) {
      let bestScore = 0
      let bestKey = ''

      for (const key of keys) {
        const value = getNestedValue(item, String(key))
        if (!value) continue

        const score = calculateSimilarity(value, debouncedQuery)
        if (score > bestScore) {
          bestScore = score
          bestKey = String(key)
        }
      }

      if (bestScore >= threshold) {
        searchResults.push({
          item,
          score: bestScore,
          matchedKey: bestKey,
        })
      }
    }

    // Sort by score descending
    return searchResults.sort((a, b) => b.score - a.score)
  }, [items, debouncedQuery, keys, threshold])

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
    setIsSearching(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return {
    /** Current search query */
    query,
    /** Set the search query */
    setQuery,
    /** Filtered and sorted results */
    results,
    /** Whether a search is pending (during debounce) */
    isSearching,
    /** Clear the search */
    clearSearch,
    /** Whether there's an active search */
    hasSearch: debouncedQuery.length > 0,
  }
}

/**
 * Utility function for one-off fuzzy filtering (non-hook version)
 * Useful for filtering in callbacks or outside React components
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  keys: (keyof T | string)[],
  threshold = 40
): FuzzySearchResult<T>[] {
  if (!query || query.length === 0) {
    return items.map(item => ({ item, score: 100, matchedKey: '' }))
  }

  const searchResults: FuzzySearchResult<T>[] = []

  for (const item of items) {
    let bestScore = 0
    let bestKey = ''

    for (const key of keys) {
      const value = getNestedValue(item, String(key))
      if (!value) continue

      const score = calculateSimilarity(value, query)
      if (score > bestScore) {
        bestScore = score
        bestKey = String(key)
      }
    }

    if (bestScore >= threshold) {
      searchResults.push({
        item,
        score: bestScore,
        matchedKey: bestKey,
      })
    }
  }

  return searchResults.sort((a, b) => b.score - a.score)
}

/**
 * Utility function for simple string fuzzy matching
 * Returns true if the target matches the search query above threshold
 */
export function fuzzyMatch(target: string, search: string, threshold = 40): boolean {
  if (!search || search.length === 0) return true
  if (!target) return false
  return calculateSimilarity(target, search) >= threshold
}

/**
 * Export similarity calculation for external use
 */
export { calculateSimilarity, normalizeText }
