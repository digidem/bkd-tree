# bkd-tree

[bkd tree][bkd] implementation using [random-access][] storage

[bkd]: https://users.cs.duke.edu/~pankaj/publications/papers/bkd-sstd.pdf
[random-access]: https://www.npmjs.com/package/abstract-random-access

This module implements some of the bkd tree paper and is very fast. However, the
memory usage can be high at times and some features of the paper, such as the
grid bulk load algorithm, are not yet implemented.

The robustness and atomicity of these data structures has not yet been
thoroughly tested.

# example

insert 5000 points to in-memory storage then search those points for
`-0.5 <= x <= -0.4 and -0.9 <= y <= -0.85`

``` js
var ram = require('random-access-memory')
function storage (name, cb) { cb(null,ram()) }

var bkd = require('bkd-tree')(storage, {
  branchFactor: 4,
  type: {
    point: [ 'float32be', 'float32be' ],
    value: [ 'uint32be' ]
  },
  compare: function (a, b) { return a.value[0] === b.value[0] }
})

var N = 5000
var batch = []
for (var i = 0; i < N; i++) {
  var x = Math.random()*2-1
  var y = Math.random()*2-1
  batch.push({ type: 'insert', point: [x,y], value: [i+1] })
}

var bbox = [-0.5,-0.9,-0.4,-0.85]

bkd.batch(batch, function (err) {
  if (err) console.error(err)
  bkd.query(bbox, function (err, values) {
    if (err) console.error(err)
    else console.log(values)
  })
})
```

output:

```
[ { point: [ -0.4952811002731323, -0.8651710152626038 ],
    value: [ 1404 ] },
  { point: [ -0.46114417910575867, -0.8699662089347839 ],
    value: [ 300 ] },
  { point: [ -0.4253665506839752, -0.8783734440803528 ],
    value: [ 1869 ] },
  { point: [ -0.41438907384872437, -0.8694494962692261 ],
    value: [ 3807 ] } ]
```

# api

``` js
var BKD = require('bkd-tree')
```

## var bkd = BKD(storage, opts)

Create a new `bkd` instance from a [random-access][] `storage` instance and:

* `opts.type.point` - array of type strings for the coordinates
* `opts.type.value` - array of type strings for the data payload
* `opts.branchFactor` - branch factor. default: 4
* `opts.levels` - number of levels in the smallest tree. default: 5
* `opts.compare(a,b)` - boolean comparison function required for deletes

The dimensionality of the coordinates should match the length of the
`opts.type.value` length.

The type strings listed in `opts.type.point` and `opts.type.value` can be:

* float32be, float32le, float64be, float64le
* uint8, uint16be, uint16le, uint32be, uint32le
* int8, int16be, int16le, int32be, int32le

Any of these types can have a `[n]` quantity at the end. When `n > 1`, the
corresponding value for the type will be a typed array except for uint8 which is
a `Buffer` (which is also a Uint8Array).

## bkd.batch(rows, cb)

Write or remove documents from an array of `rows`. Each `row` in the `rows`
array should have:

* `row.type` - `'delete'` or `'insert'`
* `row.point` - coordinate array
* `row.value` - array of value types

## var stream = bkd.query(bbox)
## bkd.query(bbox, cb)

Search for records inside a bounding box `bbox`.

Obtain the results with the returned [pull-stream][] `stream` or from
`cb(err, results)` to get an array of results.

The `bbox` should contain all the minimum values for each dimension followed by
all the maximum values for each dimension. In 2d, the bbox is
`[minX,minY,maxX,maxY]`, or the more familiar `[west,south,east,north]`.

Values exactly on the border are included in the results.

[pull-stream]: https://pull-stream.github.io/

# install

```
npm install bkd-tree
```

# license

BSD
