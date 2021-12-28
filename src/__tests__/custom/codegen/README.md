## codegen 汇编代码文件

这里放一些我手写的汇编文件，这些汇编文件可以用 `gcc -no-pie -o ${binary} -L ./lib -l6035 ${filename}.s` 生成出可以通过 6.035 课程的 codegen 测试用例的文件。

这样我在写 compiler 的时候，就可以直接对比这里的文件字符串了，能省很多事。
