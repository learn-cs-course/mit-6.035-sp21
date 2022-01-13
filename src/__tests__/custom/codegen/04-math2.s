.section .rodata
.msg0:
    .string "10 + 20 is %d (30)\n"
.msg1:
    .string "10 - 20 is %d (-10)\n"
.msg2:
    .string "10 * 20 is %d (200)\n"
.msg3:
    .string "a < b is correct\n"
.msg4:
    .string "a <= b is correct\n"
.msg5:
    .string "a > b is incorrect\n"
.msg6:
    .string "a >= b is incorrect\n"
.msg7:
    .string "c < b is incorrect\n"
.msg8:
    .string "c <= b is correct\n"
.msg9:
    .string "c > b is incorrect\n"
.msg10:
    .string "c >= b is correct\n"
.msg11:
    .string "a == a is correct\n"
.msg12:
    .string "a == b is incorrect\n"
.msg13:
    .string "a != b is correct\n"
.msg14:
    .string "true and true is correct\n"
.msg15:
    .string "false and true is incorrect\n"
.msg16:
    .string "true and false is incorrect\n"
.msg17:
    .string "false and false is incorrect\n"
.msg18:
    .string "true or true is correct\n"
.msg19:
    .string "false or true is correct\n"
.msg20:
    .string "true or false is correct\n"
.msg21:
    .string "false or false is incorrect\n"

.section .text
.globl main

main:
    enter $32, $0

    movq $10, %rcx
    addq $20, %rcx
    movq %rcx, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg0, %rdi
    call printf

    movq $10, %rcx
    subq $20, %rcx
    movq %rcx, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg1, %rdi
    call printf

    movq $10, %rcx
    imulq $20, %rcx
    movq %rcx, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg2, %rdi
    call printf

    movq $1, -8(%rbp)
    movq $2, -16(%rbp)
    movq $2, -24(%rbp)

    movq -8(%rbp), %rcx
    cmpq -16(%rbp), %rcx
    jge .L0

    movq $.msg3, %rdi
    call printf
.L0:

    movq -8(%rbp), %rcx
    cmpq -16(%rbp), %rcx
    jg .L1

    movq $.msg4, %rdi
    call printf
.L1:

    movq -8(%rbp), %rcx
    cmpq -16(%rbp), %rcx
    jle .L2

    movq $.msg5, %rdi
    call printf
.L2:

    movq -8(%rbp), %rcx
    cmpq -16(%rbp), %rcx
    jl .L3

    movq $.msg6, %rdi
    call printf
.L3:

    movq -24(%rbp), %rcx
    cmpq -16(%rbp), %rcx
    jge .L4

    movq $.msg7, %rdi
    call printf
.L4:

    movq -24(%rbp), %rcx
    cmpq -16(%rbp), %rcx
    jg .L5

    movq $.msg8, %rdi
    call printf
.L5:

    movq -24(%rbp), %rcx
    cmpq -16(%rbp), %rcx
    jle .L6

    movq $.msg9, %rdi
    call printf
.L6:

    movq -24(%rbp), %rcx
    cmpq -16(%rbp), %rcx
    jl .L7

    movq $.msg10, %rdi
    call printf
.L7:

    movq -8(%rbp), %rcx
    cmpq %rcx, %rcx
    jne .L8

    movq $.msg11, %rdi
    call printf
.L8:

    movq -8(%rbp), %rcx
    cmpq -16(%rbp), %rcx
    jne .L9

    movq $.msg12, %rdi
    call printf
.L9:

    movq -8(%rbp), %rcx
    cmpq -16(%rbp), %rcx
    je .L10

    movq $.msg13, %rdi
    call printf
.L10:

    movq -8(%rbp), %rcx
    cmpq %rcx, %rcx
    jne .L11

    movq -16(%rbp), %rcx
    cmpq -24(%rbp), %rcx
    jne .L11

    movq $.msg14, %rdi
    call printf
.L11:

    movq -8(%rbp), %rcx
    cmpq %rcx, %rcx
    je .L12

    movq -16(%rbp), %rcx
    cmpq -24(%rbp), %rcx
    jne .L12

    movq $.msg15, %rdi
    call printf
.L12:

    movq -8(%rbp), %rcx
    cmpq %rcx, %rcx
    jne .L13

    movq -16(%rbp), %rcx
    cmpq -24(%rbp), %rcx
    je .L13

    movq $.msg16, %rdi
    call printf
.L13:

    movq -8(%rbp), %rcx
    cmpq %rcx, %rcx
    je .L14

    movq -16(%rbp), %rcx
    cmpq -24(%rbp), %rcx
    je .L14

    movq $.msg17, %rdi
    call printf
.L14:

    movq -8(%rbp), %rcx
    cmpq %rcx, %rcx
    je .L15

    movq -16(%rbp), %rcx
    cmpq -24(%rbp), %rcx
    jne .L16
.L15:

    movq $.msg18, %rdi
    call printf
.L16:

    movq -8(%rbp), %rcx
    cmpq %rcx, %rcx
    jne .L17

    movq -16(%rbp), %rcx
    cmpq -24(%rbp), %rcx
    jne .L18
.L17:

    movq $.msg19, %rdi
    call printf
.L18:

    movq -8(%rbp), %rcx
    cmpq %rcx, %rcx
    je .L19

    movq -16(%rbp), %rcx
    cmpq -24(%rbp), %rcx
    je .L20
.L19:

    movq $.msg20, %rdi
    call printf
.L20:

    movq -8(%rbp), %rcx
    cmpq %rcx, %rcx
    jne .L21

    movq -16(%rbp), %rcx
    cmpq -24(%rbp), %rcx
    je .L22
.L21:

    movq $.msg21, %rdi
    call printf
.L22:

    movq $0, %rax
    leave
    ret
