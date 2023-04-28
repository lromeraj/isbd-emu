import tabtab, { TabtabEnv } from "tabtab";

const completion = (env: TabtabEnv) => {
  
  // Write your completions there

  if (env.prev === "foo") {
    return tabtab.log([ "is", "this", "the", "real", "life" ]);
  }

  if (env.prev === "bar") {
    return tabtab.log([ "is", "this", "just", "fantasy" ]);
  }

  if (env.prev === "--loglevel") {
    return tabtab.log([ "error", "warn", "info", "notice", "verbose" ]);
  }

  return tabtab.log([
    "--help",
    "--version",
    "--loglevel",
    "foo",
    "bar",
    "someCommand:a comprehensive description of the command",
    {
      name: "someOtherCommand",
      description: "comprehensive description of the other command",
    },
    "anotherOne",
  ]);

};

const run = async () => {

  // Write your CLI there

  // Here we install for the program `tabtab-test` (this file), with
  // completer being the same program. Sometimes, you want to complete
  // another program that's where the `completer` option might come handy.
    
  /*
    await tabtab.install({
      name: "tabtab-test",
      completer: "tabtab-test",      
    });
  */

  // The completion command is added automatically by tabtab when the program
  // is completed.

  // tabtab.parseEnv( process.env )
  
  const env = tabtab.parseEnv(process.env);
  console.log( completion(env) );


};

run();