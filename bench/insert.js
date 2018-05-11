var raf = require('random-access-file')
var randombytes = require('crypto').randomBytes
var tmpdir = require('os').tmpdir()
var path = require('path')

var dir = path.join(tmpdir,'umbkd-'+randombytes(4).toString('hex'))
require('mkdirp').sync(dir)
console.log(dir)

function storage (name, cb) { cb(null,raf(path.join(dir,name))) }

var bkd = require('../')(storage, {
  branchFactor: Number(process.argv[2])
})

var N = Number(process.argv[3])
var M = Number(process.argv[4])

var batches = []
for (var i = 0; i < N; i++) {
  var batch = []
  for (var j = 0; j < M; j++) {
    var x = Math.random()*2-1
    var y = Math.random()*2-1
    batch.push([x,y,i+1]) // float32, float32, uint32
  }
  batches.push(batch)
}

var start = Date.now()
;(function next (i) {
  if (i === batches.length) return finish()
  bkd.batch(batches[i], function (err) {
    if (err) console.error(err)
    else next(i+1)
  })
})(0)

function finish () {
  console.log(Date.now()-start)
}
