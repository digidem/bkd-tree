module.exports = function (buffer, opts) {
  var parse = opts.parse
  var size = opts.size
  var rows = []
  for (var offset = 0; offset < buffer.length; offset += size) {
    var p = parse(buffer, offset)
    if (p) rows.push(p)
  }
  return rows
}
