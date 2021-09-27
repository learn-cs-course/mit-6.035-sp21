# 6.035 Computer Language Engineering SP21

__WE WILL MAKE ALL ANNOUNCEMENTS VIA [PIAZZA][piazza], SO MAKE SURE THAT YOU ENROLL__

If neither this site nor the Piazza has the information you need, you should [email the TA's directly](#course-staff)

## Table of Contents

1. [Schedule](#schedule-tentative)
1. [General Administrivia](#general-administrivia)
	1. [Course Staff](#course-staff)
	1. [MIT Catalog Description](#mit-catalog-description)
	1. [Recommended Texts](#recommended-texts)
	1. [Communication](#communication)
	1. [Grading](#grading)
	1. [Late policy](#late-policy)
	1. [Collaboration](#collaboration)
	1. [Compiler project](#compiler-project)
	1. [Class meetings](#class-meetings)
	1. [Contact](#contact)
	1. [Office Hours](#office-hours)
1. [Reference Materials](#reference-materials)
	1. [Official References](#official-references)
		1. [Provided During Exams](#provided-during-exams)
	1. [Unofficial References](#unofficial-references)

## Schedule (Tentative)

[Official MIT Calendar](https://registrar.mit.edu/calendar)

```txt
                                            2021
      February                 March                   April                    May
Su Mo Tu We Th Fr Sa    Su Mo Tu We Th Fr Sa    Su Mo Tu We Th Fr Sa    Su Mo Tu We Th Fr Sa
    1  2  3  4  5  6        1  2  3  4  5  6                 1  2  3                       1
 7  8  9 10 11 12 13     7  8  9 10 11 12 13     4  5  6  7  8  9 10     2  3  4  5  6  7  8
14 15 16 17 18 19 20    14 15 16 17 18 19 20    11 12 13 14 15 16 17     9 10 11 12 13 14 15
21 22 23 24 25 26 27    21 22 23 24 25 26 27    18 19 20 21 22 23 24    16 17 18 19 20 ...
28                      28 29 30 31             25 26 27 28 29 30       
```

__!!! Note: This schedule is tentative and may change throughout the semester. !!!__

`L: parsing~55` means that the topic was `parsing` and we covered up to slide `55`.

|                 | Monday          | Tuesday         | Wednesday       | Thursday        | Friday          |
| :-:             | :-:             | :-:             | :-:             | :-:             | :-:             |
| `02/15 - 02/19` |                 | __FIRST DAY__<br/>[LOGISTICS FORM][gform-1]<br/>[L: regex~39][lec02] | [L: regex~62][lec02] | [L: top-down~53][lec03] | [P1 RELEASE][P1 RELEASE]<br/>[L: top-down~$][lec03] |
| `02/22 - 02/26` | P1 OH<br/>(during lecture slot) |                 |                 |                 |                 |
| `03/01 - 03/05` | [L: shift-reduce~104][lec04] | [L: shift-reduce~133][lec04] | [L: shift-reduce~$][lec04]<br/>[L: IR~52][lec05] | [L: IR~$][lec05] | __P1 DUE__<br/>[P2 RELEASE][P2 RELEASE]<br/>[PSET A][pset a]<br/>[L: sem~$][lec06] |
| `03/08 - 03/12` | Student holiday | [SUBMIT TEAM][SUBMIT TEAM]<br/>[L: codegen~58][lec07] | [L: codegen~79][lec07] | [L: codegen~$][lec07] | |
| `03/15 - 03/19` | | | | | ADD DATE<br/>__P2 DUE__<br/> |
| `03/22 - 03/26` | Student holiday | Student holiday | [L: dataflow~31][lec08] | [L: dataflow~$][lec08] | __PSET A DUE__ |
| `03/29 - 04/02` | [L: dataflow~48][lec09] | | [L: dataflow~$][lec09] | | |
| `04/05 - 04/09` |                 |                 |                 |                 | __P3 DUE__      |
| `04/12 - 04/16` | [L: loops~18][lec10] | [L: loops~$][lec10] | [L: lattice~15][lec12] | CPW<br/>[L: lattice~47][lec12] | CPW<br/> |
| `04/19 - 04/23` | Patriots' Day | Student holiday | [L: lattice][lec12] | [L: reg~35][lec11] | __P4 DUE__<br/>[L: reg~$][lec11] |
| `04/26 - 04/30` | [L: lattice~62][lec12] | | [L: lattice~$][lec12] | DROP DATE<br/>[L: sched~52][lec15] | |
| `05/03 - 05/07` | __PSET B DUE__<br/>[L: sched~165][lec15] | [L: parallel][lec13] |                 | [L: parallel][lec13] | __CHECKPOINT__ |
| `05/10 - 05/14` |                 |                 |                 | L: research | L: research |
| `05/17 - 05/21` |                 |                 | __P5 DUE MIDNIGHT__      | __LAST DAY__<br/>__L: DERBY__ |      |

<!--- lecture slides --->
[lec01]: materials/lecture/lec01-f19-intro.pdf
[lec02]: materials/lecture/lec02-f19-regex-grammar.pdf
[lec03]: materials/lecture/lec03-f19-top-down-parsing.pdf
[lec04]: materials/lecture/lec04-f19-shift-reduce-parsing.pdf
[lec05]: materials/lecture/lec05-f19-intermediate-representation.pdf
[lec06]: materials/lecture/lec06-f19-semantic-analysis.pdf
[lec07]: materials/lecture/lec07-unoptimized-codegen.pdf
[lec08]: materials/lecture/lec08-s21-program-analysis.pdf
[lec09]: materials/lecture/lec09-program-analysis-2.pdf
[lec10]: materials/lecture/lec10-loop-optimization.pdf
[lec11]: materials/lecture/lec11-register-allocation.pdf
[lec12]: materials/lecture/lec12-foundations-of-dataflow.pdf
[lec13]: materials/lecture/lec13-parallelization.pdf
[lec14]: materials/lecture/lec14-mem.pdf
[lec15]: materials/lecture/lec15-sched.pdf

<!--- others --->
[piazza]: https://piazza.com/mit/spring2021/6035
[gform-1]: https://forms.gle/R2BebDW2ZEXfwtdE8

<!--- project phases --->
[P1 RELEASE]: phase-1/
[P2 RELEASE]: phase-2/
[P3 RELEASE]: phase-3/

[pset a]: materials/psets/pset-a.md
[pset a sol]: materials/psets/pset-a-sol.md

<!--- handouts --->
[course tools]: materials/handouts/01-athena.pdf
[project info]: materials/handouts/01-project-overview.pdf
[decaf spec]: materials/handouts/01-decaf-spec.pdf
[SUBMIT TEAM]: https://forms.gle/LMbee24cAhgtchfM7
[quiz]: materials/exam/2019fa-exam1.pdf
[solutions]: materials/exam/2019fa-exam1-answers.pdf

<!--- miniquizzes --->

<!--- exams and answer keys --->
[11-e1]: materials/exam/2011-exam1.pdf
[11-k1]: materials/exam/2011-exam1-key.pdf
[13-e1]: materials/exam/2013-exam1.pdf
[13-k1]: materials/exam/2013-exam1-key.pdf
[14-e1]: materials/exam/2014-exam1.pdf
[14-k1]: materials/exam/2014-exam1-key.pdf
[16-e1]: materials/exam/2016fa-exam1.pdf
[16-k1]: materials/exam/2016fa-exam1-key.pdf
[17-e1]: materials/exam/2017fa-exam1.pdf
[17-k1]: materials/exam/2017fa-exam1-key.pdf
[18-e1]: materials/exam/2018fa-exam1.pdf
[18-k1]: materials/exam/2018fa-exam1-key.pdf

## General Administrivia

### Course Staff

- Faculty
    - Martin Rinard <rinard@csail.mit.edu>
    - Michael Carbin <mcarbin@csail.mit.edu>
- TA
    - Mark Theng <mtheng@mit.edu>

### MIT Catalog Description

- Prereq -- `6.004`, `6.031`
- Level -- `U`
- Units -- `4-4-4`

Analyzes issues associated with the implementation of higher-level programming languages. Fundamental concepts, functions, and structures of compilers. The interaction of theory and practice. Using tools in building software. Includes a multi-person project on compiler design and implementation.

### Recommended Texts

6.035 has no officially required textbook. All of the material you need is taught in class, with the exception of the documentation for your implementation language and associated libraries. However, the following books may be helpful in implementing various components of your compiler, and are available from MIT libraries.

```txt
Modern Compiler Implementation in Java (Tiger Book)
Andrew W. Appel and Jens Palsberg
Cambridge University Press, 2002
```

Many other resources such as technical papers, interesting and useful blog posts, and reference guides are available on the references page.

### Communication

We will distribute assignments here and make all announcements via [Piazza][piazza]. Important announcements will also be made via email.

Since lecture dates are not all finalized at the start of the semester, please check the schedule regularly.

### Grading

|Component             |Weight |
|----------------------|-------|
|Project phases 2 and 3|25%    |
|Project phases 4 and 5|50%    |
|Problem set A         |9%     |
|Problem set B         |10%    |
|Miniquizzes           |6%     |

For more information on the way the compiler project is graded, see the [project overview][project info].

### Late policy

We expect you to submit all components of the class on time. For extensions under extenuating circumstances (e.g., you are sick for a week, family emergencies), we require a letter from one of the student deans at S^3.

### Collaboration

Although you may discuss the projects with anybody, you must develop the code yourself. For the scanner/parser project, you must develop your code alone. On all subsequent projects, you should work with your team members, but you may not develop or share any code with other teams.

You may collaborate on the mini-quizzes and the problem sets, but you should write all solutions yourself.

Do not post your lab or homework solutions on publicly accessible web sites or file spaces; this enables cheating for students in future years.

### Compiler project

This class involves a group project, where you will build a compiler almost entirely from scratch. Details about the project can be found [here][project info]. Specific instructions for each phase of the project will be released later in the class.

### Class meetings

Lectures:

- 11am-12pm MTWRF on Zoom. The link will be distributed on [Piazza][piazza].

To find out whether there is lecture on a given day, check the calendar above. Lectures will be recorded, so don't worry if you can't make them.

### Contact

For all general questions and/or concerns, please post on Piazza.

If the matter is private, please email the TA's directly.

### Office Hours

Refer to Piazza for the latest updates about office hours. We will have additional office hours before each quiz and each phase of the project.

## Reference Materials

This section contains a number of useful and/or interesting references selected by the staff. You are not expected to know most of the material on this page for the class; however, you may find it interesting and helpful.

### Official References

1. The complete [Intel x64 manual](http://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-software-developer-manual-325462.pdf)
1. [Intel x64 Optimization Reference Manual](http://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-optimization-manual.pdf)
1. [x64 wiki](https://en.wikibooks.org/wiki/X86_Assembly/X86_Instructions)
1. [x64 cheat sheet](https://cs.brown.edu/courses/cs033/docs/guides/x64_cheatsheet.pdf) -- lists and tables detailing registers and assembly commands
1. [x86-64 architecture guide](http://6.035.scripts.mit.edu/fa18/x86-64-architecture-guide.html) -- a walkthrough with an example, and common commands
1. [Intel x64 manual](https://software.intel.com/en-us/articles/intel-sdm)
1. [Intel developer manual](https://software.intel.com/sites/default/files/managed/39/c5/325462-sdm-vol-1-2abcd-3abcd.pdf) -- detailed description of some assembly instructions

#### Provided During Exams

1. [x64 cheat sheet](https://cs.brown.edu/courses/cs033/docs/guides/x64_cheatsheet.pdf) -- lists and tables detailing registers and assembly commands

### Unofficial References

Interesting blog posts, papers, etc

1. Overviews
    1. [LLVM compiler architecture](http://www.aosabook.org/en/llvm.html)
    1. [GCC compiler architecture](http://en.wikibooks.org/wiki/GNU_C_Compiler_Internals/GNU_C_Compiler_Architecture)
1. Blogs
    1. [Russ Cox's Blog](http://research.swtch.com/) -- Russ is one of the developers of Google Go, a pretty interesting language.
    1. [Ian Wienand's Blog](http://www.technovelty.org/) -- Whoever he is, he writes about compiler and language internals, the magic black box that is the linker, and more
    1. [Matt Might's Blog](http://matt.might.net/articles/) -- Matt is a professor at the University of Utah and has written some very interesting articles (e.g. "Yacc is dead")
1. Papers
    1. [Register Allocation & Spilling via Graph Coloring](http://dl.acm.org/citation.cfm?id=806984) -- G.J. Chaitin / 1982. Great (short) paper on simple register allocation.
    1. [Linear Scan Register Allocation](https://dl.acm.org/citation.cfm?id=330250)
    1. [Iterated Register Coalescing](http://dl.acm.org/citation.cfm?id=229546) -- Lal George / 1996. Presents improvements/alternative to Chaitin's design. If Chaitin-style (+/-Briggs) register allocation isn't enough for you, this paper is a good read - actually, it's a good read anyway, to understand the tradeoffs
    1. [Superword Level Parallelism](http://dl.acm.org/citation.cfm?id=358438) combined with loop unrolling, a simple way to implement a vectorizing compiler
1. Miscellaneous
    1. [Scala Patterns for Compiler Design](https://gist.github.com/rcoh/4992969)
    1. `6.823 Advanced Computer Architecture` [lecture notes](http://csg.csail.mit.edu/6.823/lecnotes.html)
