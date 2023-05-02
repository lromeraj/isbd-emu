#!/bin/bash
socat -dd pty,link=/tmp/tty,raw,echo=0 pty,link=/tmp/960x,raw,echo=0
