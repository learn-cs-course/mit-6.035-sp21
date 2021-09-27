1. Regular expression: `(00|11|(01|10)(00|11)*(01|10))*`

	One way to construct the DFA is to have a four states tracking the whether the number of 0's is even or odd, and whether the number of 1's is even or odd.

	```
	              even #0s                 odd #0s

	             ----------       0       ----------
	             |        |  ---------->  |        |
	even #1s     | start, |               |        |
	             | accept |  <----------  |        |
	             |        |       0       |        |
	             ----------               ----------
	               |   ∧                     |   ∧ 
	               |   |                     |   |
	              1|   |1                   1|   |1
	               |   |                     |   |
	               ∨   |                     ∨   |
	             ----------       0       ----------
	             |        |  ---------->  |        |
	odd #1s      |        |               |        |
	             |        |  <----------  |        |
	             |        |       0       |        |
	             ----------               ----------
	```

1. Parse trees for `id pp id`:

	```
	L
	|\
	| \
	L  S
	|  |
	|  |
	S  id
	|\
	| \
	id pp
	```

	```
	L
	|\
	| \
	L  S
	|  |\
	|  | \
	S  pp id
	|
	|
	id
	```

	This causes a shift-reduce conflict. Suppose the parser consumes `id` and encounters `pp`. The parser can reduce by rule 3 since `pp` is in the follow set of `S`, or shift `pp` onto the stack as allowed by rule 5.

	Hacked, unambiguous grammar:

	```
	L → L1
	L → L2
	L → L3
	L1 → S1
	L1 → L1 S1
	L1 → L2 S1
	L1 → L3 S1
	L2 → S2
	L2 → L2 S2
	L2 → L3 S2
	L3 → S3
	L3 → L1 S3
	L3 → L2 S3
	L3 → L3 S3
	S1 → id
	S2 → pp id
	S3 → id pp
	```

	This uses the idea described in the hint. It eliminates rule `L2 → L1 S2`, corresponding to rejecting `(id) (pp id)` in favor of `(id pp) (id)`.

1. The first snippet typechecks when `r` is an `ImageReader`. It prints `89 50 4E 47` under dynamic dispatch and nothing under static dispatch.

	The second snippet does not typecheck. `PngReader` and `WavReader` do not have a common ancestor in the class hierarchy.
