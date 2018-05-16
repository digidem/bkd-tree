var writers = {
  float32be: function (buffer, value, offset, n) {
    for (var i = 0; i < n; i++) {
      buffer.writeFloatBE(value, offset+i*4)
    }
  },
  float64be: function (buffer, value, offset, n) {
    for (var i = 0; i < n; i++) {
      buffer.writeDoubleBE(value, offset+i*8)
    }
  },
  uint8: function (buffer, value, offset, n) {
    if (n === 1) {
      buffer.writeUInt8(value, offset)
    } else value.copy(buffer, offset)
  },
  uint16be: function (buffer, value, offset, n) {
    for (var i = 0; i < n; i++) {
      buffer.writeUInt16BE(value, offset+i*2)
    }
  },
  uint16le: function (buffer, value, offset, n) {
    for (var i = 0; i < n; i++) {
      buffer.writeUInt16LE(value, offset+i*2)
    }
  },
  uint32be: function (buffer, value, offset, n) {
    for (var i = 0; i < n; i++) {
      buffer.writeUInt32BE(value, offset+i*4)
    }
  },
  uint32le: function (buffer, value, offset, n) {
    for (var i = 0; i < n; i++) {
      buffer.writeUInt32LE(value, offset+i*4)
    }
  }
}

module.exports = function (typeStrings) {
  var types = typeStrings.map(parse)
  var size = 0
  for (var i = 0; i < types.length; i++) {
    size += types[i].size * types[i].quantity
  }
  var fns = types.map(function (t) {
    var n = t.quantity
    var w = writers[t.type]
    return function (buffer, offset, value) {
      w(buffer, value, offset, t.quantity)
      return t.size * t.quantity
    }
  })
  return function (buffer, offset, index, pt) {
    offset += index * size
    for (var i = 0; i < fns.length; i++) {
      offset += fns[i](buffer, offset, pt[i])
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
