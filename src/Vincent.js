/**
 * Created by mark on 2016/04/22.
 */
import Console from './ui/Console/Console';
import Provider from './Provider';
import logger from './Logger';
import fs from 'fs';
import tls from 'tls';
import LdapAuthProvider from './ui/authentication/LdapAuthProvider';
import DBAuthProvider from './ui/authentication/DBAuthProvider';
import UnixAuthProvider from './ui/authentication/UnixAuthProvider';
import AppUser from './ui/AppUser';
import ModuleLoader from './utilities/ModuleLoader';
import path from 'path';


class Vincent {

    constructor(appDir) {
        if (!this.processArguments()) {
            process.exit();
        }
        if (!appDir) {
            this.provider = new Provider(this.args.configDir);
        } else {
            this.provider = new Provider(appDir);
        }
        Vincent.app = this;
    }


    startServer() {
        logger.info("staring server");
        var options = {
            key: fs.readFileSync(path.resolve(this.args.configDir, this.provider.config.get("privatekey"))),
            cert: fs.readFileSync(path.resolve(this.args.configDir, this.provider.config.get("publickey")))
        };

        tls.createServer(options, (s)=> {
            logger.info("incoming connection");
            s.setNoDelay(true);
            s.write("Please enter your username:");
            let pCount = 0;
            let username = "";
            let password = "";
            s.on("data", (data)=> {
                let input = data;
                switch (pCount) {
                    case 0:
                        if (!input) {
                            logger.warn("invalid input for username. closing connection");
                            s.write("Invalid input");
                            s.destroy();
                            return;
                        }
                        s.write(input.toString());
                        if (input.toString().slice(-1) != "\r") {
                            username = username.concat(input.toString().slice(-1));
                            break;
                        } else {
                            username = username.concat(input.toString().slice(0, -1));
                        }
                        logger.info(`login attempt for user ${username}`);
                        s.write("\n\rPlease enter your password:");
                        pCount++;
                        break;
                    case 1:
                        if (!input) {
                            s.write("Invalid input");
                            logger.warn("invalid input for password. closing connection");
                            s.destroy();
                            return;
                        }
                        s.write("*");
                        if (input.toString().slice(-1) != "\r") {
                            password = password.concat(input.toString().slice(-1));
                            break;
                        } else {
                            password = password.concat(input.toString().slice(0, -1));
                        }
                        logger.info(`attempting to authenticate user ${username}`);
                        pCount++;
                        s.write('\n\rAuthenticating user ....');
                        let auth = this.getAuthProvider();
                        auth.authenticate(username, password).then(
                            (result)=> {
                                if (result) {
                                    logger.info(`login successful for user ${username}`);
                                    s.write("\n\rAuthentication Successful.");
                                    let groups = auth.getGroups(username);
                                    let primary = groups[0];
                                    groups.splice(0,1);
                                    let kpath = path.resolve(Vincent.app.provider.getDBDir(),Vincent.app.provider.config.get("keydir"));
                                    let user = new AppUser(username,groups,primary,kpath);
                                    let console = this.startServerConsole(s, user);
                                } else {
                                    logger.info(`login failed for user ${username}`);
                                    s.write("\n\rAuthentication failure. Closing connection.");
                                    s.destroy();
                                }

                            }
                        );
                }
            });
        }).listen(1979);
    }


    getAuthProvider() {
        let auth = {};
        let authtype = this.provider.config.get('authtype');
        switch (authtype) {
            case 'db':
                auth = new DBAuthProvider(this.provider);
                break;
            case 'unix':
                auth = new UnixAuthProvider(this.provider);
                break;
            case 'ldap':
                auth = new LdapAuthProvider(this.provider);
                break;
        }
        return auth;
    }


    startServerConsole(socket, user) {
        logger.info("Starting Vincent console");
        return new Console(socket, user);
    }

    startWeb() {
        //this.ui= new Web();
    }

    processArguments() {
        let argslist = process.argv;
        this.args = {
            cli: false,
            daemon: true //daemon is the default mode if no mode specified
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
                    if (argslist[counter].startsWith("-") || argslist[counter].startsWith("--")) {
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
                    this.args.cli = false;
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


    start() {
        if (this.args.cli) {
            Vincent.app.startConsole();//todo fix me
        } else {
            Vincent.app.startServer();
        }

    }


}

Vincent.app = {};

export default Vincent;