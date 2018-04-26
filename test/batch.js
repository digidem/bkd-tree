var test = require('tape')
var approxEq = require('approximately-equal')
var umkd = require('../')

test('batch', function (t) {
  var N = 100
  var bkd = umkd(null, { branchFactor: 4 })
  var batch = []
  for (var i = 0; i < N; i++) {
    var x = Math.random()*2-1
    var y = Math.random()*2-1
    batch.push([x,y,i+1]) // float32, float32, uint32
  }
  var bbox = [-0.9,-0.7,-0.2,-0.1]
  var expected = batch.filter(function (b) {
    return b[0] > bbox[0] && b[0] < bbox[2]
      && b[1] > bbox[1] && b[1] < bbox[3]
  })
  t.plan(3+expected.length*2)

  bkd.batch(batch, function (err) {
    t.error(err)
    bkd.query(bbox, function (err, values) {
      t.error(err)
      var ids = values.map(function (p) { return p[2] }).sort()
      var exids = expected.map(function (p) { return p[2] }).sort()
      console.log(values.sort(cmp))
      console.log('---')
      console.log(expected.sort(cmp))
      t.deepEqual(ids, exids, 'ids match')
      expected.sort(cmp)
      values.sort(cmp)
      for (var i = 0; i < Math.max(values.length, expected.length); i++) {
        var v = values[i] || [null,null]
        var e = expected[i] || [null,null]
        t.ok(approxEq(v[0],e[0],0.0001),i+' x')
        t.ok(approxEq(v[1],e[1],0.0001),i+' y')
      }
    })
  })
})

function cmp (a, b) { return a[2] < b[2] ? -1 : +1 }
