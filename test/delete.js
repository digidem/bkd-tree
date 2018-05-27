var test = require('tape')
var approxEq = require('approximately-equal')
var umkd = require('../')
var ram = require('random-access-memory')

function storage (name, cb) { cb(null, ram()) }

test('delete', function (t) {
  var N = 5000
  var bkd = umkd(storage, {
    branchFactor: 4,
    type: {
      point: ['float32be','float32be'],
      value: ['uint32be']
    },
    compare: function (a, b) {
      return a.value[0] === b.value[0]
    }
  })
  var inserts = []
  var inserted = {}
  for (var i = 0; i < N; i++) {
    var x = Math.random()*2-1
    var y = Math.random()*2-1
    inserted[i] = [x,y]
    inserts.push({ type: 'insert', point: [x,y], value: [i] })
  }
  var deletes = []
  var deleted = {}
  for (var i = 0; i < N; i+=4) {
    deleted[i] = true
    deletes.push({ type: 'delete', point: inserted[i].slice(), value: [i] })
  }

  var searches = [
    [-0.9,-0.7,-0.8,-0.5],
    [+0.5,+0.6,+0.6,+0.7],
    [+0.1,+0.1,+0.2,+0.2]
  ]
  var expected = searches.map(function (q) {
    return inserts.filter(function (b) {
      if (deleted[b.value[0]]) return false
      return b.point[0] > q[0] && b.point[0] < q[2]
        && b.point[1] > q[1] && b.point[1] < q[3]
    })
  })
  t.plan(2 + expected.length*2
    + expected.reduce(function (sum,x) { return sum+x.length },0)*2)

  bkd.batch(inserts, function (err) {
    t.error(err)
    bkd.batch(deletes, function (err) {
      t.error(err)
      check()
    })
  })
  function check () {
    searches.forEach(function (bbox,i) {
      bkd.query(bbox, function (err, values) {
        t.error(err)
        var ids = values.map(function (p) { return p.value[0] }).sort()
        var exids = expected[i].map(function (p) { return p.value[0] }).sort()
        t.deepEqual(ids, exids, 'ids match')
        expected[i].sort(cmp)
        values.sort(cmp)
        for (var j = 0; j < Math.max(values.length,expected[i].length); j++) {
          var v = values[j] || { point: [null,null], value: null }
          var e = expected[i][j] || { point: [null,null], value: null }
          t.ok(approxEq(v.point[0],e.point[0],0.0001),i+' x')
          t.ok(approxEq(v.point[1],e.point[1],0.0001),i+' y')
        }
      })
    })
  }
})

function cmp (a, b) { return a.value < b.value ? -1 : +1 }
