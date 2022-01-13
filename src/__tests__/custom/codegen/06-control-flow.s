.section .rodata
.msg0:
    .string "ERROR: for loop is bad (1)\n"
.msg1:
    .string "ERROR: for loop is bad (2)\n"
.msg2:
    .string "%d\n"
.msg3:
    .string "control flow OK if no previous output\n"

.section .text

.globl main

main:
    enter $32, $0

    movq $0, -16(%rbp)

    movq $0, -24(%rbp)

    jmp .L0
.L1:

    movq -24(%rbp), %rcx
    addq %rcx, -16(%rbp)

    addq $1, -24(%rbp)
.L0:

    cmpq $10, -24(%rbp)
    jl .L1

    cmpq $45, -16(%rbp)
    je .L2

    movq $.msg0, %rdi
    call printf
.L2:

    movq $11, -8(%rbp)

    movq $10, -24(%rbp)

    jmp .L3
.L4:

    addq $1, -8(%rbp)

    addq $1, -24(%rbp)
.L3:

    cmpq $0, -24(%rbp)
    jl .L4

    cmpq $11, -8(%rbp)
    je .L5

    movq $.msg1, %rdi
    call printf

    movq -8(%rbp), %rsi
    movq $.msg2, %rdi
    call printf
.L5:

    movq $.msg3, %rdi
    call printf

    movq $0, %rax
    leave
    ret
