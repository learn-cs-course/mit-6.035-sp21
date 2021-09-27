1. Perform the substitution `j = 3 * i + 2`. Then, `i < n - 1` becomes `j < 3 * n - 1`, resulting in the following CFG:

	```
	                --------------
	                | j = 2      |
	                --------------
	                       |
	                ---------------
	  ----------->  | t0 = 3 * n  |
	  |             | t1 = t0 - 1 |
	  |             | j < t1      |
	  |             ---------------
	  |                /       \
	  |    ---------------   ----------
	  |    | a[j] = n    |   | return |
	  |    | j = j + 3   |   ----------
	  |    ---------------
	  |         |
	  -----------
	```

	Loop invariant code motion only applies on the statement `t0 = n - 1`, giving the following CFG:

	```
	                --------------
	                | i = 0      |
	                | t0 = n - 1 |
	                --------------
	                       |
	                --------------
	  ----------->  | i < t0     |
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

	This can cause the resulting executable to run slower by increasing the register pressure in the loop. Before the loop invariant code motion, we could, for example, reuse the same register for `t0` and `t1`. Now that `t0`'s live range spans the whole loop, this is no longer possible.

	To be precise, if we're compiling for an architecture with only three registers, we'd have to spill/split webs when we didn't need to before. If, for example, we spill `t0` to memory, we'd have to do a memory load every iteration of the loop, which might be more expensive than the subtraction operation we saved.

1. `a` and `c` are used throughout the loop, so they each get one big web. `b` gets a web from `b = 3 * a`, `b > 6` and `x = b` (`b = 0` doesn't produce a web since that def is never used). `x` gets two webs, one from the first four lines, and one from `x = b` and `print(x)`.

	`a`'s, `b`'s and `c`'s webs interfere with each other. Both of `x`'s webs do not interfere with any other web. This gives the following interference graph:

	```
	   a        x1
	  / \
	 /   \
	b --- c     x2
	```

	The resulting graph is 3-colorable, so we can complete register allocation with three registers without spilling or splitting webs.

	We can do with only two registers by splitting the `c` web:

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
	    store c
	    b = 3 * a
	    if (b > 6) {
	        x = b
	        break
	    }
	    load c
	    c = c + 1
	}
	print(x)
	```

	`c` still contributes only one web, but it no longer interferes with `b`'s web. The resulting interference graph is now 2-colorable.

1. There are multiple approaches to this question. One approach uses a flat lattice over N as the base lattice; this is the approach described in this solution. Another common approach uses N ∪ ∞ (with the natural ordering) as the base lattice; while better able to find opportunities for optimization, it requires the use of a widening operator to ensure that the analysis terminates.

	Define the base lattice `B`:

	```
	⊤
	|\ \ \
	0 1 2 3 ...
	|/ / /
	⊥
	```

	(i.e. `B = N ∪ {⊥, ⊤}` with `⊥ ≤ n ≤ ⊤` for all `n ∈ N`)

	Lattice elements are of the form `{x₁ ↦ v₁, x₂ ↦ v₂, ..., xₙ ↦ vₙ}`, where `v₁, v₂, ..., vₙ ∈ B`.

	The transfer function for `x = concat(x1, x2)` is `f(l) = l[x ↦ l[x1] ⊕ l[x2]]` (i.e. add or set the mapping `x ↦ l[x1] ⊕ l[x2]` to `l`), where `⊕` is defined by the following table:

	```
	   | ⊥    n1   ⊤
	---+-------------
	⊥  | ⊥    ⊥    ⊤
	n2 | ⊥  n1+n2  ⊤
	⊤  | ⊤    ⊤    ⊤
	```

	Finally, the following program gives an analysis result that differs from the meet-over-paths solution:

	```
	if (b) {
	  x1 = [0]
	  x2 = [0, 0]
	}
	else {
	  x1 = [0, 0]
	  x2 = [0]
	}
	x = concat(x1, x2)
	```

	The meet-over-paths solution gives `{x1 ↦ ⊤, x2 ↦ ⊤, x ↦ 3}` at the end of the program. The length of `x` will be 3, no matter the value of `b`, even though we can't say for sure what the lengths of `x1` and `x2` are.

	However, the analysis result would give `{x1 ↦ ⊤, x2 ↦ ⊤, x ↦ ⊤}`. Since it must assign a single value to `x1` and `x2` at the merge point, we must have `x1 ↦ ⊤, x2 ↦ ⊤` coming into the concat statement. The transfer function then gives `x ↦ ⊤`.
