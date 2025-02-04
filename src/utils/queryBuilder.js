/**
 * Builds a Mango query for CouchDB based on provided filters.
 *
 * The function creates a query object that can be used with CouchDB's Mango interface.
 * It constructs a "selector" with the following optional properties:
 * - `id`: Filters events whose id is in the provided array.
 * - `pubkey`: Filters events whose pubkey (author) is in the provided array.
 * - `kind`: Filters events whose kind is in the provided array.
 * - `created_at`: Applies a range filter using "$gte" for the "since" value and "$lte" for the "until" value.
 *
 * The returned query object also includes a descending sort on `created_at` and limits the result set to 1000 documents.
 *
 * @param {Object} filters - An object containing filter parameters.
 * @param {string[]} [filters.ids] - Array of event IDs to filter on.
 * @param {string[]} [filters.authors] - Array of author public keys to filter on.
 * @param {number[]} [filters.kinds] - Array of event kinds to filter on.
 * @param {number} [filters.since] - Minimum creation timestamp (inclusive).
 * @param {number} [filters.until] - Maximum creation timestamp (inclusive).
 * @returns {Object} A Mango query object with "selector", "sort", and "limit" properties.
 */
export function buildFilterQuery(filters) {
  const selector = {};

  if (filters.ids && filters.ids.length > 0) {
    selector.id = { "$in": filters.ids };
  }

  if (filters.authors && filters.authors.length > 0) {
    selector.pubkey = { "$in": filters.authors };
  }

  if (filters.kinds && filters.kinds.length > 0) {
    selector.kind = { "$in": filters.kinds };
  }

  if (filters.since || filters.until) {
    selector.created_at = {};
    if (filters.since) {
      selector.created_at["$gte"] = filters.since;
    }
    if (filters.until) {
      selector.created_at["$lte"] = filters.until;
    }
  }

  const query = {
    selector,
    // sort: [{ created_at: "desc" }],
    limit: 1000
  };

  return query;
}

/**
 * Compiles a Mango query's selector into a fast matching function.
 *
 * Given a Mango query object (as produced by buildFilterQuery), this function returns
 * a matcher function that accepts a document and returns true if the document satisfies
 * the query's conditions, and false otherwise.
 *
 * The matcher checks:
 *   - If `selector.id` is specified, the document's `id` must be in the allowed list.
 *   - If `selector.pubkey` is specified, the document's `pubkey` must be in the allowed list.
 *   - If `selector.kind` is specified, the document's `kind` must be in the allowed list.
 *   - If `selector.created_at` has a `$gte` and/or `$lte`, the document's `created_at`
 *     must fall within that range.
 *
 * @param {Object} query - A Mango query object with a "selector" property.
 * @returns {Function} A function that takes a document and returns true if it matches, false otherwise.
 */
export function compileMatcher(query) {
  const s = query.selector || {};

  // Pre-convert $in arrays to Sets for fast membership tests.
  const idSet = s.id && s.id.$in ? new Set(s.id.$in) : null;
  const pubkeySet = s.pubkey && s.pubkey.$in ? new Set(s.pubkey.$in) : null;
  const kindSet = s.kind && s.kind.$in ? new Set(s.kind.$in) : null;
  const gte = s.created_at && s.created_at.$gte;
  const lte = s.created_at && s.created_at.$lte;

  return function(doc) {
    if (idSet && !idSet.has(doc.id)) return false;
    if (pubkeySet && !pubkeySet.has(doc.pubkey)) return false;
    if (kindSet && !kindSet.has(doc.kind)) return false;
    if (gte !== undefined && doc.created_at < gte) return false;
    if (lte !== undefined && doc.created_at > lte) return false;
    return true;
  };
}
