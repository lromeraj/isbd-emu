SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
SCRIPT_NAME=${BASH_SOURCE[0]}

function isbd {
	NODE_SCRIPT_NAME=$1
	NODE_SCRIPT_PATH=$SCRIPT_DIR/$NODE_SCRIPT_NAME.js
  shift
	if [ -e $NODE_SCRIPT_PATH ]; then
		node $NODE_SCRIPT_PATH $@
	else
		echo "$SCRIPT_NAME: err: script $NODE_SCRIPT_NAME not found"
	fi
}

function _isbd_completions {

  local COMMANDS=(
    "gss"
    "960x"
    "encode"
    "decode"
    "transport"
  )

  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=($(compgen -W "${COMMANDS[*]}" ${COMP_WORDS[1]}))
  fi

  if [ $COMP_CWORD -eq 2 ]; then 
    local name="${COMP_WORDS[1]}"
    if [ $name = "encode" ] || [ $name = "decode" ]; then
      compopt -o default; COMPREPLY=()
      # COMPREPLY=($(compgen -o filenames -A file -- "${COMP_WORDS[2]}"))
    fi
  fi

} 

complete -F _isbd_completions isbd

