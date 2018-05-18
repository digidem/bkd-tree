# unordered-materialized-bkd

work in progress

# example

insert 5000 points to in-memory storage then search those points for
`-0.5 <= x <= -0.4 and -0.9 <= y <= -0.85`

``` js
var ram = require('random-access-memory')
function storage (name, cb) { cb(null,ram()) }

var bkd = require('unordered-materialized-bkd')(storage, {
  branchFactor: 4,
  type: {
    point: [ 'float32be', 'float32be' ],
    value: [ 'uint32be' ]
  }
})

var N = 5000
var batch = []
for (var i = 0; i < N; i++) {
  var x = Math.random()*2-1
  var y = Math.random()*2-1
  batch.push({ point: [x,y], value: [i+1] })
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

