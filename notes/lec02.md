# Language Description, Regular Expressions, and Context-Free Grammars

## Definition and Description of Formal Languages

According to Wikipedia, in the field of computer science, when we use the term "language," we typically refer to a **formal language**. To define a formal language, we first need to establish some foundational concepts.

### Alphabet

An **alphabet** (denoted Σ) is a finite, non-empty set of symbols. These symbols are the atomic building blocks of a language.

Examples:
- Binary alphabet: Σ = {0, 1}
- Latin alphabet: Σ = {a, b, c, …, z}
- ASCII characters used in programming languages

### String

A **string** (also called a *word*) is a finite sequence of symbols drawn from an alphabet. The **empty string** (denoted ε) is the string of length zero.

- The **length** of string *w* is written |w|. For example, |"abc"| = 3 and |ε| = 0.
- **Concatenation**: for strings *u* and *v*, *uv* is the string formed by appending *v* after *u*.
- **Kleene star** Σ\* denotes the set of all finite strings over Σ, including ε.
- Σ⁺ = Σ\* \ {ε} denotes all non-empty strings over Σ.

### Language

A **language** *L* over alphabet Σ is any subset of Σ\*, i.e., L ⊆ Σ\*.

Examples:
- The empty language: L = ∅ (no strings at all)
- The language containing only the empty string: L = {ε}
- The set of all binary strings with an even number of 1s
- All syntactically valid Java programs

In this document, languages are sets of strings we care about describing precisely.

### Language Description

How do we precisely describe a language? To answer this, we organize a language into a hierarchy of structures:

- **Alphabet**: defines which characters (letters) may appear in the language.
- **Lexical structure**: defines which *words* (sequences of characters) are valid tokens in the language.
- **Syntactic structure**: defines which *sentences* (sequences of tokens/words) form valid programs or expressions.
- **Semantics**: the *meaning* of a program — describes what output is produced for a given input.

In this lecture, we focus primarily on **lexical** and **syntactic** structure.

There are two mainstream approaches to language description:

- **Generative approach**: describes a language by specifying how to *generate* its strings. This corresponds to **regular expressions** and **grammars** introduced below.
- **Recognition approach**: describes a language by specifying a procedure that *accepts* or *rejects* a given string. This corresponds to **automata** introduced later.

These two approaches are closely connected: for every generative description, there is an equivalent recognizer, and vice versa.

---

## Regular Expressions

Regular expressions (regex) provide a compact, algebraic notation for describing sets of strings, i.e., languages.

### Formal Definition

Given an alphabet Σ, the **regular expressions** over Σ and the **languages they denote** are defined inductively:

| Regular Expression | Denoted Language |
|--------------------|-----------------|
| ∅ | The empty language {} |
| ε | {ε} (the language containing only the empty string) |
| *a* (for each *a* ∈ Σ) | {*a*} |
| *r*₁ \| *r*₂ | L(*r*₁) ∪ L(*r*₂)  — **union / alternation** |
| *r*₁ *r*₂ | L(*r*₁) · L(*r*₂)  — **concatenation** |
| *r*\* | L(*r*)\*  — **Kleene star (zero or more repetitions)** |

Parentheses are used for grouping. Operator precedence (highest to lowest): `*`, concatenation, `|`.

### Why Regular Expressions Are Generative

A regular expression describes a language by telling us how to *build* strings that belong to it. We can apply a sequence of operations to expand the expression until we enumerate (or characterize) all strings it generates.

For example, the regex `(0|1)*1` generates:
- Start with any binary string (including ε) via `(0|1)*`
- Append a `1`
- Result: all binary strings that **end in 1**

### Examples of Regular Languages

| Regex | Language |
|-------|----------|
| `[a-z]+` | One or more lowercase letters |
| `[0-9]+(\.[0-9]+)?` | Integer or decimal literals |
| `//[^\n]*` | C++-style single-line comments |
| `[a-zA-Z_][a-zA-Z0-9_]*` | Valid C identifiers |
| `(ab)*` | Even-length strings over {a,b} where each pair is "ab" |

### Limitations of Regular Expressions

Regular expressions can **not** describe all languages. A famous example is the language of balanced parentheses: `{(), (()), ((())), …}`. This language requires "counting" and therefore cannot be captured by any regular expression. Such languages require **context-free grammars** (see below).

---

## Finite State Automata

Finite state automata (FSA) are the *recognition* counterpart to regular expressions. An FSA reads an input string one symbol at a time and either accepts or rejects it.

### Deterministic Finite Automaton (DFA)

A **DFA** is a 5-tuple M = (Q, Σ, δ, q₀, F) where:

- **Q** — a finite set of *states*
- **Σ** — the input alphabet
- **δ : Q × Σ → Q** — the *transition function* (for each state and input symbol, exactly one next state)
- **q₀ ∈ Q** — the *start state*
- **F ⊆ Q** — the set of *accepting (final) states*

A DFA **accepts** a string *w* if, starting from q₀ and following transitions for each symbol of *w*, the machine ends in a state in F.

**Example** — DFA accepting binary strings ending in `1`:

```
States: {A, B}   Start: A   Accept: {B}
Transitions:
  A --0--> A
  A --1--> B
  B --0--> A
  B --1--> B
```

### Non-deterministic Finite Automaton (NFA)

A **NFA** is also a 5-tuple (Q, Σ, δ, q₀, F), but the transition function is:

δ : Q × (Σ ∪ {ε}) → 𝒫(Q)

That is, from a given state and input symbol, the NFA may move to *zero, one, or many* states simultaneously. It may also take **ε-transitions** (move without consuming input).

An NFA **accepts** a string *w* if *there exists* at least one sequence of transitions that leads from q₀ to an accepting state after reading all of *w*.

### DFA vs. NFA — Key Points

| Property | DFA | NFA |
|----------|-----|-----|
| Transitions per (state, symbol) | Exactly 1 | 0 or more |
| ε-transitions | No | Yes |
| Acceptance condition | Unique computation path ends in F | At least one path ends in F |
| Expressive power | Equal to NFA | Equal to DFA |
| Simulation complexity | O(n) per symbol | O(n·\|Q\|) per symbol via subset construction |

**Theorem (Rabin–Scott, 1959):** For every NFA there exists an equivalent DFA that recognizes the same language. The construction is called the **subset construction** (powerset construction).

### From Regular Expressions to DFAs

The pipeline used in a typical lexer (tokenizer) is:

```
Regular Expression
       |
       | Thompson's construction
       v
      NFA
       |
       | Subset construction
       v
      DFA
       |
       | Hopcroft's minimization
       v
  Minimal DFA
```

1. **Thompson's construction** converts a regex to an NFA in O(|r|) states.
2. **Subset construction** converts the NFA to a DFA (potentially exponential in states, but usually manageable in practice).
3. **Hopcroft's algorithm** minimizes the DFA to the fewest possible states.

---

## Context-Free Grammars

For syntactic structure (beyond what regular expressions can express), we use **context-free grammars (CFGs)**.

### Formal Definition

A CFG is a 4-tuple G = (V, Σ, R, S) where:

- **V** — a finite set of *non-terminal* symbols (variables)
- **Σ** — a finite set of *terminal* symbols (the alphabet), disjoint from V
- **R** — a finite set of *production rules* of the form A → α, where A ∈ V and α ∈ (V ∪ Σ)\*
- **S ∈ V** — the *start symbol*

A string *w* ∈ Σ\* is in the language L(G) if and only if S ⟹\* *w* (the start symbol derives *w* in zero or more steps).

### Example — Arithmetic Expressions

```
E → E + T | T
T → T * F | F
F → ( E ) | id | num
```

This grammar generates all arithmetic expressions with `+` and `*`, respecting precedence (multiplication binds tighter than addition).

### Parse Trees

A **parse tree** represents the hierarchical derivation of a string. Internal nodes are non-terminals; leaves are terminals. Parse trees make the syntactic structure of a program explicit and are the input to the semantic analysis phase.

### Ambiguity

A grammar is **ambiguous** if some string has more than one parse tree (or equivalently, more than one leftmost derivation). Ambiguity is generally undesirable in programming language grammars because it makes the meaning of a program unclear. Ambiguity can often be eliminated by restructuring the grammar (e.g., encoding operator precedence and associativity directly into the rules).

### Chomsky Hierarchy

The Chomsky hierarchy classifies formal grammars by expressive power:

| Type | Grammar | Recognizer | Example |
|------|---------|-----------|---------|
| Type 3 | Regular grammar | Finite automaton | Token patterns |
| Type 2 | Context-free grammar | Pushdown automaton | Programming language syntax |
| Type 1 | Context-sensitive grammar | Linear-bounded automaton | (rare in PL) |
| Type 0 | Unrestricted grammar | Turing machine | General computation |

In compiler construction, we primarily work with **Type 3** (lexing) and **Type 2** (parsing).
