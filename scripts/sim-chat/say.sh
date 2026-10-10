#!/bin/zsh
# Sends her words to the app running in the iOS Simulator, waits for Liora's reply, and screenshots it.
#   python3 scripts/sim-chat/server.py .tmp/sim-chat &      (once; the app's dev driver polls it)
#   scripts/sim-chat/say.sh <shot-name> "<her message>" [cycler|mama|newmom]
# A seed starts a fresh chat on a lived-in account. Shots land in .tmp/sim-chat/shots.
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
D=${0:A:h:h:h}/.tmp/sim-chat; mkdir -p $D/shots
name=$1; msg=$2; seed=$3; id="$name-$RANDOM"
python3 -c 'import json,sys; d={"id":sys.argv[1],"say":sys.argv[2]}; s=sys.argv[3]; d.update({"seed":s} if s else {}); open(sys.argv[4],"w").write(json.dumps(d))' "$id" "$msg" "$seed" "$D/cmd.json"
t0=$(date +%s)
until [ "$(cat $D/done.txt 2>/dev/null)" = "$id" ]; do sleep 0.5; [ $(( $(date +%s) - t0 )) -gt 300 ] && { echo "$name: no reply in 300 s"; break; }; done
sleep 2.5
xcrun simctl io booted screenshot --type=png "$D/shots/$name.png" >/dev/null 2>&1
echo "$name: replied in $(( $(date +%s) - t0 ))s $(cat $D/info.txt 2>/dev/null)"
