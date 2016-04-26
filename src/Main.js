/**
 * Created by mark on 2016/02/21.
 */

import Console from './ui/Console/Console';
import Provider from './Provider';
import logger from './Logger';
import CliLogin from './ui/Console/CliLogin';
import fs from 'fs';
import tls from 'tls';

class Main {

    constructor() {
        //this.configDir;
        if (!this.processArguments()) {
            process.exit();
        }
        if (this.args.configdir) {
            this.provider = new Provider(this.args.configdir);
        } else {
            this.provider = new Provider();
        }
        if (!this.configDir) {
            this.configDir = process.cwd();
        }
    }

    startServer(){
        var options = {
            key: fs.readFileSync(this.provider.config.get("privateKey")),
            cert: fs.readFileSync(this.provider.config.get("publicKey"))
        };

        tls.createServer(options, (s)=> {
            logger.info("incoming connection");
            s.write("Please enter your username:");
            let pCount = 0;
            let username="";
            let password="";
                s.on("data",(data)=>{
                   let input = data;
                   switch(pCount){
                       case 0:
                            if (!input){
                                logger.warn("invalid input for username. closing connection");
                                s.write("Invalid input");
                                s.destroy();
                                return;
                            }
                           s.write(input.toString());
                           if(input.toString().slice(-1)!="\r"){
                               username = username.concat(input.toString().slice(-1));
                               break;
                           }else{
                               username = username.concat(input.toString().slice(0,-1));
                           }
                           logger.info(`login attempt for user ${username}`);
                           s.write("\n\rPlease enter your password:");
                             pCount++;
                            break;
                       case 1:
                           if (!input){
                               s.write("Invalid input");
                               logger.warn("invalid input for password. closing connection");
                               s.destroy();
                               return;
                           }
                           s.write("*");
                           if(input.toString().slice(-1)!="\r"){
                               password = password.concat(input.toString().slice(-1));
                               break;
                           }else{
                               password = password.concat(input.toString().slice(0,-1));
                           }
                           logger.info(`attempting to authenticate user ${username}`);
                           pCount++;
                            if (CliLogin.login(username,password)) {
                                logger.info(`login successful for user ${username}`);
                                s.write("Authentication Successful.");
                                let console = this.startConsole(s);
                            } else{
                                logger.info(`login failed for user ${username}`);
                                s.write("Authentication failure. Closing connection.");
                                s.destroy();
                            }
                   }
                });
        }).listen(1979);
    }

    startConsole(s) {
        logger.info("Starting Vincent console");
        return new Console(s);
    }
    
    startWeb(){
        //this.ui= new Web();
    }

    processArguments() {
        let argslist = process.argv;
        this.args = {
            cli:false,
            daemon:true //daemon is the default mode if no mode specified
        };
        let numargs = process.argv.length;
        let counter = 2;
        let error = false;
        while (counter < numargs && !error) {
            let currarg = argslist[counter];
            switch (currarg) {
                case "--configdir":
                case "-c":
                    counter++;
                    if (argslist[counter].startsWith("-") | argslist[counter].startsWith("--")) {
                        this.showHelp();
                        this.error = true;
                        console.log("-c or --configdir requires a path value.");
                    } else {
                        this.args.configdir = argslist[counter];
                    }
                    break;
                case "--cli":
                case "-i":
                    this.args.cli = true;
                    break;
                case "-d":
                    this.args.daemon = true;
                    this.args.cli=false;
                    break;
                case "--username":
                case "-u":
                    this.args.username = argslist[++counter];
                    break;
                default:
                    console.log(`unrecognised argument ${currarg}`);
                //this.showHelp();
                //error = true;
            }
            counter++;
        }
        return !error;
    }

    showHelp() {
        console.log("Vincent takes the following arguments:");
        console.log("-c or --configdir: location of Vincent's configuration and database directory");
        console.log("-u or --username: username for authentication");
    }
}

export default Main;

