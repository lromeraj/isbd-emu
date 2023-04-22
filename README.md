# Iridium SBD emulator

This emulator has been implemented due to the current lack of active _Iridium SBD 960X_ and _GSS_ emulators, there are currently some repositories which implements a tiny Iridium SBD emulator, but they are totally unmaintained and have not been updated in the last years. Those implementations are using a very old versions of Python and there are some incompatible dependencies.

> **NOTE**: this emulator does not emulate the behavior of a satellite network (at least by the moment), this is implicitly abstracted within the GSS.

# Implementation

This emulator is written in [TypeScript](https://www.typescriptlang.org/) which is a strongly typed programming language that builds on JavaScript (NodeJS environment in this case). 

The idea of this implementation is to be flexible in order to facilitate the process of adding new functionality to the emulator. Currently there are some limitations, multiple AT commands are not currently supported and in some cases only a subset of all possible error codes are used.

This emulator actually consists in two different programs: `960x.js` emulator and `gss.js` emulator, the first one allows you to instantiate an _Iridium SBD 960X_ like transceiver and the `gss.js` allows you to emulate an Iridium GSS locally.

> **NOTE**: this emulator can be run in different machines, this means that you can run the `960x.js` emulator on a different machine from where the transceiver `960x.js` is running.

> **IMPORTANT**: if you use a *WAN*, remember that all the data travels over TCP or HTTP/TCP without TLS (like Iridium does).

The core of the emulator is also exposed in order to be reused for more specific implementations.

# Building
Before building this emulator you'll need to install `NodeJS` environment (which you probably have already installed) but in case you don't, you can simply do:

> **NOTE**: the following instructions assume you are working from Ubuntu. If you need specific instructions for your OS, search in Google how to install `Node JS v14.x`.

``` bash
curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh
```

Check it's contents if you don't feel comfortable with a direct "blind" install:
``` bash
nano nodesource_setup.sh
```

Finally install it:
``` bash
sudo bash nodesource_setup.sh
```

If `node` and `npm` are accesible from your path, now you can build the entire project by going to the root of this repository and executing:
``` bash
npm i
```
Thats all. Now, the symlinks named `gss.js` and `960x.js` should be pointing to a valid JavaScript file inside the `build/` directory.

If you want to run those scripts simply tell `node` to execute them, like:
``` bash
node gss.js
```

For more details, see [how to run the emulator](#running-the-emulator).

# Running the emulator

If you want to see all the possible command line arguments of any script, simply append `--help` flag:
``` bash
node 960x.js --help
``` 

This (actually) results in:
``` txt
Usage: 960x [options]

A simple emulator for Iridium SBD 960X transceivers

Options:
  -V, --version        output the version number
  -p, --path <string>  serial port path
  -i, --imei <string>  set ISU IMEI (default: "527695889002193")
  --gss-host <string>  GSS Socket host (default: "localhost")
  --gss-port <string>  GSS Socket port (default: 10801)
  --gss-uri <string>   GSS Socket URI
  -h, --help           display help for command
```

To finally run the `960x.js` emulator you need to create a virtual serial port in order to communicate with it, you can use `socat` to achieve that:

``` bash
socat -dd pty,link=/tmp/tty,raw,echo=0 pty,link=/tmp/960x,raw,echo=0
```

Leave this executing in the foreground or in a different terminal. Now you can execute:
``` bash
node 960x.js -vvv -p /tmp/960x
```

You should see an output like:
``` txt
2023-04-21T08:49:33.415Z [ OK ]: 	AT Interface ready 
```
Now you can communicate with it, using, for example, `minicom`:
``` bash
minicom -D /tmp/tty
```
Try to send the test `AT` command:
``` txt
Welcome to minicom 2.7.1

OPTIONS: I18n 
Compiled on Dec 23 2019, 02:06:26.
Port /tmp/qemu, 10:49:27

Press CTRL-A Z for help on special keys


OK
```

> **NOTE**: the modem currently does not have any type of persistance and all data is volatile, when program dies the information "disappears" with it. This will change in a near future. 

Now we have to start the _GSS_ in order to allow the modem to send (_MO_) and receive (_MT_) messages.
``` bash
node gss.js -vvv
``` 

This will output something like:
``` bash
2023-04-21T08:58:23.300Z [WARN]: 	No MO transports defined 
2023-04-21T08:58:23.303Z [ OK ]: 	SU server ready, port=10801
2023-04-21T08:58:23.303Z [ OK ]: 	MT server ready, port=10800
2023-04-21T08:58:24.876Z [DBUG]: 	ISU 527695889002193 connected 
```

If you are still running the `960x.js` program the ISU will connect automatically to the _GSS_ (like if a satellite was reachable).

The warning says that there are no _MO_ (_Mobile Originated_) transports defined, this transports are used in order to allow the _GSS_ to retransmit _MO_ messages from the _ISUs_ (_Iridium Subscriber Units_) to the [vendor server application](https://glab.lromeraj.net/ucm/miot/tfm/iridium-sbd-server). To fix that, just specify at least one _MO_ transport.

This emulator **supports two types of _MO_ transports**: `TCP` and `SMTP` (same as Iridium). You can use one or both at the same time. Use `--help` to see all the available command line options for the _GSS_:
``` txt
Usage: gss [options]

A simple emulator for Iridium GSS

Options:
  -V, --version                output the version number
  -v, --verbose                Verbosity level
  --mo-smtp-host <string>      MO SMTP transport host
  --mo-smtp-port <number>      MO SMTP transport port (default: 25)
  --mo-smtp-user <string>      MO SMTP transport username
  --mo-smtp-password <string>  MO SMTP transport password
  --mo-smtp-to <string>        MO SMTP transport destination address
  --mo-tcp-host <string>       MO TCP transport host
  --mo-tcp-port <number>       MO TCP transport port (default: 10801)
  --mt-server-port <number>    MT server port (default: 10800)
  --mo-server-port <number>    MO server port (default: 10802)
  -h, --help                   display help for command
```

If you want to setup _MO_ transport as _SMTP_ you'll have to specify (at least): `--mo-smtp-host` and `--mo-smtp-user` options:
``` bash
node gss.js -vvv \
  --mo-smtp-host smtp.domain.com \
  --mo-smtp-user your@email.com
```
- If you don't specify a destination address with `--mo-smtp-to`, emails will be sent to the email used for identification (to you). In other words, by default `--mo-smtp-to` equals to `--mo-smtp-user`. 

- If you want to use Google's Gmail SMTP service refer to [this section](#generating-google-application-passwords-for-smtp).

If you want to use the _MO_ transport as _TCP_, you'll need a running instance of [Iridium Direct IP compatible server](https://glab.lromeraj.net/ucm/miot/tfm/iridium-sbd-server). The required option to enable _TCP_ transport is `--mo-tcp-host`, the port is `10801` by default:
``` bash
node gss.js -vvv \
  --mo-tcp-host sbd.lromeraj.net
```

### Generating Google application passwords for SMTP

Recently, [Google has disabled the option](https://www.google.com/settings/security/lesssecureapps) to allow less secure applications to have access to your account, this allowed to use your own personal password to give access to third-party apps which is not ideal. 

Currently you can achieve the same, but requires a few extra steps: 
1. You need to have enabled [two factor authentication](https://myaccount.google.com/signinoptions/two-step-verification).
2. And then you can generate an application password [from here](https://myaccount.google.com/apppasswords). Save the password somewhere because you will not be able to see it again.

No you can execute the Iridium GSS using Gmail's _SMTP_:
``` bash
node gss.js -vvv \
  --mo-smtp-host smtp.gmail.com \
  --mo-smtp-user example@gmail.com \
  --mo-smtp-password XXXXXXXXXXXXXXXX
```
If the port is not specified, the default value `25` will be used, Gmail's _SMTP_ works on: `25`, `465` and `587` ports.

# General GSS behavior
Here we'll describe how the Iridium SBD emulator operates depending on different conditions:

- When a _MO_ message reaches the GSS this message is queued and **will be sent over each defined transport**, if the message reaches it's destination over at least one transport it is considered as received by the vendor application, otherwise the message will be requeued, this is the expected original Iridium behavior.

> **NOTE**: currently MT server is under development, but all decoders and encoders for TCP packets are ready to be used, just need some more time to integrate them.