var test = require('tape')
var approxEq = require('approximately-equal')
var umkd = require('../')
var ram = require('random-access-memory')

function storage (name, cb) { cb(null, ram()) }

test('uint types', function (t) {
  var N = 5000
  var bkd = umkd(storage, {
    branchFactor: 4,
    type: {
      point: ['uint32le','uint32be'],
      value: ['uint8','uint16be','uint16le','uint32be','uint32le']
    }
  })
  var batch = []
  for (var i = 0; i < N; i++) {
    var x = Math.floor(Math.random()*200)
    var y = Math.floor(Math.random()*200)
    var value = [
      Math.floor(Math.random()*256),
      Math.floor(Math.random()*65536),
      Math.floor(Math.random()*65536),
      Math.floor(Math.random()*4294967296),
      Math.floor(Math.random()*4294967296)
    ]
    batch.push({ point: [x,y], value: value })
  }
  var searches = [
    [20,10,30,15]
  ]
  var expected = searches.map(function (q) {
    return batch.filter(function (b) {
      return b.point[0] >= q[0] && b.point[0] <= q[2]
        && b.point[1] >= q[1] && b.point[1] <= q[3]
    })
  })
  t.plan(1 + searches.length*3)

  bkd.batch(batch, function (err) {
    t.error(err)
    searches.forEach(function (bbox,i) {
      bkd.query(bbox, function (err, values) {
        console.log(values.length)
        t.error(err)
        t.deepEqual(
          values.sort(cmp).map(getPoint),
          expected[i].sort(cmp).map(getPoint),
          'compare points'
        )
        t.deepEqual(
          values.sort(cmp).map(getValue),
          expected[i].sort(cmp).map(getValue),
          'compare values'
        )
      })
    })
  })
})

function cmp (a, b) { return a.value[4] < b.value[4] ? -1 : +1 }
function getPoint (x) { return x.point }
function getValue (x) { return x.value }
