.section .text
.globl main

main:
    enter $0, $0

    movq $0, %rax
    leave
    ret
