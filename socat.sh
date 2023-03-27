#!/bin/bash
socat -d -d pty,link=ttyS0,raw,echo=0 pty,link=ttyS1,raw,echo=0
