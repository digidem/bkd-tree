var M = 4+4+4
var N = 31

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
      result[index] = rows[0]
    }
    if (rows.length <= 1) return
    var axis = depth % 2
    rows.sort(function (a, b) {
      return a[axis] < b[axis] ? -1 : +1
    })
    var n = Math.floor(rows.length/2)
    result[index] = rows[n]
    var left = rows.slice(0,n)
    var right = rows.slice(n+1)
    walk(left, depth+1, index*2+1)
    walk(right, depth+1, index*2+2)
  })(rows, 0, 0)
  console.log(result)
}
