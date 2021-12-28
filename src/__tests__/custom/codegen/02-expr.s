.section .rodata
.msg0:
    .string "%d %d\n"

.section .text
.globl main

main:
    enter $64, $0

    movq $10, -8(%rbp)
    movq $20, -16(%rbp)
    movq $30, -24(%rbp)

    movq -8(%rbp), %rcx
    addq -16(%rbp), %rcx
    movq %rcx, -32(%rbp)

    movq -24(%rbp), %rcx
    imulq $3, %rcx
    movq %rcx, -40(%rbp)

    movq -32(%rbp), %rcx
    imulq -40(%rbp), %rcx
    subq $100, %rcx
    movq %rcx, -40(%rbp)

    movq -40(%rbp), %rdx
    movq -32(%rbp), %rsi
    movq $.msg0, %rdi
    call printf

    movq -32(%rbp), %rax
    movq $16, %rcx
    cqto
    idivq %rcx
    movq %rdx, -48(%rbp)

    movq -40(%rbp), %rax
    movq $100, %rcx
    cqto
    idivq %rcx
    movq %rax, -56(%rbp)

    movq -56(%rbp), %rdx
    movq -48(%rbp), %rsi
    movq $.msg0, %rdi
    call printf

    movq $0, %rax
    leave
    ret
