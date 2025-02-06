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
 * The returned query object also includes a descending sort on { pubkey, created_at } and
 * limits the result set to 1000 documents (or filters.limit if provided).
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
  const conditions = [];

  if (filters.ids && filters.ids.length > 0) {
    if (filters.ids.length === 1) {
      conditions.push({ id: filters.ids[0] });
    } else {
      conditions.push({ "$or": filters.ids.map(id => ({ id })) });
    }
  }

  if (filters.authors && filters.authors.length > 0) {
    if (filters.authors.length === 1) {
      conditions.push({ pubkey: filters.authors[0] });
    } else {
      conditions.push({ "$or": filters.authors.map(author => ({ pubkey: author })) });
    }
  }

  if (filters.kinds && filters.kinds.length > 0) {
    if (filters.kinds.length === 1) {
      conditions.push({ kind: filters.kinds[0] });
    } else {
      conditions.push({ "$or": filters.kinds.map(kind => ({ kind })) });
    }
  }

  if (filters.since || filters.until) {
    const range = {};
    if (filters.since) {
      range["$gte"] = filters.since;
    }
    if (filters.until) {
      range["$lte"] = filters.until;
    }
    conditions.push({ created_at: range });
  }

  // Tag filter: for "#p"
  if (filters["#p"] && filters["#p"].length > 0) {
    // Use $elemMatch to require that tags array has an element where:
    // element[0] equals "p" and element[1] equals one of the provided values.
    // If one value, use direct equality; if multiple, use $in.
    const tagValueCondition =
      filters["#p"].length === 1 ? filters["#p"][0] : { "$in": filters["#p"] };
    conditions.push({
      tags: {
        "$elemMatch": { "0": "p", "1": tagValueCondition }
      }
    });
  }

  let selector;
  if (conditions.length === 1) {
    selector = conditions[0];
  } else if (conditions.length > 1) {
    selector = { "$and": conditions };
  } else {
    selector = {};
  }

  const query = {
    selector,
    sort: [{ pubkey: "desc" }, { created_at: "desc" }],
    limit: filters.limit || 1000
  };
  console.log('Generated selector query', JSON.stringify(query));

  return query;
}

/**
 * Helper function that returns a matcher function for a single filter value.
 * If the provided value is an array, the returned function will check that the value
 * is a member of that array. Otherwise, it tests for strict equality.
 *
 * @param {*} value - Either an array of allowed values or a single primitive value.
 * @returns {Function} A function that takes a value and returns true if it matches.
 */
function createFieldMatcherFromValue(value) {
  if (Array.isArray(value)) {
    const allowed = new Set(value);
    return (val) => allowed.has(val);
  }
  if (value !== undefined) {
    return (val) => val === value;
  }
  return () => true;
}

/**
 * Compiles an initial filter set (the same object passed to buildFilterQuery)
 * into a fast matching function.
 *
 * The matcher function tests a document against the original filter parameters:
 *   - If `filters.ids` is provided, then doc.id must equal one of the values.
 *   - If `filters.authors` is provided, then doc.pubkey must equal one of the values.
 *   - If `filters.kinds` is provided, then doc.kind must equal one of the values.
 *   - If `filters.since` and/or `filters.until` are provided, then doc.created_at must
 *     be within the specified range.
 *
 * @param {Object} filters - The initial filter set used to build the Mango query.
 * @returns {Function} A function that takes a document and returns true if it matches the filters.
 */
export function compileMatcher(filters) {
  const idMatcher = createFieldMatcherFromValue(filters.ids);
  const pubkeyMatcher = createFieldMatcherFromValue(filters.authors);
  const kindMatcher = createFieldMatcherFromValue(filters.kinds);
  const gte = filters.since;
  const lte = filters.until;

  // Create matcher for the "#p" tag filter.
  let tagPMatcher = () => true;
  if (filters["#p"] && filters["#p"].length > 0) {
    const allowedTagPubkeys = new Set(filters["#p"]);
    tagPMatcher = function(tags) {
      if (!Array.isArray(tags)) return false;
      // Return true if at least one tag is an array where:
      // - The first element is "p"
      // - The second element is one of the allowed values.
      return tags.some(tag =>
        Array.isArray(tag) &&
        tag[0] === "p" &&
        allowedTagPubkeys.has(tag[1])
      );
    };
  }


  return function(doc) {
    // doc names are transformed to the ones from couch
    if (!idMatcher(doc._id)) return false;
    if (!pubkeyMatcher(doc.pubkey)) return false;
    if (!kindMatcher(doc.kind)) return false;
    if (gte !== undefined && doc.created_at < gte) return false;
    if (lte !== undefined && doc.created_at > lte) return false;
    if (!tagPMatcher(doc.tags)) return false;
    return true;
  };
}
