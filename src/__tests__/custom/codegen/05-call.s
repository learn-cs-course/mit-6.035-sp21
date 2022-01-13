.section .rodata
.msg0:
    .string "correct\n"
.msg1:
    .string "INCORRECT\n"
.msg2:
    .string "sum of 1 - 8 is %d (36)\n"

.section .text

.globl add

add:
    enter $16, $0

    movq %rdi, -8(%rbp)
    movq %rsi, -16(%rbp)

    movq -8(%rbp), %rcx
    addq -16(%rbp), %rcx

    movq %rcx, %rax
    leave
    ret

.globl sub

sub:
    enter $16, $0

    movq %rdi, -8(%rbp)
    movq %rsi, -16(%rbp)

    movq -8(%rbp), %rcx
    subq -16(%rbp), %rcx

    movq %rcx, %rax
    leave
    ret

.globl sum

sum:
    enter $64, $0

    movq %rdi, -8(%rbp)
    movq %rsi, -16(%rbp)
    movq %rdx, -24(%rbp)
    movq %rcx, -32(%rbp)
    movq %r8, -40(%rbp)
    movq %r9, -48(%rbp)

    movq -8(%rbp), %rcx
    addq -16(%rbp), %rcx
    addq -24(%rbp), %rcx
    addq -32(%rbp), %rcx
    addq -40(%rbp), %rcx
    addq -48(%rbp), %rcx
    addq 16(%rbp), %rcx
    addq 24(%rbp), %rcx

    movq %rcx, %rax
    leave
    ret

.globl main

main:
    enter $32, $0

    movq $1, -8(%rbp)
    movq $2, -16(%rbp)

    movq -16(%rbp), %rsi
    movq -8(%rbp), %rdi
    call add
    movq %rax, -24(%rbp)

    movq -16(%rbp), %rsi
    movq -24(%rbp), %rdi
    call sub
    movq %rax, -32(%rbp)

    movq -32(%rbp), %rcx
    cmpq -8(%rbp), %rcx
    jne .L0

    movq $.msg0, %rdi
    call printf
    jmp .L1
.L0:

    movq $.msg1, %rdi
    call printf
.L1:

    pushq $8
    pushq $7
    movq $6, %r9
    movq $5, %r8
    movq $4, %rcx
    movq $3, %rdx
    movq $2, %rsi
    movq $1, %rdi
    call sum
    addq $16, %rsp

    movq %rax, %rsi
    movq $.msg2, %rdi
    call printf

    movq $0, %rax
    leave
    ret
