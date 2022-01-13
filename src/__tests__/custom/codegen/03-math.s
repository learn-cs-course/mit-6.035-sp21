.section .rodata
.msg0:
    .string "min int operation: result should be -2147483648, is: %d\n"
.msg1:
    .string "paren assoc: result should be 100, is: %d\n"
.msg2:
    .string "- assoc: result should be 10, is: %d\n"
.msg3:
    .string "-,+ assoc: result should be 90, is: %d\n"
.msg4:
    .string "- * assoc: result should be 80, is: %d\n"
.msg5:
    .string "result should be 46, is: %d\n"
.msg6:
    .string "*, -, uses var: result should be 11, is: %d\n"
.msg7:
    .string "*,- assoc: result should be 2, is: %d\n"

.section .text
.globl main

main:
    enter $16, $0

    movq $-2147483647, %rcx
    subq $1, %rcx
    movq %rcx, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg0, %rdi
    call printf

    movq $100, %rcx
    subq $50, %rcx
    imulq $2, %rcx
    movq %rcx, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg1, %rdi
    call printf

    movq $100, %rcx
    subq $50, %rcx
    subq $40, %rcx
    movq %rcx, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg2, %rdi
    call printf

    movq $100, %rcx
    subq $50, %rcx
    addq $40, %rcx
    movq %rcx, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg3, %rdi
    call printf

    movq $5, %rcx
    imulq $4, %rcx
    movq $100, %r8
    subq %rcx, %r8
    movq %r8, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg4, %rdi
    call printf

    movq $10, %rcx
    imulq $5, %rcx
    subq $4, %rcx
    movq %rcx, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg5, %rdi
    call printf

    movq $3, -8(%rbp)
    movq -8(%rbp), %rcx
    imulq %rcx, %rcx
    movq $0, %r8
    subq $2, %r8
    subq %r8, %rcx
    movq %rcx, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg6, %rdi
    call printf

    movq $3, %rcx
    imulq $4, %rcx
    movq $2, %r8
    imulq $5, %r8
    subq %r8, %rcx
    movq %rcx, -8(%rbp)

    movq -8(%rbp), %rsi
    movq $.msg7, %rdi
    call printf

    movq $0, %rax
    leave
    ret
