mkdir out

tail -n 50000 fcam.hevc | hexdump -v -e '1/1 "%02x\n"' > out/fcam.hevc.tail.hex

tail -n 50000 fcam.mp4 | hexdump -v -e '1/1 "%02x\n"' > out/fcam.mp4.tail.hex

git diff --no-index out/fcam.hevc.tail.hex out/fcam.mp4.tail.hex > out/fcam.tail.diff