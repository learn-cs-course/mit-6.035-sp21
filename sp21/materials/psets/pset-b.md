# Problem Set B

1. Consider the following CFG:

	```
	                --------------
	                | i = 0      |
	                --------------
	                       |
	                --------------
	  ----------->  | t0 = n - 1 |
	  |             | i < t0     |
	  |             --------------
	  |                /       \
	  |    ---------------   ----------
	  |    | t1 = 3 * i  |   | return |
	  |    | t2 = t1 + 2 |   ----------
	  |    | a[t2] = n   |
	  |    | i = i + 1   |
	  |    ---------------
	  |         |
	  -----------
	```

	1. Show what happens when you apply induction variable strength reduction and elimination (but no other loop optimizations).

	1. Using the original CFG, show what happens when you apply loop invariant code motion (but no other loop optimizations).

	1. Loop invariant code motion is only one of a multitude of things a compiler might do to produce the final executable. Describe one scenario where the loop invariant code motion from the previous part might ultimately result in a slower final executable. Assume an implementation that does not create any new temporary variables.

1. Consider the following program:

	```
	x = 0
	if (x < 3) {
	    print(x)
	}
	a = 0
	b = 0
	c = 0
	while (true) {
	    if (c > 3) {
	        a = 1
	    }
	    b = 3 * a
	    if (b > 6) {
	        x = b
	        break
	    }
	    c = c + 1
	}
	print(x)
	```

	__Addendum:__ When constructing the CFG, __do not__ include the edge for the "not taken" branch of the while loop; since the loop condition is always true, the compiler is able to prune this edge in earlier optimization stages.

	1. Describe the webs and draw the interference graph. Clearly indicate which web each node corresponds to in the interference graph.

	1. Suppose we perform register allocation (using the method described in class) for a target architecture with three registers. Can we complete register allocation without spilling or splitting webs? Explain why, using the interference graph from the previous part or otherwise.

	1. Suppose our target architecture had only two registers. Split a web in order to complete register allocation. Do this by inserting one store and one load instructions into the above code.

1. Consider a language like Decaf, but augmented with the following operations on lists of bits (1 or 0):

	- `x = [b1, b2, ...]`: Set `x` to `[b1, b2, ...]`. For example, `x = [1, 0, 1]` sets `x` to the three-element list `[1, 0, 1]`.
	- `b = x[i]`: Load the `i`th element of `x` into `b`.
	- `x = concat(x1, x2)`: Set `x` to the concatenation of `x1` and `x2`. For example, `concat([0], [1, 0]) = [0, 1, 0]`.

	To optimize bounds checking, we'd like to perform a dataflow analysis that tracks the length of each list variable at each point in the program.

	1. Specify a lattice for this problem. Each lattice element should contain length information for all list variables (which you can name `x₁, x₂, ..., xₙ`).

	1. Describe the transfer function for the statement `x = concat(x1, x2)`.

	1. In the context of the above analysis, write a simple program where the meet-over-paths solution differs from the analysis result. Explain how they differ, and why.

## Hints

- (1i) You should replace the entire expression `3 * i + 2` with a new induction variable, not just `3 * i`.
- (1i) The loop condition is the most tricky part of this. Try simulating what happens with a few values of `n` to check that you performed the transformation correctly.
- (2i) If you're unsure, draw the CFG of defs and uses, look for def-use chains, and compute their live ranges. While not necessary, you can include this CFG in your submission for partial credit.
- (3i) Your lattice should be of the form `{x₁ ↦ v₁, x₂ ↦ v₂, ..., xₙ ↦ vₙ}`, where `v₁, v₂, ..., vₙ` are elements of some base lattice `B`.
- (3i) The least upper bound is completely defined by the order relation. Think about what a least upper bound on your lattice means and whether it matches what you want to do at merge points.
- (3ii) Make sure that your function works correctly when either argument is `⊥` or `⊤`, particularly if they are special elements.
- (3ii) Check that your function is monotonic, i.e. if l2 ≥ l1, then f(l2) ≥ l1.
- (3iii) Use an if/else block to create a merge point. You don't need anything more complicated than that.
