/** Build a LIKE pattern that matches `value` anywhere, escaping %, _ and \ in the input. */
function containsPattern(value) {
  return `%${String(value).replace(/[\\%_]/g, '\\$&')}%`;
}

module.exports = { containsPattern };
