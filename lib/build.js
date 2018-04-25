module.exports = function build (rows, opts) {
  var B = opts.branchFactor
  var write = opts.write
  var fB = Math.floor(B/2)
  var cB = Math.ceil(B/2)
  ;(function walk (rows, depth, index) {
    if (rows.length === 1) {
      write(index, rows[0])
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
      write(index+n,rows[k])
      subrows = rows.slice(j,k)
      subi = calcIx(B,index,n)
      walk(subrows, depth+1, subi)
      j = k + 1
      n++
    }
    subrows = rows.slice(j,rows.length)
    subi = calcIx(B,index,n)
    walk(subrows, depth+1, subi)
  })(rows, 0, 0)
}

function calcIx (B, index, n) {
  return index*(B) + (B-1)*(n+1)
}
