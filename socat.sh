#!/bin/bash
socat -dd pty,link=/tmp/qemu,raw,echo=0 pty,link=/tmp/960x,raw,echo=0
