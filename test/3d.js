var test = require('tape')
var approxEq = require('approximately-equal')
var umkd = require('../')
var ram = require('random-access-memory')

function storage (name, cb) { cb(null, ram()) }

test('3d', function (t) {
  var N = 5000
  var bkd = umkd(storage, {
    branchFactor: 4,
    type: {
      point: ['float32be','float32be','float32be'],
      value: ['uint32be']
    }
  })
  var batch = []
  for (var i = 0; i < N; i++) {
    var x = Math.random()*2-1
    var y = Math.random()*2-1
    var z = Math.random()*2-1
    batch.push({ point: [x,y,z], value: [i+1] })
  }
  var searches = [
    [-0.9,-0.7,-0.5,-0.8,-0.5,+0.5],
    [+0.5,+0.6,-0.9,+0.6,+0.7,+0.1],
    [+0.1,+0.1,-0.8,+0.2,+0.2,-0.1]
  ]
  var expected = searches.map(function (q) {
    return batch.filter(function (b) {
      return b.point[0] >= q[0] && b.point[0] <= q[3]
        && b.point[1] >= q[1] && b.point[1] <= q[4]
        && b.point[2] >= q[2] && b.point[2] <= q[5]
    })
  })
  var plan = 1
  expected.forEach(function (x) {
    plan += 2 + 3 * x.length
  })
  t.plan(plan)

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
          var v = values[j] || { point: [null,null,null], value: null }
          var e = expected[i][j] || { point: [null,null,null], value: null }
          t.ok(approxEq(v.point[0],e.point[0],0.0001),
            i+' x: ' + v.point[0] + ' cmp ' + e.point[0])
          t.ok(approxEq(v.point[1],e.point[1],0.0001),
            i+' y: ' + v.point[1] + ' cmp ' + e.point[1])
          t.ok(approxEq(v.point[2],e.point[2],0.0001),
            i+' z: ' + v.point[2] + ' cmp ' + e.point[2])
        }
      })
    })
  })
})

function cmp (a, b) { return a.value < b.value ? -1 : +1 }
