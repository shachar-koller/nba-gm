function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validate the ESPN page shape before accepting an HTTP 200 response. Throwing
 * from this function inside `fetchJsonWithRetry` causes the complete request,
 * JSON parse, and semantic-validation unit to be retried.
 */
export function validateEspnStatsPage(
  data,
  { page = 1, requirePagination = page === 1, requireCategories = page === 1 } = {}
) {
  const label = `ESPN stats page ${page}`;
  if (!isObject(data)) throw new Error(`${label} must be an object`);

  if (requirePagination) {
    const pages = Number(data.pagination?.pages);
    if (!Number.isInteger(pages) || pages < 1 || pages > 100) {
      throw new Error(
        `${label} has an invalid pagination page count: ${String(data.pagination?.pages)}`
      );
    }
  }

  if (requireCategories) {
    if (!Array.isArray(data.categories) || data.categories.length === 0) {
      throw new Error(`${label} must include categories`);
    }
    for (const category of data.categories) {
      if (
        typeof category?.name !== "string" ||
        !Array.isArray(category?.names) ||
        category.names.length === 0
      ) {
        throw new Error(`${label} contains an invalid category definition`);
      }
    }
  }

  if (!Array.isArray(data.athletes) || data.athletes.length === 0) {
    throw new Error(`${label} must include athletes`);
  }
  for (const [index, row] of data.athletes.entries()) {
    const athlete = row?.athlete;
    const athleteName =
      athlete?.displayName ||
      `${athlete?.firstName || ""} ${athlete?.lastName || ""}`.trim();
    if (!isObject(athlete) || athlete.id == null || !athleteName) {
      throw new Error(`${label} athlete ${index + 1} is missing identity fields`);
    }
    if (!Array.isArray(row.categories) || row.categories.length === 0) {
      throw new Error(`${label} athlete ${index + 1} is missing stat categories`);
    }
    for (const category of row.categories) {
      if (
        typeof category?.name !== "string" ||
        !Array.isArray(category?.values) ||
        category.values.length === 0
      ) {
        throw new Error(`${label} athlete ${index + 1} has an invalid stat category`);
      }
    }
  }

  return data;
}
