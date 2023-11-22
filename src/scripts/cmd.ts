import commander, { Option } from "commander";
import { levels } from "../logger";

const levelChoices = Object.entries( levels ).map( ([k, v]) => v );

export const logLevelOption = new Option(
	'-l, --log-level <number>', 
	`Set logging level: ${ levelChoices.join( ', ' ) }` 
).argParser( v => {
	const level = parseInt( v );
	if ( !Object.entries( levels ).map( ([k,v]) => v ).includes( level ) ) {
		throw new commander.InvalidArgumentError( `Use one of the following: ${ 
			levelChoices.join( ', ' )
		}` );
	}
	return level;
}).default( 3 )