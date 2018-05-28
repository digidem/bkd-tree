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
  self._compare = opts.compare
}

KD.prototype._init = function () {
  var self = this
  var pending = 2
  var presize = Math.ceil(self.N/8)
  self.storage('staging', function (err, r) {
    r.read(0, 4+presize+self.N*self._types.size, function (err, buf) {
      if (!buf) buf = Buffer.alloc(4+presize+self.N*self._types.size)
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
  var presize = Math.ceil(self.N/8)
  self.ready(function write () {
    for (; i < rows.length; i++) {
      var row = rows[i]
      var j = Math.floor(4+self.staging.count/8)
      if (row.type === 'delete') {
        // already zero
      } else if (row.type === 'insert' || row.type === undefined) {
        self.staging.buffer[j] = self.staging.buffer[j] | (1<<(i%8))
      }
      self._types.write(
        self.staging.buffer, 4+presize,
        self.staging.count++, row
      )
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
  var B = self.branchFactor
  var inserts = [], deletes = []
  var stagingPresize = Math.ceil(self.N/8)
  for (var i = 0; i < self.staging.count; i++) {
    var j = Math.floor(4+i/8)
    var deleted = !((self.staging.buffer[j]>>(i%8))&1)
    var pt = self._types.parse(self.staging.buffer, 4+stagingPresize, i)
    if (deleted) deletes.push(pt)
    else inserts.push(pt)
  }
  for (var i = 0; i < deletes.length; i++) {
    for (var j = 0; j < inserts.length; j++) {
      if (self._compare(deletes[i], inserts[j])) {
        //deletes.splice(i,1)
        //inserts.splice(j,1)
        console.log('STAGED!',i,j)
      }
    }
  }
  var pending = 1
  for (var i = 0; self.meta.bitfield[i]; i++) {
    pending++
    self.meta.bitfield[i] = false
    self._getTree(i, function (err, t) {
      if (err) return cb(err)
      var presize = Math.ceil(t.size/8)*2
      t.storage.read(0, presize + t.size*self._types.size, function (err, buf) {
        if (!buf) buf = Buffer.alloc(presize + t.size*self._types.size)
        for (var j = 0; j < t.size; j++) {
          var empty = !((buf[Math.floor(j/8)]>>(j%8))&1)
          if (empty) continue
          var deleted = !!((buf[Math.floor(j/8)+presize/2]>>(j%8))&1)
          if (deleted) continue
          var pt = self._types.parse(buf, presize, j)
          inserts.push(pt)
        }
        if (--pending === 0) done()
      })
    })
  }
  var finalTree = i
  if (--pending === 0) done()

  function done () {
    var B = self.branchFactor
    self._getTree(finalTree, function (err, t) {
      if (err) return cb(err)
      var presize = Math.ceil(t.size/8)*2
      var buffer = Buffer.alloc(presize+t.size*self._types.size)
      build(inserts, {
        branchFactor: B,
        dim: self._types.dim,
        write: function (index, pt) {
          var i = Math.floor(index/8)
          buffer[i] = buffer[i] | (1 << (index % 8))
          self._types.write(buffer, presize, index, pt)
        }
      })
      t.storage.write(0, buffer, function (err) {
        walkTreesForDeletes(finalTree, deletes, finish)
      })
    })
  }
  function walkTreesForDeletes (skip, deletes, cb) {
    if (deletes.length === 0) return cb()
    var pending = 1
    for (var j = 0; j < self.trees.length; j++) {
      if (!self.meta.bitfield[j]) continue
      if (j === skip) continue
      pending++
      self._getTree(j, function (err, t) {
        if (err) return cb(err)
        var presize = Math.ceil(t.size/8)*2
        t.storage.read(0, presize + t.size*self._types.size, function (err, buf) {
          if (err) return cb(err)
          if (setDeletes(buf, t, deletes) > 0) {
            t.storage.write(0, buf, function (err) {
              if (err) cb(err)
              else if (--pending === 0) cb()
            })
          } else if (--pending === 0) cb()
        })
      })
    }
    if (--pending === 0) cb()
  }
  function setDeletes (buf, t, deletes) {
    if (deletes.length === 0) return 0
    var presize = Math.ceil(t.size/8)*2
    var maxDepth = Math.ceil(Math.log(t.size+1)/Math.log(B))
    var removed = 0
    for (var i = 0; i < deletes.length; i++) {
      var d = deletes[i]
      var found = false
      var ix = 0
      for (var depth = 0; depth < maxDepth; depth++) {
        var axis = depth % self._types.dim
        for (var k = 0; k < B-1; k++) {
          var empty = !((buf[Math.floor((ix+k)/8)]>>((ix+k)%8))&1)
          if (empty) continue
          var delIndex = Math.floor((ix+k)/8)+presize/2
          var deleted = !!((buf[delIndex]>>((ix+k)%8))&1)
          var p = self._types.parse(buf, presize, ix+k)
          if (!deleted && self._compare(d,p)) {
            buf[delIndex] = buf[delIndex] | (1<<((ix+k)%8))
            removed++
            found = true
            break
          }
          if (d.point[axis] < p.point[axis]) {
            ix = calcIndex(B, ix, k)
            break
          }
        }
        if (found) break
        if (k === B-1) ix = calcIndex(B, ix, k)
      }
    }
    return removed
  }
  function finish () {
    self.meta.bitfield[finalTree] = true
    self.staging.count = 0
    cb()
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
  var dim = self._types.dim
  var q = []
  for (var i = 0; i < dim; i++) q.push([query[i],query[i+dim]])
  var B = self.branchFactor
  var stagingPresize = Math.ceil(self.N/8)
  self.ready(function () {
    var results = [], deletes = []
    for (var i = 0; i < self.staging.count; i++) {
      var j = Math.floor(4+i/8)
      var deleted = !((self.staging.buffer[j]>>(i%8))&1)
      var p = self._types.parse(self.staging.buffer, 4+stagingPresize, i)
      if (overlapPoint(p.point, query)) {
        if (deleted) deletes.push(p)
        else results.push(p)
      }
    }
    if (deletes.length > 0) {
      results = results.filter(function (r) {
        for (var i = 0; i < deletes.length; i++) {
          if (self._compare(r,deletes[i])) return false
        }
        return true
      })
    }
    var pending = 1
    for (var i = 0; i < self.meta.bitfield.length; i++) (function (i) {
      if (!self.meta.bitfield[i]) return
      pending++
      self._getTree(i, function (err, t) {
        var presize = Math.ceil(t.size/8)*2
        var len = presize + t.size*self._types.size
        t.storage.read(0, len, function (err, buf) {
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
                var deleted = !!((buf[Math.floor((ix+k)/8)+presize/2]>>((ix+k)%8))&1)
                var p = self._types.parse(buf, presize, ix+k)
                if (!deleted && overlapPoint(p.point, query)) {
                  for (var n = 0; n < deletes.length; n++) {
                    if (self._compare(p, deletes[n])) break
                  }
                  if (n === deletes.length) results.push(p)
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

function overlapPoint (p, q) {
  var dim = p.length
  for (var i = 0; i < dim; i++) {
    if (p[i] < q[i] || p[i] > q[i+dim]) return false
  }
  return true
}
