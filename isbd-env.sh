SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
SCRIPT_NAME=${BASH_SOURCE[0]}

function isbd() {
	NODE_SCRIPT_NAME=$1
	NODE_SCRIPT_PATH=$SCRIPT_DIR/$NODE_SCRIPT_NAME.js
	shift
	if [ -e $NODE_SCRIPT_PATH ]; then
		node $NODE_SCRIPT_PATH $@
	else
		echo "$SCRIPT_NAME: err: script $NODE_SCRIPT_NAME not found"
	fi
}

