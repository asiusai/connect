mkdir out

hexdump -v -e '1/1 "%02x\n"' fcam.hevc | head -n 50000 > out/fcam.hevc.head.hex

hexdump -v -e '1/1 "%02x\n"' fcam.mp4 | head -n 50000 > out/fcam.mp4.head.hex

git diff --no-index out/fcam.hevc.head.hex out/fcam.mp4.head.hex > out/fcam.head.diff