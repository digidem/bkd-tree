var build = require('./lib/build.js')
var unbuild = require('./lib/unbuild.js')
var calcIndex = require('./lib/calc-index.js')
var overlapTest = require('bounding-box-overlap-test')

module.exports = KD

function KD (storage, opts) {
  var self = this
  if (!(self instanceof KD)) return new KD(storage, opts)
  self.storage = storage
  self.staging = null
  self.trees = []
  self.bitfield = []
  self.branchFactor = opts.branchFactor || 4
  self.N = Math.pow(self.branchFactor,5)-1
  self.meta = null
  self._error = null
  self._ready = []
  self._init()
}

KD.prototype._init = function () {
  var self = this
  var pending = 2
  self.storage('staging', function (err, r) {
    r.read(0, self.N+4, function (err, buf) {
      if (!buf) buf = Buffer.alloc(4+self.N*12)
      self.staging = {
        count: buf.readUInt32BE(0),
        buffer: buf
      }
      if (--pending === 0) done()
    })
  })
  self.storage('meta', function (err, r) {
    r.read(0, 1024, function (err, buf) {
      if (buf) {
        try { self.meta = JSON.parse(buf) }
        catch (err) { self._error = err }
      } else {
        self.meta = { bitfield: 0 }
      }
      if (--pending === 0) done()
    })
  })
  function done () {
    for (var i = 0; i < self._ready.length; i++) {
      self._ready[i]()
    }
  }
}

KD.prototype.ready = function (cb) {
  if (this._ready) this._ready.push(cb)
  else cb(this._error)
}

KD.prototype.batch = function (rows, cb) {
  var self = this
  self.ready(function () {
    for (var i = 0; i < rows.length; i++) {
      var pt = rows[i]
      var index = 4+(self.staging.count++)*12
      self.staging.buffer.writeFloatBE(pt[0], index+0)
      self.staging.buffer.writeFloatBE(pt[1], index+4)
      self.staging.buffer.writeUInt32BE(pt[2], index+8)
      if (self.staging.count === self.N) self._flush()
    }
    cb()
  })
}

KD.prototype._flush = function (cb) {
  var trees = []
  var rows = []
  for (var i = 0; i < this.staging.count; i++) {
    rows.push([
      this.staging.buffer.readFloatBE(4+i*12+0),
      this.staging.buffer.readFloatBE(4+i*12+4),
      this.staging.buffer.readUInt32BE(4+i*12+8)
    ])
  }
  for (var i = 0; this.bitfield[i]; i++) {
    rows = rows.concat(unbuild(this.trees[i], { size: 12, parse: parse }))
    this.bitfield[i] = false
  }
  var B = this.branchFactor
  var n = Math.pow(B,Math.ceil(Math.log(rows.length+1)/Math.log(B)))-1
  var buffer = Buffer.alloc(n*12)
  build(rows, {
    branchFactor: B,
    write: function (index, pt) {
      buffer.writeFloatBE(pt[0], index*12+0)
      buffer.writeFloatBE(pt[1], index*12+4)
      buffer.writeUInt32BE(pt[2], index*12+8)
    }
  })
  this.trees[i] = buffer
  this.bitfield[i] = true
  this.staging.count = 0
}

KD.prototype.query = function (query, cb) {
  var self = this
  self.ready(function () {
    self._query(query, cb)
  })
}

KD.prototype._query = function (query, cb) {
  var q = [[query[0],query[2]],[query[1],query[3]]]
  var B = this.branchFactor
  var results = []
  for (var i = 0; i < this.staging.count; i++) {
    var p = [
      this.staging.buffer.readFloatBE(4+i*12+0),
      this.staging.buffer.readFloatBE(4+i*12+4),
      this.staging.buffer.readUInt32BE(4+i*12+8)
    ]
    if (p[0] >= q[0][0] && p[0] <= q[0][1]
    && p[1] >= q[1][0] && p[1] <= q[1][1]) {
      results.push(p)
    }
  }
  for (var i = -1; i < this.trees.length; i++) {
    if (!this.bitfield[i]) continue
    var t = this.trees[i]
    var maxDepth = Math.ceil(Math.log(t.length/12+1)/Math.log(B))
    var indexes = [0]
    var depth = 0
    var range = [[0,0]]
    var qrange = [null]
    for (var depth = 0; depth < maxDepth; depth++) {
      if (indexes.length === 0) break
      var axis = depth % 2
      qrange[0] = q[axis]
      var nextIndexes = []
      for (var j = 0; j < indexes.length; j++) {
        var ix = indexes[j]
        range[0][0] = -Infinity
        for (var k = 0; k < B-1; k++) {
          var p = parse(t,(ix+k)*12)
          if (!p) continue
          if (p[0] >= q[0][0] && p[0] <= q[0][1]
          && p[1] >= q[1][0] && p[1] <= q[1][1]) {
            results.push(p)
          }
          range[0][1] = p[axis]
          if (overlapTest(range,qrange)) {
            nextIndexes.push(calcIndex(B, ix, k))
          }
          range[0][0] = p[axis]
        }
        range[0][1] = +Infinity
        if (overlapTest(range,qrange)) {
          nextIndexes.push(calcIndex(B, ix, k))
        }
      }
      indexes = nextIndexes
    }
  }
  cb(null, results)
}

function parse (buffer, offset) {
  var id = buffer.readUInt32BE(offset+8)
  if (id === 0) return null
  return [
    buffer.readFloatBE(offset+0),
    buffer.readFloatBE(offset+4),
    id
  ]
}
