var raf = require('random-access-file')
var randombytes = require('crypto').randomBytes
var tmpdir = require('os').tmpdir()
var path = require('path')
var argv = require('minimist')(process.argv)

var dir = path.join(tmpdir,'umbkd-'+randombytes(4).toString('hex'))
require('mkdirp').sync(dir)
console.log(dir)

function storage (name, cb) { cb(null,raf(path.join(dir,name))) }

var bkd = require('../')(storage, {
  branchFactor: argv.branchFactor,
  levels: argv.levels,
  type: {
    point: [ 'float32be', 'float32be' ],
    value: [ 'uint32be' ]
  }
})

var N = argv.n
var M = argv.batchSize

var batches = []
for (var i = 0; i < N; i++) {
  var batch = []
  for (var j = 0; j < M; j++) {
    var x = Math.random()*2-1
    var y = Math.random()*2-1
    batch.push({ point: [x,y], value: [i+1] })
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
