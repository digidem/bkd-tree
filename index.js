var build = require('./lib/build.js')
var unbuild = require('./lib/unbuild.js')
var calcIndex = require('./lib/calc-index.js')
var overlapTest = require('bounding-box-overlap-test')

module.exports = KD

function KD (storage, opts) {
  if (!(this instanceof KD)) return new KD(storage, opts)
  this.storage = storage
  this.staging = []
  this.trees = []
  this.branchFactor = opts.branchFactor || 4
  //this.N = Math.pow(this.branchFactor,5)-1
  this.N = Math.pow(this.branchFactor,2)-1
}

KD.prototype.batch = function (rows, cb) {
  var self = this
  for (var i = 0; i < rows.length; i++) {
    this.staging.push(rows[i])
    if (this.staging.length === this.N) {
      this._flush()
    }
  }
  cb()
}

KD.prototype._flush = function (cb) {
  var trees = []
  var rows = this.staging
  for (var i = 0; this.trees[i]; i++) {
    rows = rows.concat(unbuild(this.trees[i], {
      size: 12,
      parse: parse
    }))
    this.trees[i] = null
  }
  var B = this.branchFactor
  var n = Math.pow(B,Math.ceil(Math.log(rows.length+1)/Math.log(B)))-1
  var buffer = Buffer.alloc(n*12)

  build(rows, {
    branchFactor: B,
    write: write
  })
  this.trees[i] = buffer
  this.staging = []

  function write (index, pt) {
    buffer.writeFloatBE(pt[0], index*12+0)
    buffer.writeFloatBE(pt[1], index*12+4)
    buffer.writeUInt32BE(pt[2], index*12+8)
  }
}

KD.prototype.query = function (query, cb) {
  var q = [[query[0],query[2]],[query[1],query[3]]]
  var B = this.branchFactor
  var results = []
  for (var i = 0; i < this.trees.length; i++) {
    var t = this.trees[i]
    if (!t) continue
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
          if (p === null) continue
          range[0][1] = p[axis]
          if (overlapTest(range,qrange)) {
            nextIndexes.push(calcIndex(B, ix, k))
          }
          if (p[0] >= q[0][0] && p[0] <= q[0][1]
          && p[1] >= q[1][0] && p[1] <= q[1][1]) {
            results.push(p)
          }
          range[0][0] = p[axis]
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
