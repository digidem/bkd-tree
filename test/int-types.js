var test = require('tape')
var approxEq = require('approximately-equal')
var umkd = require('../')
var ram = require('random-access-memory')

function storage (name, cb) { cb(null, ram()) }

test('int types', function (t) {
  var N = 5000
  var bkd = umkd(storage, {
    branchFactor: 4,
    type: {
      point: ['int32le','int32be'],
      value: ['int8','int16be','int16le','int32be','int32le']
    }
  })
  var batch = []
  for (var i = 0; i < N; i++) {
    var x = Math.floor((Math.random()*2-1)*1000)
    var y = Math.floor(Math.random()*10000)
    var value = [
      Math.floor((Math.random()*2-1)*128),
      Math.floor((Math.random()*2-1)*32768),
      Math.floor((Math.random()*2-1)*32768),
      Math.floor((Math.random()*2-1)*2147483648),
      Math.floor((Math.random()*2-1)*2147483648)
    ]
    batch.push({ point: [x,y], value: value })
  }
  var searches = [
    [-20,-10,-10,-5]
  ]
  var expected = searches.map(function (q) {
    return batch.filter(function (b) {
      return b.point[0] > q[0] && b.point[0] < q[2]
        && b.point[1] > q[1] && b.point[1] < q[3]
    })
  })
  t.plan(1 + searches.length*2)

  bkd.batch(batch, function (err) {
    t.error(err)
    searches.forEach(function (bbox,i) {
      bkd.query(bbox, function (err, values) {
        t.error(err)
        t.deepEqual(values.sort(cmp), expected[i].sort(cmp))
      })
    })
  })
})

function cmp (a, b) { return a.value[4] < b.value[4] ? -1 : +1 }
