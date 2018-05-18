var isBigEndian = new Uint8Array(Uint16Array.from([0x00ff]).buffer)[0] === 0

var writers = {
  float32be: function (buffer, value, offset, n) {
    if (typeof value === 'number') {
      return buffer.writeFloatBE(value, offset)
    }
    for (var i = 0; i < n; i++) {
      buffer.writeFloatBE(value[i], offset+i*4)
    }
  },
  float32le: function (buffer, value, offset, n) {
    if (typeof value === 'number') {
      return buffer.writeFloatLE(value, offset)
    }
    for (var i = 0; i < n; i++) {
      buffer.writeFloatLE(value[i], offset+i*4)
    }
  },
  float64be: function (buffer, value, offset, n) {
    if (typeof value === 'number') {
      return buffer.writeDoubleBE(value, offset)
    }
    for (var i = 0; i < n; i++) {
      buffer.writeDoubleBE(value[i], offset+i*8)
    }
  },
  float64le: function (buffer, value, offset, n) {
    if (typeof value === 'number') {
      return buffer.writeDoubleLE(value, offset)
    }
    for (var i = 0; i < n; i++) {
      buffer.writeDoubleLE(value[i], offset+i*8)
    }
  },
  uint8: function (buffer, value, offset, n) {
    if (typeof value === 'number') {
      buffer.writeUInt8(value, offset)
    } else {
      value.copy(buffer, offset)
    }
  },
  uint16be: function (buffer, value, offset, n) {
    if (typeof value === 'number') {
      return buffer.writeUInt16BE(value, offset)
    }
    for (var i = 0; i < n; i++) {
      buffer.writeUInt16BE(value[i], offset+i*2)
    }
  },
  uint16le: function (buffer, value, offset, n) {
    if (typeof value === 'number') {
      return buffer.writeUInt16LE(value, offset)
    }
    for (var i = 0; i < n; i++) {
      buffer.writeUInt16LE(value[i], offset+i*2)
    }
  },
  uint32be: function (buffer, value, offset, n) {
    if (typeof value === 'number') {
      return buffer.writeUInt32BE(value, offset)
    }
    for (var i = 0; i < n; i++) {
      buffer.writeUInt32BE(value[i], offset+i*4)
    }
  },
  uint32le: function (buffer, value, offset, n) {
    if (typeof value === 'number') {
      return buffer.writeUInt32LE(value, offset)
    }
    for (var i = 0; i < n; i++) {
      buffer.writeUInt32LE(value[i], offset+i*4)
    }
  }
}
var parsers = {
  float32be: function (buffer, offset, n) {
    if (n === 1) {
      return buffer.readFloatBE(offset)
    }
    if (isBigEndian) {
      return new Float32Array(buffer.buffer, offset, n)
    }
    var res = new Float32Array(n)
    for (var i = 0; i < n; i++) {
      res[i] = buffer.readFloatBE(offset+i*4)
    }
    return res
  },
  float32le: function (buffer, offset, n) {
    if (n === 1) {
      return buffer.readFloatLE(offset)
    }
    if (!isBigEndian) {
      return new Float32Array(buffer.buffer, offset, n)
    }
    var res = new Float32Array(n)
    for (var i = 0; i < n; i++) {
      res[i] = buffer.readFloatLE(offset+i*4)
    }
    return res
  },
  float64be: function (buffer, offset, n) {
    if (n === 1) {
      return buffer.readDoubleBE(offset)
    }
    if (isBigEndian) {
      return new Float64Array(buffer.buffer, offset, n)
    }
    var res = new Float64Array(n)
    for (var i = 0; i < n; i++) {
      res[i] = buffer.readDoubleBE(offset+i*8)
    }
    return res
  },
  float64le: function (buffer, offset, n) {
    if (n === 1) {
      return buffer.readDoubleLE(offset)
    }
    if (!isBigEndian) {
      return new Float64Array(buffer.buffer, offset, n)
    }
    var res = new Float64Array(n)
    for (var i = 0; i < n; i++) {
      res[i] = buffer.readDoubleLE(offset+i*8)
    }
    return res
  },
  uint8: function (buffer, offset, n) {
    if (n === 1) {
      return buffer.readUInt8(buffer, offset)
    } else {
      return buffer.slice(offset, offset+n)
    }
  },
  uint16be: function (buffer, offset, n) {
    if (n === 1) {
      return buffer.readUInt16BE(offset)
    }
    if (isBigEndian) {
      return new Uint16Array(buffer.buffer, offset, n)
    }
    var res = new Uint16Array(n)
    for (var i = 0; i < n; i++) {
      res[i] = buffer.readUInt16BE(offset+i*2)
    }
    return res
  },
  uint16le: function (buffer, offset, n) {
    if (n === 1) {
      return buffer.readUInt16LE(offset)
    }
    if (!isBigEndian) {
      return new Uint16Array(buffer.buffer, offset, n)
    }
    var res = new Uint16Array(n)
    for (var i = 0; i < n; i++) {
      res[i] = buffer.readUInt16LE(offset+i*2)
    }
    return res
  },
  uint32be: function (buffer, offset, n) {
    if (n === 1) {
      return buffer.readUInt32BE(offset)
    }
    if (isBigEndian) {
      return new Uint32Array(buffer.buffer, offset, n)
    }
    var res = new Uint32Array(n)
    for (var i = 0; i < n; i++) {
      res[i] = buffer.readUInt32BE(offset+i*2)
    }
    return res
  },
  uint32le: function (buffer, offset, n) {
    if (n === 1) {
      return buffer.readUInt32LE(offset)
    }
    if (!isBigEndian) {
      return new Uint32Array(buffer.buffer, offset, n)
    }
    var res = new Uint32Array(n)
    for (var i = 0; i < n; i++) {
      res[i] = buffer.readUInt32LE(offset+i*2)
    }
    return res
  }
}

module.exports = function (pointTypeStrings, valueTypeStrings) {
  var types = {
    point: pointTypeStrings.map(parse),
    value: valueTypeStrings.map(parse)
  }
  var size = 0
  for (var i = 0; i < types.point.length; i++) {
    size += types.point[i].size * types.point[i].quantity
  }
  for (var i = 0; i < types.value.length; i++) {
    size += types.value[i].size * types.value[i].quantity
  }
  var writePointFns = types.point.map(writeFn)
  var writeValueFns = types.value.map(writeFn)
  function writeFn (t) {
    var n = t.quantity
    var w = writers[t.type]
    return function (buffer, offset, value) {
      w(buffer, value, offset, t.quantity)
      return t.size * t.quantity
    }
  }
  var parsePointFns = types.point.map(parseFn)
  var parseValueFns = types.value.map(parseFn)
  function parseFn (t) {
    var p = parsers[t.type]
    var n = t.quantity
    return function (buffer, offset) {
      return p(buffer, offset, n)
    }
  }
  return {
    size: size,
    dim: types.point.length,
    write: function (buffer, offset, index, pt) {
      offset += index * size
      for (var i = 0; i < writePointFns.length; i++) {
        offset += writePointFns[i](buffer, offset, pt.point[i])
      }
      if (typeof pt.value === 'number') {
        return writeValueFns[0](buffer, offset, pt.value)
      }
      for (var i = 0; i < writeValueFns.length; i++) {
        offset += writeValueFns[i](buffer, offset, pt.value[i])
      }
    },
    parse: function (buffer, offset, index) {
      var point = []
      for (var i = 0; i < parsePointFns.length; i++) {
        point.push(parsePointFns[i](buffer, offset + size*index))
        offset += types.point[i].size * types.point[i].quantity
      }
      var value = []
      for (var i = 0; i < parseValueFns.length; i++) {
        value.push(parseValueFns[i](buffer, offset + size*index))
        offset += types.value[i].size * types.value[i].quantity
      }
      return { point: point, value: value }
    }
  }
}

function parse (str) {
  var m = /^(\w+)(?:\[(\d+)\])?$/.exec(str)
  if (!m) return null
  var type = m[1]
  var quantity = m[2] ? Number(m[2]) : 1
  var res = { type: null, size: 0, quantity: quantity }
  if (/^(float|float32|f32|f)(be)?$/i.test(type)) {
    res.type = 'float32be'
    res.size = 4
  } else if (/^(float|float32|f32|f)le$/i.test(type)) {
    res.type = 'float32le'
    res.size = 4
  } else if (/^(double|float64|f64|d)(be)?$/i.test(type)) {
    res.type = 'float64be'
    res.size = 8
  } else if (/^(double|float64|f64|d)le$/i.test(type)) {
    res.type = 'float64le'
    res.size = 8
  } else if (/^(uint8|u8|char)(be|le)?$/i.test(type)) {
    res.type = 'uint8'
    res.size = 1
  } else if (/^(uint16|u16)(be)?$/i.test(type)) {
    res.type = 'uint16be'
    res.size = 2
  } else if (/^(uint16|u16)le$/i.test(type)) {
    res.type = 'uint16le'
    res.size = 2
  } else if (/^(uint32|u32)(be)?$/i.test(type)) {
    res.type = 'uint32be'
    res.size = 4
  } else if (/^(uint32|u32)le$/i.test(type)) {
    res.type = 'uint32le'
    res.size = 4
  } else if (/^(int8|i8)(be|le)?$/i.test(type)) {
    res.type = 'int8'
    res.size = 1
  } else if (/^(int16|16)(be)?$/i.test(type)) {
    res.type = 'int16be'
    res.size = 2
  } else if (/^(int16|i16)le$/i.test(type)) {
    res.type = 'int16le'
    res.size = 2
  } else if (/^(int32|i32)(be)?$/i.test(type)) {
    res.type = 'int32be'
    res.size = 4
  } else if (/^(int32|i32)le$/i.test(type)) {
    res.type = 'int32le'
    res.size = 4
  } else {
    return null
  }
  return res
}
