#/bin/sh

function update() {
    # Nodejs packages
    npm install
    # Bower
    bower update
}

function serve() {
export CTC_TEST_PORT=`grep $USER /etc/passwd | sed -r 's/.*\:([0-9]+)\:.*/\1/'|\
python -c '
import sys
user_id = int(sys.stdin.readline().strip()) - 1000
ctc_port_id = 8000 + (user_id * 100) + 54
print ctc_port_id'`
grunt
}

update
serve
