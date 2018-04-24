module.exports = function build (rows, opts) {
  var B = opts.branchFactor
  var fB = Math.floor(B/2)
  var cB = Math.ceil(B/2)
  //var buffer = Buffer.alloc(opts.size*rows.length)
  var result = []
  ;(function walk (rows, depth, index) {
    if (rows.length === 1) {
      if (result[index] !== undefined) {
        throw new Error('writing to already-allocated sector ' + index)
      }
      result[index] = rows[0]
    }
    if (rows.length <= 1) return
    var axis = depth % 2
    rows.sort(function (a, b) {
      return a[axis] < b[axis] ? -1 : +1
    })
    var step = (rows.length) / B
    var j = 0, k = 0, n = 0
    var pk = -1
    var subi, subrows
    for (var i = step; i < rows.length; i += step) {
      k = Math.floor(i)
      if (k === pk) break
      pk = k
      if (result[index+n] !== undefined) {
        throw new Error('writing to already-allocated sector ' + (index+n))
      }
      result[index+n] = rows[k]
      subrows = rows.slice(j,k)
      subi = calcIx(index,n)
      walk(subrows, depth+1, subi)
      j = k + 1
      n++
    }
    subrows = rows.slice(j,rows.length)
    subi = calcIx(index,n)
    walk(subrows, depth+1, subi)
  })(rows, 0, 0)
  return result

  function calcIx (index, n) {
    return index*(B) + (B-1)*(n+1)
  }
}
