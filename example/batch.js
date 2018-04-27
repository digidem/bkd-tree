var ram = require('random-access-memory')
function storage (name, cb) { cb(null,ram()) }

var bkd = require('../')(storage, {
  branchFactor: Number(process.argv[2])
})

var N = Number(process.argv[3])
var batch = []
for (var i = 0; i < N; i++) {
  var x = Math.random()*2-1
  var y = Math.random()*2-1
  batch.push([x,y,i+1]) // float32, float32, uint32
}

bkd.batch(batch, function (err) {
  if (err) console.error(err)
  var bbox = process.argv.slice(4).map(Number)
  bkd.query(bbox, function (err, values) {
    if (err) console.error(err)
    else console.log(values)
  })
})
