var build = require('../lib/build.js')
var rows = []
var B = Number(process.argv[2])
var N = Number(process.argv[3])
for (var i = 0; i < N; i++) {
  var x = Math.random()*2-1
  var y = Math.random()*2-1
  rows.push([x,y,i]) // float32, float32, uint32
}

var n = Math.pow(B,Math.ceil(Math.log(rows.length+1)/Math.log(4)))-1
var buffer = Buffer.alloc(12*n)

build(rows, {
  branchFactor: B,
  write: function (index, pt) {
    buffer.writeFloatBE(pt[0], index*12+0)
    buffer.writeFloatBE(pt[1], index*12+4)
    buffer.writeUInt32BE(pt[2], index*12+8)
  }
})
process.stdout.write(buffer)
