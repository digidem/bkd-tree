var test = require('tape')
var approxEq = require('approximately-equal')
var ram = require('random-access-memory')
var umkd = require('../')

function storage (name, cb) { cb(null, ram()) }

test('deep', function (t) {
  var N = 50000
  var bkd = umkd(storage, {
    branchFactor: 4,
    type: {
      point: ['float32le','float32le'],
      value: ['uint32le']
    }
  })
  var batch = []
  for (var i = 0; i < N; i++) {
    var x = Math.random()*2-1
    var y = Math.random()*2-1
    batch.push({ point: [x,y], value: [i+1] })
  }
  var searches = [
    [-0.5,-0.8,-0.45,-0.75]
  ]
  var expected = searches.map(function (q) {
    return batch.filter(function (b) {
      return b.point[0] > q[0] && b.point[0] < q[2]
        && b.point[1] > q[1] && b.point[1] < q[3]
    })
  })
  t.plan(1 + expected.length*2
    + expected.reduce(function (sum,x) { return sum+x.length },0)*2)

  bkd.batch(batch, function (err) {
    t.error(err)
    searches.forEach(function (bbox,i) {
      bkd.query(bbox, function (err, values) {
        t.error(err)
        var ids = values.map(function (p) { return p.value[0] }).sort()
        var exids = expected[i].map(function (p) { return p.value[0] }).sort()
        t.deepEqual(ids, exids, 'ids match')
        expected[i].sort(cmp)
        values.sort(cmp)
        for (var j = 0; j < Math.max(values.length,expected[i].length); j++) {
          var v = values[j] || { point: [null,null] }
          var e = expected[i][j] || { point: [null,null] }
          t.ok(approxEq(v.point[0],e.point[0],0.0001),i+' x')
          t.ok(approxEq(v.point[1],e.point[1],0.0001),i+' y')
        }
      })
    })
  })
})

function cmp (a, b) { return a.value[0] < b.value[0] ? -1 : +1 }
