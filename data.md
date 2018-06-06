# data

This document describes how bkd-tree stores and retrieves data.

# academic papers

This module is based on the bkd tree paper which builds on work in the
kdb tree, b-tree, and kd tree papers.

* [bkd tree paper](https://users.cs.duke.edu/~pankaj/publications/papers/bkd-sstd.pdf)
* [kdb tree paper](http://repository.cmu.edu/cgi/viewcontent.cgi?article=3451&context=compsci)
* [kd tree paper](http://cgi.di.uoa.gr/~ad/MDE515/p509-bentley.pdf)
* Binary B-Trees for Virtual Memory ([wikipedia](https://en.wikipedia.org/wiki/B-tree))

# overview

This overview will progress through different datastructures that influence the
bkd design.

## binary tree

Binary trees can be used to quickly find a value in `O(ln n)` steps.

Each level of a binary tree partitions data into two halves: less than or
greater than the current node. This property is recursive, with each subsequent
node further subdividing data into two sets below it until the leaves of the
tree.

Here is an example of a binary tree where the root node is 10:

```
                10
        .------'  '---------.
       4                    14
     /   \               /     \
   2       6           12        17
  / \     / \         /   \     /  \
 1   3   5   9      11    13  15    20
```

The root node 10 partitions the data in half with a left child node of 4 and a
right child node of 14. Each of the children further subdivide the data until
the leaves of the tree.

The above tree is also balanced, which means that the height of every leaf node
is the same. Unbalanced trees degrade performance because instead of dividing
the values in two each time, in the worst case of an unbalanced tree each node
will only link to one other node resulting in `O(n)` instead of `O(ln n)`
for queries.

## kd tree

A kd tree is a binary tree for multidimensional queries. Kd trees work very
similar to binary search trees, but the dimension under consideration alternates
for each level of the tree.

Here is an example of a kd tree on 2 dimensional points with the axis under
consideration labeled on the left-hand side of the diagram:

```
x                               32,8
                    .------------'----------------.
y                18,15                          75,15
           .-------'------.                .------'------. 
x        17,5           10,25            61,11         40,19
        /    \         /      \         /     \       /     \
y    15,8   20,14    5,30    16,40    45,9   65,3  35,22   50,20
```

Starting from the root, each node on the left has an x value less than 32 and
each node on the right has an x value greater than 32.

From the first left child, `18,15`, each node to the left has a y value less
than 15 and each node to the right has a value greater than 15.

Likewise for `75,15`, each node to the left has a y value less than 15 and each
node to the right has a y value greater than 15.

After the first level, the comparison switches back to x. So for example from
`17,5`, the node on the left has an x value less than `17` and to the right
greater than 17 even though the y values are both greater than `5` (but less
than 15 as enforced by the `18,15` node above).

## b tree

B-trees improve the performance of binary trees on most kinds of real-world
storage devices which are optimized to read data in large contiguous blocks.

Each node of a b-tree contains multiple keys and links to more than 2 children.

For each node with N keys, there will be N+1 children.

This balanced tree with 4 keys per node has a root that links to 5 children.

The first level after the root contains keys that are at first less than 10,
then between 10 and 55, then between 55 and 80 then between 80 and 120, then
greater than 120:

```
                       10,55,80,120
               _______/ /   |   \  \______
              /        /    |    \        \
     ________/  ______/     |     \____    \_____________
    /          /            |           \                \
1 5 8 9   18,34,44,50  58,62,77,79  85,90,111,115  124,143,150,161
```

## kdb

The kdb paper combines the techniques from kd trees and b trees.

Starting with a b tree and pivoting on an alternating axis each level gets the
main idea across. The kdb paper also includes an optimization store full
values only on leaves and using only keys in intermediate nodes.

The paper also uses a page table scheme for dynamic updates, but these details
are not important for the bkd implementation.

## bkd

The kdb paper discusses a technique for performing inserts and deletions on a
single tree with further tricks for keeping the tree balanced. In practice, this
is much slower than the amortized cost of building and rebuilding a series of
purely static trees.

The bkd tree paper outlines a technique where documents are immediately written
to a staging area followed by a sequence of static kdb trees called a "forest".
Trees are either completely full or completely empty.

The size of each tree in the forest starts at the size of the staging area and
increases by powers of two.

For example, if the staging area can hold 100 nodes, then the forest will have
sizes:

```
100 200 400 800 1600 3200 6400 12800 ...
```

This sequence goes on.

When the staging area fills up, the staging contents are combined with the data
from every tree until the first empty tree slot is encountered.

The staging contents plus every full tree before the first empty tree will
always fit exactly into the first empty tree. This is because all trees are
multiples of the size of the staging area and increase by powers of two.

For the first empty tree index `n` starting from 0 and the staging size `S`,
the size of the first empty tree `S * 2**n` is:

```
S * 2**n = S * (2**(n-1) + 2**(n-2) + ... + 2**0 + 1)
```

# storage

There is a meta storage layer that stores 1024 padded json bytes. The meta data
contains the bitfield array, an array of `0`s and `1`s depending on if the trees
in the forest are full or empty.

The staging area starts with 4 bytes for the number of records stored in the
staging area as a uint32. Next comes a bitfield of size `Math.ceil(n/8)` bytes
for a staging area with room for `n` records. A `1` in the bitfield means the
staged operation is an insert, otherwise a delete for `0`.

Each tree is stored under the name `'tree'+i` for slot `i` starting from 0.
Each tree has two bitfields, each of size `Math.ceil(n/8)` for a tree that can
hold `n` records. The first bitfield stores whether there is a record set for
the corresponding record index: `0` for no record and `1` for a record. The
second bitfield is used to store whether a node has been deleted: `0` for not
deleted and `1` for deleted.

The first tree bitfield could be removed with some work to the tree index
calculations to ensure a more dense construction.

## layout

The data in each tree after the bitfields is arranged starting from the root
node and proceding to the root's children in breadth-first fashion from left to
right, from less to greater for the given axis under consideration for the
present level.

## inserts

Nodes are written to the staging area until it fills up. Once full, the staging
area is combined with every full tree up to the first empty slot to fill that
empty slot. After creating a new tree, the staging area and every tree before
the first empty slot is removed.

## queries

Queries search every full tree and the staging area in parallel. The staging
area is searched with a linear scan. Each tree is searched by comparing the
bounding box for the query with the partitions that each level of the tree
makes. As the tree is walked, if a node is contained in the bounding box it is
added to the results.

