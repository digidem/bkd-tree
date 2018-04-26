var test = require('tape')
var approxEq = require('approximately-equal')
var ram = require('random-access-memory')
var umkd = require('../')

function storage (name, cb) { cb(null, ram()) }

test('deep', function (t) {
  var N = 50000
  var bkd = umkd(storage, { branchFactor: 4 })
  var batch = []
  for (var i = 0; i < N; i++) {
    var x = Math.random()*2-1
    var y = Math.random()*2-1
    batch.push([x,y,i+1]) // float32, float32, uint32
  }
  var searches = [
    [-0.5,-0.8,-0.45,-0.75]
  ]
  var expected = searches.map(function (q) {
    return batch.filter(function (b) {
      return b[0] > q[0] && b[0] < q[2]
        && b[1] > q[1] && b[1] < q[3]
    })
  })
  t.plan(1 + expected.length*2
    + expected.reduce(function (sum,x) { return sum+x.length },0)*2)

  bkd.batch(batch, function (err) {
    t.error(err)
    searches.forEach(function (bbox,i) {
      bkd.query(bbox, function (err, values) {
        t.error(err)
        var ids = values.map(function (p) { return p[2] }).sort()
        var exids = expected[i].map(function (p) { return p[2] }).sort()
        t.deepEqual(ids, exids, 'ids match')
        expected[i].sort(cmp)
        values.sort(cmp)
        for (var j = 0; j < Math.max(values.length,expected.length); j++) {
          var v = values[j] || [null,null]
          var e = expected[i][j] || [null,null]
          t.ok(approxEq(v[0],e[0],0.0001),i+' x')
          t.ok(approxEq(v[1],e[1],0.0001),i+' y')
        }
      })
    })
  })
})

function cmp (a, b) { return a[2] < b[2] ? -1 : +1 }
