import Database from './utilities/Database';
import Engine from './modules/engines/AnsibleEngine';
import Config from './Config';
import path from 'path';
import ModuleLoader from './utilities/ModuleLoader';
import {logger} from './Logger';
import fs from 'fs';
import Manager from './modules/base/Manager';
import mkdirp from 'mkdirp';
import AppUser from './ui/AppUser';
import dateFormat from 'dateformat';

class Provider {

    constructor(appDir) {
        this.managers = {};
        this.configDir = appDir;
        if (!this.configDir) {
            this.configDir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
            this.configDir = path.resolve(this.configDir, ".vincent");
        }
        this.config = new Config(path.resolve(this.configDir));
        this.loader = new ModuleLoader(this);
        this.createManagers();
        this.makeDBDir();
        this.database = new Database(this);
        //todo lookup default engine from config file.
        this._engine = new Engine(this);
        this.setupLogger();
    }

    setupLogger(){
        let logdir =this.config.get("logdir");
        let logfile = this.config.get("logfile");
        let logpath = path.resolve(this.configDir,logdir?logdir:"logs",);
        try {
            fs.statSync(logpath);
        }catch(e){
            mkdirp(logpath, parseInt("770", 8));
        }
        logfile= path.resolve(logpath, logfile? logfile:"vincent.log");

        let loglevel = this.config.get("loglevel");
        logger.setStream(logfile,loglevel? loglevel:"info");

    }

    makeDBDir() {
        try {
            var stat = fs.statSync(this.getDBDir());
        } catch (e) {
            logger.info(`${this.getDBDir()} does not exists. It will be created`);
            fs.mkdirSync(this.getDBDir(), parseInt("700", 8));
        }

        try {
            fs.statSync(`${this.getDBDir()}/configs`);
        } catch (e) {
            logger.info(`${this.getDBDir()}/configs does not exists. It will be created`);
            fs.mkdirSync(`${this.getDBDir()}/configs`, parseInt("700", 8));
        }
        
        try {
            fs.statSync(`${this.getDBDir()}/scripts`);
        } catch (e) {
            logger.info(`${this.getDBDir()}/scripts does not exists. It will be created`);
            fs.mkdirSync(`${this.getDBDir()}/scripts`, parseInt("700", 8));
        }
        
        try {
            fs.statSync(`${this.getDBDir()}/archive`);
        } catch (e) {
            logger.info(`${this.getDBDir()}/archive does not exists. It will be created`);
            fs.mkdirSync(`${this.getDBDir()}/archive`, parseInt("700", 8));
        }

        try {
            let stat = fs.statSync(`${this.getDBDir()}/keys`);
            if (!stat.mode == parseInt("700", 8)) {
                fs.chmodSync(`${this.getDBDir()}/keys`, parseInt("700", 8));
            }
        } catch (e) {
            logger.info(`${this.getDBDir()}/keys does not exists. It will be created`);
            fs.mkdirSync(`${this.getDBDir()}/keys`, parseInt("700", 8));
        }

        try {
            fs.statSync(`${this.getDBDir()}/includes`);
        } catch (e) {
            logger.info(`${this.getDBDir()}/includes does not exists. It will be created`);
            fs.mkdirSync(`${this.getDBDir()}/includes`, parseInt("700", 8));
        }
    }

    removeFile(filename){
        let currentPath = path.resolve(this.getDBDir(), filename);
        fs.unlink(currentPath,()=>{
            logger.info(`Deleted ${currentPath}.`);
        });
    }

    /**
     Allow export engine to be set programatically
     */
    set engine(engine) {
        this._engine = engine;
    }

    get engine() {
        return this._engine;
    }

    /**
     Create all managers
     */
    createManagers() {
        //let mpath = path.resolve(this.getRootDir(), 'lib/modules');
        //return this.loader.parseDirectory(mpath, 'Manager', this);
       try {
           this.loader.parseModulesDirectory();
           this.loader.callFunctionInTopDownOrder((manager)=> {
               let name = manager.name.charAt(0).toLowerCase() + manager.name.slice(1);
               try {
                  this.managers[name] = new manager(this);
               } catch (e) {
                   logger.logAndThrow(e);
               }
           });
       }catch(e){
           logger.logAndThrow(e);
       }

    }

    getManagerFromClassName(manager) {
        let name = manager.name.charAt(0).toLowerCase() + manager.name.slice(1);
        try {
            return this.managers[name];
        } catch (e) {
            logger.error(`Could not find manager ${name} in list of available managers`);
        }
    }

    /**
     *
     */
    loadAll(user) {
        let status = true;
        this.loader.callFunctionInTopDownOrder((managerClass)=> {
            let manager = this.getManagerFromClassName(managerClass);
            if (!manager || !manager.loadFromFile(user)) {
                logger.error(`There was an error calling loadFromFile on ${managerClass.name}`);
                status = false;
            }
        });
        return status;
    }

    /**
     * Persist all data files.
     */
    saveAll() {
        let historyDir = this.makeArchiveDir();
        let results =[];
        //move host file
        try {
            let filename = this.getDBDir() + "/configs";
            let exists = fs.statSync(filename);
            let archivePath = historyDir + "/configs";
            fs.renameSync(filename, archivePath);
            results.push("Successfully archived configs folder.");
        } catch (e) {
            results.push("The configs folder does not exist.");
            logger.info(`The configs folder does not exist.`);
        }

        //move users file
        try {
            let filename = this.getDBDir() + "/users.json";
            let exists = fs.statSync(filename);
            let archivePath = historyDir + "/users.json";
            fs.renameSync(filename, archivePath);
            results.push("Successfully archived user.json file.");
        } catch (e) {
            results.push("The file users.json does not exist.");
            logger.info(`The file users.json does not exist.`);
        }

        //move groups file
        try {
            let filename = this.getDBDir() + "/groups.json";
            let exists = fs.statSync(filename);
            let archivePath = historyDir + "/groups.json";
            fs.renameSync(filename, archivePath);
            results.push("Successfully archived groups.json file.");
        } catch (e) {
            results.push("The file groups.json does not exist.");
            logger.info(`The file groups.json does not exist.`);
        }

        if(this.saveToFile(`groups.json`,this.managers.groupManager, false)){
            results.push("Successfully saved groups.json.");
        }else{
            results.push("Failed to save groups.json");
        }
        if(this.saveToFile(`users.json`,this.managers.userManager, false)){
            results.push("Successfully saved users.json.");       
        }else{
            results.push("Failed to save users.json");        
        }
        
        this.managers.hostManager.validHosts.forEach((host)=> {
            if(this.saveToFile(`configs/${host.configGroup}/${host.name}.json`,host, false)){
                results.push(`Successfully saved ${host.name} in ${host.configGroup}.`);
            }else{
                results.push(`Failed to save ${host.name} in ${host.configGroup}.`);
            }
        });
        return results;
    }

    createConfigGroup(configGroup) {
        let tpath = path.join(this.getDBDir() + "/configs", configGroup);
        try {
            var stat = fs.statSync(tpath);
        } catch (e) {
            logger.info(`${tpath} does not exists. It will be created.`);
            fs.mkdirSync(tpath);
        }
    }

    getConfigGroups() {
        return fs.readdirSync(this.getDBDir() + "/configs").filter((entry)=> {
            return fs.statSync(path.join(this.getDBDir() + "/configs", entry)).isDirectory();
        });
    }

    /**
     * Utility function for the save function of Manager objects.
     * @returns {*}
     */
    makeArchiveDir() {
        let archive = dateFormat(new Date(), "yyyy-mm-dd-HH:MM:ss");
        let archiveDir = path.resolve(this.getDBDir(), "archive", archive);

        try {
            var stat = fs.statSync(archiveDir);
        } catch (e) {
            logger.info(`${archiveDir} does not exists. It will be created.`);
            fs.mkdirSync(archiveDir);
        }
        /*
         try {
         fs.statSync(`${archiveDir}/configs`);
         } catch (e) {
         fs.mkdirSync(`${archiveDir}/configs`);
         logger.info(`${archiveDir}/roles does not exists. It will be created.`);
         }

         try {
         fs.statSync(`${archiveDir}/configs/default`);
         } catch (e) {
         fs.mkdirSync(`${archiveDir}/configs/default`);
         logger.info(`${archiveDir}/configs/default does not exists. It will be created.`);
         }

         try {
         fs.statSync(`${archiveDir}/includes`);
         } catch (e) {
         fs.mkdirSync(`${archiveDir}/includes`);
         logger.info(`${archiveDir}/includes does not exists. It will be created.`);
         }*/
        return archiveDir;
    }

    fileExists(filename) {
        try {
            fs.statSync(path.resolve(this.getDBDir(), filename));
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Populate data for managers from text files.
     * @returns {Promise}
     */
    loadManagersFromFiles() {
        let promises = [];
        this.managers.forEach(manager=> {
            promises.push(manager.loadFromFile());
        });
        return Promise.all(promises);
    }

    /**
     * Utility function used by managers to load their data files from  the config directory
     * @param filename
     * @returns {Promise}
     */
    loadFromFile(filename) {
        let dbDir = this.getDBDir();
        let data = fs.readFileSync(path.resolve(dbDir,filename), 'utf-8');
        try {
            return JSON.parse(data);
        } catch (e) {
            logger.logAndThrow(`Error loading the users config - ${e.message}.`);
        }
    }

    saveToFile(filename, manager, backup) {
        try {
            let currentPath = path.resolve(this.getDBDir(), filename);
            if (backup) {
                try {
                    var stat = fs.statSync(currentPath);
                    //let archivePath = "";
                    if (stat && stat.isFile()) {
                        let archivePath = this.makeArchiveDir();
                        let fullArchivePath = path.resolve(archivePath, filename);
                        this._checkDirectoriesExists(fullArchivePath);
                        fs.renameSync(currentPath, fullArchivePath);
                    }
                } catch (e) {
                    logger.warn(`${filename} file does not exist. No backup taken - ${e.message}.`);
                }
            }
            let obj = manager.export();
            var json = JSON.stringify(obj, null, 2);
            this._checkDirectoriesExists(currentPath);
            fs.writeFileSync(currentPath, json);
            return true;
        }catch(e){
            return false;
        }
    }

    _checkDirectoriesExists(filename){
        let comps = path.dirname(filename).split("/");
        let tpath = "";
        comps.forEach((comp)=> {
            tpath += "/" + comp;
            try {
                fs.statSync(tpath);
            } catch (e) {
                logger.info(`${tpath} does not exist, creating path.`);
                fs.mkdirSync(tpath);
            }
        });
    }

    /**
     * Convenience function to return the configure datastore directory
     * @returns {*}
     */
    getDBDir() {
        let loc = path.resolve(this.configDir, this.config.get('dbdir'));
        /*        //check if config directory exists
         try {
         var stat = fs.statSync(loc);
         } catch (e) {
         mkdirp(loc);
         }*/
        /*        //ensure host directory exists
         let hostloc = path.resolve(loc, "hosts");
         try {
         stat = fs.statSync(hostloc);
         } catch (e) {
         mkdirp(hostloc);
         }*/
        return loc;
    }

    /**
     * Convenience function to retrieve the datastore location for generated files for automation engines
     * @returns {*}
     */
    getEngineDir() {
        let loc = path.resolve(this.configDir, this.config.get('enginedir'));
        //check if config directory exists
        try {
            var stat = fs.statSync(loc);
        } catch (e) {
            mkdirp(loc);
        }
        return loc;
    }

    /**
     * Convenience function to retrieve Vincent's configuration directory
     * @returns {*}
     */
    getConfigDir() {
        let loc = path.resolve(this.configDir);
        //check if config directory exists
        try {
            var stat = fs.statSync(loc);
        } catch (e) {
            mkdirp(loc);
        }
        return loc;
    }

    /**
     * Convenience function to retrieve the location of Vincent's modules
     * @returns {string}
     */
    getRootDir() {
        let dir = __dirname.split(path.sep);
        dir.pop();
        return dir.join(path.sep);
    }

    clear() {
        for (let manager in this.managers) {
            if (manager instanceof Manager) {
                manager.clear();
            }
        }
    }

    //perm may be r,w,x or 4,2,1
    checkPermissions(appUser, permObj, perm) {

        if (!appUser || !(appUser instanceof AppUser)) {
            logger.logAndThrow("Parameter appUser must be of type AppUser and cannot be null or undefined");
        }

        if (appUser.isAdmin) {
            return true;
        }

        let nperm = undefined;
        if (typeof perm === 'number' && (perm == 1 || perm == 4 || perm == 2)) {
            nperm = perm;
        } else if (typeof perm === 'string' && perm.length === 1) {
            nperm = this._permStringToInteger(perm);
        }

        if (!nperm) {
            logger.logAndThrow(`Invalid permission syntax ${perm} - checkPermissions`);
        }

        let owner = permObj.owner;
        let group = permObj.group;
        let perms = permObj.permissions.toString(8);

        if (appUser.name === owner && (parseInt(perms.charAt(0)) & nperm) != 0) {
            return true;
        }

        if (appUser.groups.indexOf(group) != -1 && (parseInt(perms.charAt(1)) & nperm) != 0) {
            return true;
        }

        if (parseInt((perms.charAt(2)) & nperm) != 0) {
            return true;
        }

        return false;
    }

    //perms may be an 3 digit decimal or a 9 character string (rwx){3}. If a number is provided it is assumed to be
    //octal.

    _validateAndConvertPermissions(perms) {

        //if we have been pased an octal as a string
        if (typeof perms === "string" && perms.length === 3) {
            perms = parseInt(perms);
        }

        if (Number.isInteger(perms)) {
            if (isNaN(perms) || perms > "0777") {
                logger.logAndThrow(`Invalid permissions syntax for ${perms} - max value exceeded.`);
            }
            return parseInt(perms, 8);
        } else if (typeof perms === 'string' && perms.length === 9) {
            let regex = /([r\-]{1}[w\-]{1}[x\-]{1})?/g;
            //var result = regex.exec(perms);
            let octal = "";
            try {
                octal = octal.concat(this._permStringToInteger(regex.exec(perms)[1]));
                octal = octal.concat(this._permStringToInteger(regex.exec(perms)[1]));
                octal = octal.concat(this._permStringToInteger(regex.exec(perms)[1]));
            } catch (e) {
                //console.log(e);
                logger.logAndThrow(`Invalid permissions syntax for ${perms} - string format error`);
            }
            return parseInt(octal, 8); //convert it to decimal;
        } else {
            logger.logAndThrow(`Invalid permissions syntax for ${perms} - format error`);
        }
    }

    //string is either a 1 digit integer less than or equal to 7 or a 3 character string (rwx)
    _permStringToInteger(str) {
        let perm = 0;
        if (typeof str === 'string' && str.length == 3) {
            let regex = /([r\-]{1}[w\-]{1}[x\-]{1}?)/g;
            if (!str.match(regex)) {
                logger.logAndThrow(`Invalid permissions syntax for ${str} - _permStringToInteger error`);
            }
            if (str.charAt(0) === 'r') perm += 4;
            if (str.charAt(1) === "w") perm += +2;
            if (str.charAt(2) == 'x') perm += 1;
        } else if (str.match(/^[rwx]{1}$/)) {
            switch (str) {
                case 'r':
                    perm = 4;
                    break;
                case 'w':
                    perm = 2;
                    break;
                case 'x':
                    perm = 1;
                    break;
            }
        } else {
            logger.logAndThrow(`Invalid permissions syntax for ${str} -  _permStringToInteger error`);
        }
        return perm;
    }


    _integerToOctalString(perm) {
        let perms = perm.toString(8);
        perms = perms.concat(this._singleIntegerToOctalString(parseInt(perms.charAt(0))),
            this._singleIntegerToOctalString(parseInt(perms.charAt(1))),
            this._singleIntegerToOctalString(parseInt(perms.charAt(2))));
        return perms;
    }


    //convert single digit integer to permission string. Number is assumed to be an octal
    _singleIntegerToOctalString(perm) {
        if (typeof perm !== "number" || perm > "07" || perm < 0) {
            logger.logAndThrow(`Invalid permissions syntax for ${perm} - octalToString error`);
        }
        let result = "";
        switch (perm) {
            case 0:
                result = "---";
                break;
            case 1:
                result = "--x";
                break;
            case 2:
                result = "-w-";
                break;
            case 3:
                result = "-wx";
                break;
            case 4:
                result = "r--";
                break;
            case 5:
                result = "r-x";
                break;
            case 6:
                result = "rw-";
                break;
            case 7:
                result = "rwx";
                break;
        }
        return result;
    }

    _readAttributeCheck(appUser, permObj, callback) {
        if (this.checkPermissions(appUser, permObj, "r")) {
            return callback();
        } else {
            logger.logAndThrowSecruityPermission(appUser, permObj, "read attribute");
        }
    }

    _writeAttributeCheck(appUser, permObj, callback) {
        if (this.checkPermissions(appUser, permObj, "w")) {
            return callback();
        } else {
            logger.logAndThrowSecruityPermission(appUser, permObj, "write attribute");
        }
    }

    _executeAttributeCheck(appUser, permObj, callback) {
        if (this.checkPermissions(appUser, permObj, "x")) {
            return callback();
        } else {
            logger.logAndThrowSecruityPermission(appUser, permObj, "execute attribute");
        }
    }

}

export default Provider;