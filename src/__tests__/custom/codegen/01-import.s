.section .rodata
.msg0:
    .string "Hello, World.\n"

.section .text
.globl main

main:
    enter $0, $0

    movq $.msg0, %rdi
    call printf
    movq $0, %rax

    leave
    ret
