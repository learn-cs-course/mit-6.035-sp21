# Problem Set A

1. Let L be the language of binary strings that have an even number of 0's **and** and even number of 1's.
	1. Write a regular expression that recognizes L. Use only the syntax used in lecture: |, \*, ε, ().
	1. Draw a DFA that recognizes L. You may derive it from scratch, or from your regular expression by converting it to an NFA and then to a DFA. Clearly indicate the start state and accept states. As a reminder, each edge should contain exactly one character; do not merge edges.

		Challenge: use at most four states. (This is entirely optional, there is no extra credit.)

1. Consider the following grammar. Symbols in uppercase are non-terminals, while symbols in lowercase are terminals. You can think of this as describing a language containing only C-style increments, e.g. `a++ ++a a a++ a`.

	```
	(1) L → S
	(2) L → L S
	(3) S → id
	(4) S → pp id
	(5) S → id pp
	```

	1. Show that this grammar is ambiguous by providing two parse trees for a string in the language.
	1. Using the SLR parsing algorithm covered in class, does this ambiguity result in a shift-reduce or a reduce-reduce conflict? Explain why.
	1. Hack the grammar to make it unambiguous. You can resolve ambiguities in either direction. Explain in a few sentences how your new grammar eliminates the ambiguity, and if isn't immediately clear from your grammar rules, why it recognizes the same language.

1. Consider the following class hierarchy:

	```
	class ImageReader {
	    string GetMagicNumber() {
	        return ""
	    }
	}
	class PngReader extends ImageReader {
	    string GetMagicNumber() {
	        return "89 50 4E 47"
	    }
	}
	class GifReader extends ImageReader {
	    string GetMagicNumber() {
	        return "47 49 46 38"
	    }
	}

	class AudioReader {
	    string GetMagicNumber() {
	        return ""
	    }
	}
	class WavReader extends AudioReader {
	    string GetMagicNumber() {
	        return "52 49 46 46"
	    }
	}
	```

	For each of the following code snippets, does there exist an assignment of types to variables that would make it typecheck? If so, provide a type for `r`, and state what would be printed under static and dynamic dispatch respectively when `b = true`. If not, explain why.

	1. ```
		...
		if (b) {
		    r = new PngReader()
		}
		else {
		    r = new GifReader()
		}
		print(r.GetMagicNumber())
		...
		```

	1. ```
		...
		if (b) {
		    r = new PngReader()
		}
		else {
		    r = new WavReader()
		}
		print(r.GetMagicNumber())
		...
		```

## Submission

Submit the problem set on Gradescope. The link and entry code will be provided on Piazza.

## Hints

- (1i) Construct a regular expression for the language of strings with alphabet `{e, o}`, that contain any number of e's but an even number of o's.
- (1i) In the previous hint, what happens if you replace `e` with `(00|11)` and `o` with `(01|10)`?
- (1i) Check that your regular expression accepts the string `1111010000101111`.
- (2iii) There are multiple ways to approach this problem, but this is one of them. Let `S1 → id`, `S2 → pp id`, and `S3 → id pp`. Now define `L1`, `L2` and `L3` to be sequences of `S`s ending with an `S1`, `S2` and `S3` respectively. Construct recursive rules of the form `Li → Lj Si`. Which of these rules should be eliminated?
- (2iii) Check that your grammar accepts `pp id id pp` and `id pp pp id` but not `pp id pp pp id pp`.
- (2iii) If you want, you can check that your grammar is unambiguous by contructing a parse table for it, perhaps with the help of an LALR(1) parser generator like yacc.
