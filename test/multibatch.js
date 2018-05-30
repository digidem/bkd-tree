var test = require('tape')
var approxEq = require('approximately-equal')
var umkd = require('../')
var ram = require('random-access-memory')

function storage (name, cb) { cb(null, ram()) }

test('multibatch', function (t) {
  t.plan(5)
  var N = 5000
  var bkd = umkd(storage, {
    branchFactor: 4,
    type: {
      point: ['float64be','float64be'],
      value: ['uint32be']
    },
    compare: function (a, b) {
      return a.value[0] === b.value[0]
    }
  })
  var batches = [
    [ { type: 'insert', point: [1,2], value: [0] } ],
    [ { type: 'insert', point: [3,4], value: [1] } ],
    [
      { type: 'insert', point: [5,6], value: [2] },
      { type: 'delete', point: [1,2], value: [0] }
    ]
  ]
  ;(function next (i) {
    if (i === batches.length) return check()
    var batch = batches[i]
    bkd.batch(batch, function (err) {
      t.error(err)
      next(i+1)
    })
  })(0)
  function check () {
    bkd.query([0,0,9,9], function (err, values) {
      t.error(err)
      t.deepEqual(values, [
        { point: [3,4], value: [1] },
        { point: [5,6], value: [2] }
      ])
    })
  }
})

function cmp (a, b) { return a.value < b.value ? -1 : +1 }
