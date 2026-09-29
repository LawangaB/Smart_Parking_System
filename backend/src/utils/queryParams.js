/** "RESERVED, ACTIVE" -> ['RESERVED', 'ACTIVE'] (undefined when empty). Values are validated by the route validators. */
function parseStatusList(value) {
  if (!value) return undefined;
  const list = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}

module.exports = { parseStatusList };
