var raf = require('random-access-file')
var randombytes = require('crypto').randomBytes
var tmpdir = require('os').tmpdir()
var path = require('path')

var dir = process.argv[2]

function storage (name, cb) { cb(null,raf(path.join(dir,name))) }

var bkd = require('../')(storage, {
  branchFactor: Number(process.argv[3]),
  type: {
    point: [ 'float32be', 'float32be' ],
    value: [ 'uint32be' ]
  }
})

var bbox = process.argv.slice(4).map(Number)

var start = Date.now()
bkd.query(bbox, function (err, rows) {
  console.log(Date.now()-start)
  console.log(rows.length)
})
