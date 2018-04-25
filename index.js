var build = require('./lib/build.js')
var unbuild = require('./lib/unbuild.js')

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
  var B = 4
  var n = Math.pow(B,Math.ceil(Math.log(rows.length+1)/Math.log(B)))-1
  var buffer = Buffer.alloc(n*12)

  build(rows, {
    branchFactor: B,
    write: write
  })
  this.trees[i] = buffer
  this.staging = []
  console.log(this.trees.map(function (t) {
    return t ? t.length/12 : 0
  }).join(' '))

  function write (index, pt) {
    buffer.writeFloatBE(pt[0], index*12+0)
    buffer.writeFloatBE(pt[1], index*12+4)
    buffer.writeUInt32BE(pt[2], index*12+8)
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
}

KD.prototype.ready = function (cb) {
}

KD.prototype.query = function (query, cb) {
}
