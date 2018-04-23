var M = 4+4+4
var B = 4
var N = 12
var fB = Math.floor(B/2)
var cB = Math.ceil(B/2)

var rows = []
for (var i = 0; i < N; i++) {
  var x = Math.random()*2-1
  var y = Math.random()*2-1
  rows.push([x,y,i]) // float32, float32, uint32
}
build(rows, 0)

function build (rows, depth) {
  //var buffer = Buffer.alloc(M*rows.length)
  var result = []
  ;(function walk (rows, depth, index) {
    if (rows.length === 1) {
      if (result[index*B+0] !== undefined) {
        throw new Error('writing to already-allocated sector ' + index*B)
      }
      result[index*B+0] = rows[0]
      //console.log('set',index*B+0)
    }
    if (rows.length <= 1) return
    var axis = depth % 2
    rows.sort(function (a, b) {
      return a[axis] < b[axis] ? -1 : +1
    })
    var n = Math.floor(rows.length/2)
    for (var i = 0; i < B; i++) {
      var j = n+i-fB
      if (j < 0 || j >= rows.length) {
        result[index*B+i] = null
      } else {
        //console.log('SET',index*B+i)
        if (result[index*B+i] !== undefined) {
          throw new Error('writing to already-allocated sector '
            + (index*B+i))
        }
        result[index*B+i] = rows[j]
      }
    }
    var lowN = Math.max(0,n-fB)
    var hiN = Math.min(rows.length,n+cB)
    var left = rows.slice(0,lowN)
    var right = rows.slice(hiN)
    walk(left, depth+1, index*2+1)
    walk(right, depth+1, index*2+2)
  })(rows, 0, 0)
  for (var i = 0; i < result.length; i++) {
    console.log(i, result[i])
  }
}
