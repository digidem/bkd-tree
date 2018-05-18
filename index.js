var build = require('./lib/build.js')
var calcIndex = require('./lib/calc-index.js')
var types = require('./lib/types.js')
var overlapTest = require('bounding-box-overlap-test')
var once = require('once')

module.exports = KD

function KD (storage, opts) {
  var self = this
  if (!(self instanceof KD)) return new KD(storage, opts)
  self.storage = storage
  self.staging = null
  self.trees = []
  self.branchFactor = opts.branchFactor || 4
  self._types = types(opts.type.point, opts.type.value)
  self.N = Math.pow(self.branchFactor,5)
  self.meta = null
  self._error = null
  self._ready = []
  self._init()
}

KD.prototype._init = function () {
  var self = this
  var pending = 2
  self.storage('staging', function (err, r) {
    r.read(0, 4+self.N*self._types.size, function (err, buf) {
      if (!buf) buf = Buffer.alloc(4+self.N*self._types.size)
      self.staging = {
        storage: r,
        count: buf.readUInt32BE(0),
        buffer: buf
      }
      if (--pending === 0) done()
    })
  })
  self.storage('meta', function (err, r) {
    self.metaStorage = r
    r.read(0, 1024, function (err, buf) {
      if (buf) {
        try { self.meta = JSON.parse(buf) }
        catch (err) { self._error = err }
      } else {
        self.meta = { bitfield: [], branchFactor: self.branchFactor }
      }
      if (--pending === 0) done()
    })
  })
  function done () {
    for (var i = 0; i < self._ready.length; i++) {
      self._ready[i]()
    }
    self._ready = null
  }
}

KD.prototype.ready = function (cb) {
  if (this._ready) this._ready.push(cb)
  else cb(this._error)
}

KD.prototype.batch = function (rows, cb) {
  cb = once(cb || noop)
  var self = this
  var i = 0
  self.ready(function write () {
    for (; i < rows.length; i++) {
      self._types.write(self.staging.buffer, 4, self.staging.count++, rows[i])
      if (self.staging.count === self.N) {
        self._flush(function () {
          i++
          write()
        })
        return
      }
    }
    self.staging.buffer.writeUInt32BE(self.staging.count, 0)
    var pending = 2
    self.staging.storage.write(0, self.staging.buffer, done)
    var metaStr = JSON.stringify(self.meta)
    var metaBuf = Buffer.from(metaStr + Array(1+1024-metaStr.length).join(' '))
    self.metaStorage.write(0, metaBuf, done)
    function done (err) {
      if (err) return cb(err)
      else if (--pending === 0) cb()
    }
  })
}

KD.prototype._flush = function (cb) {
  var self = this
  var rows = []
  for (var i = 0; i < self.staging.count; i++) {
    var pt = self._types.parse(self.staging.buffer, 4, i)
    rows.push(pt)
  }
  var pending = 1
  for (var i = 0; self.meta.bitfield[i]; i++) {
    pending++
    self.meta.bitfield[i] = false
    self._getTree(i, function (err, t) {
      if (err) return cb(err)
      var presize = Math.ceil(t.size/8)
      t.storage.read(0, presize + t.size*self._types.size, function (err, buf) {
        if (!buf) buf = Buffer.alloc(presize + t.size*self._types.size)
        for (var j = 0; j < t.size; j++) {
          var empty = !((buf[Math.floor(j/8)]>>(j%8))&1)
          if (empty) continue
          var pt = self._types.parse(buf, presize, j)
          rows.push(pt)
        }
        if (--pending === 0) done()
      })
    })
  }
  if (--pending === 0) done()

  function done () {
    var B = self.branchFactor
    var n = Math.pow(B,Math.ceil(Math.log(rows.length+1)/Math.log(B)))-1
    self._getTree(i, function (err, t) {
      if (err) return cb(err)
      var presize = Math.ceil(t.size/8)
      var buffer = Buffer.alloc(presize + n*self._types.size)
      build(rows, {
        branchFactor: B,
        dim: self._types.dim,
        write: function (index, pt) {
          var i = Math.floor(index/8)
          buffer[i] = buffer[i] | (1 << (index % 8))
          self._types.write(buffer, presize, index, pt)
        }
      })
      t.storage.write(0, buffer, function (err) {
        self.meta.bitfield[i] = true
        self.staging.count = 0
        cb()
      })
    })
  }
}

KD.prototype._getTree = function (i, cb) {
  var self = this
  var B = self.branchFactor
  var x = self.N*Math.pow(2,i)
  var size = Math.pow(B,Math.ceil(Math.log(x+1)/Math.log(B)))-1
  self.ready(function () {
    if (self.trees[i]) cb(null, self.trees[i])
    else self.storage('tree'+i, function (err, s) {
      if (err) return cb(err)
      self.trees[i] = { storage: s, size: size }
      cb(null, self.trees[i])
    })
  })
}

KD.prototype.query = function (query, cb) {
  cb = once(cb || noop)
  var self = this
  self.ready(function () {
    self._query(query, cb)
  })
}

KD.prototype._query = function (query, cb) {
  var self = this
  var q = [[query[0],query[2]],[query[1],query[3]]]
  var B = self.branchFactor
  self.ready(function () {
    var results = []
    for (var i = 0; i < self.staging.count; i++) {
      var p = self._types.parse(self.staging.buffer, 4, i)
      if (p.point[0] >= q[0][0] && p.point[0] <= q[0][1]
      && p.point[1] >= q[1][0] && p.point[1] <= q[1][1]) {
        results.push(p)
      }
    }
    var pending = 1
    for (var i = 0; i < self.meta.bitfield.length; i++) (function (i) {
      if (!self.meta.bitfield[i]) return
      pending++
      self._getTree(i, function (err, t) {
        var presize = Math.ceil(t.size/8)
        t.storage.read(0, presize + t.size*self._types.size, function (err, buf) {
          if (!buf) buf = Buffer.alloc(presize + t.size*self._types.size)
          var maxDepth = Math.ceil(Math.log(t.size+1)/Math.log(B))
          var indexes = [0]
          var depth = 0
          var range = [[0,0]]
          var qrange = [null]
          for (var depth = 0; depth < maxDepth; depth++) {
            if (indexes.length === 0) break
            var axis = depth % self._types.dim
            qrange[0] = q[axis]
            var nextIndexes = []
            for (var j = 0; j < indexes.length; j++) {
              var ix = indexes[j]
              range[0][0] = -Infinity
              for (var k = 0; k < B-1; k++) {
                var empty = !((buf[Math.floor((ix+k)/8)]>>((ix+k)%8))&1)
                if (empty) continue
                var p = self._types.parse(buf, presize, ix+k)
                if (p.point[0] >= q[0][0] && p.point[0] <= q[0][1]
                && p.point[1] >= q[1][0] && p.point[1] <= q[1][1]) {
                  results.push(p)
                }
                range[0][1] = p.point[axis]
                if (overlapTest(range,qrange)) {
                  nextIndexes.push(calcIndex(B, ix, k))
                }
                range[0][0] = p.point[axis]
              }
              range[0][1] = +Infinity
              if (overlapTest(range,qrange)) {
                nextIndexes.push(calcIndex(B, ix, k))
              }
            }
            indexes = nextIndexes
          }
          if (--pending === 0) cb(null, results)
        })
      })
    })(i)
    if (--pending === 0) cb(null, results)
  })
}

function noop () {}
