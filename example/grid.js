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
    var n = Math.floor(N/t*j)
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

var height = Math.ceil(Math.log2(N+1))
;(function split (grid, dim, count, axis) {
  if (dim[0] * dim[1] <= 1) return
  if (count === 0) return
  var sum = 0
  var offaxis = (axis+1)%2
  var c0 = 0, c1 = 0
  for (var i = 0; i < dim[axis]; i++) {
    for (var j = 0; j < dim[offaxis]; j++) {
      sum += grid[i*(axis?1:t)+j*(axis?t:1)]
    }
    c1 = sum
    if (sum > count/2) break
    c0 = sum
  }
  var cut = i
  var leftDim = axis ? [cut,dim[1]] : [dim[0],cut]
  var rightDim = axis ? [dim[0]-cut,dim[1]] : [dim[0],dim[1]-cut]

  console.log('L',leftDim,'R',rightDim)
  var left = new Array(leftDim[0]*leftDim[1]).fill(0)
  var right = new Array(rightDim[0]*rightDim[1]).fill(0)
  for (var i = 0; i < cut; i++) {
    for (var j = 0; j < dim[offaxis]; j++) {
      var g = grid[i*(axis?1:t)+j*(axis?t:1)]
      left[i*(axis?1:t)+j*(axis?t:1)] = g
    }
  }
  for (; i < dim[axis]; i++) {
    for (var j = 0; j < dim[offaxis]; j++) {
      var g = grid[i*(axis?1:t)+j*(axis?t:1)]
      right[(i-cut)*(axis?1:t)+j*(axis?t:1)] = g
    }
  }
  console.log(dim, grid)
  /*
  var mid = rows[sorted[axis][Math.floor(count/2)]][axis]
  for (var j = 0; j < dim[offaxis]; j++) {
    //console.log(cut,j)
  }
  */

  for (var c = c0; c < c1; c++) {
    var n = sorted[axis][c]
    var i = Math.floor(n/N*t)
    /*
    if (rows[n][axis] < mid) {
      //console.log('L',rows[n])
    } else {
      //console.log('R',rows[n])
      //right[cut*(axis?1:t)+i*(axis?t:1)] = 
    }
    */
  }
  var leftCount = 0
  var rightCount = 0
  for (var i = 0; i < left.length; i++) leftCount += left[i]
  for (var i = 0; i < right.length; i++) rightCount += right[i]

  split(left, leftDim, leftCount, offaxis)
  split(right, rightDim, rightCount, offaxis)
})(grid, [t,t], N, 0)

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
