var M = 4+4+4
var N = 32

var rows = []
for (var i = 0; i < N; i++) {
  var x = Math.random()*2-1
  var y = Math.random()*2-1
  rows.push([x,y,i]) // float32, float32, uint32
}
var indexes = []
for (var i = 0; i < N; i++) {
  indexes.push(i)
}

var sorted = [
  indexes.slice().sort(function (a, b) {
    return rows[a][0] < rows[b][0] ? -1 : +1
  }),
  indexes.slice().sort(function (a, b) {
    return rows[a][1] < rows[b][1] ? -1 : +1
  })
]

var t = 4
var pivots = []
for (var i = 0; i < 2; i++) {
  pivots[i] = []
  for (var j = 1; j < t; j++) {
    var n = N/t*j
    pivots[i][j-1] = rows[sorted[i][n]][i]
  }
}
var grid = []
for (var i = 0; i < t; i++) {
  for (var j = 0; j < t; j++) {
    grid.push(0)
  }
}

for (var i = 0; i < N; i++) {
  for (var j = 0; j < t-1; j++) {
    if (rows[i][0] < pivots[0][j]) break
  }
  for (var k = 0; k < t-1; k++) {
    if (rows[i][1] < pivots[1][k]) break
  }
  grid[j*t+k]++
}
console.log(grid)

/*
var buf = Buffer.alloc(M*N)
var offset = 0
for (var i = 0; i < N; i++) {
  var row = rows[i]
  for (var j = 0; j < ; j++) {
    row[j]
  }
  buf.writeFloat32BE(row[0],offset+0)
  buf.writeFloat32BE(row[1],offset+4)
  buf.writeUInt32BE(row[2],offset+8)
  offset += M
}
process.stdout.write(buf)
*/
