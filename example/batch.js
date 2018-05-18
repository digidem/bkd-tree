var ram = require('random-access-memory')
function storage (name, cb) { cb(null,ram()) }

var bkd = require('../')(storage, {
  branchFactor: 4,
  type: {
    point: [ 'float32be', 'float32be' ],
    value: [ 'uint32be' ]
  }
})

var N = 5000
var batch = []
for (var i = 0; i < N; i++) {
  var x = Math.random()*2-1
  var y = Math.random()*2-1
  batch.push({ point: [x,y], value: [i+1] })
}

var bbox = [-0.5,-0.9,-0.4,-0.85]

bkd.batch(batch, function (err) {
  if (err) console.error(err)
  bkd.query(bbox, function (err, values) {
    if (err) console.error(err)
    else console.log(values)
  })
})
