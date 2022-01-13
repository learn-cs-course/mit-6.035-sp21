.section .rodata
.msg0:
    .string "10! = %d (3628800)\n"

.section .text

.globl factorial

factorial:
    enter $16, $0

    movq %rdi, -8(%rbp)

    cmpq $1, -8(%rbp)
    jle .L0

    movq -8(%rbp), %rcx
    subq $1, %rcx

    movq %rcx, %rdi
    call factorial

    imulq -8(%rbp), %rax
    jmp .L1

.L0:
    movq $1, %rax

.L1:
    leave
    ret

.globl main

main:
    enter $16, $0

    movq $10, %rdi
    call factorial
    movq %rax, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg0, %rdi
    call printf

    movq $0, %rax
    leave
    ret
