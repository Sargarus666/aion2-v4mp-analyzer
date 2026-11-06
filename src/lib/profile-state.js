const INFO_SECTIONS = ["profile", "stat", "daevanion", "title", "ranking"];
const EQUIPMENT_SECTIONS = ["equipment", "skill", "arcana", "petwing"];

export function mergeProfileSnapshot(previous, next, failedEndpoints = [], warnings = [], fetchedAt = null) {
  const incoming = next && typeof next === "object" ? next : {};
  const prior = previous && typeof previous === "object" ? previous : null;
  const failed = new Set(Array.isArray(failedEndpoints) ? failedEndpoints : []);
  const merged = { ...(prior || {}), ...incoming };
  const staleSections = [];

  const preserve = (endpoint, sections) => {
    if (!failed.has(endpoint) || !prior) return;
    for (const section of sections) {
      if (Object.prototype.hasOwnProperty.call(prior, section)) {
        merged[section] = prior[section];
        staleSections.push(section);
      }
    }
  };

  preserve("info", INFO_SECTIONS);
  preserve("equipment", EQUIPMENT_SECTIONS);

  merged._partial = failed.size > 0 || (Array.isArray(warnings) && warnings.length > 0);
  merged._warnings = Array.isArray(warnings) ? warnings : [];
  merged._staleSections = staleSections;
  merged._fetchedAt = fetchedAt || new Date().toISOString();
  merged._lastCompleteAt = merged._partial ? prior?._lastCompleteAt || null : merged._fetchedAt;

  return merged;
}
